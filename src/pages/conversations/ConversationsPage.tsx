import { useState } from 'react';
import { MessageSquare, Search, Filter, User, Bot, Clock } from 'lucide-react';
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

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface Conversation {
  id: string;
  agentName: string;
  channel: 'web' | 'whatsapp';
  status: 'active' | 'resolved' | 'pending';
  lastMessage: string;
  timestamp: string;
  messages: Message[];
}

const mockConversations: Conversation[] = [
  {
    id: '1',
    agentName: 'Sales Bot',
    channel: 'web',
    status: 'active',
    lastMessage: 'I\'d be happy to help you with pricing information...',
    timestamp: '2 min ago',
    messages: [
      { id: '1', role: 'user', content: 'Hi, I\'m interested in your enterprise plan', timestamp: '10:30 AM' },
      { id: '2', role: 'assistant', content: 'Hello! Great to hear you\'re interested in our Enterprise plan. I\'d be happy to help you with pricing information and features. Could you tell me a bit about your team size and use case?', timestamp: '10:30 AM' },
      { id: '3', role: 'user', content: 'We have about 50 employees and need it for customer support', timestamp: '10:31 AM' },
      { id: '4', role: 'assistant', content: 'Perfect! For a team of 50 focusing on customer support, our Enterprise plan would be ideal. It includes unlimited agents, priority support, and custom integrations. Would you like me to schedule a demo with our sales team?', timestamp: '10:31 AM' },
    ],
  },
  {
    id: '2',
    agentName: 'Support Agent',
    channel: 'whatsapp',
    status: 'resolved',
    lastMessage: 'Your issue has been resolved. Is there anything else?',
    timestamp: '15 min ago',
    messages: [
      { id: '1', role: 'user', content: 'My agent is not responding', timestamp: '10:15 AM' },
      { id: '2', role: 'assistant', content: 'I understand you\'re having issues with your agent. Let me check the status for you.', timestamp: '10:15 AM' },
      { id: '3', role: 'assistant', content: 'I can see that your agent was paused due to credit limits. I\'ve reactivated it for you. It should be working now!', timestamp: '10:16 AM' },
      { id: '4', role: 'user', content: 'Thanks! It works now', timestamp: '10:20 AM' },
      { id: '5', role: 'assistant', content: 'Your issue has been resolved. Is there anything else I can help you with?', timestamp: '10:20 AM' },
    ],
  },
  {
    id: '3',
    agentName: 'FAQ Bot',
    channel: 'web',
    status: 'pending',
    lastMessage: 'Let me find that information for you...',
    timestamp: '1 hour ago',
    messages: [
      { id: '1', role: 'user', content: 'What file types can I upload?', timestamp: '9:30 AM' },
      { id: '2', role: 'assistant', content: 'You can upload PDF, TXT, and DOC files. We also support adding website URLs for content extraction. Each file can be up to 10MB.', timestamp: '9:30 AM' },
    ],
  },
];

const statusColors = {
  active: 'bg-primary/10 text-primary border-primary/20',
  resolved: 'bg-muted text-muted-foreground border-muted',
  pending: 'bg-accent text-accent-foreground border-accent-foreground/20',
};

export const ConversationsPage = () => {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(mockConversations[0]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredConversations = mockConversations.filter(conv => {
    const matchesSearch = conv.agentName.toLowerCase().includes(search.toLowerCase()) ||
                          conv.lastMessage.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || conv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-8rem)]">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Conversations</h1>
            <p className="text-muted-foreground">
              View and manage all agent conversations
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100%-4rem)]">
          {/* Conversation List */}
          <Card className="bg-card lg:col-span-1 flex flex-col">
            <div className="p-4 border-b border-border space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search conversations..." 
                  className="pl-10"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-2">
                {filteredConversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv)}
                    className={cn(
                      "w-full p-3 rounded-lg text-left transition-colors",
                      selectedConversation?.id === conv.id 
                        ? "bg-primary/10 border border-primary/20" 
                        : "hover:bg-muted/30"
                    )}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="font-medium text-foreground">{conv.agentName}</span>
                      <span className="text-xs text-muted-foreground">{conv.timestamp}</span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate mb-2">{conv.lastMessage}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs capitalize">{conv.channel}</Badge>
                      <Badge variant="outline" className={cn("text-xs capitalize", statusColors[conv.status])}>
                        {conv.status}
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </Card>

          {/* Conversation Detail */}
          <Card className="bg-card lg:col-span-2 flex flex-col">
            {selectedConversation ? (
              <>
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <MessageSquare className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{selectedConversation.agentName}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs capitalize">{selectedConversation.channel}</Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {selectedConversation.timestamp}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={cn("capitalize", statusColors[selectedConversation.status])}
                  >
                    {selectedConversation.status}
                  </Badge>
                </div>
                <ScrollArea className="flex-1 p-4">
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
                          "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                          message.role === 'user' ? "bg-muted" : "bg-primary/10"
                        )}>
                          {message.role === 'user' ? (
                            <User className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <Bot className="w-4 h-4 text-primary" />
                          )}
                        </div>
                        <div className={cn(
                          "max-w-[70%] rounded-lg p-3",
                          message.role === 'user' 
                            ? "bg-muted text-foreground" 
                            : "bg-primary/10 text-foreground"
                        )}>
                          <p className="text-sm">{message.content}</p>
                          <p className="text-xs text-muted-foreground mt-1">{message.timestamp}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </>
            ) : (
              <CardContent className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">Select a conversation to view details</p>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ConversationsPage;
