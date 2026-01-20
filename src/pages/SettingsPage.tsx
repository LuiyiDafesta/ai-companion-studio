import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
    Bell,
    Webhook,
    Key,
    Save,
    Copy,
    Plus,
    Trash2,
    RefreshCw,
    ExternalLink,
    Shield,
    Download,
    Upload,
    AlertTriangle,
    Loader2
} from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface UserSettings {
    email_welcome: boolean;
    email_new_message: boolean;
    email_low_credits: boolean;
    email_marketing: boolean;
    low_credits_threshold: number;
    crm_webhook_url: string | null;
    crm_webhook_secret: string | null;
}

interface ApiToken {
    id: string;
    name: string;
    token: string;
    last_used_at: string | null;
    created_at: string;
    revoked_at: string | null;
}

export default function SettingsPage() {
    const { toast } = useToast();
    const [settings, setSettings] = useState<UserSettings>({
        email_welcome: true,
        email_new_message: true,
        email_low_credits: true,
        email_marketing: false,
        low_credits_threshold: 100,
        crm_webhook_url: null,
        crm_webhook_secret: null
    });
    const [tokens, setTokens] = useState<ApiToken[]>([]);
    const [newTokenName, setNewTokenName] = useState('');
    const [newlyCreatedToken, setNewlyCreatedToken] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoadingTokens, setIsLoadingTokens] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');

    useEffect(() => {
        loadSettings();
        loadTokens();
    }, []);

    const loadSettings = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('user_settings')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 = not found
                throw error;
            }

            if (data) {
                setSettings({
                    email_welcome: data.email_welcome,
                    email_new_message: data.email_new_message,
                    email_low_credits: data.email_low_credits,
                    email_marketing: data.email_marketing,
                    low_credits_threshold: data.low_credits_threshold,
                    crm_webhook_url: data.crm_webhook_url,
                    crm_webhook_secret: data.crm_webhook_secret
                });
            }
        } catch (error) {
            console.error('Error loading settings:', error);
            toast({
                title: 'Error',
                description: 'No se pudieron cargar las configuraciones',
                variant: 'destructive'
            });
        }
    };

    const saveSettings = async () => {
        try {
            setIsSaving(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { error } = await supabase
                .from('user_settings')
                .upsert({
                    user_id: user.id,
                    ...settings
                });

            if (error) throw error;

            toast({
                title: 'Guardado',
                description: 'Configuraciones actualizadas correctamente'
            });
        } catch (error) {
            console.error('Error saving settings:', error);
            toast({
                title: 'Error',
                description: 'No se pudieron guardar las configuraciones',
                variant: 'destructive'
            });
        } finally {
            setIsSaving(false);
        }
    };

    const loadTokens = async () => {
        try {
            setIsLoadingTokens(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('api_tokens')
                .select('*')
                .eq('user_id', user.id)
                .is('revoked_at', null)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setTokens(data || []);
        } catch (error) {
            console.error('Error loading tokens:', error);
        } finally {
            setIsLoadingTokens(false);
        }
    };

    const generateToken = async () => {
        if (!newTokenName.trim()) {
            toast({
                title: 'Error',
                description: 'Ingresa un nombre para el token',
                variant: 'destructive'
            });
            return;
        }

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Generate secure token
            const token = `ah_${crypto.randomUUID().replace(/-/g, '')}`;

            const { error } = await supabase
                .from('api_tokens')
                .insert({
                    user_id: user.id,
                    name: newTokenName,
                    token: token
                });

            if (error) throw error;

            setNewlyCreatedToken(token);
            setNewTokenName('');
            loadTokens();

            toast({
                title: 'Token generado',
                description: 'Copia el token ahora, no podrás verlo de nuevo'
            });
        } catch (error) {
            console.error('Error generating token:', error);
            toast({
                title: 'Error',
                description: 'No se pudo generar el token',
                variant: 'destructive'
            });
        }
    };

    const revokeToken = async (tokenId: string) => {
        try {
            const { error } = await supabase
                .from('api_tokens')
                .update({ revoked_at: new Date().toISOString() })
                .eq('id', tokenId);

            if (error) throw error;

            loadTokens();
            toast({
                title: 'Token revocado',
                description: 'El token ya no es válido'
            });
        } catch (error) {
            console.error('Error revoking token:', error);
            toast({
                title: 'Error',
                description: 'No se pudo revocar el token',
                variant: 'destructive'
            });
        }
    };

    const copyToken = (token: string) => {
        navigator.clipboard.writeText(token);
        toast({
            title: 'Copiado',
            description: 'Token copiado al portapapeles'
        });
    };

    // Export user data backup
    const handleExportData = async () => {
        setIsExporting(true);
        try {
            const { data, error } = await (supabase.rpc as any)('user_export_my_data');

            if (error) throw error;

            // Create and download file
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const date = new Date().toISOString().split('T')[0];
            a.href = url;
            a.download = `mi_backup_agenthub_${date}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            toast({
                title: 'Backup descargado',
                description: 'Tu backup se ha descargado correctamente'
            });
        } catch (error: any) {
            console.error('Export error:', error);
            toast({
                title: 'Error al exportar',
                description: error.message,
                variant: 'destructive'
            });
        } finally {
            setIsExporting(false);
        }
    };

    // Delete user account
    const handleDeleteAccount = async () => {
        setIsDeleting(true);
        try {
            const { data, error } = await (supabase.rpc as any)('user_delete_my_account');

            if (error) throw error;

            toast({
                title: 'Cuenta eliminada',
                description: 'Todos tus datos han sido eliminados',
                variant: 'destructive'
            });

            // Sign out after deletion
            await supabase.auth.signOut();
            window.location.href = '/';
        } catch (error: any) {
            console.error('Delete error:', error);
            toast({
                title: 'Error al eliminar',
                description: error.message,
                variant: 'destructive'
            });
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="p-6 max-w-5xl mx-auto space-y-6">
                <div>
                    <h1 className="text-3xl font-bold">Configuración</h1>
                    <p className="text-muted-foreground mt-1">
                        Gestiona tus preferencias y configuraciones
                    </p>
                </div>

                {/* Email Notifications */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Bell className="w-5 h-5" />
                            <CardTitle>Notificaciones por Email</CardTitle>
                        </div>
                        <CardDescription>
                            Configura qué emails deseas recibir
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Email de bienvenida</Label>
                                <p className="text-sm text-muted-foreground">
                                    Recibir email al registrarse
                                </p>
                            </div>
                            <Switch
                                checked={settings.email_welcome}
                                onCheckedChange={(checked) =>
                                    setSettings({ ...settings, email_welcome: checked })
                                }
                            />
                        </div>

                        <Separator />

                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Nuevos mensajes del widget</Label>
                                <p className="text-sm text-muted-foreground">
                                    Notificación cuando un visitante envía un mensaje
                                </p>
                            </div>
                            <Switch
                                checked={settings.email_new_message}
                                onCheckedChange={(checked) =>
                                    setSettings({ ...settings, email_new_message: checked })
                                }
                            />
                        </div>

                        <Separator />

                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Alerta de créditos bajos</Label>
                                <p className="text-sm text-muted-foreground">
                                    Notificación cuando tus créditos estén por debajo del umbral
                                </p>
                            </div>
                            <Switch
                                checked={settings.email_low_credits}
                                onCheckedChange={(checked) =>
                                    setSettings({ ...settings, email_low_credits: checked })
                                }
                            />
                        </div>

                        {settings.email_low_credits && (
                            <div className="ml-6 space-y-2">
                                <Label htmlFor="threshold">Umbral de créditos</Label>
                                <Input
                                    id="threshold"
                                    type="number"
                                    min="1"
                                    value={settings.low_credits_threshold}
                                    onChange={(e) =>
                                        setSettings({
                                            ...settings,
                                            low_credits_threshold: parseInt(e.target.value) || 100
                                        })
                                    }
                                    className="max-w-xs"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Recibirás un email cuando tengas menos de {settings.low_credits_threshold} créditos
                                </p>
                            </div>
                        )}

                        <Separator />

                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Marketing y novedades</Label>
                                <p className="text-sm text-muted-foreground">
                                    Recibir actualizaciones sobre nuevas funciones
                                </p>
                            </div>
                            <Switch
                                checked={settings.email_marketing}
                                onCheckedChange={(checked) =>
                                    setSettings({ ...settings, email_marketing: checked })
                                }
                            />
                        </div>

                        <div className="pt-4">
                            <Button onClick={saveSettings} disabled={isSaving}>
                                <Save className="w-4 h-4 mr-2" />
                                {isSaving ? 'Guardando...' : 'Guardar preferencias'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* CRM Integration */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Webhook className="w-5 h-5" />
                            <CardTitle>Integración CRM</CardTitle>
                        </div>
                        <CardDescription>
                            Conecta tu CRM para recibir notificaciones de nuevas conversaciones
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="webhook-url">Webhook URL</Label>
                            <Input
                                id="webhook-url"
                                type="url"
                                placeholder="https://tu-crm.com/webhook"
                                value={settings.crm_webhook_url || ''}
                                onChange={(e) =>
                                    setSettings({ ...settings, crm_webhook_url: e.target.value })
                                }
                            />
                            <p className="text-xs text-muted-foreground">
                                URL donde se enviarán las notificaciones de nuevas conversaciones
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="webhook-secret">Secret Key (Opcional)</Label>
                            <Input
                                id="webhook-secret"
                                type="password"
                                placeholder="tu-secret-key"
                                value={settings.crm_webhook_secret || ''}
                                onChange={(e) =>
                                    setSettings({ ...settings, crm_webhook_secret: e.target.value })
                                }
                            />
                            <p className="text-xs text-muted-foreground">
                                Se enviará en el header X-Webhook-Secret para verificar la autenticidad
                            </p>
                        </div>

                        <div className="pt-4">
                            <Button onClick={saveSettings} disabled={isSaving}>
                                <Save className="w-4 h-4 mr-2" />
                                {isSaving ? 'Guardando...' : 'Guardar integración'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* API Tokens */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Key className="w-5 h-5" />
                            <CardTitle>Tokens API REST</CardTitle>
                        </div>
                        <CardDescription>
                            Genera tokens para acceder a la API pública
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {newlyCreatedToken && (
                            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg space-y-2">
                                <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                                    ⚠️ Token generado - Guárdalo ahora
                                </p>
                                <div className="flex items-center gap-2">
                                    <code className="flex-1 p-2 bg-white dark:bg-gray-900 rounded text-sm">
                                        {newlyCreatedToken}
                                    </code>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => copyToken(newlyCreatedToken)}
                                    >
                                        <Copy className="w-4 h-4" />
                                    </Button>
                                </div>
                                <p className="text-xs text-yellow-800 dark:text-yellow-200">
                                    Este token solo se muestra una vez. Guárdalo en un lugar seguro.
                                </p>
                            </div>
                        )}

                        <div className="flex gap-2">
                            <Input
                                placeholder="Nombre del token (ej: Mi App)"
                                value={newTokenName}
                                onChange={(e) => setNewTokenName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && generateToken()}
                            />
                            <Button onClick={generateToken}>
                                <Plus className="w-4 h-4 mr-2" />
                                Generar
                            </Button>
                        </div>

                        {isLoadingTokens ? (
                            <div className="text-center py-8 text-muted-foreground">
                                Cargando tokens...
                            </div>
                        ) : tokens.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <Key className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p>No hay tokens generados aún</p>
                            </div>
                        ) : (
                            <div className="border rounded-lg">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Nombre</TableHead>
                                            <TableHead>Token</TableHead>
                                            <TableHead>Último uso</TableHead>
                                            <TableHead>Creado</TableHead>
                                            <TableHead className="w-[100px]">Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {tokens.map((token) => (
                                            <TableRow key={token.id}>
                                                <TableCell className="font-medium">{token.name}</TableCell>
                                                <TableCell>
                                                    <code className="text-xs">
                                                        {token.token.substring(0, 16)}...
                                                    </code>
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {token.last_used_at
                                                        ? formatDistanceToNow(new Date(token.last_used_at), {
                                                            addSuffix: true,
                                                            locale: es
                                                        })
                                                        : 'Nunca'}
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {formatDistanceToNow(new Date(token.created_at), {
                                                        addSuffix: true,
                                                        locale: es
                                                    })}
                                                </TableCell>
                                                <TableCell>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => revokeToken(token.id)}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}

                        <div className="pt-4 border-t">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <ExternalLink className="w-4 h-4" />
                                <a href="#" className="hover:underline">
                                    Ver documentación de la API
                                </a>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Account & Security */}
                <Card className="border-destructive/30">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Shield className="w-5 h-5" />
                            <CardTitle>Cuenta y Seguridad</CardTitle>
                        </div>
                        <CardDescription>
                            Exporta tus datos o elimina tu cuenta
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Backup Section */}
                        <div className="space-y-3">
                            <h4 className="font-medium">Backup de mis datos</h4>
                            <p className="text-sm text-muted-foreground">
                                Descarga una copia de todos tus datos: agentes, documentos, conversaciones y configuraciones.
                            </p>
                            <Button variant="outline" onClick={handleExportData} disabled={isExporting}>
                                {isExporting ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Download className="w-4 h-4 mr-2" />
                                )}
                                Descargar mi backup
                            </Button>
                        </div>

                        <Separator />

                        {/* Delete Account Section */}
                        <div className="space-y-3">
                            <h4 className="font-medium text-destructive">Eliminar cuenta</h4>
                            <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                                <p className="text-sm text-destructive font-medium mb-2">
                                    ⚠️ Esta acción es irreversible
                                </p>
                                <ul className="list-disc list-inside text-sm text-destructive/80 space-y-1">
                                    <li>Se eliminarán todos tus agentes y configuraciones</li>
                                    <li>Se borrarán todas tus conversaciones y mensajes</li>
                                    <li>Se eliminarán todos los documentos subidos</li>
                                    <li>Perderás los créditos restantes</li>
                                </ul>
                            </div>

                            <div className="space-y-2">
                                <Label>Escribe "ELIMINAR CUENTA" para confirmar</Label>
                                <Input
                                    placeholder="ELIMINAR CUENTA"
                                    value={deleteConfirmText}
                                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                                    className="max-w-sm"
                                />
                            </div>

                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button
                                        variant="destructive"
                                        disabled={deleteConfirmText !== 'ELIMINAR CUENTA' || isDeleting}
                                    >
                                        {isDeleting ? (
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        ) : (
                                            <AlertTriangle className="w-4 h-4 mr-2" />
                                        )}
                                        Eliminar mi cuenta permanentemente
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle className="text-destructive">
                                            ⚠️ ¿Estás absolutamente seguro?
                                        </AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Esta acción eliminará permanentemente tu cuenta y todos tus datos.
                                            No podrás recuperar nada después de confirmar.
                                            <br /><br />
                                            <strong>Esto incluye:</strong> todos tus agentes, documentos, conversaciones,
                                            créditos y configuraciones.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={handleDeleteAccount}
                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        >
                                            Sí, eliminar mi cuenta
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
