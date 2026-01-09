import { MessageSquare, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Conversation {
  id: string;
  agentName: string;
  channel: 'web' | 'whatsapp';
  lastMessage: string;
  timestamp: string;
  status: 'active' | 'resolved' | 'pending';
}

const mockConversations: Conversation[] = [
  {
    id: '1',
    agentName: 'Sales Bot',
    channel: 'web',
    lastMessage: 'Thank you for your interest! Let me help you with...',
    timestamp: '2 min ago',
    status: 'active',
  },
  {
    id: '2',
    agentName: 'Support Agent',
    channel: 'whatsapp',
    lastMessage: 'Your issue has been resolved. Is there anything else?',
    timestamp: '15 min ago',
    status: 'resolved',
  },
  {
    id: '3',
    agentName: 'FAQ Bot',
    channel: 'web',
    lastMessage: 'Here are the answers to your questions about our...',
    timestamp: '1 hour ago',
    status: 'pending',
  },
];

const statusColors = {
  active: 'bg-primary/10 text-primary',
  resolved: 'bg-muted text-muted-foreground',
  pending: 'bg-accent text-accent-foreground',
};

export const RecentConversations = () => {
  return (
    <Card className="bg-card">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold">Recent Conversations</CardTitle>
        <Button variant="ghost" size="sm" className="text-muted-foreground">
          View All <ExternalLink className="w-4 h-4 ml-1" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {mockConversations.map((conv) => (
          <div 
            key={conv.id}
            className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors cursor-pointer"
          >
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <MessageSquare className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="font-medium text-foreground text-sm">{conv.agentName}</span>
                <span className="text-xs text-muted-foreground">{conv.timestamp}</span>
              </div>
              <p className="text-sm text-muted-foreground truncate">{conv.lastMessage}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="text-xs capitalize">
                  {conv.channel}
                </Badge>
                <Badge className={`text-xs capitalize ${statusColors[conv.status]}`}>
                  {conv.status}
                </Badge>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
