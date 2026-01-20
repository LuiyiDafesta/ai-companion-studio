import { Plus, Bot, MessageSquare, CreditCard, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { AgentCard } from '@/components/dashboard/AgentCard';
import { RecentConversations } from '@/components/dashboard/RecentConversations';
import { UsageChart } from '@/components/dashboard/UsageChart';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfile';
import { useCredits, useDashboardStats } from '@/hooks/useCredits';
import { useAgents, useUpdateAgent } from '@/hooks/useAgents';
import { useSubscription, PLAN_LIMITS } from '@/hooks/useSubscription';
import { useLanguage } from '@/contexts/LanguageContext';
import { AgentStatus } from '@/types/database';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const DashboardPage = () => {
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const { data: credits } = useCredits();
  const { data: stats } = useDashboardStats();
  const { data: agents, isLoading: agentsLoading } = useAgents();
  const updateAgent = useUpdateAgent();
  const { data: subscription } = useSubscription();
  const { t } = useLanguage();

  // Fetch conversation counts per agent for the cards
  const { data: conversationCounts } = useQuery({
    queryKey: ['agent-conversations-count-dashboard', (agents || []).map(a => a.id).join(',')],
    queryFn: async () => {
      if (!agents || agents.length === 0) return {};

      const agentIds = agents.map(a => a.id);

      // Fetch all conversations for these agents (ids only)
      const { data, error } = await supabase
        .from('ah_public_conversations')
        .select('agent_id')
        .in('agent_id', agentIds);

      if (error) {
        console.error('Error fetching conversation counts:', error);
        return {};
      }

      // Aggregate counts in memory
      const counts: Record<string, number> = {};
      data?.forEach(c => {
        counts[c.agent_id] = (counts[c.agent_id] || 0) + 1;
      });

      return counts;
    },
    enabled: !!agents && agents.length > 0,
    refetchInterval: 30000 // Update every 30s
  });

  const displayName = profile?.full_name || 'there';
  const activeAgents = agents?.filter(a => a.status === 'active').length || 0;

  const planType = subscription?.plan_type || 'free';
  const planLimits = PLAN_LIMITS[planType];
  const activeAgentsDisplay = `${activeAgents} / ${planLimits.agents}`;

  const handleToggleStatus = (id: string) => {
    const agent = agents?.find(a => a.id === id);
    if (!agent) return;

    let newStatus: AgentStatus;
    if (agent.status === 'active') {
      newStatus = 'paused';
    } else if (agent.status === 'archived') {
      newStatus = 'draft';
    } else {
      newStatus = 'active';
    }

    updateAgent.mutate({ id, data: { status: newStatus } });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t('dashboard.title')}</h1>
            <p className="text-muted-foreground">
              {t('dashboard.welcome').replace('{name}', displayName)}
            </p>
          </div>
          <Button onClick={() => navigate('/agents/new')}>
            <Plus className="w-4 h-4 mr-2" />
            {t('dashboard.newAgent')}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title={t('dashboard.activeAgents')}
            value={activeAgentsDisplay}
            icon={<Bot className="w-6 h-6" />}
          />
          <StatsCard
            title={t('dashboard.conversations')}
            value={stats?.conversations || 0}
            icon={<MessageSquare className="w-6 h-6" />}
          />
          <StatsCard
            title={t('dashboard.creditsRemaining')}
            value={credits?.balance.toLocaleString() || 0}
            description={planLimits.label}
            icon={<CreditCard className="w-6 h-6" />}
          />
          <StatsCard
            title={t('dashboard.tokensUsed')}
            value={(stats?.messages || 0).toLocaleString()}
            description="Mensajes enviados"
            icon={<Zap className="w-6 h-6" />}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <UsageChart />
          </div>
          <div>
            <RecentConversations agents={agents} />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">{t('dashboard.yourAgents')}</h2>
            <Button variant="ghost" onClick={() => navigate('/agents')}>
              {t('dashboard.viewAll')}
            </Button>
          </div>
          {agentsLoading ? (
            <div className="text-center py-8 text-muted-foreground">{t('dashboard.loadingAgents')}</div>
          ) : agents && agents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {agents.slice(0, 3).map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={{
                    ...agent,
                    conversations: conversationCounts ? (conversationCounts[agent.id] || 0) : 0
                  }}
                  onEdit={(id) => navigate(`/agents/${id}`)}
                  onToggleStatus={handleToggleStatus}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 border border-dashed border-border rounded-lg">
              <Bot className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-foreground font-medium">{t('dashboard.noAgentsYet')}</p>
              <p className="text-sm text-muted-foreground mb-4">{t('dashboard.createFirstAgent')}</p>
              <Button onClick={() => navigate('/agents/new')}>
                <Plus className="w-4 h-4 mr-2" />
                {t('dashboard.createAgent')}
              </Button>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DashboardPage;
