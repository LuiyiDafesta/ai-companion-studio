import { useState } from "react";
import { useAdminUserAgents } from "@/hooks/useAdmin";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, MessageSquare, Calendar, MoreVertical, Eye, Play, Pause, Trash2, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export const UserAgentsList = ({ userId }: { userId: string }) => {
    const { data: agents, isLoading } = useAdminUserAgents(userId);
    const [selectedAgent, setSelectedAgent] = useState<any | null>(null);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const handleStatusChange = async (e: React.MouseEvent, agentId: string, currentStatus: string) => {
        e.stopPropagation();
        console.log('Action: Toggle Status', { agentId, currentStatus });

        const newStatus = currentStatus === 'active' ? 'paused' : 'active';
        try {
            const { error } = await (supabase.rpc as any)('admin_update_agent_status', {
                target_agent_id: agentId,
                new_status: newStatus
            });

            if (error) {
                console.error('RPC Error (admin_update_agent_status):', error);
                throw error;
            }

            console.log('Status updated successfully');
            toast({ title: "Success", description: `Agent ${newStatus === 'active' ? 'activated' : 'paused'}` });
            queryClient.invalidateQueries({ queryKey: ['admin-user-agents'] });
        } catch (error: any) {
            console.error('Catch error:', error);
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    };

    const handleDelete = async (e: React.MouseEvent, agentId: string) => {
        e.stopPropagation();
        if (!confirm("Are you sure you want to delete this agent? This cannot be undone.")) return;
        console.log('Action: Delete Agent', agentId);

        try {
            const { error } = await (supabase.rpc as any)('admin_delete_agent', {
                target_agent_id: agentId
            });

            if (error) {
                console.error('RPC Error (admin_delete_agent):', error);
                throw error;
            }

            console.log('Agent deleted successfully');
            toast({ title: "Success", description: "Agent deleted" });
            queryClient.invalidateQueries({ queryKey: ['admin-user-agents'] });
        } catch (error: any) {
            console.error('Delete failed:', error);
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    };

    const handleViewDetails = async (e: React.MouseEvent, agentId: string) => {
        e.stopPropagation();
        console.log('Action: View Details', agentId);
        try {
            const { data, error } = await (supabase.rpc as any)('admin_get_agent_details', {
                target_agent_id: agentId
            });

            console.log('RPC Response:', { data, error });

            if (error) throw error;

            if (!data) {
                console.warn('RPC data empty');
                toast({ title: "Info", description: "No details available for this agent." });
                return;
            }

            setSelectedAgent(data);
            setDetailsOpen(true);
        } catch (error: any) {
            console.error('Details fetch failed:', error);
            toast({ title: "Error fetching details", description: error.message, variant: "destructive" });
        }
    };

    if (isLoading) {
        return (
            <div className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
            </div>
        );
    }

    if (!agents || agents.length === 0) {
        return (
            <div className="text-center py-8 text-muted-foreground bg-muted/30 rounded-lg">
                <Bot className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No agents found for this user.</p>
            </div>
        );
    }

    return (
        <>
            <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-3">
                    {agents.map((agent) => (
                        <div key={agent.id} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card group">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                                {agent.avatar_url ? (
                                    <img src={agent.avatar_url} alt={agent.name} className="w-full h-full object-cover" />
                                ) : (
                                    <Bot className="w-5 h-5 text-primary" />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                    <h4 className="font-medium truncate">{agent.name}</h4>
                                    <div className="flex items-center gap-2">
                                        <Badge variant={agent.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                                            {agent.status}
                                        </Badge>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <MoreVertical className="w-4 h-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={(e) => handleViewDetails(e, agent.id)}>
                                                    <Eye className="w-4 h-4 mr-2" />
                                                    View Details
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={(e) => handleStatusChange(e, agent.id, agent.status)}>
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
                                                <DropdownMenuItem className="text-destructive" onClick={(e) => handleDelete(e, agent.id)}>
                                                    <Trash2 className="w-4 h-4 mr-2" />
                                                    Delete Agent
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                                <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                                    {agent.description || 'No description'}
                                </p>
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                        <MessageSquare className="w-3 h-3" />
                                        <span>{agent.conversations_count} chats</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        <span>{new Date(agent.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </ScrollArea>

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
                                <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto whitespace-pre-wrap font-mono relative">
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
        </>
    );
};
