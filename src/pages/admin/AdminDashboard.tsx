import { 
  Users, 
  Bot, 
  MessageSquare, 
  CreditCard, 
  TrendingUp,
  Activity
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

const usageData = [
  { name: 'Week 1', users: 120, messages: 4500, tokens: 45000 },
  { name: 'Week 2', users: 145, messages: 5200, tokens: 52000 },
  { name: 'Week 3', users: 168, messages: 6100, tokens: 61000 },
  { name: 'Week 4', users: 189, messages: 7200, tokens: 72000 },
];

const agentUsage = [
  { name: 'Sales Bot', messages: 2340 },
  { name: 'Support', messages: 1890 },
  { name: 'FAQ', messages: 1200 },
  { name: 'Lead Gen', messages: 890 },
  { name: 'Booking', messages: 650 },
];

export const AdminDashboard = () => {
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
            value={189}
            icon={<Users className="w-6 h-6" />}
            trend={{ value: 23, isPositive: true }}
          />
          <StatsCard
            title="Active Agents"
            value={342}
            icon={<Bot className="w-6 h-6" />}
            trend={{ value: 15, isPositive: true }}
          />
          <StatsCard
            title="Messages Today"
            value="12.4K"
            icon={<MessageSquare className="w-6 h-6" />}
            trend={{ value: 8, isPositive: true }}
          />
          <StatsCard
            title="Revenue (MTD)"
            value="$24,580"
            icon={<CreditCard className="w-6 h-6" />}
            trend={{ value: 12, isPositive: true }}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Platform Growth
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={usageData}>
                    <defs>
                      <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="name" 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        color: 'hsl(var(--foreground))'
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="users" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorUsers)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Top Agents by Usage
              </CardTitle>
            </CardHeader>
            <CardContent>
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
                      width={80}
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
            </CardContent>
          </Card>
        </div>

        <Card className="bg-card">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { action: 'New user registered', user: 'john@example.com', time: '2 min ago' },
                { action: 'Agent created', user: 'sarah@company.com', time: '15 min ago' },
                { action: 'Subscription upgraded', user: 'mike@startup.io', time: '1 hour ago' },
                { action: 'Documents uploaded', user: 'alice@corp.com', time: '2 hours ago' },
              ].map((activity, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/30 transition-colors">
                  <div>
                    <p className="font-medium text-foreground">{activity.action}</p>
                    <p className="text-sm text-muted-foreground">{activity.user}</p>
                  </div>
                  <span className="text-sm text-muted-foreground">{activity.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
