import { useState, useEffect, useRef } from 'react';
import { Send, Loader2, AlertCircle, Mail, X, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
    getWidgetConfig,
    sendPublicMessage,
    getConversationHistory,
    type WidgetConfig,
    type PublicMessage
} from '@/lib/publicWidgetApi';

interface ChatWidgetProps {
    agentId: string;
}

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

export default function ChatWidget({ agentId }: ChatWidgetProps) {
    const [config, setConfig] = useState<WidgetConfig | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPreChat, setShowPreChat] = useState(true);
    const [visitorName, setVisitorName] = useState('');
    const [visitorEmail, setVisitorEmail] = useState('');
    const [visitorId, setVisitorId] = useState('');
    const [isOutOfService, setIsOutOfService] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Initialize visitor ID
    useEffect(() => {
        const stored = localStorage.getItem('chat_visitor_id');
        if (stored) {
            setVisitorId(stored);
        } else {
            const newId = crypto.randomUUID();
            localStorage.setItem('chat_visitor_id', newId);
            setVisitorId(newId);
        }
    }, []);

    // Load widget config and history
    useEffect(() => {
        async function init() {
            if (!visitorId) return;

            const widgetConfig = await getWidgetConfig(agentId);
            setConfig(widgetConfig);

            if (widgetConfig?.status !== 'active') {
                setIsOutOfService(true);
                return;
            }

            // Load conversation history
            const history = await getConversationHistory(agentId, visitorId);
            const mappedMessages = history.map((msg, idx) => ({
                id: idx.toString(),
                role: msg.role,
                content: msg.content,
                timestamp: new Date(msg.created_at)
            }));
            setMessages(mappedMessages);

            // If there's history, skip pre-chat form
            if (history.length > 0) {
                setShowPreChat(false);
            }
        }

        init();
    }, [agentId, visitorId]);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current && isOpen) {
            // Small timeout to ensure DOM is fully rendered
            setTimeout(() => {
                if (scrollRef.current) {
                    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                }
            }, 100);
        }
    }, [messages, isOpen]);

    // Polling for new messages (for human takeover support)
    useEffect(() => {
        if (!visitorId || !agentId || showPreChat || isOutOfService) return;

        const pollMessages = async () => {
            try {
                const history = await getConversationHistory(agentId, visitorId);
                const mappedMessages = history.map((msg, idx) => ({
                    id: `poll-${idx}`,
                    role: msg.role,
                    content: msg.content,
                    timestamp: new Date(msg.created_at)
                }));

                // Only update if there are more messages
                if (mappedMessages.length > messages.length) {
                    setMessages(mappedMessages);
                }
            } catch (error) {
                console.error('[Widget] Polling error:', error);
            }
        };

        // Poll every 3 seconds
        const interval = setInterval(pollMessages, 3000);

        return () => clearInterval(interval);
    }, [agentId, visitorId, showPreChat, isOutOfService, messages.length]);

    const handlePreChatSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (config?.agent.require_email && (!visitorName || !visitorEmail)) {
            return;
        }
        setShowPreChat(false);
    };

    const handleSendMessage = async () => {
        if (!inputMessage.trim() || !visitorId || isOutOfService) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: inputMessage.trim(),
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInputMessage('');
        setIsLoading(true);

        try {
            const response = await sendPublicMessage(agentId, {
                visitor_id: visitorId,
                message: userMessage.content,
                visitor_info: {
                    name: visitorName,
                    email: visitorEmail
                }
            });

            if (response.status === 'out_of_service') {
                setIsOutOfService(true);
                setMessages(prev => [...prev, {
                    id: Date.now().toString(),
                    role: 'assistant',
                    content: response.response,
                    timestamp: new Date()
                }]);
            } else if (response.status === 'human_takeover') {
                // Human is handling - don't add any automatic message
                // The visitor's message was saved, they'll see human response via polling
            } else if (response.status === 'success' && response.response) {
                // Only add message if there's actual content
                setMessages(prev => [...prev, {
                    id: Date.now().toString(),
                    role: 'assistant',
                    content: response.response,
                    timestamp: new Date()
                }]);
            } else if (response.status === 'error') {
                throw new Error(response.response || 'Error desconocido');
            }
        } catch (error) {
            console.error('Error sending message:', error);
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'assistant',
                content: 'Lo siento, hubo un error. Por favor, inténtalo más tarde.',
                timestamp: new Date()
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    if (!config) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    const primaryColor = config.agent.widget_color || '#3B82F6';

    // Floating button when minimized
    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed shadow-lg hover:scale-110 transition-transform duration-200 rounded-full p-4 flex items-center justify-center"
                style={{
                    backgroundColor: primaryColor,
                    bottom: '20px',
                    right: '20px',
                    width: '60px',
                    height: '60px',
                    zIndex: 9999
                }}
                aria-label="Open chat"
            >
                <MessageCircle className="w-6 h-6 text-white" />
            </button>
        );
    }

    // Pre-chat form
    if (showPreChat) {
        return (
            <div className="fixed shadow-2xl rounded-lg overflow-hidden bg-background" style={{
                bottom: '20px',
                right: '20px',
                width: '400px',
                height: '600px',
                zIndex: 9999
            }}>
                <div
                    className="p-4 text-white flex items-center justify-between"
                    style={{ backgroundColor: primaryColor }}
                >
                    <div>
                        <h2 className="text-lg font-semibold">{config.agent.name}</h2>
                        <p className="text-sm opacity-90">Cuéntanos sobre ti</p>
                    </div>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="hover:bg-white/20 rounded-full p-1 transition-colors"
                        aria-label="Close chat"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handlePreChatSubmit} className="flex-1 p-4 space-y-4">
                    <div>
                        <label className="text-sm font-medium">Nombre *</label>
                        <Input
                            value={visitorName}
                            onChange={(e) => setVisitorName(e.target.value)}
                            placeholder="Tu nombre"
                            required={config.agent.require_email}
                            className="mt-1"
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium">Email *</label>
                        <Input
                            type="email"
                            value={visitorEmail}
                            onChange={(e) => setVisitorEmail(e.target.value)}
                            placeholder="tu@email.com"
                            required={config.agent.require_email}
                            className="mt-1"
                        />
                    </div>

                    <Button
                        type="submit"
                        className="w-full"
                        style={{ backgroundColor: primaryColor }}
                    >
                        Iniciar Chat
                    </Button>
                </form>
            </div>
        );
    }

    // Out of service message
    if (isOutOfService) {
        return (
            <div className="fixed shadow-2xl rounded-lg overflow-hidden bg-background" style={{
                bottom: '20px',
                right: '20px',
                width: '400px',
                height: '600px',
                zIndex: 9999
            }}>
                <div
                    className="p-4 text-white flex items-center justify-between"
                    style={{ backgroundColor: primaryColor }}
                >
                    <h2 className="text-lg font-semibold">{config.agent.name}</h2>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="hover:bg-white/20 rounded-full p-1 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 flex items-center justify-center p-6 text-center">
                    <div>
                        <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                        <h3 className="font-medium mb-2">Servicio no disponible</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            {config.agent.fallback_message}
                        </p>
                        {config.agent.fallback_email && (
                            <a
                                href={`mailto:${config.agent.fallback_email}`}
                                className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                            >
                                <Mail className="w-4 h-4" />
                                {config.agent.fallback_email}
                            </a>
                        )}
                    </div>
                </div>

                {messages.length > 0 && (
                    <div className="p-4 border-t">
                        <Button
                            onClick={() => setShowPreChat(true)}
                            variant="outline"
                            className="w-full"
                        >
                            Ver conversación anterior
                        </Button>
                    </div>
                )}
            </div>
        );
    }

    // Main chat interface
    return (
        <div className="fixed shadow-2xl rounded-lg overflow-hidden bg-background flex flex-col" style={{
            bottom: '20px',
            right: '20px',
            width: '400px',
            height: '600px',
            zIndex: 9999
        }}>
            {/* Header */}
            <div
                className="p-4 text-white flex items-center justify-between"
                style={{ backgroundColor: primaryColor }}
            >
                <div className="flex items-center gap-3">
                    {config.agent.avatar_url && (
                        <img
                            src={config.agent.avatar_url}
                            alt={config.agent.name}
                            className="w-10 h-10 rounded-full"
                        />
                    )}
                    <div>
                        <h2 className="text-lg font-semibold">{config.agent.name}</h2>
                        <p className="text-xs opacity-90">En línea</p>
                    </div>
                </div>
                <button
                    onClick={() => setIsOpen(false)}
                    className="hover:bg-white/20 rounded-full p-1 transition-colors"
                    aria-label="Close chat"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
                {messages.length === 0 && config.agent.welcome_message && (
                    <div className="bg-muted rounded-lg p-3">
                        <p className="text-sm">{config.agent.welcome_message}</p>
                    </div>
                )}

                {messages.map((message) => (
                    <div
                        key={message.id}
                        className={`flex ${message.role === 'assistant' ? 'justify-start' : 'justify-end'}`}
                    >
                        <div
                            className={`max-w-[80%] rounded-lg p-3 ${message.role === 'user'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                                }`}
                            style={message.role === 'user' ? { backgroundColor: primaryColor } : {}}
                        >
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                            <p className="text-xs opacity-70 mt-1">
                                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-muted rounded-lg p-3">
                            <Loader2 className="w-4 h-4 animate-spin" />
                        </div>
                    </div>
                )}
            </div>

            {/* Input */}
            <div className="p-4 border-t">
                <div className="flex gap-2">
                    <Textarea
                        placeholder="Escribe tu mensaje..."
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={isLoading}
                        className="min-h-[44px] max-h-32 resize-none"
                        rows={1}
                    />
                    <Button
                        onClick={handleSendMessage}
                        disabled={!inputMessage.trim() || isLoading}
                        size="icon"
                        className="h-11 w-11"
                        style={{ backgroundColor: primaryColor }}
                    >
                        {isLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Send className="w-4 h-4" />
                        )}
                    </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                    Enter para enviar, Shift + Enter para nueva línea
                </p>
            </div>
        </div>
    );
}
