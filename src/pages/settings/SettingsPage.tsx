import { useState, useEffect } from 'react';
import { 
  User, 
  Building, 
  Bell, 
  Shield, 
  Trash2,
  Save,
  Download,
  Globe
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
import { useLanguage } from '@/contexts/LanguageContext';
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

export const SettingsPage = () => {
  const { user } = useAuth();
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const { toast } = useToast();
  const { language, setLanguage, t } = useLanguage();

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    company_name: '',
    company_website: '',
    phone: '',
  });

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

  const handleExportData = () => {
    toast({
      title: t('settings.exportStarted'),
      description: t('settings.exportReady'),
    });
  };

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
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">{t('settings.emailNotifications')}</p>
                    <p className="text-sm text-muted-foreground">{t('settings.receiveEmailUpdates')}</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">{t('settings.usageAlerts')}</p>
                    <p className="text-sm text-muted-foreground">{t('settings.lowCreditsNotify')}</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">{t('settings.weeklyReports')}</p>
                    <p className="text-sm text-muted-foreground">{t('settings.performanceSummary')}</p>
                  </div>
                  <Switch />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">{t('settings.marketingUpdates')}</p>
                    <p className="text-sm text-muted-foreground">{t('settings.newsAndProducts')}</p>
                  </div>
                  <Switch />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preferences">
            <Card className="bg-card">
              <CardHeader>
                <CardTitle>{t('settings.preferences')}</CardTitle>
                <CardDescription>{t('settings.languageDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">{t('settings.language')}</p>
                    <p className="text-sm text-muted-foreground">{t('settings.languageDesc')}</p>
                  </div>
                  <Select value={language} onValueChange={(value: 'es' | 'en') => setLanguage(value)}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="es">🇪🇸 {t('settings.spanish')}</SelectItem>
                      <SelectItem value="en">🇺🇸 {t('settings.english')}</SelectItem>
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
                <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                  <div>
                    <p className="font-medium text-foreground">{t('settings.exportData')}</p>
                    <p className="text-sm text-muted-foreground">{t('settings.downloadData')}</p>
                  </div>
                  <Button variant="outline" onClick={handleExportData}>
                    <Download className="w-4 h-4 mr-2" />
                    {t('settings.export')}
                  </Button>
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg border border-destructive/50 bg-destructive/5">
                  <div>
                    <p className="font-medium text-foreground">{t('settings.deleteAccount')}</p>
                    <p className="text-sm text-muted-foreground">{t('settings.permanentlyDelete')}</p>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive">
                        <Trash2 className="w-4 h-4 mr-2" />
                        {t('settings.delete')}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t('settings.deleteConfirmTitle')}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t('settings.deleteConfirmDesc')}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t('settings.cancel')}</AlertDialogCancel>
                        <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          {t('settings.deleteAccountBtn')}
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
    </DashboardLayout>
  );
};

export default SettingsPage;
