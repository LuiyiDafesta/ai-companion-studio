import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Search, Filter, User, Bot, Clock, Loader2, RefreshCw, CheckCircle, UserCheck, RotateCcw, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

interface Conversation {
  id: string;
  agent_id: string;
  visitor_id: string;
  visitor_name: string | null;
  visitor_email: string | null;
  status: string;
  created_at?: string;

  agent: {
    name: string;
    avatar_url: string | null;
  };
  messages: Message[];
}

const statusColors: Record<string, string> = {
  active: 'bg-primary/10 text-primary border-primary/20',
  resolved: 'bg-muted text-muted-foreground border-muted',
  closed: 'bg-muted text-muted-foreground border-muted',
  pending: 'bg-accent text-accent-foreground border-accent-foreground/20',
};

function formatTimeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Ahora';
  if (diffMins < 60) return `hace ${diffMins} min`;
  if (diffHours < 24) return `hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
  return `hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
}

function formatTime(dateString: string) {
  return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export const ConversationsPage = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ownerMessage, setOwnerMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (selectedConversation?.messages) {
      scrollToBottom();
    }
  }, [selectedConversation?.messages, selectedConversation?.id]);

  // Load conversations on mount and when user changes
  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    loadConversations(user.id);

    // Subscribe to new messages for real-time updates
    const channel = supabase
      .channel('public-messages-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ah_public_messages'
        },
        () => {
          loadConversations(user.id, true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const loadConversations = async (userId: string, silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      setError(null);

      // Get user's agents first
      const { data: userAgents, error: agentsError } = await supabase
        .from('ah_agents')
        .select('id')
        .eq('user_id', userId);

      if (agentsError) {
        console.error('Error fetching user agents:', agentsError);
        if (!silent) setError('Error al cargar agentes');
        return;
      }

      if (!userAgents || userAgents.length === 0) {
        setConversations([]);
        return;
      }

      const agentIds = userAgents.map(a => a.id);

      // Get conversations for user's agents
      const { data: convos, error: convError } = await supabase
        .from('ah_public_conversations')
        .select(`
          *,
          agent:ah_agents!ah_public_conversations_agent_id_fkey(name, avatar_url)
        `)
        .in('agent_id', agentIds);

      if (convError) {
        console.error('Error fetching conversations:', convError);
        if (!silent) setError('Error al cargar conversaciones');
        return;
      }

      // Get messages for each conversation
      const conversationsWithMessages = await Promise.all(
        (convos || []).map(async (convo: any) => {
          const { data: messages } = await supabase
            .from('ah_public_messages')
            .select('*')
            .eq('conversation_id', convo.id)
            .order('created_at', { ascending: true });

          return {
            ...convo,
            messages: messages || []
          };
        })
      );

      setConversations(conversationsWithMessages);

      // Update selected conversation with fresh data if it exists
      if (selectedConversation) {
        const updatedSelected = conversationsWithMessages.find((c: any) => c.id === selectedConversation.id);
        if (updatedSelected) {
          // Only update if messages length changed or status changed to avoid unnecessary re-renders
          if (updatedSelected.messages.length !== selectedConversation.messages.length ||
            updatedSelected.status !== selectedConversation.status) {
            setSelectedConversation(updatedSelected);
          }
        }
      } else if (conversationsWithMessages.length > 0 && !selectedConversation) {
        // Auto-select first conversation if none selected
        setSelectedConversation(conversationsWithMessages[0]);
      }
    } catch (err) {
      console.error('Error loading conversations:', err);
      // Don't show error on screen for background updates, just log
      if (!silent && !conversations.length) setError('Error inesperado');
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  // Poll for updates every 5 seconds as fallback
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      // Silent update
      loadConversations(user.id, true);
    }, 5000);

    return () => clearInterval(interval);
  }, [user, selectedConversation?.id]); // Add dependency to valid closure if needed, though loadConversations uses user.id directly

  const handleSelectConversation = (conv: Conversation) => {
    setSelectedConversation(conv);
    setOwnerMessage('');
  };

  // Update conversation status
  const updateConversationStatus = async (conversationId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('ah_public_conversations')
        .update({ status: newStatus })
        .eq('id', conversationId);

      if (error) {
        console.error('Error updating status:', error);
        return;
      }

      // Insert a notification message when status changes
      let notificationMessage = '';
      if (newStatus === 'human_takeover') {
        notificationMessage = '👤 Ahora estás hablando con un operador humano.';
      } else if (newStatus === 'active') {
        notificationMessage = '🤖 Has sido transferido al asistente virtual.';
      } else if (newStatus === 'resolved') {
        notificationMessage = '✅ Esta conversación ha sido marcada como resuelta.';
      }

      if (notificationMessage) {
        const { data: newMsg } = await supabase
          .from('ah_public_messages')
          .insert({
            conversation_id: conversationId,
            role: 'assistant',
            content: notificationMessage
          })
          .select()
          .single();

        // Update local state with new message
        if (newMsg && selectedConversation?.id === conversationId) {
          const updatedMessages = [...selectedConversation.messages, newMsg as Message];
          setSelectedConversation(prev => prev ? { ...prev, status: newStatus, messages: updatedMessages } : null);
          setConversations(prev =>
            prev.map(c => c.id === conversationId
              ? { ...c, status: newStatus, messages: updatedMessages }
              : c
            )
          );
          return; // Already updated, no need to continue
        }
      }

      // Update local state
      setConversations(prev =>
        prev.map(c => c.id === conversationId ? { ...c, status: newStatus } : c)
      );
      if (selectedConversation?.id === conversationId) {
        setSelectedConversation(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (err) {
      console.error('Error updating conversation status:', err);
    }
  };

  // Send message as owner (human takeover)
  const sendOwnerMessage = async () => {
    if (!selectedConversation || !ownerMessage.trim()) return;

    try {
      setIsSending(true);

      // Insert message as assistant (but from human)
      const { data: newMsg, error } = await supabase
        .from('ah_public_messages')
        .insert({
          conversation_id: selectedConversation.id,
          role: 'assistant',
          content: ownerMessage.trim()
        })
        .select()
        .single();

      if (error) {
        console.error('Error sending message:', error);
        return;
      }

      // Update local state
      const updatedMessages = [...selectedConversation.messages, newMsg as Message];
      setSelectedConversation(prev => prev ? { ...prev, messages: updatedMessages } : null);
      setConversations(prev =>
        prev.map(c => c.id === selectedConversation.id
          ? { ...c, messages: updatedMessages }
          : c
        )
      );
      setOwnerMessage('');
    } catch (err) {
      console.error('Error sending owner message:', err);
    } finally {
      setIsSending(false);
    }
  };

  const filteredConversations = conversations.filter(conv => {
    const query = search.toLowerCase();
    const matchesSearch =
      conv.agent.name.toLowerCase().includes(query) ||
      (conv.visitor_name?.toLowerCase() || '').includes(query) ||
      (conv.visitor_email?.toLowerCase() || '').includes(query);
    const matchesStatus = statusFilter === 'all' || conv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getLastMessage = (conv: Conversation) => {
    if (conv.messages.length === 0) return 'Sin mensajes';
    const lastMsg = conv.messages[conv.messages.length - 1];
    return lastMsg.content.length > 50 ? lastMsg.content.substring(0, 50) + '...' : lastMsg.content;
  };

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-8rem)]">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Conversaciones del Widget</h1>
            <p className="text-muted-foreground">
              Monitorea las conversaciones de visitantes con tus agentes
            </p>
          </div>
          <Button
            onClick={() => user && loadConversations(user.id)}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Actualizar
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-96">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-destructive">{error}</p>
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No hay conversaciones aún</h3>
              <p className="text-muted-foreground">
                Las conversaciones aparecerán aquí cuando los visitantes chateen con tus agentes.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100%-4rem)]">
            {/* Conversation List */}
            <Card className="bg-card lg:col-span-1 flex flex-col overflow-hidden max-h-full">
              <div className="p-4 border-b border-border space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar conversaciones..."
                    className="pl-10"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Filtrar por estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="active">Activa</SelectItem>
                    <SelectItem value="human_takeover">Atención Humana</SelectItem>
                    <SelectItem value="resolved">Resuelta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-2 space-y-2">
                  {filteredConversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => handleSelectConversation(conv)}
                      className={cn(
                        "w-full p-3 rounded-lg text-left transition-colors",
                        selectedConversation?.id === conv.id
                          ? "bg-primary/10 border border-primary/20"
                          : "hover:bg-muted/30"
                      )}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className="font-medium text-foreground">
                          {conv.visitor_name || 'Visitante Anónimo'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {conv.messages.length > 0
                            ? formatTimeAgo(conv.messages[conv.messages.length - 1].created_at)
                            : 'Sin fecha'}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate mb-2">{getLastMessage(conv)}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{conv.agent.name}</Badge>
                        <Badge variant="outline" className={cn("text-xs capitalize", statusColors[conv.status] || '')}>
                          {conv.status}
                        </Badge>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </Card>

            {/* Conversation Detail */}
            <Card className="bg-card lg:col-span-2 flex flex-col overflow-hidden max-h-full">
              {selectedConversation ? (
                <>
                  <div className="p-4 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {selectedConversation.visitor_name || 'Visitante Anónimo'}
                        </p>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{selectedConversation.agent.name}</Badge>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {selectedConversation.messages.length > 0
                              ? formatTimeAgo(selectedConversation.messages[0].created_at)
                              : 'Sin fecha'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Status Badge */}
                      <Badge
                        variant="outline"
                        className={cn("capitalize", statusColors[selectedConversation.status] || '')}
                      >
                        {selectedConversation.status === 'human_takeover' ? 'Humano' : selectedConversation.status}
                      </Badge>

                      {/* Action Buttons */}
                      {selectedConversation.status === 'active' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateConversationStatus(selectedConversation.id, 'human_takeover')}
                            className="gap-1 text-xs"
                          >
                            <UserCheck className="w-3 h-3" />
                            Tomar Control
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateConversationStatus(selectedConversation.id, 'resolved')}
                            className="gap-1 text-xs"
                          >
                            <CheckCircle className="w-3 h-3" />
                            Resolver
                          </Button>
                        </>
                      )}

                      {selectedConversation.status === 'human_takeover' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateConversationStatus(selectedConversation.id, 'active')}
                            className="gap-1 text-xs"
                          >
                            <RotateCcw className="w-3 h-3" />
                            Devolver al Agente
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateConversationStatus(selectedConversation.id, 'resolved')}
                            className="gap-1 text-xs"
                          >
                            <CheckCircle className="w-3 h-3" />
                            Resolver
                          </Button>
                        </>
                      )}

                      {selectedConversation.status === 'resolved' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateConversationStatus(selectedConversation.id, 'active')}
                          className="gap-1 text-xs"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Reabrir
                        </Button>
                      )}
                    </div>
                  </div>
                  <ScrollArea className="flex-1 p-4">
                    {selectedConversation.messages.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        No hay mensajes en esta conversación
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {selectedConversation.messages.map((message) => (
                          <div
                            key={message.id}
                            className={cn(
                              "flex gap-3",
                              message.role === 'assistant' && "flex-row-reverse"
                            )}
                          >
                            <div className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden",
                              message.role === 'user' ? "bg-primary text-primary-foreground" : "bg-primary/10"
                            )}>
                              {message.role === 'user' ? (
                                <span className="text-sm font-medium">
                                  {selectedConversation.visitor_name
                                    ? selectedConversation.visitor_name.charAt(0).toUpperCase()
                                    : '?'}
                                </span>
                              ) : (
                                selectedConversation.agent.avatar_url ? (
                                  <img
                                    src={selectedConversation.agent.avatar_url}
                                    alt={selectedConversation.agent.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <Bot className="w-4 h-4 text-primary" />
                                )
                              )}
                            </div>
                            <div className={cn(
                              "max-w-[70%] rounded-lg p-3",
                              message.role === 'user'
                                ? "bg-muted text-foreground"
                                : "bg-primary/10 text-foreground"
                            )}>
                              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                              <p className="text-xs text-muted-foreground mt-1">{formatTime(message.created_at)}</p>
                            </div>
                          </div>
                        ))}
                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </ScrollArea>

                  {/* Owner Message Input - Only visible in human_takeover mode */}
                  {selectedConversation.status === 'human_takeover' && (
                    <div className="p-4 border-t border-border">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Escribe tu respuesta como humano..."
                          value={ownerMessage}
                          onChange={(e) => setOwnerMessage(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              sendOwnerMessage();
                            }
                          }}
                          disabled={isSending}
                        />
                        <Button
                          onClick={sendOwnerMessage}
                          disabled={!ownerMessage.trim() || isSending}
                          size="icon"
                        >
                          {isSending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Send className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Estás respondiendo como humano. El agente IA está pausado para esta conversación.
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <CardContent className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">Selecciona una conversación para ver los mensajes</p>
                  </div>
                </CardContent>
              )}
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ConversationsPage;
