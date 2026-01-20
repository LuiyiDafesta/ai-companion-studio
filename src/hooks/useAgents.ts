import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Agent, AgentObjective, AgentStatus } from '@/types/database';
import { useToast } from '@/hooks/use-toast';
import { getWebhookUrl } from '@/hooks/useWebhookUrl';

interface CreateAgentData {
  name: string;
  description?: string;
  objective: AgentObjective;
  tone?: string;
  personality?: string;
  system_prompt?: string;
  welcome_message?: string;
  widget_color?: string;
  widget_position?: string;
  status?: AgentStatus;
}

interface UpdateAgentData extends Partial<CreateAgentData> {
  status?: AgentStatus;
  widget_color?: string;
  widget_position?: string;
  avatar_url?: string;
  whatsapp_enabled?: boolean;
  whatsapp_number?: string;
  webchat_enabled?: boolean;
  tools?: string[];
}

// Función helper para llamar al webhook de embeddings
async function callEmbeddingsWebhook(action: 'create' | 'delete', agentId: string, agentName: string) {
  const webhookUrl = await getWebhookUrl('VITE_N8N_EMBEDDINGS_WEBHOOK_URL');

  if (!webhookUrl) {
    console.warn('VITE_N8N_EMBEDDINGS_WEBHOOK_URL not configured');
    // Si no está configurado, podemos decidir si fallar o simplemente ignorarlo.
    // Como era comportamiento original, retornamos.
    return;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        agentId,
        agentName,
        timestamp: new Date().toISOString()
      }),
    });

    if (!response.ok) {
      console.error(`Embeddings webhook error: ${response.status}`);
    } else {
      console.log(`✅ Embeddings table ${action}d for agent ${agentId}`);
    }
  } catch (error) {
    console.error('Error calling embeddings webhook:', error);
    // No lanzamos el error para no bloquear la creación/borrado del agente
  }
}

export function useAgents() {
  const { toast } = useToast();

  return useQuery({
    queryKey: ['ah_agents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ah_agents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        toast({
          title: 'Error loading agents',
          description: error.message,
          variant: 'destructive',
        });
        throw error;
      }

      return data as Agent[];
    },
  });
}

export function useAgent(id: string) {
  const { toast } = useToast();

  return useQuery({
    queryKey: ['ah_agents', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ah_agents')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        toast({
          title: 'Error loading agent',
          description: error.message,
          variant: 'destructive',
        });
        throw error;
      }

      return data as Agent;
    },
    enabled: !!id,
  });
}

export function useCreateAgent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateAgentData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: agent, error } = await supabase
        .from('ah_agents')
        .insert({
          user_id: user.id,
          name: data.name,
          description: data.description,
          objective: data.objective,
          tone: data.tone,
          personality: data.personality,
          system_prompt: data.system_prompt,
          welcome_message: data.welcome_message,
          widget_color: data.widget_color,
          widget_position: data.widget_position,
          status: data.status,
        })
        .select()
        .single();

      if (error) throw error;

      // Llamar al webhook de n8n en paralelo para crear la tabla de embeddings
      // No esperamos la respuesta para no bloquear la UI
      callEmbeddingsWebhook('create', agent.id, agent.name);

      return agent as Agent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ah_agents'] });
      toast({
        title: '¡Agente creado!',
        description: 'Tu nuevo agente está listo para configurar.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error al crear agente',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateAgent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateAgentData }) => {
      const { data: agent, error } = await supabase
        .from('ah_agents')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return agent as Agent;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['ah_agents'] });
      queryClient.invalidateQueries({ queryKey: ['ah_agents', id] });
      toast({
        title: 'Agente actualizado',
        description: 'Los cambios se guardaron correctamente.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error al actualizar agente',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteAgent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      // Primero obtenemos el nombre del agente para el log
      const { data: agent } = await supabase
        .from('ah_agents')
        .select('name')
        .eq('id', id)
        .single();

      // Llamar al webhook de n8n para borrar la tabla de embeddings
      // Lo hacemos ANTES de borrar el agente para tener el ID
      await callEmbeddingsWebhook('delete', id, agent?.name || 'unknown');

      const { error } = await supabase
        .from('ah_agents')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      toast({
        title: 'Agente eliminado',
        description: 'El agente y su tabla de embeddings han sido eliminados.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error al eliminar agente',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
