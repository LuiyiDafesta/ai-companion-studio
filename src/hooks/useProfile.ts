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

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        toast({
          title: 'Error loading profile',
          description: error.message,
          variant: 'destructive',
        });
        throw error;
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
        .from('profiles')
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
