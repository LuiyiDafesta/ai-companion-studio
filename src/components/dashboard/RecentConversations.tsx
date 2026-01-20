import { MessageSquare, ExternalLink, Loader2, Bot } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Agent } from '@/types/database';

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-700 border-green-200',
  resolved: 'bg-gray-100 text-gray-700 border-gray-200',
  human_takeover: 'bg-purple-100 text-purple-700 border-purple-200',
  closed: 'bg-gray-100 text-gray-700 border-gray-200',
};

const statusLabels: Record<string, string> = {
  active: 'Activa',
  resolved: 'Resuelta',
  human_takeover: 'Humano',
  closed: 'Cerrada',
};

interface RecentConversationsProps {
  agents?: Agent[];
}

export const RecentConversations = ({ agents }: RecentConversationsProps) => {
  const navigate = useNavigate();

  const { data: conversations, isLoading, isError, error } = useQuery({
    queryKey: ['recent-conversations-dashboard-v3', agents?.map(a => a.id).join(',')],
    queryFn: async () => {
      // Si no hay agentes, no hay conversaciones que mostrar
      if (!agents || agents.length === 0) return [];

      const agentIds = agents.map(a => a.id);

      const { data: convs, error } = await supabase
        .from('ah_public_conversations')
        .select(`
          *,
          agent:ah_agents (
            name
          )
        `)
        .in('agent_id', agentIds)
        .order('started_at', { ascending: false })
        .limit(3);

      if (error) {
        console.error('Error fetching recent conversations:', error);
        throw error;
      }

      return (convs as any[]).map(c => ({
        ...c,
        agentName: c.agent?.name || 'Agente desconocido'
      }));
    },
    enabled: !!agents && agents.length > 0,
    retry: 1,
    refetchInterval: 5000
  });

  return (
    <Card className="bg-card h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold">Conversaciones Recientes</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={() => navigate('/conversations')}
        >
          Ver Todas <ExternalLink className="w-4 h-4 ml-1" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : isError ? (
          <div className="text-center py-8 text-destructive">
            <p className="font-medium text-sm">Error cargando datos</p>
          </div>
        ) : !conversations || conversations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-20" />
            <p className="text-sm">No hay conversaciones recientes</p>
          </div>
        ) : (
          conversations.map((conv) => (
            <div
              key={conv.id}
              className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors cursor-pointer border border-transparent hover:border-border"
              onClick={() => navigate(`/conversations?id=${conv.id}`)}
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Bot className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-medium text-foreground text-sm truncate">{conv.agentName}</span>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {conv.started_at ? formatDistanceToNow(new Date(conv.started_at), { addSuffix: true, locale: es }) : ''}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge
                    variant="secondary"
                    className={`text-[10px] px-1.5 py-0 capitalize border ${statusColors[conv.status] || 'bg-gray-100 text-gray-700'}`}
                  >
                    {statusLabels[conv.status] || conv.status}
                  </Badge>
                  {/* Si tuviéramos last message, lo pondríamos aquí, pero ah_public_conversations no siempre tiene last_message cacheado, 
                      tendríamos que hacer join con ah_public_messages. 
                      Por simplicidad y rendimiento, mostramos info básica. 
                      Si el usuario pide el mensaje, lo agregaremos después. */}
                  {/* UPDATE: Ah, en el mock se muestra lastMessage. 
                      ah_public_conversations NO tiene last_message. 
                      Para no complicar la query N+1, mostraré ID o estado por ahora. 
                      Si es crítico, habrá que modificar la DB o hacer subquery. */}
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};
