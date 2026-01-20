import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

export interface WebhookConfiguration {
    id: string;
    key: string;
    name: string;
    description: string;
    url: string;
    is_active: boolean;
    category: 'ai' | 'chat' | 'email' | 'general' | 'crm';
    created_at: string;
    updated_at: string;
}

export const useWebhooks = () => {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: webhooks, isLoading } = useQuery({
        queryKey: ['webhooks'],
        queryFn: async () => {
            // Intentar usar RPC primero
            const { data, error } = await supabase
                .rpc('get_all_webhooks');

            if (error) {
                console.error('Error fetching webhooks via RPC:', error);

                // Fallback: Intentar select directo 
                const { data: directData, error: directError } = await supabase
                    .from('webhook_configurations')
                    .select('*')
                    .order('category', { ascending: true });

                if (directError) {
                    console.error('Error fetching webhooks via Select:', directError);
                    return [];
                }

                return (directData as unknown as WebhookConfiguration[]) || [];
            }

            return (data as unknown as WebhookConfiguration[]) || [];
        },
    });

    const updateWebhook = useMutation({
        mutationFn: async ({ id, url, is_active }: { id: string; url: string; is_active?: boolean }) => {
            console.log('Updating webhook:', { id, url, is_active });

            const updates: any = {};
            // Solo agregar al objeto updates si el valor está definido, para no sobreescribir con undefined
            if (url !== undefined) updates.url = url;
            if (is_active !== undefined) updates.is_active = is_active;

            // Usar RPC segura para evitar problemas de RLS
            const { data, error } = await supabase
                .rpc('update_webhook_configuration', {
                    p_id: id,
                    p_url: url,
                    p_is_active: is_active
                });

            if (error) {
                console.error('Supabase Update Error:', error);
                throw error;
            }

            if (!data) {
                throw new Error("No se pudo actualizar (respuesta vacía).");
            }

            // RPC retorna json directamente, no necesita mapeo extra si coincide con la estructura
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['webhooks'] });
            toast({
                title: "Webhook updated",
                description: "The webhook configuration has been saved successfully.",
            });
        },
        onError: (error: any) => {
            console.error('Mutation error:', error);
            toast({
                title: "Error saving changes",
                description: error.message || error.details || "Could not update webhook. Check console for details.",
                variant: "destructive",
            });
        },
    });

    return {
        webhooks,
        isLoading,
        updateWebhook,
    };
};
