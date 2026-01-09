import { Bot, MessageSquare, MoreVertical, Pause, Play, Settings, Trash2, Archive } from 'lucide-react';
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
import { AgentStatus, AgentObjective } from '@/types/database';

interface AgentCardProps {
  agent: {
    id: string;
    name: string;
    description: string | null;
    status: AgentStatus;
    objective: AgentObjective;
    conversations?: number;
    avatar_url?: string | null;
  };
  onEdit?: (id: string) => void;
  onToggleStatus?: (id: string) => void;
  onDelete?: (id: string) => void;
}

const statusStyles: Record<AgentStatus, string> = {
  active: 'bg-primary/10 text-primary border-primary/20',
  paused: 'bg-muted text-muted-foreground border-muted',
  draft: 'bg-accent text-accent-foreground border-accent-foreground/20',
  archived: 'bg-destructive/10 text-destructive border-destructive/20',
};

const objectiveLabels: Record<AgentObjective, string> = {
  sales: 'Sales',
  support: 'Support',
  information: 'Information',
};

export const AgentCard = ({ agent, onEdit, onToggleStatus, onDelete }: AgentCardProps) => {
  return (
    <Card className="bg-card hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              {agent.avatar_url ? (
                <img src={agent.avatar_url} alt={agent.name} className="w-12 h-12 rounded-xl object-cover" />
              ) : (
                <Bot className="w-6 h-6 text-primary" />
              )}
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
                ) : agent.status === 'archived' ? (
                  <>
                    <Archive className="w-4 h-4 mr-2" />
                    Unarchive
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
          {agent.description || 'No description'}
        </p>

        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MessageSquare className="w-4 h-4" />
              <span>{agent.conversations || 0} chats</span>
            </div>
          </div>
          <Badge variant="secondary" className="text-xs capitalize">
            {objectiveLabels[agent.objective]}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};
