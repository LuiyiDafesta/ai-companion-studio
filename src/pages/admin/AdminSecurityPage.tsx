import { Shield, Key, Lock, UserCheck, AlertTriangle, Save, Loader2 } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useState } from 'react';

export const AdminSecurityPage = () => {
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        await new Promise(resolve => setTimeout(resolve, 1000));
        setIsSaving(false);
    };

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Security Settings</h1>
                        <p className="text-muted-foreground">
                            Configure platform security and access controls
                        </p>
                    </div>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <Save className="w-4 h-4 mr-2" />
                        )}
                        Save Changes
                    </Button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="bg-card">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Lock className="w-5 h-5" />
                                Authentication
                            </CardTitle>
                            <CardDescription>
                                Configure user authentication settings
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <Label>Two-Factor Authentication</Label>
                                    <p className="text-sm text-muted-foreground">Require 2FA for all users</p>
                                </div>
                                <Switch />
                            </div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <Label>Email Verification</Label>
                                    <p className="text-sm text-muted-foreground">Require email verification</p>
                                </div>
                                <Switch defaultChecked />
                            </div>
                            <div className="space-y-2">
                                <Label>Session Timeout (minutes)</Label>
                                <Input type="number" defaultValue="60" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-card">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <UserCheck className="w-5 h-5" />
                                Access Control
                            </CardTitle>
                            <CardDescription>
                                Manage user permissions and access levels
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <Label>Allow User Registration</Label>
                                    <p className="text-sm text-muted-foreground">Enable public signups</p>
                                </div>
                                <Switch defaultChecked />
                            </div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <Label>Admin Approval Required</Label>
                                    <p className="text-sm text-muted-foreground">Approve new users manually</p>
                                </div>
                                <Switch />
                            </div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <Label>Invite-Only Mode</Label>
                                    <p className="text-sm text-muted-foreground">Require invitation to register</p>
                                </div>
                                <Switch />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-card">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Key className="w-5 h-5" />
                                Password Policy
                            </CardTitle>
                            <CardDescription>
                                Set password requirements
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Minimum Password Length</Label>
                                <Input type="number" defaultValue="8" />
                            </div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <Label>Require Uppercase</Label>
                                    <p className="text-sm text-muted-foreground">At least one uppercase letter</p>
                                </div>
                                <Switch defaultChecked />
                            </div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <Label>Require Numbers</Label>
                                    <p className="text-sm text-muted-foreground">At least one number</p>
                                </div>
                                <Switch defaultChecked />
                            </div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <Label>Require Special Characters</Label>
                                    <p className="text-sm text-muted-foreground">At least one special character</p>
                                </div>
                                <Switch />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-card">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Shield className="w-5 h-5" />
                                Security Monitoring
                            </CardTitle>
                            <CardDescription>
                                Monitor and log security events
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <Label>Login Attempt Logging</Label>
                                    <p className="text-sm text-muted-foreground">Log all login attempts</p>
                                </div>
                                <Switch defaultChecked />
                            </div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <Label>IP Blocking</Label>
                                    <p className="text-sm text-muted-foreground">Block suspicious IPs</p>
                                </div>
                                <Switch defaultChecked />
                            </div>
                            <div className="space-y-2">
                                <Label>Max Failed Attempts</Label>
                                <Input type="number" defaultValue="5" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card className="bg-card border-amber-500/50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-amber-500">
                            <AlertTriangle className="w-5 h-5" />
                            Security Alerts
                        </CardTitle>
                        <CardDescription>Recent security events</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-center py-8 text-muted-foreground">
                            No security alerts at this time
                        </div>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
};

export default AdminSecurityPage;
