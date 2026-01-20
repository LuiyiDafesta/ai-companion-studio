import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { AdminUser } from "@/hooks/useAdmin";
import { Badge } from "@/components/ui/badge";
import { UserAgentsList } from "./UserAgentsList";

interface UserDetailsDialogProps {
    user: AdminUser | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const UserDetailsDialog = ({ user, open, onOpenChange }: UserDetailsDialogProps) => {
    if (!user) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>User Details</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <h4 className="text-sm font-medium text-muted-foreground">Full Name</h4>
                            <p className="text-base">{user.full_name || 'N/A'}</p>
                        </div>
                        <div>
                            <h4 className="text-sm font-medium text-muted-foreground">Email</h4>
                            <p className="text-base">{user.email}</p>
                        </div>
                        <div>
                            <h4 className="text-sm font-medium text-muted-foreground">Role</h4>
                            <Badge variant="outline">{user.role}</Badge>
                        </div>
                        <div>
                            <h4 className="text-sm font-medium text-muted-foreground">Credits</h4>
                            <p className="text-base font-bold text-green-600">{user.credits_balance.toLocaleString()}</p>
                        </div>
                        <div>
                            <h4 className="text-sm font-medium text-muted-foreground">Total Agents</h4>
                            <p className="text-base">{user.agents_count}</p>
                        </div>
                        <div>
                            <h4 className="text-sm font-medium text-muted-foreground">Joined At</h4>
                            <p className="text-base">{new Date(user.created_at).toLocaleString()}</p>
                        </div>
                        <div className="col-span-2">
                            <h4 className="text-sm font-medium text-muted-foreground">User ID</h4>
                            <code className="text-xs bg-muted p-1 rounded block mt-1">{user.user_id}</code>
                        </div>
                    </div>

                    <div className="pt-4 border-t">
                        <h4 className="text-sm font-medium text-muted-foreground mb-3">Agents ({user.agents_count})</h4>
                        <UserAgentsList userId={user.user_id} />
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
