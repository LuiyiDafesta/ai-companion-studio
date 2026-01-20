import { useState } from 'react';
import { Search, MoreVertical, Bot, Pause, Play, Trash2, Eye, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AdminAgent {
    id: string;
    name: string;
    description: string | null;
    status: string;
    objective: string;
    user_email: string;
    created_at: string;
    system_prompt?: string;
    welcome_message?: string;
    model?: string;
    avatar_url?: string;
}

export const AdminAgentsPage = () => {
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedAgent, setSelectedAgent] = useState<AdminAgent | null>(null);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Paginación
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 15;

    const { data: agents, isLoading, refetch } = useQuery({
        queryKey: ['admin-all-agents'],
        queryFn: async () => {
            const { data, error } = await (supabase.rpc as any)('get_admin_agents');
            if (error) throw error;
            return data as AdminAgent[];
        },
    });

    const handleViewDetails = async (agent: AdminAgent) => {
        console.log('View Details:', agent.id);
        try {
            const { data, error } = await (supabase.rpc as any)('admin_get_agent_details', {
                target_agent_id: agent.id
            });

            console.log('RPC Response:', { data, error });

            if (error) throw error;

            if (data) {
                setSelectedAgent({ ...agent, ...data });
            } else {
                setSelectedAgent(agent);
            }
            setDetailsOpen(true);
        } catch (error: any) {
            console.error('Error:', error);
            // Fallback: just show what we have
            setSelectedAgent(agent);
            setDetailsOpen(true);
        }
    };

    const handleStatusChange = async (agentId: string, currentStatus: string) => {
        console.log('Toggle Status:', agentId, currentStatus);
        const newStatus = currentStatus === 'active' ? 'paused' : 'active';

        try {
            const { error } = await (supabase.rpc as any)('admin_update_agent_status', {
                target_agent_id: agentId,
                new_status: newStatus
            });

            if (error) {
                console.error('RPC Error:', error);
                throw error;
            }

            toast({ title: "Success", description: `Agent ${newStatus === 'active' ? 'activated' : 'paused'}` });
            queryClient.invalidateQueries({ queryKey: ['admin-all-agents'] });
        } catch (error: any) {
            console.error('Action failed:', error);
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    };

    const handleDelete = async (agentId: string) => {
        if (!confirm("Are you sure you want to delete this agent? This cannot be undone.")) return;
        console.log('Delete Agent:', agentId);

        try {
            const { error } = await (supabase.rpc as any)('admin_delete_agent', {
                target_agent_id: agentId
            });

            if (error) {
                console.error('RPC Error:', error);
                throw error;
            }

            toast({ title: "Success", description: "Agent deleted" });
            queryClient.invalidateQueries({ queryKey: ['admin-all-agents'] });
        } catch (error: any) {
            console.error('Delete failed:', error);
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    };

    const filteredAgents = agents?.filter(agent => {
        const matchesSearch = agent.name.toLowerCase().includes(search.toLowerCase()) ||
            agent.user_email.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = statusFilter === 'all' || agent.status === statusFilter;
        return matchesSearch && matchesStatus;
    }) || [];

    const getStatusBadgeStyle = (status: string) => {
        switch (status) {
            case 'active':
                return 'bg-primary/10 text-primary border-primary/20';
            case 'paused':
                return 'bg-accent/30 text-accent-foreground border-accent-foreground/20';
            case 'archived':
                return 'bg-muted text-muted-foreground border-muted';
            default:
                return 'bg-muted/30 text-muted-foreground border-border';
        }
    };

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">All Agents</h1>
                    <p className="text-muted-foreground">
                        View and manage all agents on the platform
                    </p>
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
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[150px]">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="paused">Paused</SelectItem>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="archived">Archived</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isLoading}>
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : filteredAgents.length === 0 ? (
                    <div className="text-center py-12">
                        <Bot className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                        <p className="text-muted-foreground">No agents found</p>
                    </div>
                ) : (
                    <>
                        <div className="rounded-lg border border-border bg-card overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Agent</TableHead>
                                        <TableHead>Owner</TableHead>
                                        <TableHead>Objective</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Created</TableHead>
                                        <TableHead className="w-[50px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredAgents
                                        .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                                        .map((agent) => (
                                            <TableRow key={agent.id}>
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                                            <Bot className="w-5 h-5 text-primary" />
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-foreground">{agent.name}</p>
                                                            <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                                                                {agent.description || 'No description'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-muted-foreground">
                                                    {agent.user_email}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="capitalize">
                                                        {agent.objective}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className={getStatusBadgeStyle(agent.status)}>
                                                        {agent.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-muted-foreground">
                                                    {new Date(agent.created_at).toLocaleDateString()}
                                                </TableCell>
                                                <TableCell>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                                <MoreVertical className="w-4 h-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={() => handleViewDetails(agent)}>
                                                                <Eye className="w-4 h-4 mr-2" />
                                                                View Details
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem onClick={() => handleStatusChange(agent.id, agent.status)}>
                                                                {agent.status === 'active' ? (
                                                                    <>
                                                                        <Pause className="w-4 h-4 mr-2" />
                                                                        Pause Agent
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Play className="w-4 h-4 mr-2" />
                                                                        Activate Agent
                                                                    </>
                                                                )}
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(agent.id)}>
                                                                <Trash2 className="w-4 h-4 mr-2" />
                                                                Delete Agent
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Paginación */}
                        {filteredAgents.length > ITEMS_PER_PAGE && (
                            <div className="flex items-center justify-between p-4 bg-card border border-border rounded-lg mt-4">
                                <p className="text-sm text-muted-foreground">
                                    Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredAgents.length)} de {filteredAgents.length} agentes
                                </p>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                    >
                                        Anterior
                                    </Button>
                                    <span className="flex items-center px-3 text-sm">
                                        Página {currentPage} de {Math.ceil(filteredAgents.length / ITEMS_PER_PAGE)}
                                    </span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(p => p + 1)}
                                        disabled={currentPage * ITEMS_PER_PAGE >= filteredAgents.length}
                                    >
                                        Siguiente
                                    </Button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Agent Details Dialog */}
            <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Agent Details</DialogTitle>
                    </DialogHeader>
                    {selectedAgent && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                                    {selectedAgent.avatar_url ? (
                                        <img src={selectedAgent.avatar_url} alt={selectedAgent.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <Bot className="w-8 h-8 text-primary" />
                                    )}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold">{selectedAgent.name}</h3>
                                    <p className="text-muted-foreground text-sm">{selectedAgent.user_email}</p>
                                    <Badge variant="outline" className="mt-1">{selectedAgent.status}</Badge>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <h5 className="font-medium text-muted-foreground text-sm">Model</h5>
                                    <p>{selectedAgent.model || 'Default'}</p>
                                </div>
                                <div>
                                    <h5 className="font-medium text-muted-foreground text-sm">Objective</h5>
                                    <p className="capitalize">{selectedAgent.objective || 'N/A'}</p>
                                </div>
                                <div>
                                    <h5 className="font-medium text-muted-foreground text-sm">Created At</h5>
                                    <p>{new Date(selectedAgent.created_at).toLocaleString()}</p>
                                </div>
                            </div>

                            <div>
                                <h5 className="font-medium text-muted-foreground text-sm mb-1">Description</h5>
                                <p className="text-sm border p-2 rounded-md bg-muted/20">{selectedAgent.description || 'No description'}</p>
                            </div>

                            <div>
                                <h5 className="font-medium text-muted-foreground text-sm mb-1">System Prompt</h5>
                                <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto whitespace-pre-wrap font-mono">
                                    {selectedAgent.system_prompt || 'No system prompt'}
                                </pre>
                            </div>

                            {selectedAgent.welcome_message && (
                                <div>
                                    <h5 className="font-medium text-muted-foreground text-sm mb-1">Welcome Message</h5>
                                    <p className="text-sm border p-2 rounded-md bg-muted/20">{selectedAgent.welcome_message}</p>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
};

export default AdminAgentsPage;
