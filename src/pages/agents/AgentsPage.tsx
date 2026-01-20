import { useState } from 'react';
import { Plus, Search, Filter, Grid, List, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AgentCard } from '@/components/dashboard/AgentCard';
import { useNavigate } from 'react-router-dom';
import { useAgents, useUpdateAgent, useDeleteAgent } from '@/hooks/useAgents';
import { useLanguage } from '@/contexts/LanguageContext';
import { AgentStatus } from '@/types/database';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const AgentsPage = () => {
  const navigate = useNavigate();
  const { data: agents, isLoading } = useAgents();
  const updateAgent = useUpdateAgent();
  const deleteAgent = useDeleteAgent();
  const { t } = useLanguage();

  // Fetch conversation counts per agent
  const { data: conversationCounts } = useQuery({
    queryKey: ['agent-conversations-count-list', (agents || []).map(a => a.id).join(',')],
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
    refetchInterval: 30000
  });

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState<string | null>(null);

  const filteredAgents = agents?.filter(agent => {
    const matchesSearch = agent.name.toLowerCase().includes(search.toLowerCase()) ||
      (agent.description?.toLowerCase() || '').includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || agent.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

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

  const handleDeleteClick = (id: string) => {
    setAgentToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (agentToDelete) {
      deleteAgent.mutate(agentToDelete);
      setDeleteDialogOpen(false);
      setAgentToDelete(null);
    }
  };

  const handleEdit = (id: string) => {
    const agent = agents?.find(a => a.id === id);
    if (agent?.status === 'draft') {
      navigate(`/agents/new?draftId=${id}`);
    } else {
      navigate(`/agents/${id}`);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t('agents.title')}</h1>
            <p className="text-muted-foreground">
              {t('agents.subtitle')}
            </p>
          </div>
          <Button onClick={() => navigate('/agents/new')}>
            <Plus className="w-4 h-4 mr-2" />
            {t('dashboard.createAgent')}
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t('agents.search')}
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder={t('common.status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('agents.all')}</SelectItem>
                <SelectItem value="active">{t('agents.active')}</SelectItem>
                <SelectItem value="paused">{t('agents.paused')}</SelectItem>
                <SelectItem value="draft">{t('agents.draft')}</SelectItem>
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

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredAgents.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">
              {t('agents.noAgentsFound')}
            </h3>
            <p className="text-muted-foreground mb-4">
              {t('agents.trySearchOrCreate')}
            </p>
            {agents?.length === 0 && (
              <Button onClick={() => navigate('/agents/new')}>
                <Plus className="w-4 h-4 mr-2" />
                {t('dashboard.createAgent')}
              </Button>
            )}
          </div>
        ) : (
          <div className={viewMode === 'grid'
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            : "space-y-4"
          }>
            {filteredAgents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={{
                  ...agent,
                  conversations: conversationCounts ? (conversationCounts[agent.id] || 0) : 0
                }}
                onEdit={handleEdit}
                onToggleStatus={handleToggleStatus}
                onDelete={handleDeleteClick}
              />
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('agents.deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('agents.deleteConfirmDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('settings.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('agents.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default AgentsPage;
