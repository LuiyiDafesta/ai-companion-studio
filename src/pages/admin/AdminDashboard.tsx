import {
  Users,
  Bot,
  MessageSquare,
  CreditCard,
  TrendingUp,
  Activity,
  Loader2
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useAdminStats } from '@/hooks/useAdmin';
import { useAgents } from '@/hooks/useAgents';

export const AdminDashboard = () => {
  const { data: stats, isLoading: statsLoading } = useAdminStats();
  const { data: agents } = useAgents();

  // Create agent usage data from real stats
  const agentUsage = stats?.topAgents?.map((agent: any) => ({
    name: agent.name.length > 15 ? agent.name.substring(0, 15) + '...' : agent.name,
    messages: agent.conversations_count || 0,
  })) || [];

  // Format recent activity
  const recentActivity = [
    ...(stats?.recentProfiles?.map(p => ({
      action: 'New user registered',
      user: p.email,
      time: formatTimeAgo(p.created_at),
      sortDate: new Date(p.created_at),
    })) || []),
    ...(stats?.recentAgents?.map(a => ({
      action: 'Agent created',
      user: a.name,
      time: formatTimeAgo(a.created_at),
      sortDate: new Date(a.created_at),
    })) || []),
  ].sort((a, b) => b.sortDate.getTime() - a.sortDate.getTime()).slice(0, 5);

  function formatTimeAgo(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }

  if (statsLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Admin Overview</h1>
          <p className="text-muted-foreground">
            Platform-wide metrics and management
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total Users"
            value={stats?.totalUsers || 0}
            icon={<Users className="w-6 h-6" />}
          />
          <StatsCard
            title="Active Agents"
            value={stats?.activeAgents || 0}
            icon={<Bot className="w-6 h-6" />}
          />
          <StatsCard
            title="Total Messages"
            value={stats?.totalMessages?.toLocaleString() || '0'}
            icon={<MessageSquare className="w-6 h-6" />}
          />
          <StatsCard
            title="Credits Used"
            value={stats?.totalCreditsUsed?.toLocaleString() || '0'}
            icon={<CreditCard className="w-6 h-6" />}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Platform Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 rounded-lg bg-muted/30">
                  <span className="text-muted-foreground">Total Users</span>
                  <span className="font-semibold text-foreground">{stats?.totalUsers || 0}</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-muted/30">
                  <span className="text-muted-foreground">Total Agents</span>
                  <span className="font-semibold text-foreground">{stats?.totalAgents || 0}</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-muted/30">
                  <span className="text-muted-foreground">Active Agents</span>
                  <span className="font-semibold text-foreground text-green-600">{stats?.activeAgents || 0}</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-muted/30">
                  <span className="text-muted-foreground">Draft Agents</span>
                  <span className="font-semibold text-foreground text-yellow-600">{stats?.draftAgents || 0}</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-muted/30">
                  <span className="text-muted-foreground">Total Tokens Used</span>
                  <span className="font-semibold text-foreground">{stats?.totalTokens?.toLocaleString() || 0}</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-muted/30">
                  <span className="text-muted-foreground">Total Conversations</span>
                  <span className="font-semibold text-foreground">{stats?.totalConversations || 0}</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-muted/30">
                  <span className="text-muted-foreground">Total Messages</span>
                  <span className="font-semibold text-foreground">{stats?.totalMessages || 0}</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-muted/30">
                  <span className="text-muted-foreground">Credits Purchased</span>
                  <span className="font-semibold text-foreground">{stats?.totalCreditsPurchased?.toLocaleString() || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Top Agents
              </CardTitle>
            </CardHeader>
            <CardContent>
              {agentUsage.length > 0 ? (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={agentUsage} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                      <XAxis
                        type="number"
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        width={100}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          color: 'hsl(var(--foreground))'
                        }}
                      />
                      <Bar
                        dataKey="messages"
                        fill="hsl(var(--primary))"
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  No agents created yet
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="bg-card">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length > 0 ? (
              <div className="space-y-4">
                {recentActivity.map((activity, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/30 transition-colors">
                    <div>
                      <p className="font-medium text-foreground">{activity.action}</p>
                      <p className="text-sm text-muted-foreground">{activity.user}</p>
                    </div>
                    <span className="text-sm text-muted-foreground">{activity.time}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No recent activity
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
