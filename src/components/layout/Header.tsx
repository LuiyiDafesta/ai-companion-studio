import { Bell, Moon, Sun, LogOut, User, Search, MessageSquare, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { useCredits } from '@/hooks/useCredits';
import { useProfile } from '@/hooks/useProfile';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface Notification {
  id: string;
  type: 'human_takeover' | 'new_conversation';
  title: string;
  message: string;
  time: string;
  conversationId: string;
}

export const Header = () => {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { data: credits } = useCredits();
  const { data: profile } = useProfile();

  // Fetch notifications (conversations needing attention)
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const notifs: Notification[] = [];

      // Get human takeover conversations
      const { data: takeoverConvs } = await (supabase as any)
        .from('ah_public_conversations')
        .select(`
          id,
          visitor_name,
          started_at,
          agent_id,
          ah_agents!inner(user_id, name)
        `)
        .eq('status', 'human_takeover')
        .eq('ah_agents.user_id', user.id)
        .order('started_at', { ascending: false })
        .limit(5);

      if (takeoverConvs) {
        takeoverConvs.forEach((conv: any) => {
          notifs.push({
            id: conv.id,
            type: 'human_takeover',
            title: '👤 Human Takeover',
            message: `${conv.visitor_name || 'Visitante'} espera respuesta`,
            time: conv.started_at,
            conversationId: conv.id,
          });
        });
      }

      // Get recent active conversations (last 30 min)
      const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      const { data: recentConvs } = await (supabase as any)
        .from('ah_public_conversations')
        .select(`
          id,
          visitor_name,
          started_at,
          agent_id,
          ah_agents!inner(user_id, name)
        `)
        .eq('status', 'active')
        .eq('ah_agents.user_id', user.id)
        .gte('started_at', thirtyMinAgo)
        .order('started_at', { ascending: false })
        .limit(3);

      if (recentConvs) {
        recentConvs.forEach((conv: any) => {
          notifs.push({
            id: 'new-' + conv.id,
            type: 'new_conversation',
            title: '💬 Nueva conversación',
            message: `${conv.visitor_name || 'Visitante'} en ${conv.ah_agents?.name || 'agente'}`,
            time: conv.started_at,
            conversationId: conv.id,
          });
        });
      }

      return notifs;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    enabled: !!user?.id,
  });

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleNotificationClick = (notification: Notification) => {
    navigate('/conversations');
  };

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'User';
  const hasNotifications = notifications.length > 0;
  const humanTakeoverCount = notifications.filter(n => n.type === 'human_takeover').length;

  return (
    <header className="h-16 border-b border-border bg-card px-6 flex items-center justify-between">
      <div className="flex items-center gap-4 flex-1">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t('header.search')}
            className="pl-10 bg-background"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        {credits && (
          <Badge variant="outline" className="gap-1.5 py-1.5">
            <span className="w-2 h-2 rounded-full bg-primary" />
            {credits.balance.toLocaleString()} {t('header.credits')}
          </Badge>
        )}

        {/* Notifications Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              {hasNotifications && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-destructive rounded-full text-[10px] font-bold text-white flex items-center justify-center">
                  {notifications.length}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <div className="px-3 py-2 border-b">
              <h4 className="font-semibold text-sm">Notificaciones</h4>
              {humanTakeoverCount > 0 && (
                <p className="text-xs text-destructive">
                  {humanTakeoverCount} esperando respuesta humana
                </p>
              )}
            </div>
            <ScrollArea className="h-[300px]">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground text-sm">
                  No hay notificaciones
                </div>
              ) : (
                notifications.map((notification) => (
                  <DropdownMenuItem
                    key={notification.id}
                    className="p-3 cursor-pointer flex flex-col items-start gap-1"
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-center gap-2 w-full">
                      {notification.type === 'human_takeover' ? (
                        <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                      ) : (
                        <MessageSquare className="w-4 h-4 text-primary flex-shrink-0" />
                      )}
                      <span className="font-medium text-sm">{notification.title}</span>
                    </div>
                    <p className="text-xs text-muted-foreground pl-6">{notification.message}</p>
                    <p className="text-xs text-muted-foreground pl-6">
                      {formatDistanceToNow(new Date(notification.time), { addSuffix: true, locale: es })}
                    </p>
                  </DropdownMenuItem>
                ))
              )}
            </ScrollArea>
            {notifications.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="justify-center text-primary text-sm"
                  onClick={() => navigate('/conversations')}
                >
                  Ver todas las conversaciones
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="ghost" size="icon" onClick={toggleTheme}>
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-medium text-primary">
                  {displayName.charAt(0).toUpperCase()}
                </span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => navigate('/settings')}>
              <User className="w-4 h-4 mr-2" />
              {t('header.profile')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive">
              <LogOut className="w-4 h-4 mr-2" />
              {t('header.logout')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
