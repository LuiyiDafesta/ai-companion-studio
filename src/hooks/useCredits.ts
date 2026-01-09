import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Credits, CreditTransaction } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

export function useCredits() {
  const { toast } = useToast();

  return useQuery({
    queryKey: ['credits'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('credits')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        toast({
          title: 'Error loading credits',
          description: error.message,
          variant: 'destructive',
        });
        throw error;
      }

      return data as Credits;
    },
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
