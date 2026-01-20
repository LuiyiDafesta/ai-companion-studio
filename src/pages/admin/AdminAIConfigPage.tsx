import { Database, Cpu, Zap, Settings, Save, Loader2 } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useState } from 'react';

export const AdminAIConfigPage = () => {
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        // Simulate save
        await new Promise(resolve => setTimeout(resolve, 1000));
        setIsSaving(false);
    };

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">AI Configuration</h1>
                        <p className="text-muted-foreground">
                            Configure AI models and parameters
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
                                <Cpu className="w-5 h-5" />
                                Default Model
                            </CardTitle>
                            <CardDescription>
                                Select the default AI model for new agents
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Primary Model</Label>
                                <Select defaultValue="gpt-4">
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select model" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="gpt-4">GPT-4</SelectItem>
                                        <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                                        <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                                        <SelectItem value="claude-3">Claude 3</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Fallback Model</Label>
                                <Select defaultValue="gpt-3.5-turbo">
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select model" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                                        <SelectItem value="claude-instant">Claude Instant</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-card">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Zap className="w-5 h-5" />
                                Performance Settings
                            </CardTitle>
                            <CardDescription>
                                Configure response parameters
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Max Tokens per Response</Label>
                                <Input type="number" defaultValue="1024" />
                            </div>
                            <div className="space-y-2">
                                <Label>Temperature (0-1)</Label>
                                <Input type="number" step="0.1" min="0" max="1" defaultValue="0.7" />
                            </div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <Label>Stream Responses</Label>
                                    <p className="text-sm text-muted-foreground">Enable real-time streaming</p>
                                </div>
                                <Switch defaultChecked />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-card">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Database className="w-5 h-5" />
                                API Keys
                            </CardTitle>
                            <CardDescription>
                                Configure your AI provider credentials
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>OpenAI API Key</Label>
                                <Input type="password" placeholder="sk-..." />
                            </div>
                            <div className="space-y-2">
                                <Label>Anthropic API Key</Label>
                                <Input type="password" placeholder="sk-ant-..." />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-card">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Settings className="w-5 h-5" />
                                Advanced Settings
                            </CardTitle>
                            <CardDescription>
                                Additional configuration options
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <Label>Rate Limiting</Label>
                                    <p className="text-sm text-muted-foreground">Limit API requests per user</p>
                                </div>
                                <Switch defaultChecked />
                            </div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <Label>Content Moderation</Label>
                                    <p className="text-sm text-muted-foreground">Filter inappropriate content</p>
                                </div>
                                <Switch defaultChecked />
                            </div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <Label>Usage Logging</Label>
                                    <p className="text-sm text-muted-foreground">Log all API requests</p>
                                </div>
                                <Switch />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default AdminAIConfigPage;
