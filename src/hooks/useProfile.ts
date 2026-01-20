import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

interface UpdateProfileData {
  full_name?: string;
  company_name?: string;
  company_website?: string;
  phone?: string;
  avatar_url?: string;
}

export function useProfile() {
  const { toast } = useToast();

  return useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Intentar obtener perfil existente
      const { data, error } = await supabase
        .from('ah_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        toast({
          title: 'Error loading profile',
          description: error.message,
          variant: 'destructive',
        });
        throw error;
      }

      // Si no existe el perfil, crearlo
      if (!data) {
        const { data: newProfile, error: createError } = await supabase
          .from('ah_profiles')
          .insert({ user_id: user.id, email: user.email })
          .select()
          .single();

        if (createError) {
          console.error('Error creating profile:', createError);
          throw createError;
        }
        return newProfile as Profile;
      }

      return data as Profile;
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: UpdateProfileData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile, error } = await supabase
        .from('ah_profiles')
        .update(data)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return profile as Profile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast({
        title: 'Profile updated',
        description: 'Your changes have been saved.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error updating profile',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
