import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Message {
    id: string;
    conversation_id: string;
    role: string;
    content: string;
    tokens: number | null;
    created_at: string;
}

export interface Conversation {
    id: string;
    agent_id: string;
    agent_name: string;
    user_id: string;
    channel: string;
    visitor_name: string | null;
    visitor_email: string | null;
    visitor_phone: string | null;
    status: string;
    messages_count: number | null;
    tokens_used: number | null;
    started_at: string;
    ended_at: string | null;
    messages: Message[];
}

export function useConversations() {
    const { toast } = useToast();

    return useQuery({
        queryKey: ['ah_conversations'],
        queryFn: async () => {
            // Get conversations with agent info
            const { data: conversations, error: convError } = await supabase
                .from('ah_conversations')
                .select('*')
                .order('started_at', { ascending: false });

            if (convError) {
                toast({
                    title: 'Error loading conversations',
                    description: convError.message,
                    variant: 'destructive',
                });
                throw convError;
            }

            if (!conversations || conversations.length === 0) {
                return [];
            }

            // Get agent names
            const agentIds = [...new Set(conversations.map(c => c.agent_id))];
            const { data: agents, error: agentsError } = await supabase
                .from('ah_agents')
                .select('id, name')
                .in('id', agentIds);

            if (agentsError) {
                throw agentsError;
            }

            const agentMap: Record<string, string> = {};
            agents?.forEach(a => {
                agentMap[a.id] = a.name;
            });

            // Get messages for each conversation
            const conversationIds = conversations.map(c => c.id);
            const { data: messages, error: messagesError } = await supabase
                .from('ah_messages')
                .select('*')
                .in('conversation_id', conversationIds)
                .order('created_at', { ascending: true });

            if (messagesError) {
                throw messagesError;
            }

            // Group messages by conversation
            const messageMap: Record<string, Message[]> = {};
            messages?.forEach(m => {
                if (!messageMap[m.conversation_id]) {
                    messageMap[m.conversation_id] = [];
                }
                messageMap[m.conversation_id].push(m);
            });

            // Merge data
            const result: Conversation[] = conversations.map(conv => ({
                ...conv,
                agent_name: agentMap[conv.agent_id] || 'Unknown Agent',
                messages: messageMap[conv.id] || [],
            }));

            return result;
        },
    });
}

export function useConversation(id: string) {
    const { toast } = useToast();

    return useQuery({
        queryKey: ['ah_conversations', id],
        queryFn: async () => {
            const { data: conversation, error: convError } = await supabase
                .from('ah_conversations')
                .select('*')
                .eq('id', id)
                .single();

            if (convError) {
                toast({
                    title: 'Error loading conversation',
                    description: convError.message,
                    variant: 'destructive',
                });
                throw convError;
            }

            // Get agent name
            const { data: agent } = await supabase
                .from('ah_agents')
                .select('name')
                .eq('id', conversation.agent_id)
                .single();

            // Get messages
            const { data: messages, error: messagesError } = await supabase
                .from('ah_messages')
                .select('*')
                .eq('conversation_id', id)
                .order('created_at', { ascending: true });

            if (messagesError) {
                throw messagesError;
            }

            return {
                ...conversation,
                agent_name: agent?.name || 'Unknown Agent',
                messages: messages || [],
            } as Conversation;
        },
        enabled: !!id,
    });
}
