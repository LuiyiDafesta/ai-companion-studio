import { useState, useEffect, useRef } from 'react';
import {
  User,
  Building,
  Bell,
  Shield,
  Trash2,
  Save,
  Download,
  Upload,
  Globe,
  Clock,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile, useUpdateProfile } from '@/hooks/useProfile';
import { useLanguage, timezones } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSettings } from '@/hooks/useSettings';
import { sendWeeklyReport } from '@/lib/notifications';
import { supabase } from '@/integrations/supabase/client';

export const SettingsPage = () => {
  const { user } = useAuth();
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const { toast } = useToast();
  const { language, setLanguage, timezone, setTimezone, t } = useLanguage();
  const { settings, updateSettings, isLoading: isLoadingSettings } = useSettings();

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    company_name: '',
    company_website: '',
    phone: '',
  });

  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        email: profile.email || '',
        company_name: profile.company_name || '',
        company_website: profile.company_website || '',
        phone: profile.phone || '',
      });
    }
  }, [profile]);

  const handleSaveProfile = () => {
    updateProfile.mutate({
      full_name: formData.full_name,
      company_name: formData.company_name,
      company_website: formData.company_website,
      phone: formData.phone,
    });
  };

  // Real export function
  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const { data, error } = await (supabase.rpc as any)('user_export_my_data');

      if (error) throw error;

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
        description: 'Tu backup se ha descargado correctamente',
      });
    } catch (error: any) {
      console.error('Export error:', error);
      toast({
        title: 'Error al exportar',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Import backup file
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const [isRestoring, setIsRestoring] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsRestoring(true);
    try {
      const text = await file.text();
      const backupData = JSON.parse(text);

      if (!backupData.backup_version || !backupData.data) {
        throw new Error('Formato de backup inválido');
      }

      // Call restore RPC
      const { data, error } = await (supabase.rpc as any)('user_restore_my_data', {
        backup_data: backupData
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: 'Backup restaurado',
          description: `Se restauraron ${data.restored.agents} agentes, perfil y configuraciones.`,
        });
      } else {
        throw new Error(data.message);
      }
    } catch (error: any) {
      toast({
        title: 'Error al restaurar',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsRestoring(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Delete account function
  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      const { data, error } = await (supabase.rpc as any)('user_delete_my_account');

      if (error) throw error;

      toast({
        title: 'Cuenta eliminada',
        description: 'Todos tus datos han sido eliminados',
        variant: 'destructive',
      });

      await supabase.auth.signOut();
      window.location.href = '/';
    } catch (error: any) {
      console.error('Delete error:', error);
      toast({
        title: 'Error al eliminar',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const currentTimezone = timezones.find(tz => tz.value === timezone);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">{t('settings.loading')}</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('settings.title')}</h1>
          <p className="text-muted-foreground">
            {t('settings.subtitle')}
          </p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="bg-muted/30">
            <TabsTrigger value="profile" className="gap-2">
              <User className="w-4 h-4" />
              {t('settings.profile')}
            </TabsTrigger>
            <TabsTrigger value="company" className="gap-2">
              <Building className="w-4 h-4" />
              {t('settings.company')}
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="w-4 h-4" />
              {t('settings.notifications')}
            </TabsTrigger>
            <TabsTrigger value="preferences" className="gap-2">
              <Globe className="w-4 h-4" />
              {t('settings.preferences')}
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Shield className="w-4 h-4" />
              {t('settings.security')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card className="bg-card">
              <CardHeader>
                <CardTitle>{t('settings.profileInfo')}</CardTitle>
                <CardDescription>{t('settings.updatePersonalDetails')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-2xl font-semibold text-primary">
                      {(formData.full_name || 'U').charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <Button variant="outline">{t('settings.changeAvatar')}</Button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">{t('settings.fullName')}</Label>
                    <Input
                      id="full_name"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">{t('settings.email')}</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      disabled
                      className="bg-muted/30"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">{t('settings.phone')}</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>
                </div>
                <Button onClick={handleSaveProfile} disabled={updateProfile.isPending}>
                  <Save className="w-4 h-4 mr-2" />
                  {updateProfile.isPending ? t('settings.saving') : t('settings.saveChanges')}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="company">
            <Card className="bg-card">
              <CardHeader>
                <CardTitle>{t('settings.companyInfo')}</CardTitle>
                <CardDescription>{t('settings.companyDetails')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="company_name">{t('settings.companyName')}</Label>
                  <Input
                    id="company_name"
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company_website">{t('settings.website')}</Label>
                  <Input
                    id="company_website"
                    value={formData.company_website}
                    onChange={(e) => setFormData({ ...formData, company_website: e.target.value })}
                    placeholder="https://yourcompany.com"
                  />
                </div>
                <Button onClick={handleSaveProfile} disabled={updateProfile.isPending}>
                  <Save className="w-4 h-4 mr-2" />
                  {updateProfile.isPending ? t('settings.saving') : t('settings.saveChanges')}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card className="bg-card">
              <CardHeader>
                <CardTitle>{t('settings.notificationPrefs')}</CardTitle>
                <CardDescription>{t('settings.chooseUpdates')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {isLoadingSettings ? (
                  <div className="flex justify-center p-4">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-foreground">{t('settings.emailNotifications')}</p>
                        <p className="text-sm text-muted-foreground">{t('settings.receiveEmailUpdates')}</p>
                      </div>
                      <Switch
                        checked={settings?.email_new_message ?? true}
                        onCheckedChange={(checked) => updateSettings.mutate({ email_new_message: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-foreground">{t('settings.usageAlerts')}</p>
                        <p className="text-sm text-muted-foreground">{t('settings.lowCreditsNotify')}</p>
                      </div>
                      <Switch
                        checked={settings?.email_low_credits ?? true}
                        onCheckedChange={(checked) => updateSettings.mutate({ email_low_credits: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-foreground">{t('settings.weeklyReports')}</p>
                        <p className="text-sm text-muted-foreground">{t('settings.performanceSummary')}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            if (!user?.id) return;
                            toast({ title: "Enviando reporte de prueba..." });
                            try {
                              const result = await sendWeeklyReport(user.id, { testMode: true });
                              if (result.success) {
                                toast({ title: "Reporte enviado", description: "Revisa tu n8n/email." });
                              } else {
                                toast({ title: "Error", description: "Falló el envío.", variant: "destructive" });
                              }
                            } catch (e) {
                              toast({ title: "Error", description: "Error inesperado.", variant: "destructive" });
                            }
                          }}
                        >
                          Probar
                        </Button>
                        <Switch
                          checked={settings?.email_weekly_report ?? false}
                          onCheckedChange={(checked) => updateSettings.mutate({ email_weekly_report: checked })}
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-foreground">{t('settings.marketingUpdates')}</p>
                        <p className="text-sm text-muted-foreground">{t('settings.newsAndProducts')}</p>
                      </div>
                      <Switch
                        checked={settings?.email_marketing ?? false}
                        onCheckedChange={(checked) => updateSettings.mutate({ email_marketing: checked })}
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preferences">
            <Card className="bg-card">
              <CardHeader>
                <CardTitle>{t('settings.preferences')}</CardTitle>
                <CardDescription>{t('settings.preferencesDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Globe className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{t('settings.language')}</p>
                      <p className="text-sm text-muted-foreground">{t('settings.languageDesc')}</p>
                    </div>
                  </div>
                  <Select value={language} onValueChange={(value: 'es' | 'en') => setLanguage(value)}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="es">🇪🇸 {t('settings.spanish')}</SelectItem>
                      <SelectItem value="en">🇺🇸 {t('settings.english')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{t('settings.timezone')}</p>
                      <p className="text-sm text-muted-foreground">{t('settings.timezoneDesc')}</p>
                    </div>
                  </div>
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger className="w-64">
                      <SelectValue>
                        {currentTimezone ? `${currentTimezone.label} (${currentTimezone.offset})` : t('settings.selectTimezone')}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="max-h-80">
                      {timezones.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>
                          <span className="flex items-center gap-2">
                            <span>{tz.label}</span>
                            <span className="text-muted-foreground text-xs">({tz.offset})</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card className="bg-card">
              <CardHeader>
                <CardTitle>{t('settings.password')}</CardTitle>
                <CardDescription>{t('settings.updatePassword')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">{t('settings.currentPassword')}</Label>
                  <Input id="current-password" type="password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">{t('settings.newPassword')}</Label>
                  <Input id="new-password" type="password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">{t('settings.confirmPassword')}</Label>
                  <Input id="confirm-password" type="password" />
                </div>
                <Button>{t('settings.updatePasswordBtn')}</Button>
              </CardContent>
            </Card>

            <Card className="bg-card">
              <CardHeader>
                <CardTitle>{t('settings.dataManagement')}</CardTitle>
                <CardDescription>{t('settings.exportOrDelete')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Export */}
                <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                  <div>
                    <p className="font-medium text-foreground">{t('settings.exportData')}</p>
                    <p className="text-sm text-muted-foreground">{t('settings.downloadData')}</p>
                  </div>
                  <Button variant="outline" onClick={handleExportData} disabled={isExporting}>
                    {isExporting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4 mr-2" />
                    )}
                    {t('settings.export')}
                  </Button>
                </div>

                {/* Import */}
                <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                  <div>
                    <p className="font-medium text-foreground">Importar Backup</p>
                    <p className="text-sm text-muted-foreground">Cargar un archivo de backup previo</p>
                  </div>
                  <Button variant="outline" onClick={handleImportClick} disabled={isRestoring}>
                    {isRestoring ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 mr-2" />
                    )}
                    {isRestoring ? 'Restaurando...' : 'Importar'}
                  </Button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".json"
                    className="hidden"
                  />
                </div>

                {/* Delete Account - with double confirmation */}
                <div className="p-4 rounded-lg border border-destructive/50 bg-destructive/5 space-y-4">
                  <div>
                    <p className="font-medium text-foreground">{t('settings.deleteAccount')}</p>
                    <p className="text-sm text-muted-foreground">{t('settings.permanentlyDelete')}</p>
                  </div>

                  <div className="p-3 rounded bg-destructive/10 border border-destructive/20">
                    <p className="text-sm text-destructive font-medium mb-1">
                      ⚠️ Esta acción es irreversible
                    </p>
                    <p className="text-xs text-destructive/80">
                      Se eliminarán todos tus agentes, documentos, conversaciones, créditos y configuraciones.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Escribe "ELIMINAR CUENTA" para habilitar</Label>
                    <Input
                      placeholder="ELIMINAR CUENTA"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      className="max-w-xs"
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
                          <Trash2 className="w-4 h-4 mr-2" />
                        )}
                        {t('settings.delete')}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-destructive">
                          ⚠️ ¿Estás absolutamente seguro?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta acción eliminará permanentemente tu cuenta y todos tus datos.
                          <br /><br />
                          <strong>No podrás recuperar nada después de confirmar.</strong>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t('settings.cancel')}</AlertDialogCancel>
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
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout >
  );
};

export default SettingsPage;
