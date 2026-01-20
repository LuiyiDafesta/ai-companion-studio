import { useState, useRef, useEffect } from 'react';
import {
    Send,
    Bot,
    User,
    Loader2,
    MessageSquare,
    Database,
    Sparkles,
    RefreshCw,
    Trash2,
    AlertTriangle
} from 'lucide-react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useAgents } from '@/hooks/useAgents';
import { useCredits, useConsumeCredits } from '@/hooks/useCredits';
import { useProfile } from '@/hooks/useProfile';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { getWebhookUrl } from '@/hooks/useWebhookUrl';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    sources?: string[];
}

export const PlaygroundPage = () => {
    const { data: agents, isLoading: loadingAgents } = useAgents();
    const { data: profile } = useProfile();
    const { toast } = useToast();
    const { t } = useLanguage();

    // Hooks de créditos
    const { data: creditsData } = useCredits();
    const consumeCredits = useConsumeCredits();

    const [selectedAgentId, setSelectedAgentId] = useState<string>('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [clearDialogOpen, setClearDialogOpen] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const selectedAgent = agents?.find(a => a.id === selectedAgentId);

    // Generar Session ID único por usuario y agente (determinístico para mantener memoria)
    const sessionId = selectedAgentId && profile?.id
        ? `${selectedAgentId}_${profile.id}`
        : '';

    // Cargar historial cuando se selecciona un agente
    const cleanAgentResponse = (text: string): string => {
        if (!text) return '';

        // Remover [Used tools: Tool: ... Result: [...]] pattern completo
        let cleaned = text.replace(/\[Used tools:[\s\S]*?Result:[\s\S]*?\]\s*/g, '');

        // Remover [Used tools: ...] sin Result
        cleaned = cleaned.replace(/\[Used tools:.*?\]/gs, '');

        // Remover JSON objects que empiezan con {"type":"text"
        cleaned = cleaned.replace(/\{"type":"text"[\s\S]*?\}/g, '');

        // Remover JSON objects que empiezan con {"pageContent"
        cleaned = cleaned.replace(/\{"pageContent":[\s\S]*?"\}/g, '');

        // Remover metadata patterns como "metadata":{...}
        cleaned = cleaned.replace(/"metadata":\{[^}]*\}/g, '');

        // Remover Result: seguido de arrays JSON
        cleaned = cleaned.replace(/Result:\s*\[[\s\S]*?\]\s*/g, '');

        // Remover Input: patterns
        cleaned = cleaned.replace(/Input:\s*"[^"]*"/g, '');

        // Remover Tool: patterns
        cleaned = cleaned.replace(/Tool:\s*\w+,?\s*/g, '');

        // Limpiar caracteres escapados
        cleaned = cleaned.replace(/\\n/g, '\n');
        cleaned = cleaned.replace(/\\"/g, '"');

        // Remover corchetes y llaves sueltas al inicio
        cleaned = cleaned.replace(/^[\[\]\{\},\s]+/g, '');

        // Remover corchetes y llaves sueltas al final
        cleaned = cleaned.replace(/[\[\]\{\},\s]+$/g, '');

        // Limpiar múltiples saltos de línea y espacios
        cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
        cleaned = cleaned.replace(/\s{3,}/g, '  ');

        return cleaned.trim();
    };

    // Cargar historial cuando se selecciona un agente
    const loadHistory = async (currentSessionId: string) => {
        const webhookUrl = await getWebhookUrl('VITE_N8N_GET_HISTORY_WEBHOOK_URL');
        if (!webhookUrl) return;

        setIsLoadingHistory(true);
        try {
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ agentId: currentSessionId }), // Usar el ID pasado como argumento
            });

            if (!response.ok) throw new Error('Error al cargar historial');

            const data = await response.json();
            console.log('Historial cargado:', data);

            // Parsear mensajes del historial
            const historyMessages: Message[] = [];
            const records = Array.isArray(data) ? data : (data[0] ? [data[0]] : []);

            for (const record of records) {
                const msgData = typeof record.message === 'string'
                    ? JSON.parse(record.message)
                    : record.message;

                if (msgData && msgData.content) {
                    // Limpiar el contenido de metadata si es del asistente
                    const content = msgData.type === 'ai'
                        ? cleanAgentResponse(msgData.content)
                        : msgData.content;

                    historyMessages.push({
                        id: record.id?.toString() || Date.now().toString(),
                        role: msgData.type === 'human' ? 'user' : 'assistant',
                        content: content,
                        timestamp: new Date(record.created_at || Date.now()),
                    });
                }
            }

            setMessages(historyMessages);
        } catch (error) {
            console.error('Error loading history:', error);
        } finally {
            setIsLoadingHistory(false);
        }
    };

    // Cargar historial cuando cambia el agente
    useEffect(() => {
        if (sessionId && selectedAgentId) {
            loadHistory(sessionId);
        }
    }, [sessionId, selectedAgentId]);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    // Función para simular escritura humana dividiendo la respuesta
    const typeMessageHumanLike = async (fullContent: string, sources: string[] = []) => {
        // Dividir por oraciones (. ! ?) pero mantener el separador
        const sentences = fullContent.match(/[^.!?]+[.!?]+/g) || [fullContent];

        // Agrupar oraciones de 2-3 para que sea más natural
        const chunks: string[] = [];
        let currentChunk = '';

        for (let i = 0; i < sentences.length; i++) {
            currentChunk += sentences[i];

            // Agrupar cada 2-3 oraciones, o si es la última
            const sentencesInChunk = (currentChunk.match(/[.!?]/g) || []).length;
            const isLast = i === sentences.length - 1;

            if (sentencesInChunk >= 2 || isLast) {
                chunks.push(currentChunk.trim());
                currentChunk = '';
            }
        }

        // Filtrar chunks vacíos
        const filteredChunks = chunks.filter(c => c.trim());

        for (let i = 0; i < filteredChunks.length; i++) {
            const chunk = filteredChunks[i].trim();
            if (!chunk) continue;

            // Mostrar indicador de "escribiendo..." antes de cada mensaje
            if (i > 0) {
                setIsLoading(true);
                // Delay aleatorio entre 800ms y 1800ms
                await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1000));
                setIsLoading(false);
            }

            const messageId = `${Date.now()}_${i}`;
            const isLastChunk = i === filteredChunks.length - 1;

            setMessages(prev => [...prev, {
                id: messageId,
                role: 'assistant' as const,
                content: chunk,
                timestamp: new Date(),
                sources: isLastChunk ? sources : undefined,
            }]);

            // Scroll después de cada mensaje
            if (scrollRef.current) {
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }

            // Pequeño delay antes del siguiente chunk
            if (!isLastChunk) {
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        }
    };

    const handleClearChatClick = () => {
        setClearDialogOpen(true);
    };

    const handleConfirmClearChat = async () => {
        setClearDialogOpen(false);
        if (!sessionId) return;

        setMessages([]);

        try {
            const webhookUrl = await getWebhookUrl('VITE_N8N_CLEAR_HISTORY_WEBHOOK_URL');
            if (webhookUrl) {
                const response = await fetch(webhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ agentId: sessionId }),
                });

                if (!response.ok) {
                    throw new Error(`Error ${response.status}: ${await response.text()}`);
                }

                toast({
                    title: "Chat limpiado",
                    description: "El historial de conversación ha sido eliminado correctamente.",
                });
            }
        } catch (error) {
            console.error('Error clearing history:', error);
            toast({
                title: "Error",
                description: "No se pudo eliminar el historial.",
                variant: "destructive"
            });
        }
    };

    const handleSendMessage = async () => {
        if (!inputMessage.trim() || !selectedAgentId || !sessionId) return;

        // Optimistic check: only block if explicitly 0 (and not loading/undefined)
        // Admin bypass in hook takes a moment, so undefined should pass.
        // Also, the backend/mutation will enforce the hard limit.
        const currentBalance = creditsData?.balance;

        // Block only if we strictly know balance is < 1 (and not loading, i.e., not undefined)
        // However, if it returns 0 for admin due to glitch, we are stuck.
        // Let's rely on consumeCredits throwing error if real balance is low.
        // But consumeCredits is called AFTER response currently? 
        // No, we should check before.

        // Better: Disable check here if we trust the mutation or check subscription.
        // For now, let's keep it but handle the 'admin' case explicitly if possible or just relax it.

        if (currentBalance !== undefined && currentBalance < 1) {
            // Fallback: check if subscription is 'admin-override' or 'business' which implies high limits
            // But we don't have sub here easily access without another hook call.
            // Let's just trust the user if they say they are admin, maybe 'creditsData' is just 0.

            // Check if useCredits returned the bypass value (999999). 
            // If it returned 0, it means the hook didn't see them as admin.

            toast({
                title: "Sin créditos",
                description: "No tienes suficientes créditos. (Si eres admin, verifica tu rol en ah_profiles)",
                variant: "destructive"
            });
            return;
        }

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: inputMessage.trim(),
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMessage]);
        setInputMessage('');
        setIsLoading(true);

        try {
            const webhookUrl = await getWebhookUrl('VITE_N8N_CHAT_WEBHOOK_URL');

            if (!webhookUrl) {
                throw new Error('VITE_N8N_CHAT_WEBHOOK_URL no está configurada');
            }

            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    agentId: sessionId, // Usar sessionId para mantener memoria por usuario
                    agentName: selectedAgent?.name,
                    tableName: `embeddings_${selectedAgentId.split('-').join('_')}`,
                    message: userMessage.content,
                    systemPrompt: selectedAgent?.system_prompt || '',
                    history: messages.slice(-10).map(m => ({
                        role: m.role,
                        content: m.content
                    })),
                }),
            });

            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }

            const data = await response.json();
            console.log('Respuesta del agente:', data);

            // Consumir 1 crédito por mensaje exitoso
            consumeCredits.mutate({
                amount: 1,
                type: 'chat_message',
                description: 'Mensaje de chat',
                metadata: { agent_id: selectedAgentId, session_id: sessionId }
            });

            // Obtener el contenido de la respuesta
            let fullContent = data.output || data.response || data.message || data[0]?.output || data[0]?.response || 'Sin respuesta';

            // Limpiar el contenido de metadata de herramientas
            fullContent = cleanAgentResponse(fullContent);

            const sources = data.sources || [];

            setIsLoading(false);

            // Usar efecto de escritura humana
            await typeMessageHumanLike(fullContent, sources);

        } catch (error) {
            console.error('Error sending message:', error);
            toast({
                title: 'Error al enviar mensaje',
                description: error instanceof Error ? error.message : 'No se pudo conectar con el agente',
                variant: 'destructive',
            });
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };



    const formatTime = (date: Date) => {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <DashboardLayout>
            <div className="h-[calc(100vh-8rem)]">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                            <Sparkles className="w-6 h-6 text-primary" />
                            Playground
                        </h1>
                        <p className="text-muted-foreground">
                            Prueba tus agentes con RAG en tiempo real
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100%-5rem)]">
                    {/* Sidebar - Agent Selection */}
                    <Card className="bg-card lg:col-span-1">
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <Bot className="w-4 h-4" />
                                Seleccionar Agente
                            </CardTitle>
                            <CardDescription>
                                Elige un agente con documentos indexados
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Select
                                value={selectedAgentId}
                                onValueChange={(value) => {
                                    setSelectedAgentId(value);
                                    setMessages([]);
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecciona un agente" />
                                </SelectTrigger>
                                <SelectContent>
                                    {loadingAgents ? (
                                        <SelectItem value="loading\" disabled>
                                            Cargando...
                                        </SelectItem>
                                    ) : agents && agents.length > 0 ? (
                                        agents.map((agent) => (
                                            <SelectItem key={agent.id} value={agent.id}>
                                                {agent.name}
                                            </SelectItem>
                                        ))
                                    ) : (
                                        <SelectItem value="none" disabled>
                                            No hay agentes
                                        </SelectItem>
                                    )}
                                </SelectContent>
                            </Select>

                            {selectedAgent && (
                                <div className="space-y-3 pt-4 border-t">
                                    <div>
                                        <p className="text-sm font-medium">Agente</p>
                                        <p className="text-sm text-muted-foreground">{selectedAgent.name}</p>
                                    </div>
                                    {selectedAgent.description && (
                                        <div>
                                            <p className="text-sm font-medium">Descripción</p>
                                            <p className="text-sm text-muted-foreground line-clamp-3">
                                                {selectedAgent.description}
                                            </p>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2">
                                        <Database className="w-4 h-4 text-muted-foreground" />
                                        <span className="text-sm text-muted-foreground">
                                            Base: embeddings_{selectedAgentId.split('-')[0]}...
                                        </span>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full"
                                        onClick={handleClearChatClick}
                                    >
                                        <RefreshCw className="w-4 h-4 mr-2" />
                                        Limpiar Chat
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Chat Area */}
                    <Card className="bg-card lg:col-span-3 flex flex-col h-full overflow-hidden">
                        {selectedAgentId ? (
                            <>
                                {/* Chat Header */}
                                <div className="p-4 border-b border-border flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                                            {selectedAgent?.avatar_url ? (
                                                <img
                                                    src={selectedAgent.avatar_url}
                                                    alt={selectedAgent.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <Bot className="w-5 h-5 text-primary" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-medium text-foreground">{selectedAgent?.name}</p>
                                            <Badge
                                                variant="outline"
                                                className={cn(
                                                    "text-xs",
                                                    selectedAgent?.status === 'active' && "border-green-500 text-green-600",
                                                    selectedAgent?.status === 'paused' && "border-yellow-500 text-yellow-600",
                                                    selectedAgent?.status === 'draft' && "border-gray-500 text-gray-600",
                                                    selectedAgent?.status === 'archived' && "border-red-500 text-red-600"
                                                )}
                                            >
                                                {selectedAgent?.status === 'active' && '🟢 Activo'}
                                                {selectedAgent?.status === 'paused' && '🟡 Pausado'}
                                                {selectedAgent?.status === 'draft' && '⚪ Borrador'}
                                                {selectedAgent?.status === 'archived' && '🔴 Archivado'}
                                            </Badge>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={handleClearChatClick}
                                        title="Limpiar chat (borrará la memoria)"
                                    >
                                        <Trash2 className="w-5 h-5 text-muted-foreground hover:text-destructive transition-colors" />
                                    </Button>
                                </div>

                                {/* Messages */}
                                <div className="flex-1 overflow-y-auto p-4" ref={scrollRef}>
                                    {messages.length === 0 ? (
                                        <div className="flex items-center justify-center h-full text-center">
                                            <div>
                                                <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                                                <p className="text-muted-foreground">
                                                    Envía un mensaje para comenzar la conversación
                                                </p>
                                                <p className="text-sm text-muted-foreground mt-1">
                                                    El agente responderá usando su base de conocimiento
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {messages.map((message) => (
                                                <div
                                                    key={message.id}
                                                    className={cn(
                                                        "flex gap-3",
                                                        message.role === 'assistant' && "flex-row-reverse"
                                                    )}
                                                >
                                                    {/* Avatar */}
                                                    <div className={cn(
                                                        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden",
                                                        message.role === 'user' ? "bg-muted" : "bg-primary/10"
                                                    )}>
                                                        {message.role === 'user' ? (
                                                            // Avatar del usuario
                                                            profile?.avatar_url ? (
                                                                <img
                                                                    src={profile.avatar_url}
                                                                    alt="Avatar"
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            ) : (
                                                                <span className="text-sm font-medium text-muted-foreground">
                                                                    {(profile?.full_name || profile?.email || 'U').charAt(0).toUpperCase()}
                                                                </span>
                                                            )
                                                        ) : (
                                                            // Avatar del agente (logo)
                                                            selectedAgent?.avatar_url ? (
                                                                <img
                                                                    src={selectedAgent.avatar_url}
                                                                    alt={selectedAgent.name}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            ) : (
                                                                <Bot className="w-4 h-4 text-primary" />
                                                            )
                                                        )}
                                                    </div>
                                                    <div className={cn(
                                                        "max-w-[75%] rounded-lg p-3",
                                                        message.role === 'user'
                                                            ? "bg-muted text-foreground"
                                                            : "bg-primary/10 text-foreground"
                                                    )}>
                                                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                                                        <p className="text-xs text-muted-foreground mt-1">
                                                            {formatTime(message.timestamp)}
                                                        </p>
                                                        {message.sources && message.sources.length > 0 && (
                                                            <div className="mt-2 pt-2 border-t border-border/50">
                                                                <p className="text-xs text-muted-foreground">Fuentes:</p>
                                                                <div className="flex flex-wrap gap-1 mt-1">
                                                                    {message.sources.map((source, i) => (
                                                                        <Badge key={i} variant="secondary" className="text-xs">
                                                                            {source}
                                                                        </Badge>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                            {isLoading && (
                                                <div className="flex gap-3 flex-row-reverse">
                                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                                        <Bot className="w-4 h-4 text-primary" />
                                                    </div>
                                                    <div className="bg-primary/10 rounded-lg p-3">
                                                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Input Area */}
                                <div className="p-4 border-t border-border">
                                    {selectedAgent?.status === 'active' ? (
                                        <div className="flex gap-2">
                                            <Textarea
                                                placeholder="Escribe tu mensaje..."
                                                value={inputMessage}
                                                onChange={(e) => setInputMessage(e.target.value)}
                                                onKeyDown={handleKeyDown}
                                                className="min-h-[44px] max-h-32 resize-none"
                                                rows={1}
                                            />
                                            <Button
                                                onClick={handleSendMessage}
                                                disabled={!inputMessage.trim() || isLoading}
                                                size="icon"
                                                className="h-11 w-11"
                                            >
                                                {isLoading ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <Send className="w-4 h-4" />
                                                )}
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="bg-muted/50 rounded-lg p-4 text-center border border-dashed">
                                            <p className="text-muted-foreground text-sm flex items-center justify-center gap-2">
                                                {selectedAgent?.status === 'paused' && '🟡 Este agente está pausado'}
                                                {selectedAgent?.status === 'draft' && '⚪ Este agente está en borrador'}
                                                {selectedAgent?.status === 'archived' && '🔴 Este agente está archivado'}
                                                <span className="opacity-60">- no se pueden enviar mensajes</span>
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <CardContent className="flex-1 flex items-center justify-center">
                                <div className="text-center">
                                    <Bot className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                                    <h3 className="text-lg font-medium text-foreground mb-2">
                                        Selecciona un Agente
                                    </h3>
                                    <p className="text-muted-foreground">
                                        Elige un agente del panel izquierdo para comenzar a chatear
                                    </p>
                                </div>
                            </CardContent>
                        )}
                    </Card>
                </div >
            </div >

            <AlertDialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-destructive" />
                            ¿Estás seguro de limpiar el chat?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción eliminará todo el historial de conversación actual.
                            La memoria del agente sobre esta charla se perderá permanentemente.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmClearChat} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Limpiar Historial
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </DashboardLayout >
    );
};

export default PlaygroundPage;
