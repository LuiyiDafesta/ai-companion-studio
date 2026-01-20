import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, MessageSquare, User, Mail, Calendar, RefreshCw } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface Conversation {
    id: string;
    agent_id: string;
    visitor_id: string;
    visitor_name: string | null;
    visitor_email: string | null;
    status: string;
    created_at: string;
    updated_at: string;
    agent: {
        name: string;
        avatar_url: string | null;
    };
    last_message?: {
        content: string;
        role: string;
        created_at: string;
    };
}

interface Message {
    id: string;
    conversation_id: string;
    role: 'user' | 'assistant';
    content: string;
    created_at: string;
}

export default function ConversationsPage() {
    const { t } = useLanguage();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);

    // Load conversations
    useEffect(() => {
        loadConversations();

        // Subscribe to new messages
        const channel = supabase
            .channel('public-messages')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'ah_public_messages'
                },
                () => {
                    loadConversations();
                    if (selectedConversation) {
                        loadMessages(selectedConversation.id);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const loadConversations = async () => {
        try {
            setIsLoading(true);

            // Get current user
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // First, get user's agents
            const { data: userAgents, error: agentsError } = await supabase
                .from('ah_agents')
                .select('id')
                .eq('user_id', user.id);

            if (agentsError) {
                console.error('Error fetching user agents:', agentsError);
                setConversations([]);
                return;
            }

            if (!userAgents || userAgents.length === 0) {
                // User has no agents, no conversations to show
                setConversations([]);
                return;
            }

            const agentIds = userAgents.map(a => a.id);

            // Get conversations ONLY for user's agents with last message
            const { data: convos, error } = await supabase
                .from('ah_public_conversations')
                .select(`
          *,
          agent:ah_agents!ah_public_conversations_agent_id_fkey(name, avatar_url)
        `)
                .in('agent_id', agentIds)
                .order('updated_at', { ascending: false });

            if (error) throw error;

            // Fetch last message for each conversation
            const conversationsWithMessages = await Promise.all(
                (convos || []).map(async (convo: any) => {
                    const { data: lastMsg } = await supabase
                        .from('ah_public_messages')
                        .select('content, role, created_at')
                        .eq('conversation_id', convo.id)
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .single();

                    return {
                        ...convo,
                        last_message: lastMsg
                    };
                })
            );

            setConversations(conversationsWithMessages);
        } catch (error) {
            console.error('Error loading conversations:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadMessages = async (conversationId: string) => {
        try {
            setIsLoadingMessages(true);

            const { data, error } = await supabase
                .from('ah_public_messages')
                .select('*')
                .eq('conversation_id', conversationId)
                .order('created_at', { ascending: true });

            if (error) throw error;
            setMessages(data || []);
        } catch (error) {
            console.error('Error loading messages:', error);
        } finally {
            setIsLoadingMessages(false);
        }
    };

    const handleSelectConversation = (conversation: Conversation) => {
        setSelectedConversation(conversation);
        loadMessages(conversation.id);
    };

    const filteredConversations = conversations.filter(convo => {
        const query = searchQuery.toLowerCase();
        return (
            convo.visitor_name?.toLowerCase().includes(query) ||
            convo.visitor_email?.toLowerCase().includes(query) ||
            convo.agent.name.toLowerCase().includes(query)
        );
    });

    return (
        <DashboardLayout>
            <div className="h-[calc(100vh-4rem)] flex flex-col">
                {/* Header */}
                <div className="p-6 border-b">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold">Conversaciones del Widget</h1>
                            <p className="text-muted-foreground mt-1">
                                Monitorea y gestiona las conversaciones de tus visitantes
                            </p>
                        </div>
                        <Button
                            onClick={loadConversations}
                            variant="outline"
                            size="sm"
                            className="gap-2"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Actualizar
                        </Button>
                    </div>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Conversations List - Left Sidebar */}
                    <div className="w-96 border-r flex flex-col">
                        <div className="p-4 border-b">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar conversaciones..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>

                        <ScrollArea className="flex-1">
                            {isLoading ? (
                                <div className="p-4 text-center text-muted-foreground">
                                    Cargando conversaciones...
                                </div>
                            ) : filteredConversations.length === 0 ? (
                                <div className="p-8 text-center">
                                    <MessageSquare className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                                    <p className="text-muted-foreground">No hay conversaciones aún</p>
                                </div>
                            ) : (
                                <div className="divide-y">
                                    {filteredConversations.map((convo) => (
                                        <button
                                            key={convo.id}
                                            onClick={() => handleSelectConversation(convo)}
                                            className={`w-full p-4 text-left hover:bg-muted/50 transition-colors ${selectedConversation?.id === convo.id ? 'bg-muted' : ''
                                                }`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                                    <User className="w-5 h-5 text-primary" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <p className="font-medium truncate">
                                                            {convo.visitor_name || 'Visitante Anónimo'}
                                                        </p>
                                                        <Badge variant="outline" className="text-xs">
                                                            {convo.agent.name}
                                                        </Badge>
                                                    </div>
                                                    {convo.visitor_email && (
                                                        <p className="text-xs text-muted-foreground truncate mb-1">
                                                            {convo.visitor_email}
                                                        </p>
                                                    )}
                                                    {convo.last_message && (
                                                        <p className="text-sm text-muted-foreground truncate">
                                                            {convo.last_message.content}
                                                        </p>
                                                    )}
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        {formatDistanceToNow(new Date(convo.updated_at), {
                                                            addSuffix: true,
                                                            locale: es
                                                        })}
                                                    </p>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </div>

                    {/* Messages Panel - Right Side */}
                    <div className="flex-1 flex flex-col">
                        {selectedConversation ? (
                            <>
                                {/* Conversation Header */}
                                <div className="p-4 border-b">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                                            <User className="w-6 h-6 text-primary" />
                                        </div>
                                        <div className="flex-1">
                                            <h2 className="font-semibold text-lg">
                                                {selectedConversation.visitor_name || 'Visitante Anónimo'}
                                            </h2>
                                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                {selectedConversation.visitor_email && (
                                                    <span className="flex items-center gap-1">
                                                        <Mail className="w-3 h-3" />
                                                        {selectedConversation.visitor_email}
                                                    </span>
                                                )}
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    {new Date(selectedConversation.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                        <Badge variant={selectedConversation.status === 'active' ? 'default' : 'secondary'}>
                                            {selectedConversation.status}
                                        </Badge>
                                    </div>
                                </div>

                                {/* Messages */}
                                <ScrollArea className="flex-1 p-4">
                                    {isLoadingMessages ? (
                                        <div className="text-center text-muted-foreground">
                                            Cargando mensajes...
                                        </div>
                                    ) : (
                                        <div className="space-y-4 max-w-3xl mx-auto">
                                            {messages.map((message) => (
                                                <div
                                                    key={message.id}
                                                    className={`flex ${message.role === 'assistant' ? 'justify-start' : 'justify-end'}`}
                                                >
                                                    <div
                                                        className={`max-w-[70%] rounded-lg p-3 ${message.role === 'user'
                                                            ? 'bg-primary text-primary-foreground'
                                                            : 'bg-muted'
                                                            }`}
                                                    >
                                                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                                                        <p className="text-xs opacity-70 mt-1">
                                                            {new Date(message.created_at).toLocaleTimeString([], {
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            })}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </ScrollArea>
                            </>
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-muted-foreground">
                                <div className="text-center">
                                    <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
                                    <p className="text-lg">Selecciona una conversación para ver los mensajes</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
