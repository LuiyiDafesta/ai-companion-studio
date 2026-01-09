import { Plus, Bot, MessageSquare, CreditCard, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { AgentCard } from '@/components/dashboard/AgentCard';
import { RecentConversations } from '@/components/dashboard/RecentConversations';
import { UsageChart } from '@/components/dashboard/UsageChart';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfile';
import { useCredits } from '@/hooks/useCredits';
import { useAgents } from '@/hooks/useAgents';
import { useLanguage } from '@/contexts/LanguageContext';

export const DashboardPage = () => {
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const { data: credits } = useCredits();
  const { data: agents, isLoading: agentsLoading } = useAgents();
  const { t } = useLanguage();

  const displayName = profile?.full_name || 'there';
  const activeAgents = agents?.filter(a => a.status === 'active').length || 0;

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
            value={activeAgents}
            icon={<Bot className="w-6 h-6" />}
          />
          <StatsCard
            title={t('dashboard.conversations')}
            value={0}
            icon={<MessageSquare className="w-6 h-6" />}
          />
          <StatsCard
            title={t('dashboard.creditsRemaining')}
            value={credits?.balance.toLocaleString() || 0}
            icon={<CreditCard className="w-6 h-6" />}
          />
          <StatsCard
            title={t('dashboard.tokensUsed')}
            value={credits?.total_used.toLocaleString() || 0}
            icon={<Zap className="w-6 h-6" />}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <UsageChart />
          </div>
          <div>
            <RecentConversations />
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
                  agent={agent}
                  onEdit={(id) => navigate(`/agents/${id}`)}
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
