import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Agent, AgentObjective, AgentStatus } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

interface CreateAgentData {
  name: string;
  description?: string;
  objective: AgentObjective;
  tone?: string;
  personality?: string;
  system_prompt?: string;
  welcome_message?: string;
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

export function useAgents() {
  const { toast } = useToast();

  return useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agents')
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
    queryKey: ['agents', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agents')
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
        .from('agents')
        .insert({
          user_id: user.id,
          name: data.name,
          description: data.description,
          objective: data.objective,
          tone: data.tone,
          personality: data.personality,
          system_prompt: data.system_prompt,
          welcome_message: data.welcome_message,
        })
        .select()
        .single();

      if (error) throw error;
      return agent as Agent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      toast({
        title: 'Agent created!',
        description: 'Your new agent is ready to be configured.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error creating agent',
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
        .from('agents')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return agent as Agent;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      queryClient.invalidateQueries({ queryKey: ['agents', id] });
      toast({
        title: 'Agent updated',
        description: 'Changes saved successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error updating agent',
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
      const { error } = await supabase
        .from('agents')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      toast({
        title: 'Agent deleted',
        description: 'The agent has been removed.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error deleting agent',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
