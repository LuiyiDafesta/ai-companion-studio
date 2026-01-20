import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Loader2 } from 'lucide-react';
import { format, subDays, startOfDay, isAfter, parseISO } from 'date-fns';
import { Conversation, Agent } from '@/types/database';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export const AnalyticsPage = () => {
  const [timeRange, setTimeRange] = useState('30d');

  // Fetch conversations
  const { data: conversations, isLoading: isLoadingConversations } = useQuery({
    queryKey: ['analytics-conversations', timeRange],
    queryFn: async () => {
      let startDate = subDays(new Date(), 30);
      if (timeRange === '7d') startDate = subDays(new Date(), 7);
      if (timeRange === '24h') startDate = subDays(new Date(), 1);
      if (timeRange === '90d') startDate = subDays(new Date(), 90);

      const { data, error } = await supabase
        .from('ah_public_conversations' as any)
        .select('*')
        .gte('started_at', startDate.toISOString())
        .order('started_at', { ascending: true });

      if (error) throw error;
      return data as unknown as Conversation[];
    },
  });

  // Fetch agents for names and objectives
  const { data: agents, isLoading: isLoadingAgents } = useQuery({
    queryKey: ['analytics-agents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ah_agents')
        .select('id, name, objective')
        .neq('status', 'draft');
      if (error) throw error;
      return data as unknown as Agent[];
    },
  });

  const analyticsData = useMemo(() => {
    if (!conversations || !agents) return null;

    // 1. KPIs
    const totalMessages = conversations.reduce((acc, curr) => acc + (curr.messages_count || 0), 0);

    // Logic: Use tokens_used if available, otherwise fallback to messages_count (1 msg = 1 token approximation)
    const getTokenCount = (c: any) => {
      const explicitTokens = c.tokens || c.tokens_used;
      return explicitTokens && explicitTokens > 0 ? explicitTokens : (c.messages_count || 0);
    };

    const totalTokens = conversations.reduce((acc, curr) => acc + getTokenCount(curr), 0);
    const humanTakeoverCount = conversations.filter(c => c.status === 'human_takeover').length;
    const resolvedCount = conversations.filter(c => c.status === 'resolved' || c.status === 'closed').length;

    // 2. Daily Trends
    const trendsMap = new Map();
    conversations.forEach(c => {
      const date = format(parseISO(c.started_at), 'MMM d');
      if (!trendsMap.has(date)) {
        trendsMap.set(date, { date, messages: 0, tokens: 0, conversations: 0 });
      }
      const entry = trendsMap.get(date);
      entry.messages += c.messages_count || 0;
      entry.tokens += getTokenCount(c);
      entry.conversations += 1;
    });
    const trendsData = Array.from(trendsMap.values());

    // 3. Agent Performance
    const agentMap = new Map();
    agents.forEach(a => {
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

    conversations.forEach(c => {
      if (agentMap.has(c.agent_id)) {
        const entry = agentMap.get(c.agent_id);
        entry.messages += c.messages_count || 0;
        entry.tokens += getTokenCount(c);
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
      .sort((a, b) => b.conversations - a.conversations) // Sort by total conversations
      .slice(0, 10); // Top 10
    // 4. Objective Distribution
    const objectiveMap = new Map();
    conversations.forEach(c => {
      const agent = agents.find(a => a.id === c.agent_id);
      if (agent?.objective) {
        const obj = agent.objective;
        objectiveMap.set(obj, (objectiveMap.get(obj) || 0) + 1);
      }
    });
    const objectiveData = Array.from(objectiveMap.entries()).map(([name, value]) => ({ name, value }));

    // 5. Channel Distribution
    const channelMap = new Map();
    conversations.forEach(c => {
      const channel = c.channel || 'Web';
      channelMap.set(channel, (channelMap.get(channel) || 0) + 1);
    });
    const channelData = Array.from(channelMap.entries()).map(([name, value]) => ({ name, value }));
    return {
      kpis: { totalMessages, totalTokens, humanTakeoverCount, totalConversations: conversations.length, resolvedCount },
      trendsData,
      agentData,
      objectiveData,
      channelData
    };
  }, [conversations, agents]);

  const isLoading = isLoadingConversations || isLoadingAgents;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[50vh]">
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
            <h1 className="text-2xl font-bold text-foreground">Analíticas</h1>
            <p className="text-muted-foreground">
              Monitorea el rendimiento y uso de tus agentes IA
            </p>
          </div>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Rango de tiempo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Últimas 24 horas</SelectItem>
              <SelectItem value="7d">Últimos 7 días</SelectItem>
              <SelectItem value="30d">Últimos 30 días</SelectItem>
              <SelectItem value="90d">Últimos 90 días</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="bg-card">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">Conversaciones</p>
              <p className="text-3xl font-bold text-foreground">{analyticsData?.kpis.totalConversations.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card className="bg-card">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">Mensajes Totales</p>
              <p className="text-3xl font-bold text-foreground">{analyticsData?.kpis.totalMessages.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card className="bg-card">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">Tokens Usados</p>
              <p className="text-3xl font-bold text-foreground">{(analyticsData?.kpis.totalTokens || 0).toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-l-4 border-l-green-500">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">Resueltas</p>
              <p className="text-3xl font-bold text-foreground">{analyticsData?.kpis.resolvedCount}</p>
              <p className="text-xs text-muted-foreground mt-1">Chats finalizados</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-l-4 border-l-orange-500">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">Atención Humana</p>
              <p className="text-3xl font-bold text-foreground">{analyticsData?.kpis.humanTakeoverCount}</p>
              <p className="text-xs text-muted-foreground mt-1">Chats derivados</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="trends" className="space-y-6">
          <TabsList>
            <TabsTrigger value="trends">Tendencias</TabsTrigger>
            <TabsTrigger value="agents">Por Agente</TabsTrigger>
            <TabsTrigger value="distribution">Distribución</TabsTrigger>
          </TabsList>

          <TabsContent value="trends">
            <Card className="bg-card">
              <CardHeader>
                <CardTitle>Actividad Diaria</CardTitle>
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
                      <Area type="monotone" dataKey="conversations" name="Conversaciones" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorConversations)" />
                      <Area type="monotone" dataKey="messages" name="Mensajes" stroke="hsl(var(--chart-2))" strokeWidth={2} fillOpacity={0} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="agents">
            <Card className="bg-card">
              <CardHeader>
                <CardTitle>Rendimiento por Agente (Estado de Conversaciones)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analyticsData?.agentData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={true} vertical={false} />
                      <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis dataKey="name" type="category" width={100} stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          color: 'hsl(var(--foreground))'
                        }}
                      />
                      <Legend />
                      <Bar dataKey="active" stackId="a" name="Activas" fill="hsl(var(--primary))" radius={[0, 0, 0, 0]} barSize={20} />
                      <Bar dataKey="human" stackId="a" name="Humano" fill="hsl(var(--chart-5))" radius={[0, 0, 0, 0]} barSize={20} />
                      <Bar dataKey="resolved" stackId="a" name="Resueltas" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} barSize={20} />
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
                  <CardTitle>Conversaciones por Objetivo</CardTitle>
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
                          outerRadius={80}
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
                  <CardTitle>Canales de Origen</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={analyticsData?.channelData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {analyticsData?.channelData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex justify-center flex-wrap gap-4 mt-4">
                    {analyticsData?.channelData.map((entry, index) => (
                      <div key={entry.name} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[(index + 2) % COLORS.length] }} />
                        <span className="text-sm capitalize">{entry.name} ({entry.value})</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs >
      </div >
    </DashboardLayout >
  );
};

export default AnalyticsPage;
