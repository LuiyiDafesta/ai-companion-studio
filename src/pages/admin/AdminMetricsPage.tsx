import { useState, useMemo } from 'react';
import { BarChart3, TrendingUp, Users, Bot, MessageSquare, CreditCard, Loader2 } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, parseISO } from 'date-fns';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export const AdminMetricsPage = () => {
    const [timeRange, setTimeRange] = useState('30d');

    // Fetch ALL conversations (system-wide) - from ah_public_conversations where status updates happen
    const { data: conversations, isLoading: isLoadingConversations } = useQuery({
        queryKey: ['admin-analytics-conversations', timeRange],
        queryFn: async () => {
            let startDate = subDays(new Date(), 30);
            if (timeRange === '7d') startDate = subDays(new Date(), 7);
            if (timeRange === '24h') startDate = subDays(new Date(), 1);
            if (timeRange === '90d') startDate = subDays(new Date(), 90);

            // Query ah_public_conversations - this is where status updates happen
            const { data, error } = await (supabase as any)
                .from('ah_public_conversations')
                .select('*')
                .gte('started_at', startDate.toISOString())
                .order('started_at', { ascending: true });

            if (error) {
                console.error('Error fetching public conversations:', error);
                // Fallback to ah_conversations
                const { data: convData, error: convError } = await supabase
                    .from('ah_conversations')
                    .select('*')
                    .gte('started_at', startDate.toISOString())
                    .order('started_at', { ascending: true });

                if (convError) throw convError;
                console.log('Admin Metrics: Got', convData?.length || 0, 'from ah_conversations');
                return convData || [];
            }
            console.log('Admin Metrics: Got', data?.length || 0, 'from ah_public_conversations');
            return data || [];
        },
    });

    // Fetch ALL agents (system-wide)
    const { data: agents, isLoading: isLoadingAgents } = useQuery({
        queryKey: ['admin-analytics-agents'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('ah_agents')
                .select('id, name, objective, status, user_id');
            if (error) throw error;
            return data || [];
        },
    });

    // Fetch ALL users
    const { data: users, isLoading: isLoadingUsers } = useQuery({
        queryKey: ['admin-analytics-users'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('ah_profiles')
                .select('user_id, email, created_at');
            if (error) throw error;
            return data || [];
        },
    });

    // Fetch credit usage
    const { data: usageLogs, isLoading: isLoadingUsage } = useQuery({
        queryKey: ['admin-analytics-usage', timeRange],
        queryFn: async () => {
            let startDate = subDays(new Date(), 30);
            if (timeRange === '7d') startDate = subDays(new Date(), 7);
            if (timeRange === '24h') startDate = subDays(new Date(), 1);
            if (timeRange === '90d') startDate = subDays(new Date(), 90);

            const { data, error } = await supabase
                .from('ah_usage_logs')
                .select('*')
                .gte('created_at', startDate.toISOString());
            if (error) throw error;
            return data || [];
        },
    });

    const analyticsData = useMemo(() => {
        if (!conversations || !agents) return null;

        // KPIs
        const totalConversations = conversations.length;
        const totalMessages = conversations.reduce((acc: number, curr: any) => acc + (curr.messages_count || 0), 0);
        const totalTokens = conversations.reduce((acc: number, curr: any) => acc + (curr.tokens_used || curr.messages_count || 0), 0);
        const humanTakeoverCount = conversations.filter((c: any) => c.status === 'human_takeover').length;
        const resolvedCount = conversations.filter((c: any) => c.status === 'resolved' || c.status === 'closed').length;
        const activeCount = conversations.filter((c: any) => c.status === 'active').length;
        const totalCreditsUsed = usageLogs?.reduce((acc: number, curr: any) => acc + (curr.amount || 0), 0) || 0;
        const totalUsers = users?.length || 0;
        const totalAgents = agents.length;
        const activeAgents = agents.filter((a: any) => a.status === 'active').length;

        // Daily Trends
        const trendsMap = new Map();
        conversations.forEach((c: any) => {
            const date = format(parseISO(c.started_at), 'MMM d');
            if (!trendsMap.has(date)) {
                trendsMap.set(date, { date, messages: 0, tokens: 0, conversations: 0, credits: 0 });
            }
            const entry = trendsMap.get(date);
            entry.messages += c.messages_count || 0;
            entry.tokens += c.tokens_used || c.messages_count || 0;
            entry.conversations += 1;
        });

        // Add credit usage to trends
        usageLogs?.forEach((log: any) => {
            const date = format(parseISO(log.created_at), 'MMM d');
            if (trendsMap.has(date)) {
                trendsMap.get(date).credits += log.amount || 0;
            }
        });

        const trendsData = Array.from(trendsMap.values());

        // Agent Performance
        const agentMap = new Map();
        agents.forEach((a: any) => {
            agentMap.set(a.id, {
                name: a.name,
                messages: 0,
                tokens: 0,
                conversations: 0,
                resolved: 0,
                human: 0,
                active: 0
            });
        });

        conversations.forEach((c: any) => {
            if (agentMap.has(c.agent_id)) {
                const entry = agentMap.get(c.agent_id);
                entry.messages += c.messages_count || 0;
                entry.tokens += c.tokens_used || 0;
                entry.conversations += 1;

                if (c.status === 'resolved' || c.status === 'closed') {
                    entry.resolved += 1;
                } else if (c.status === 'human_takeover') {
                    entry.human += 1;
                } else {
                    entry.active += 1;
                }
            }
        });
        const agentData = Array.from(agentMap.values())
            .sort((a, b) => b.conversations - a.conversations)
            .slice(0, 10);

        // Objective Distribution
        const objectiveMap = new Map();
        conversations.forEach((c: any) => {
            const agent = agents.find((a: any) => a.id === c.agent_id);
            if (agent?.objective) {
                objectiveMap.set(agent.objective, (objectiveMap.get(agent.objective) || 0) + 1);
            }
        });
        const objectiveData = Array.from(objectiveMap.entries()).map(([name, value]) => ({ name, value }));

        // Status Distribution
        const statusMap = new Map();
        statusMap.set('Active', activeCount);
        statusMap.set('Resolved', resolvedCount);
        statusMap.set('Human Takeover', humanTakeoverCount);
        const statusData = Array.from(statusMap.entries()).map(([name, value]) => ({ name, value }));

        // User Growth (by registration date)
        const userGrowthMap = new Map();
        users?.forEach((u: any) => {
            const date = format(parseISO(u.created_at), 'MMM d');
            userGrowthMap.set(date, (userGrowthMap.get(date) || 0) + 1);
        });
        const userGrowthData = Array.from(userGrowthMap.entries()).map(([date, count]) => ({ date, newUsers: count }));

        return {
            kpis: {
                totalConversations,
                totalMessages,
                totalTokens,
                humanTakeoverCount,
                resolvedCount,
                totalCreditsUsed,
                totalUsers,
                totalAgents,
                activeAgents
            },
            trendsData,
            agentData,
            objectiveData,
            statusData,
            userGrowthData
        };
    }, [conversations, agents, users, usageLogs]);

    const isLoading = isLoadingConversations || isLoadingAgents || isLoadingUsers || isLoadingUsage;

    if (isLoading) {
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
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Platform Metrics</h1>
                        <p className="text-muted-foreground">
                            System-wide analytics and usage statistics
                        </p>
                    </div>
                    <Select value={timeRange} onValueChange={setTimeRange}>
                        <SelectTrigger className="w-[150px]">
                            <SelectValue placeholder="Time range" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="24h">Last 24 hours</SelectItem>
                            <SelectItem value="7d">Last 7 days</SelectItem>
                            <SelectItem value="30d">Last 30 days</SelectItem>
                            <SelectItem value="90d">Last 90 days</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <Card className="bg-card">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-1">
                                <Users className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">Users</span>
                            </div>
                            <p className="text-2xl font-bold">{analyticsData?.kpis.totalUsers.toLocaleString()}</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-card">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-1">
                                <Bot className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">Agents</span>
                            </div>
                            <p className="text-2xl font-bold">{analyticsData?.kpis.totalAgents}</p>
                            <p className="text-xs text-muted-foreground">{analyticsData?.kpis.activeAgents} active</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-card">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-1">
                                <MessageSquare className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">Conversations</span>
                            </div>
                            <p className="text-2xl font-bold">{analyticsData?.kpis.totalConversations.toLocaleString()}</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-card">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-1">
                                <BarChart3 className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">Messages</span>
                            </div>
                            <p className="text-2xl font-bold">{analyticsData?.kpis.totalMessages.toLocaleString()}</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-card">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-1">
                                <TrendingUp className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">Tokens</span>
                            </div>
                            <p className="text-2xl font-bold">{analyticsData?.kpis.totalTokens.toLocaleString()}</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-card">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-1">
                                <CreditCard className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">Credits Used</span>
                            </div>
                            <p className="text-2xl font-bold">{analyticsData?.kpis.totalCreditsUsed.toLocaleString()}</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Secondary KPIs */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-card border-l-4 border-l-green-500">
                        <CardContent className="p-4">
                            <p className="text-sm text-muted-foreground">Resolved Conversations</p>
                            <p className="text-2xl font-bold text-green-600">{analyticsData?.kpis.resolvedCount}</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-card border-l-4 border-l-orange-500">
                        <CardContent className="p-4">
                            <p className="text-sm text-muted-foreground">Human Takeover</p>
                            <p className="text-2xl font-bold text-orange-600">{analyticsData?.kpis.humanTakeoverCount}</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-card border-l-4 border-l-blue-500">
                        <CardContent className="p-4">
                            <p className="text-sm text-muted-foreground">Avg Messages/Conversation</p>
                            <p className="text-2xl font-bold text-blue-600">
                                {analyticsData?.kpis.totalConversations
                                    ? (analyticsData.kpis.totalMessages / analyticsData.kpis.totalConversations).toFixed(1)
                                    : '0'}
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Tabs for detailed analytics */}
                <Tabs defaultValue="trends" className="space-y-6">
                    <TabsList>
                        <TabsTrigger value="trends">Trends</TabsTrigger>
                        <TabsTrigger value="agents">Top Agents</TabsTrigger>
                        <TabsTrigger value="distribution">Distribution</TabsTrigger>
                    </TabsList>

                    <TabsContent value="trends">
                        <Card className="bg-card">
                            <CardHeader>
                                <CardTitle>Daily Activity</CardTitle>
                                <CardDescription>Conversations & Messages over time</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[350px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={analyticsData?.trendsData}>
                                            <defs>
                                                <linearGradient id="colorConversations" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                            <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                                            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: 'hsl(var(--card))',
                                                    border: '1px solid hsl(var(--border))',
                                                    borderRadius: '8px',
                                                    color: 'hsl(var(--foreground))'
                                                }}
                                            />
                                            <Legend />
                                            <Area type="monotone" dataKey="conversations" name="Conversations" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorConversations)" />
                                            <Area type="monotone" dataKey="messages" name="Messages" stroke="hsl(var(--chart-2))" strokeWidth={2} fillOpacity={0} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="agents">
                        <Card className="bg-card">
                            <CardHeader>
                                <CardTitle>Top 10 Agents by Activity</CardTitle>
                                <CardDescription>Performance breakdown by conversation status</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[400px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={analyticsData?.agentData} layout="vertical">
                                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={true} vertical={false} />
                                            <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                                            <YAxis dataKey="name" type="category" width={120} stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: 'hsl(var(--card))',
                                                    border: '1px solid hsl(var(--border))',
                                                    borderRadius: '8px',
                                                    color: 'hsl(var(--foreground))'
                                                }}
                                            />
                                            <Legend />
                                            <Bar dataKey="active" stackId="a" name="Active" fill="hsl(var(--primary))" barSize={20} />
                                            <Bar dataKey="human" stackId="a" name="Human" fill="hsl(var(--chart-5))" barSize={20} />
                                            <Bar dataKey="resolved" stackId="a" name="Resolved" fill="hsl(var(--chart-2))" barSize={20} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="distribution">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Card className="bg-card">
                                <CardHeader>
                                    <CardTitle>Conversations by Objective</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="h-[300px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={analyticsData?.objectiveData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={100}
                                                    paddingAngle={5}
                                                    dataKey="value"
                                                >
                                                    {analyticsData?.objectiveData.map((_, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="flex justify-center flex-wrap gap-4 mt-4">
                                        {analyticsData?.objectiveData.map((entry, index) => (
                                            <div key={entry.name} className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                                <span className="text-sm capitalize">{entry.name} ({entry.value})</span>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-card">
                                <CardHeader>
                                    <CardTitle>Conversation Status</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="h-[300px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={analyticsData?.statusData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={100}
                                                    paddingAngle={5}
                                                    dataKey="value"
                                                >
                                                    {analyticsData?.statusData.map((_, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="flex justify-center flex-wrap gap-4 mt-4">
                                        {analyticsData?.statusData.map((entry, index) => (
                                            <div key={entry.name} className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[(index + 2) % COLORS.length] }} />
                                                <span className="text-sm">{entry.name} ({entry.value})</span>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </DashboardLayout>
    );
};

export default AdminMetricsPage;
