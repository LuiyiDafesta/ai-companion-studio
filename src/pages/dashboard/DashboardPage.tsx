import { Plus, Bot, MessageSquare, CreditCard, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { AgentCard } from '@/components/dashboard/AgentCard';
import { RecentConversations } from '@/components/dashboard/RecentConversations';
import { UsageChart } from '@/components/dashboard/UsageChart';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const mockAgents = [
  {
    id: '1',
    name: 'Sales Assistant',
    description: 'Helps qualify leads and answer product questions for potential customers.',
    status: 'active' as const,
    objective: 'Sales',
    conversations: 156,
    messagesThisMonth: 2340,
  },
  {
    id: '2',
    name: 'Support Bot',
    description: 'Handles customer support inquiries and troubleshooting requests 24/7.',
    status: 'active' as const,
    objective: 'Support',
    conversations: 89,
    messagesThisMonth: 1205,
  },
  {
    id: '3',
    name: 'FAQ Agent',
    description: 'Answers frequently asked questions about products and services.',
    status: 'training' as const,
    objective: 'Information',
    conversations: 0,
    messagesThisMonth: 0,
  },
];

export const DashboardPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back, {user?.name}! Here's an overview of your AI agents.
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
            value={2}
            icon={<Bot className="w-6 h-6" />}
            trend={{ value: 50, isPositive: true }}
          />
          <StatsCard
            title="Conversations"
            value={245}
            icon={<MessageSquare className="w-6 h-6" />}
            trend={{ value: 12, isPositive: true }}
          />
          <StatsCard
            title="Credits Remaining"
            value={user?.credits.toLocaleString() || 0}
            icon={<CreditCard className="w-6 h-6" />}
          />
          <StatsCard
            title="Tokens Used"
            value="45.2K"
            icon={<Zap className="w-6 h-6" />}
            trend={{ value: 8, isPositive: false }}
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mockAgents.map((agent) => (
              <AgentCard 
                key={agent.id} 
                agent={agent}
                onEdit={(id) => navigate(`/agents/${id}`)}
              />
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DashboardPage;
