import { Link, useLocation } from 'react-router-dom';
import { 
  Bot, 
  LayoutDashboard, 
  FileText, 
  MessageSquare, 
  Settings, 
  CreditCard, 
  BarChart3,
  Users,
  Shield,
  Webhook,
  Database,
  AlertTriangle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useProfile } from '@/hooks/useProfile';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

const userNavItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: Bot, label: 'AI Agents', path: '/agents' },
  { icon: FileText, label: 'Documents', path: '/documents' },
  { icon: MessageSquare, label: 'Conversations', path: '/conversations' },
  { icon: BarChart3, label: 'Analytics', path: '/analytics' },
  { icon: CreditCard, label: 'Billing', path: '/billing' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

const adminNavItems = [
  { icon: LayoutDashboard, label: 'Overview', path: '/admin' },
  { icon: Users, label: 'Users', path: '/admin/users' },
  { icon: Bot, label: 'All Agents', path: '/admin/agents' },
  { icon: BarChart3, label: 'Metrics', path: '/admin/metrics' },
  { icon: Webhook, label: 'Integrations', path: '/admin/integrations' },
  { icon: Database, label: 'AI Config', path: '/admin/ai-config' },
  { icon: Shield, label: 'Security', path: '/admin/security' },
  { icon: AlertTriangle, label: 'Danger Zone', path: '/admin/danger' },
];

export const Sidebar = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { data: roleData } = useUserRole();
  const { data: profile } = useProfile();
  const [collapsed, setCollapsed] = useState(false);
  
  const isAdmin = roleData?.isAdmin || false;
  const isAdminRoute = location.pathname.startsWith('/admin');
  const navItems = isAdminRoute && isAdmin ? adminNavItems : userNavItems;
  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'User';

  return (
    <aside className={cn(
      "h-screen bg-card border-r border-border flex flex-col transition-all duration-300",
      collapsed ? "w-16" : "w-64"
    )}>
      <div className="p-4 border-b border-border flex items-center justify-between">
        {!collapsed && (
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Bot className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground">AgentHub</span>
          </Link>
        )}
        {collapsed && (
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center mx-auto">
            <Bot className="w-5 h-5 text-primary-foreground" />
          </div>
        )}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setCollapsed(!collapsed)}
          className={cn("h-8 w-8", collapsed && "mx-auto mt-2")}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {isAdmin && !collapsed && (
        <div className="px-4 py-2">
          <div className="flex gap-1 p-1 bg-muted/30 rounded-lg">
            <Link 
              to="/dashboard" 
              className={cn(
                "flex-1 text-center py-1.5 text-sm rounded-md transition-colors",
                !isAdminRoute ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              User
            </Link>
            <Link 
              to="/admin" 
              className={cn(
                "flex-1 text-center py-1.5 text-sm rounded-md transition-colors",
                isAdminRoute ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Admin
            </Link>
          </div>
        </div>
      )}

      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                isActive 
                  ? "bg-primary text-primary-foreground" 
                  : "text-muted-foreground hover:text-foreground hover:bg-accent",
                collapsed && "justify-center px-2"
              )}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {!collapsed && user && (
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-medium text-primary">
                {displayName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
