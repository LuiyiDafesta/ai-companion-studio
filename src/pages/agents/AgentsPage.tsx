import { useState } from 'react';
import { Plus, Search, Filter, Grid, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AgentCard } from '@/components/dashboard/AgentCard';
import { useNavigate } from 'react-router-dom';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
  {
    id: '4',
    name: 'Lead Capture Bot',
    description: 'Captures visitor information and qualifies leads for the sales team.',
    status: 'paused' as const,
    objective: 'Sales',
    conversations: 45,
    messagesThisMonth: 320,
  },
];

export const AgentsPage = () => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredAgents = mockAgents.filter(agent => {
    const matchesSearch = agent.name.toLowerCase().includes(search.toLowerCase()) ||
                          agent.description.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || agent.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">AI Agents</h1>
            <p className="text-muted-foreground">
              Create and manage your conversational AI agents
            </p>
          </div>
          <Button onClick={() => navigate('/agents/new')}>
            <Plus className="w-4 h-4 mr-2" />
            Create Agent
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search agents..." 
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="training">Training</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex border border-border rounded-lg">
              <Button 
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'} 
                size="icon"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button 
                variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
                size="icon"
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {filteredAgents.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">No agents found</h3>
            <p className="text-muted-foreground mb-4">
              Try adjusting your search or filter criteria
            </p>
            <Button variant="outline" onClick={() => { setSearch(''); setStatusFilter('all'); }}>
              Clear filters
            </Button>
          </div>
        ) : (
          <div className={viewMode === 'grid' 
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            : "space-y-4"
          }>
            {filteredAgents.map((agent) => (
              <AgentCard 
                key={agent.id} 
                agent={agent}
                onEdit={(id) => navigate(`/agents/${id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AgentsPage;
