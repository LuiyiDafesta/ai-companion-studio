import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AdminUser {
    id: string;
    user_id: string;
    email: string;
    full_name: string | null;
    role: 'admin' | 'moderator' | 'user';
    credits_balance: number;
    agents_count: number;
    created_at: string;
}

export function useAdminUsers() {
    const { toast } = useToast();

    return useQuery({
        queryKey: ['admin-users'],
        queryFn: async () => {
            const { data, error } = await (supabase.rpc as any)('get_admin_users');

            if (error) {
                toast({
                    title: 'Error loading users',
                    description: error.message,
                    variant: 'destructive',
                });
                throw error;
            }

            // Map response to internal AdminUser type
            // Note: SQL returns 'credit_balance', Frontend expects 'credits_balance'
            return (data as any[]).map(user => ({
                id: user.id || user.user_id, // Fallback if id missing
                user_id: user.user_id,
                email: user.email,
                full_name: user.full_name,
                role: user.role,
                credits_balance: user.credit_balance,
                agents_count: user.agents_count,
                created_at: user.created_at,
            })) as AdminUser[];
        },
    });
}

export function useAdminStats() {
    const { toast } = useToast();

    return useQuery({
        queryKey: ['admin-stats'],
        queryFn: async () => {
            const { data, error } = await (supabase.rpc as any)('get_admin_overview');

            if (error) {
                console.error('Error fetching admin stats:', error);
                throw error;
            }

            // The RPC returns a JSON object with all data
            const stats = data as any;

            return {
                totalUsers: stats.totalUsers || 0,
                totalAgents: stats.totalAgents || 0,
                activeAgents: stats.activeAgents || 0,
                draftAgents: stats.draftAgents || 0,
                totalConversations: stats.totalConversations || 0,
                totalMessages: stats.totalMessages || 0,
                totalTokens: stats.totalTokens || 0,
                totalCreditsUsed: stats.totalCreditsUsed || 0,
                totalCreditsPurchased: 0,
                recentProfiles: stats.recentUsers || [],
                recentAgents: stats.recentAgents || [],
                topAgents: stats.topAgents || [],
            };
        },
    });
}

export function useAdminUserAgents(userId: string | null) {
    const { toast } = useToast();

    return useQuery({
        queryKey: ['admin-user-agents', userId],
        queryFn: async () => {
            if (!userId) return [];

            const { data, error } = await (supabase.rpc as any)('get_admin_user_agents', {
                target_user_id: userId
            });

            if (error) {
                console.error('Error fetching user agents:', error);
                toast({
                    title: 'Error loading user agents',
                    description: error.message,
                    variant: 'destructive',
                });
                throw error;
            }

            return data as {
                id: string;
                name: string;
                description: string | null;
                status: string;
                avatar_url: string | null;
                created_at: string;
                conversations_count: number;
            }[];
        },
        enabled: !!userId,
    });
}
