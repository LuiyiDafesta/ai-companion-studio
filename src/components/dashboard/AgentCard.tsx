import { Bot, MessageSquare, MoreVertical, Pause, Play, Settings, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface AgentCardProps {
  agent: {
    id: string;
    name: string;
    description: string;
    status: 'active' | 'paused' | 'training';
    objective: string;
    conversations: number;
    messagesThisMonth: number;
  };
  onEdit?: (id: string) => void;
  onToggleStatus?: (id: string) => void;
  onDelete?: (id: string) => void;
}

const statusStyles = {
  active: 'bg-primary/10 text-primary border-primary/20',
  paused: 'bg-muted text-muted-foreground border-muted',
  training: 'bg-accent text-accent-foreground border-accent-foreground/20',
};

export const AgentCard = ({ agent, onEdit, onToggleStatus, onDelete }: AgentCardProps) => {
  return (
    <Card className="bg-card hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Bot className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{agent.name}</h3>
              <Badge 
                variant="outline" 
                className={cn("text-xs capitalize mt-1", statusStyles[agent.status])}
              >
                {agent.status}
              </Badge>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit?.(agent.id)}>
                <Settings className="w-4 h-4 mr-2" />
                Configure
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onToggleStatus?.(agent.id)}>
                {agent.status === 'active' ? (
                  <>
                    <Pause className="w-4 h-4 mr-2" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Activate
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => onDelete?.(agent.id)} 
                className="text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {agent.description}
        </p>

        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MessageSquare className="w-4 h-4" />
              <span>{agent.conversations} chats</span>
            </div>
          </div>
          <Badge variant="secondary" className="text-xs">
            {agent.objective}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};
