import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    ArrowLeft,
    Bot,
    Target,
    Sparkles,
    FileText,
    Save,
    Loader2,
    Trash2,
    Wand2,
    FolderOpen,
    Upload,
    X,
    Code
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { cn } from '@/lib/utils';
import { useAgent, useUpdateAgent, useDeleteAgent } from '@/hooks/useAgents';
import { useGeneratePrompt } from '@/hooks/useGeneratePrompt';
import { useLanguage } from '@/contexts/LanguageContext';
import { AgentObjective, AgentStatus } from '@/types/database';
import { Badge } from '@/components/ui/badge';
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
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/components/ui/tabs';
import { AgentDocuments } from '@/components/agents/AgentDocuments';

export const EditAgentPage = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const { data: agent, isLoading, error } = useAgent(id || '');
    const updateAgent = useUpdateAgent();
    const deleteAgent = useDeleteAgent();
    const { generatePrompt, isGenerating } = useGeneratePrompt();
    const { t } = useLanguage();

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const logoInputRef = useRef<HTMLInputElement>(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        objective: '' as AgentObjective | '',
        tone: '',
        user_instructions: '',
        system_prompt: '',
        welcome_message: '',
        status: '' as AgentStatus | '',
        widget_color: '#6366f1',
        widget_position: 'bottom-right',
        avatar_url: '',
    });

    useEffect(() => {
        if (agent) {
            setFormData({
                name: agent.name || '',
                description: agent.description || '',
                objective: agent.objective || '',
                tone: agent.tone || '',
                user_instructions: '',
                system_prompt: agent.system_prompt || '',
                welcome_message: agent.welcome_message || '',
                status: agent.status || 'draft',
                widget_color: agent.widget_color || '#6366f1',
                widget_position: agent.widget_position || 'bottom-right',
                avatar_url: agent.avatar_url || '',
            });
        }
    }, [agent]);

    const objectives: { value: AgentObjective; label: string; description: string }[] = [
        { value: 'sales', label: t('createAgent.sales'), description: t('createAgent.salesDesc') || 'Qualify leads and convert visitors into customers' },
        { value: 'support', label: t('createAgent.support'), description: t('createAgent.supportDesc') || 'Help customers resolve issues and answer questions' },
        { value: 'information', label: t('createAgent.information'), description: t('createAgent.infoDesc') || 'Provide information about products or services' },
    ];

    const tones = [
        { value: 'professional', label: 'Profesional', description: 'Comunicación formal y empresarial' },
        { value: 'friendly', label: 'Amigable', description: 'Estilo de conversación cálido y accesible' },
        { value: 'casual', label: 'Casual', description: 'Tono relajado e informal' },
        { value: 'enthusiastic', label: 'Entusiasta', description: 'Comunicación enérgica y emocionada' },
    ];

    const updateFormData = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    // Función para subir logo del agente
    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !id) return;

        setUploadingLogo(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${id}/logo.${fileExt}`;

            // Subir archivo a Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('ahdocuments')
                .upload(fileName, file, { upsert: true });

            if (uploadError) throw uploadError;

            // Obtener URL pública
            const { data: urlData } = supabase.storage
                .from('ahdocuments')
                .getPublicUrl(fileName);

            const publicUrl = urlData?.publicUrl;
            if (publicUrl) {
                updateFormData('avatar_url', publicUrl);
            }
        } catch (error) {
            console.error('Error uploading logo:', error);
        } finally {
            setUploadingLogo(false);
        }
    };

    // Función para eliminar logo
    const handleRemoveLogo = () => {
        updateFormData('avatar_url', '');
    };

    const handleSave = async () => {
        if (!id || !formData.objective) return;

        try {
            await updateAgent.mutateAsync({
                id,
                data: {
                    name: formData.name,
                    description: formData.description,
                    objective: formData.objective as AgentObjective,
                    tone: formData.tone,
                    system_prompt: formData.system_prompt,
                    welcome_message: formData.welcome_message,
                    status: formData.status as AgentStatus,
                    widget_color: formData.widget_color,
                    widget_position: formData.widget_position,
                    avatar_url: formData.avatar_url || null,
                },
            });
        } catch (error) {
            // Error is handled by the mutation
        }
    };

    const handleDelete = async () => {
        if (!id) return;
        try {
            await deleteAgent.mutateAsync(id);
            navigate('/agents');
        } catch (error) {
            // Error is handled by the mutation
        }
    };

    const handleGeneratePrompt = async () => {
        const result = await generatePrompt({
            agentName: formData.name,
            agentDescription: formData.description,
            companyName: '',
            companyDescription: '',
            productsServices: '',
            targetAudience: '',
            companyWebsite: '',
            objective: formData.objective,
            tone: formData.tone,
            userInstructions: formData.user_instructions,
        });

        if (result) {
            setFormData(prev => ({
                ...prev,
                system_prompt: result.systemPrompt,
                welcome_message: result.welcomeMessage || prev.welcome_message,
            }));
        }
    };

    const getStatusBadgeStyle = (status: string) => {
        switch (status) {
            case 'active':
                return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800';
            case 'paused':
                return 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800';
            case 'archived':
                return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800';
            default: // draft
                return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700';
        }
    };

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-96">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            </DashboardLayout>
        );
    }

    if (error || !agent) {
        return (
            <DashboardLayout>
                <div className="text-center py-12">
                    <p className="text-destructive mb-4">Agent not found</p>
                    <Button onClick={() => navigate('/agents')}>{t('editAgent.backToAgents')}</Button>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                    <Button variant="ghost" onClick={() => navigate('/agents')} className="mb-4">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        {t('editAgent.backToAgents')}
                    </Button>
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-foreground">{formData.name || t('common.edit')}</h1>
                            <p className="text-muted-foreground">
                                {t('editAgent.configure')}
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className={getStatusBadgeStyle(formData.status)}>
                                {formData.status ? t(`editAgent.${formData.status}`) : t('editAgent.draft')}
                            </Badge>
                        </div>
                    </div>
                </div>

                <Tabs defaultValue="general" className="space-y-6">
                    <TabsList className="grid w-full grid-cols-5">
                        <TabsTrigger value="general">
                            <Bot className="w-4 h-4 mr-2" />
                            {t('editAgent.general')}
                        </TabsTrigger>
                        <TabsTrigger value="behavior">
                            <Sparkles className="w-4 h-4 mr-2" />
                            {t('editAgent.behavior')}
                        </TabsTrigger>
                        <TabsTrigger value="prompts">
                            <FileText className="w-4 h-4 mr-2" />
                            {t('editAgent.prompts')}
                        </TabsTrigger>
                        <TabsTrigger value="documents">
                            <FolderOpen className="w-4 h-4 mr-2" />
                            {t('documents.title')}
                        </TabsTrigger>
                        <TabsTrigger value="settings">
                            <Target className="w-4 h-4 mr-2" />
                            {t('editAgent.settings')}
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="general">
                        <Card className="bg-card">
                            <CardHeader>
                                <CardTitle>{t('editAgent.basicInfo')}</CardTitle>
                                <CardDescription>
                                    {t('editAgent.basicInfoDesc')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="name">{t('editAgent.agentName')}</Label>
                                    <Input
                                        id="name"
                                        placeholder={t('createAgent.agentNamePlaceholder')}
                                        value={formData.name}
                                        onChange={(e) => updateFormData('name', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="description">{t('editAgent.description')}</Label>
                                    <Textarea
                                        id="description"
                                        placeholder={t('createAgent.descriptionPlaceholder')}
                                        value={formData.description}
                                        onChange={(e) => updateFormData('description', e.target.value)}
                                        rows={3}
                                    />
                                </div>

                                {/* Logo del Agente */}
                                <div className="space-y-2">
                                    <Label>Logo del Agente (opcional)</Label>
                                    <div className="flex items-center gap-4">
                                        {formData.avatar_url ? (
                                            <div className="relative">
                                                <img
                                                    src={formData.avatar_url}
                                                    alt="Logo del agente"
                                                    className="w-16 h-16 rounded-lg object-cover border"
                                                />
                                                <Button
                                                    type="button"
                                                    variant="destructive"
                                                    size="icon"
                                                    className="absolute -top-2 -right-2 h-6 w-6"
                                                    onClick={handleRemoveLogo}
                                                >
                                                    <X className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center border border-dashed">
                                                <Bot className="w-8 h-8 text-primary" />
                                            </div>
                                        )}
                                        <div>
                                            <input
                                                ref={logoInputRef}
                                                type="file"
                                                accept="image/*"
                                                onChange={handleLogoUpload}
                                                className="hidden"
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => logoInputRef.current?.click()}
                                                disabled={uploadingLogo}
                                            >
                                                {uploadingLogo ? (
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                ) : (
                                                    <Upload className="w-4 h-4 mr-2" />
                                                )}
                                                {formData.avatar_url ? 'Cambiar logo' : 'Subir logo'}
                                            </Button>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                PNG, JPG hasta 2MB
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('editAgent.status')}</Label>
                                    <Select
                                        value={formData.status}
                                        onValueChange={(value) => updateFormData('status', value)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('editAgent.status')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="draft">{t('editAgent.draft')}</SelectItem>
                                            <SelectItem value="active">{t('editAgent.active')}</SelectItem>
                                            <SelectItem value="paused">{t('editAgent.paused')}</SelectItem>
                                            <SelectItem value="archived">{t('editAgent.archived')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="behavior">
                        <Card className="bg-card">
                            <CardHeader>
                                <CardTitle>{t('editAgent.agentBehavior')}</CardTitle>
                                <CardDescription>
                                    {t('editAgent.agentBehaviorDesc')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-4">
                                    <Label>{t('editAgent.objective')}</Label>
                                    <RadioGroup
                                        value={formData.objective}
                                        onValueChange={(value) => updateFormData('objective', value)}
                                        className="space-y-3"
                                    >
                                        {objectives.map((obj) => (
                                            <Label
                                                key={obj.value}
                                                htmlFor={`obj-${obj.value}`}
                                                className={cn(
                                                    "flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-colors",
                                                    formData.objective === obj.value
                                                        ? "border-primary bg-primary/5"
                                                        : "border-border hover:border-primary/50"
                                                )}
                                            >
                                                <RadioGroupItem value={obj.value} id={`obj-${obj.value}`} />
                                                <div>
                                                    <p className="font-medium text-foreground">{obj.label}</p>
                                                    <p className="text-sm text-muted-foreground">{obj.description}</p>
                                                </div>
                                            </Label>
                                        ))}
                                    </RadioGroup>
                                </div>

                                <div className="space-y-4">
                                    <Label>{t('editAgent.tone')}</Label>
                                    <RadioGroup
                                        value={formData.tone}
                                        onValueChange={(value) => updateFormData('tone', value)}
                                        className="grid grid-cols-2 gap-3"
                                    >
                                        {tones.map((tone) => (
                                            <Label
                                                key={tone.value}
                                                htmlFor={`tone-${tone.value}`}
                                                className={cn(
                                                    "flex flex-col p-4 rounded-lg border-2 cursor-pointer transition-colors",
                                                    formData.tone === tone.value
                                                        ? "border-primary bg-primary/5"
                                                        : "border-border hover:border-primary/50"
                                                )}
                                            >
                                                <RadioGroupItem value={tone.value} id={`tone-${tone.value}`} className="sr-only" />
                                                <p className="font-medium text-foreground">{tone.label}</p>
                                                <p className="text-sm text-muted-foreground">{tone.description}</p>
                                            </Label>
                                        ))}
                                    </RadioGroup>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="prompts">
                        <Card className="bg-card">
                            <CardHeader>
                                <CardTitle>{t('editAgent.promptsMessages')}</CardTitle>
                                <CardDescription>
                                    {t('editAgent.promptsMessagesDesc')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Campo de lenguaje natural */}
                                <div className="space-y-2">
                                    <Label htmlFor="user_instructions">
                                        {t('editAgent.describeAgent')}
                                    </Label>
                                    <Textarea
                                        id="user_instructions"
                                        placeholder={t('editAgent.describeAgentPlaceholder')}
                                        value={formData.user_instructions}
                                        onChange={(e) => updateFormData('user_instructions', e.target.value)}
                                        rows={4}
                                        className="bg-muted/30"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        {t('editAgent.describeAgentHelp')}
                                    </p>
                                    <Button
                                        onClick={handleGeneratePrompt}
                                        disabled={isGenerating || !formData.user_instructions.trim()}
                                        className="mt-2"
                                        variant="secondary"
                                    >
                                        {isGenerating ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                {t('editAgent.generating')}
                                            </>
                                        ) : (
                                            <>
                                                <Wand2 className="w-4 h-4 mr-2" />
                                                {t('editAgent.generateWithAI')}
                                            </>
                                        )}
                                    </Button>
                                </div>

                                {/* Separador */}
                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center">
                                        <span className="w-full border-t" />
                                    </div>
                                    <div className="relative flex justify-center text-xs uppercase">
                                        <span className="bg-card px-2 text-muted-foreground">
                                            {t('editAgent.technicalPromptSeparator')}
                                        </span>
                                    </div>
                                </div>

                                {/* Campo de prompt técnico */}
                                <div className="space-y-2">
                                    <Label htmlFor="system_prompt">{t('editAgent.systemPrompt')}</Label>
                                    <Textarea
                                        id="system_prompt"
                                        placeholder={t('editAgent.systemPromptPlaceholder')}
                                        value={formData.system_prompt}
                                        onChange={(e) => updateFormData('system_prompt', e.target.value)}
                                        rows={8}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        {t('editAgent.systemPromptHelp')}
                                    </p>
                                </div>

                                {/* Welcome Message */}
                                <div className="space-y-2">
                                    <Label htmlFor="welcome_message">{t('editAgent.welcomeMessage')}</Label>
                                    <Textarea
                                        id="welcome_message"
                                        placeholder={t('editAgent.welcomeMessagePlaceholder')}
                                        value={formData.welcome_message}
                                        onChange={(e) => updateFormData('welcome_message', e.target.value)}
                                        rows={3}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        {t('editAgent.welcomeMessageHelp')}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="documents">
                        <Card className="bg-card">
                            <CardHeader>
                                <CardTitle>{t('documents.title')}</CardTitle>
                                <CardDescription>
                                    {t('documents.subtitle')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <AgentDocuments agentId={id!} agentName={formData.name} />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="settings">
                        <Card className="bg-card">
                            <CardHeader>
                                <CardTitle>{t('editAgent.widgetSettings')}</CardTitle>
                                <CardDescription>
                                    {t('editAgent.widgetSettingsDesc')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="widget_color">{t('editAgent.widgetColor')}</Label>
                                    <div className="flex items-center gap-3">
                                        <Input
                                            id="widget_color"
                                            type="color"
                                            value={formData.widget_color}
                                            onChange={(e) => updateFormData('widget_color', e.target.value)}
                                            className="w-16 h-10 p-1 cursor-pointer"
                                        />
                                        <Input
                                            value={formData.widget_color}
                                            onChange={(e) => updateFormData('widget_color', e.target.value)}
                                            className="flex-1"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('editAgent.widgetPosition')}</Label>
                                    <Select
                                        value={formData.widget_position}
                                        onValueChange={(value) => updateFormData('widget_position', value)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('editAgent.widgetPosition')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="bottom-right">{t('editAgent.bottomRight')}</SelectItem>
                                            <SelectItem value="bottom-left">{t('editAgent.bottomLeft')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Embed Code Section */}
                        <Card className="bg-card mt-6">
                            <CardHeader>
                                <CardTitle>Código para Incrustar Widget</CardTitle>
                                <CardDescription>
                                    Copia este código e insértalo en tu sitio web
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Código iframe (Recomendado)</Label>
                                    <div className="relative">
                                        <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs">
                                            <code>{`<iframe src="${window.location.origin}${import.meta.env.PROD ? '/agentes' : ''}/widget/${id}" width="400" height="600" frameborder="0" style="position: fixed; ${formData.widget_position === 'bottom-left' ? 'bottom: 20px; left: 20px;' : formData.widget_position === 'top-right' ? 'top: 20px; right: 20px;' : formData.widget_position === 'top-left' ? 'top: 20px; left: 20px;' : 'bottom: 20px; right: 20px;'} z-index: 9999; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);"></iframe>`}</code>
                                        </pre>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="absolute top-2 right-2"
                                            onClick={() => {
                                                const position = formData.widget_position === 'bottom-left' ? 'bottom: 20px; left: 20px;' : formData.widget_position === 'top-right' ? 'top: 20px; right: 20px;' : formData.widget_position === 'top-left' ? 'top: 20px; left: 20px;' : 'bottom: 20px; right: 20px;';
                                                const code = `<iframe src="${window.location.origin}${import.meta.env.PROD ? '/agentes' : ''}/widget/${id}" width="400" height="600" frameborder="0" style="position: fixed; ${position} z-index: 9999; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);"></iframe>`;
                                                navigator.clipboard.writeText(code);
                                            }}
                                        >
                                            Copiar
                                        </Button>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Pega este código antes de la etiqueta &lt;/body&gt; en tu HTML
                                    </p>
                                </div>
                                <Button
                                    variant="secondary"
                                    onClick={() => window.open(`${import.meta.env.PROD ? '/agentes' : ''}/widget/${id}`, '_blank')}
                                    className="w-full"
                                >
                                    Ver Vista Previa del Widget
                                </Button>
                            </CardContent>
                        </Card>

                        <Card className="bg-card mt-6 border-destructive/50">
                            <CardHeader>
                                <CardTitle className="text-destructive">{t('editAgent.dangerZone')}</CardTitle>
                                <CardDescription>
                                    {t('editAgent.dangerZoneDesc')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button
                                    variant="destructive"
                                    onClick={() => setDeleteDialogOpen(true)}
                                >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    {t('editAgent.deleteAgent')}
                                </Button>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                <div className="flex justify-end mt-6 gap-3">
                    <Button variant="outline" onClick={() => navigate('/agents')}>
                        {t('editAgent.cancel')}
                    </Button>
                    <Button onClick={handleSave} disabled={updateAgent.isPending}>
                        {updateAgent.isPending ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <Save className="w-4 h-4 mr-2" />
                        )}
                        {t('editAgent.saveChanges')}
                    </Button>
                </div>

                <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>{t('editAgent.deleteConfirmTitle')}</AlertDialogTitle>
                            <AlertDialogDescription>
                                {t('editAgent.deleteConfirmDesc')}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>{t('editAgent.cancel')}</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleDelete}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                                {t('editAgent.deleteAgent')}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </DashboardLayout>
    );
};

export default EditAgentPage;
