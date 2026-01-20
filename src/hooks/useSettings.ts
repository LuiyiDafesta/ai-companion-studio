import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface UserSettings {
    id: string;
    user_id: string;
    email_welcome: boolean;
    email_new_message: boolean;
    email_low_credits: boolean;
    email_marketing: boolean;
    email_weekly_report: boolean;
    low_credits_threshold: number;
}

export const useSettings = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: settings, isLoading } = useQuery({
        queryKey: ['user-settings', user?.id],
        queryFn: async () => {
            if (!user?.id) return null;

            const { data, error } = await supabase
                .from('user_settings')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (error) {
                // If settings don't exist, try to create them
                if (error.code === 'PGRST116') {
                    const { data: newData, error: createError } = await supabase
                        .from('user_settings')
                        .insert({
                            user_id: user.id,
                            email_welcome: true,
                            email_new_message: true,
                            email_low_credits: true,
                            email_marketing: false, // Default to false for marketing
                            email_weekly_report: false,
                            low_credits_threshold: 50
                        })
                        .select()
                        .single();

                    if (createError) throw createError;
                    return newData as UserSettings;
                }
                throw error;
            }

            return data as UserSettings;
        },
        enabled: !!user?.id,
    });

    const updateSettings = useMutation({
        mutationFn: async (newSettings: Partial<UserSettings>) => {
            if (!user?.id) throw new Error('No user');

            // Use upsert to handle cases where settings might not exist yet
            const { data, error } = await supabase
                .from('user_settings')
                .upsert({
                    user_id: user.id,
                    ...newSettings,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['user-settings', user?.id] });
            toast({
                title: 'Configuración actualizada',
                description: 'Tus preferencias se han guardado correctamente.',
            });
        },
        onError: (error) => {
            console.error('Error updating settings:', error);
            toast({
                title: 'Error',
                description: 'No se pudo actualizar la configuración.',
                variant: 'destructive',
            });
        },
    });

    return {
        settings,
        isLoading,
        updateSettings,
    };
};
