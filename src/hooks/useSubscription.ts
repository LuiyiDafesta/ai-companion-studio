import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type SubscriptionPlan = 'free' | 'pro' | 'business';

export interface Subscription {
    id: string;
    user_id: string;
    plan_type: SubscriptionPlan;
    status: string;
    current_period_end: string | null;
}

export const PLAN_LIMITS = {
    free: {
        agents: 1,
        rag_enabled: true, // Now enabled but limited by credits
        credits_per_month: 50,
        label: 'Free'
    },
    pro: {
        agents: 3,
        rag_enabled: true,
        credits_per_month: 500,
        label: 'Pro'
    },
    business: {
        agents: 5,
        rag_enabled: true,
        credits_per_month: 2000,
        label: 'Business'
    }
};

export function useSubscription() {
    const { toast } = useToast();

    return useQuery({
        queryKey: ['subscription'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            // Verificar rol de admin
            const { data: roleData } = await supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', user.id)
                .maybeSingle();

            // Si es admin, forzar plan Business
            if (roleData?.role === 'admin') {
                return {
                    id: 'admin-override',
                    user_id: user.id,
                    plan_type: 'business',
                    status: 'active',
                    current_period_end: null
                } as Subscription;
            }

            const { data, error } = await supabase
                .from('ah_subscriptions')
                .select('*')
                .eq('user_id', user.id)
                .maybeSingle();

            if (error) {
                console.error('Error fetching subscription:', error);
            }

            // Default to free if no subscription found
            if (!data) {
                return {
                    id: 'temp',
                    user_id: user.id,
                    plan_type: 'free',
                    status: 'active',
                    current_period_end: null
                } as Subscription;
            }

            return data as Subscription;
        },
    });
}
