import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Document, DocumentType } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

interface CreateDocumentData {
  name: string;
  type: DocumentType;
  url?: string;
  file_path?: string;
  file_size?: number;
  agent_id?: string;
}

export function useDocuments(agentId?: string) {
  const { toast } = useToast();

  return useQuery({
    queryKey: ['documents', agentId],
    queryFn: async () => {
      let query = supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (agentId) {
        query = query.eq('agent_id', agentId);
      }

      const { data, error } = await query;

      if (error) {
        toast({
          title: 'Error loading documents',
          description: error.message,
          variant: 'destructive',
        });
        throw error;
      }

      return data as Document[];
    },
  });
}

export function useCreateDocument() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateDocumentData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: document, error } = await supabase
        .from('documents')
        .insert({
          user_id: user.id,
          name: data.name,
          type: data.type,
          url: data.url,
          file_path: data.file_path,
          file_size: data.file_size,
          agent_id: data.agent_id,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;
      return document as Document;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast({
        title: 'Document added',
        description: 'Processing will begin shortly.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error adding document',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast({
        title: 'Document deleted',
        description: 'The document has been removed.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error deleting document',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useRetryDocument() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('documents')
        .update({ status: 'pending', error_message: null })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Document;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast({
        title: 'Retrying...',
        description: 'Document will be processed again.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error retrying document',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
