import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Credits, CreditTransaction } from '@/types/database';
import { useToast } from '@/hooks/use-toast';
import { sendLowCreditsEmail } from '@/lib/notifications';

const LOW_CREDITS_THRESHOLD = 20;

export function useConsumeCredits() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ amount, type, description, metadata }: { amount: number, type: string, description?: string, metadata?: any }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      console.log('useConsumeCredits called with:', { amount, type });

      // 0. Verificar si es admin para bypass
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      const isAdmin = roleData?.role === 'admin';
      console.log('User role check:', { userId: user.id, isAdmin, role: roleData?.role });

      let currentBalance = 999999;

      if (!isAdmin) {
        // 1. Verificar balance actual
        const { data: creditData, error: fetchError } = await supabase
          .from('ah_credits')
          .select('balance')
          .eq('user_id', user.id)
          .single();

        if (fetchError || !creditData) {
          console.error('Error fetching balance:', fetchError);
          throw new Error('No se pudo verificar el saldo de créditos');
        }

        if (creditData.balance < amount) {
          throw new Error(`Saldo insuficiente. Necesitas ${amount} créditos.`);
        }

        // Note: We no longer manually deduct credits here.
        // The database TRIGGER on 'ah_usage_logs' will automatically 
        // subtract the amount from 'ah_credits' when the log is inserted below.

        currentBalance = creditData.balance - amount; // Optimistic update
      }

      // 3. Registrar uso (PARA TODOS, incluido admin)
      const { error: logError } = await supabase
        .from('ah_usage_logs')
        .insert({
          user_id: user.id,
          amount: amount,
          description: description || `Consumo de ${amount} créditos - ${type}`
        });

      if (logError) {
        console.error('Error logging usage:', logError);
        throw new Error(`Error al registrar uso: ${logError.message}`);
      }

      // 4. Check and notify if credits are low (fire-and-forget)
      if (!isAdmin && currentBalance < LOW_CREDITS_THRESHOLD && currentBalance >= 0) {
        try {
          const { data: profile } = await supabase
            .from('ah_profiles')
            .select('email, full_name')
            .eq('user_id', user.id)
            .single();

          if (profile) {
            sendLowCreditsEmail(
              profile.email,
              profile.full_name || 'Usuario',
              user.id,
              currentBalance,
              LOW_CREDITS_THRESHOLD
            ).catch(err => console.error('[Credits] Error sending low credits email:', err));
          }
        } catch (notifyError) {
          console.error('[Credits] Error checking low credits notification:', notifyError);
        }
      }

      return { success: true, newBalance: currentBalance };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credits'] });
      queryClient.invalidateQueries({ queryKey: ['usage-stats'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] }); // Actualizar contadores
    },
    onError: (error) => {
      toast({
        title: 'Error de Créditos',
        description: error.message,
        variant: 'destructive',
      });
    }
  });
}


export function useCredits() {
  const { toast } = useToast();

  return useQuery({
    queryKey: ['credits'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check admin for infinite credits visual
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (roleData?.role === 'admin') {
        return { balance: 999999, user_id: user.id } as Credits;
      }

      const { data, error } = await supabase
        .from('ah_credits')
        .select('balance, user_id')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching credits:', error);
        return { balance: 0, user_id: user.id } as Credits;
      }

      // Si no existe, retornar objeto dummy (el trigger de DB debería haberlo creado, 
      // pero si falló o es usuario viejo, mostramos 0 o un valor seguro)
      if (!data) {
        return { balance: 0, user_id: user.id } as Credits;
      }

      return data as Credits;
    },
    // Refresh interval para mantener el saldo actualizado mientras chatea
    refetchInterval: 30000,
  });
}

export function useCreditTransactions() {
  const { toast } = useToast();

  return useQuery({
    queryKey: ['credit-transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('credit_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        toast({
          title: 'Error loading transactions',
          description: error.message,
          variant: 'destructive',
        });
        throw error;
      }

      return data as CreditTransaction[];
    },
  });
}

export function useUsageStats(days: number = 7) {
  return useQuery({
    queryKey: ['usage-stats', days],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('ah_usage_logs')
        .select('created_at, amount')
        .eq('user_id', user.id)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching usage stats:', error);
        return [];
      }

      // Agrupar por día
      const statsMap = new Map<string, { name: string, fullDate: string, credits: number, messages: number }>();

      // Inicializar días
      for (let i = 0; i < days; i++) {
        const d = new Date();
        d.setDate(d.getDate() - (days - 1 - i));
        const dateStr = d.toLocaleDateString('en-US', { weekday: 'short' });
        const fullDate = d.toISOString().split('T')[0];
        statsMap.set(fullDate, { name: dateStr, fullDate, credits: 0, messages: 0 });
      }

      data.forEach(log => {
        const date = log.created_at.split('T')[0];
        if (statsMap.has(date)) {
          const entry = statsMap.get(date)!;
          entry.credits += log.amount;
          entry.messages += 1; // Cada log es un mensaje
        }
      });

      return Array.from(statsMap.values());
    }
  });
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Obtener logs de uso
      const { data: usageLogs, error } = await supabase
        .from('ah_usage_logs')
        .select('id')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching dashboard stats:', error);
        return { conversations: 0, messages: 0 };
      }

      // Obtener agentes del usuario para contar sus conversaciones
      // Método seguro: 2 pasos para evitar problemas de RLS complejos en joins automáticos
      const { data: agents } = await supabase
        .from('ah_agents')
        .select('id')
        .eq('user_id', user.id);

      let conversationCount = 0;
      const agentIds = agents?.map(a => a.id) || [];

      if (agentIds.length > 0) {
        const { count } = await supabase
          .from('ah_public_conversations')
          .select('*', { count: 'exact', head: true })
          .in('agent_id', agentIds);

        conversationCount = count || 0;
      }

      // Contar mensajes totales
      const totalMessages = usageLogs?.length || 0;

      return {
        conversations: conversationCount,
        messages: totalMessages
      };
    }
  });
}
