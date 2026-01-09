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

export const DashboardPage = () => {
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const { data: credits } = useCredits();
  const { data: agents, isLoading: agentsLoading } = useAgents();

  const displayName = profile?.full_name || 'there';
  const activeAgents = agents?.filter(a => a.status === 'active').length || 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back, {displayName}! Here's an overview of your AI agents.
            </p>
          </div>
          <Button onClick={() => navigate('/agents/new')}>
            <Plus className="w-4 h-4 mr-2" />
            New Agent
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Active Agents"
            value={activeAgents}
            icon={<Bot className="w-6 h-6" />}
          />
          <StatsCard
            title="Conversations"
            value={0}
            icon={<MessageSquare className="w-6 h-6" />}
          />
          <StatsCard
            title="Credits Remaining"
            value={credits?.balance.toLocaleString() || 0}
            icon={<CreditCard className="w-6 h-6" />}
          />
          <StatsCard
            title="Tokens Used"
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
            <h2 className="text-lg font-semibold text-foreground">Your Agents</h2>
            <Button variant="ghost" onClick={() => navigate('/agents')}>
              View All
            </Button>
          </div>
          {agentsLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading agents...</div>
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
              <p className="text-foreground font-medium">No agents yet</p>
              <p className="text-sm text-muted-foreground mb-4">Create your first AI agent to get started</p>
              <Button onClick={() => navigate('/agents/new')}>
                <Plus className="w-4 h-4 mr-2" />
                Create Agent
              </Button>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DashboardPage;
