import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppRole } from '@/types/database';

export function useUserRole() {
  return useQuery({
    queryKey: ['user-role'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (error) throw error;

      const roles = data?.map(r => r.role as AppRole) || [];
      return {
        roles,
        isAdmin: roles.includes('admin'),
        isModerator: roles.includes('moderator'),
        isUser: roles.includes('user'),
      };
    },
  });
}
