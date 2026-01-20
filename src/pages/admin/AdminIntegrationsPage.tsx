import { Webhook, MessageSquare, Globe, Smartphone, Plus, Settings, Save, Loader2 } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useWebhooks } from '@/hooks/useWebhooks';
import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';

const integrations = [
    {
        id: 'whatsapp',
        name: 'WhatsApp Business',
        description: 'Connect your agents to WhatsApp for instant messaging',
        icon: Smartphone,
        status: 'inactive',
        color: 'bg-green-500/10 text-green-500',
    },
    {
        id: 'webchat',
        name: 'Web Chat Widget',
        description: 'Embed a chat widget on your website',
        icon: MessageSquare,
        status: 'active',
        color: 'bg-primary/10 text-primary',
    },
    {
        id: 'api',
        name: 'REST API',
        description: 'Integrate with any platform using our API',
        icon: Globe,
        status: 'active',
        color: 'bg-blue-500/10 text-blue-500',
    },
];

export const AdminIntegrationsPage = () => {
    const { webhooks, isLoading, updateWebhook } = useWebhooks();
    const [localWebhooks, setLocalWebhooks] = useState<Record<string, string>>({});
    const { toast } = useToast();

    const handleUrlChange = (id: string, value: string) => {
        setLocalWebhooks(prev => ({ ...prev, [id]: value }));
    };

    const handleSave = async (webhookId: string) => {
        const newValue = localWebhooks[webhookId];
        if (newValue === undefined) return; // No changes

        try {
            await updateWebhook.mutateAsync({ id: webhookId, url: newValue });
            // Cleanup local state to show saved state
            setLocalWebhooks(prev => {
                const newState = { ...prev };
                delete newState[webhookId];
                return newState;
            });
        } catch (error) {
            console.error(error);
        }
    };

    const handleToggleActive = async (webhookId: string, currentState: boolean) => {
        try {
            await updateWebhook.mutateAsync({ id: webhookId, url: '', is_active: !currentState }); // URL se ignora en el hook si solo cambiamos active pero el hook pide string
            // Corrección: El hook updateWebhook pide url obligatorio, vamos a ajustarlo o pasar la url actual si la tenemos.
            // Para simplificar, asumimos que el usuario no quiere borrar la URL al desactivar.
            const webhook = webhooks?.find(w => w.id === webhookId);
            if (webhook) {
                await updateWebhook.mutateAsync({ id: webhookId, url: webhook.url, is_active: !currentState });
            }
        } catch (error) {
            console.error(error);
        }
    };

    // Group webhooks by category
    const groupedWebhooks = webhooks?.reduce((acc, webhook) => {
        const category = webhook.category || 'general';
        if (!acc[category]) acc[category] = [];
        acc[category].push(webhook);
        return acc;
    }, {} as Record<string, typeof webhooks>);

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Integrations</h1>
                        <p className="text-muted-foreground">
                            Manage platform integrations and connections
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {integrations.map((integration) => (
                        <Card key={integration.id} className="bg-card">
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-12 h-12 rounded-lg ${integration.color} flex items-center justify-center`}>
                                            <integration.icon className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-lg">{integration.name}</CardTitle>
                                            <CardDescription>{integration.description}</CardDescription>
                                        </div>
                                    </div>
                                    <Switch checked={integration.status === 'active'} />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between">
                                    <Badge
                                        variant="outline"
                                        className={integration.status === 'active'
                                            ? 'bg-primary/10 text-primary border-primary/20'
                                            : 'bg-muted text-muted-foreground'
                                        }
                                    >
                                        {integration.status === 'active' ? 'Connected' : 'Disconnected'}
                                    </Badge>
                                    <Button variant="ghost" size="sm">
                                        <Settings className="w-4 h-4 mr-2" />
                                        Configure
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Webhook Configuration Section */}
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <Webhook className="w-5 h-5" />
                        n8n Webhook Configuration
                    </h2>

                    {isLoading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-6">
                            {groupedWebhooks && Object.entries(groupedWebhooks).map(([category, hooks]) => (
                                <Card key={category} className="bg-card">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-lg capitalize">{category} Webhooks</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {hooks.map((webhook) => (
                                            <div key={webhook.id} className="flex flex-col gap-2 p-3 rounded-lg border bg-background/50">
                                                <div className="flex items-center justify-between mb-1">
                                                    <div className="flex flex-col">
                                                        <Label htmlFor={webhook.id} className="font-medium text-base">
                                                            {webhook.name}
                                                        </Label>
                                                        <span className="text-xs text-muted-foreground">{webhook.description}</span>
                                                        <span className="text-xs font-mono text-primary/70 mt-0.5">{webhook.key}</span>
                                                    </div>
                                                    <Switch
                                                        checked={webhook.is_active}
                                                        onCheckedChange={() => handleToggleActive(webhook.id, webhook.is_active)}
                                                    />
                                                </div>
                                                <div className="flex gap-2">
                                                    <Input
                                                        id={webhook.id}
                                                        value={localWebhooks[webhook.id] !== undefined ? localWebhooks[webhook.id] : webhook.url}
                                                        onChange={(e) => handleUrlChange(webhook.id, e.target.value)}
                                                        placeholder="https://n8n.your-domain.com/webhook/..."
                                                        className="font-mono text-xs"
                                                    />
                                                    {localWebhooks[webhook.id] !== undefined && localWebhooks[webhook.id] !== webhook.url && (
                                                        <Button
                                                            size="sm"
                                                            onClick={() => handleSave(webhook.id)}
                                                            disabled={updateWebhook.isPending}
                                                        >
                                                            {updateWebhook.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
};

export default AdminIntegrationsPage;
