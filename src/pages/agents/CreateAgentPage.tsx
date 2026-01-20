import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Building2,
  Target,
  Sparkles,
  FileText,
  MessageSquare,
  Check,
  Loader2,
  Wand2,
  Eye,
  Users,
  ShoppingBag,
  MessageCircle,
  Settings,
  Palette,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useCreateAgent, useUpdateAgent, useAgent, useAgents } from '@/hooks/useAgents'; // Added useUpdateAgent, useAgent
import { useGeneratePrompt } from '@/hooks/useGeneratePrompt';
import { useLanguage } from '@/contexts/LanguageContext';
import { AgentObjective, AgentStatus } from '@/types/database';

import { useSubscription, PLAN_LIMITS } from '@/hooks/useSubscription';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export const CreateAgentPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const draftId = searchParams.get('draftId');

  const createAgent = useCreateAgent();
  const updateAgent = useUpdateAgent();

  // Load draft data if ID exists
  const { data: draftAgent, isLoading: isLoadingDraft } = useAgent(draftId || '');

  const { generatePrompt, isGenerating, generatedConfig, clearGeneratedConfig } = useGeneratePrompt();
  const { t } = useLanguage();
  const [currentStep, setCurrentStep] = useState(1);

  const { data: agents } = useAgents();
  const { data: subscription } = useSubscription();

  const planType = subscription?.plan_type || 'free';
  const limits = PLAN_LIMITS[planType];
  const currentAgentCount = agents?.length || 0;
  // If editing a draft, don't count it towards the limit (it's already created)
  const isLimitReached = !draftId && currentAgentCount >= limits.agents;

  const [formData, setFormData] = useState({
    // Paso 1: Información del agente y empresa
    name: '',
    description: '',
    company_name: '',
    company_description: '',
    products_services: '',
    target_audience: '',
    company_website: '',
    // Paso 2: Objetivo
    objective: '' as AgentObjective | '',
    // Paso 3: Tono
    tone: '',
    // Paso 4: Prompt
    user_instructions: '',
    instructions: '',
    // Paso 5: Ajustes
    widget_color: '#6366f1',
    widget_position: 'bottom-right',
  });

  // Load draft data into form
  useEffect(() => {
    if (draftAgent) {
      setFormData({
        name: draftAgent.name || '',
        description: draftAgent.description || '',
        company_name: '', // These fields are not in Agent table yet, only used for prompt generation. If we wanted to persist them we'd need metadata column.
        company_description: '',
        products_services: '',
        target_audience: '',
        company_website: '',
        objective: (draftAgent.objective as AgentObjective) || '',
        tone: draftAgent.tone || '',
        user_instructions: '',
        instructions: draftAgent.system_prompt || '',
        widget_color: draftAgent.widget_color || '#6366f1',
        widget_position: draftAgent.widget_position || 'bottom-right',
      });

      // Determine step based on filled fields
      if (!draftAgent.objective) setCurrentStep(2);
      else if (!draftAgent.tone) setCurrentStep(3);
      else if (!draftAgent.system_prompt) setCurrentStep(4);
      else setCurrentStep(5);
    }
  }, [draftAgent]);

  if (isLimitReached) {
    return (
      <DashboardLayout>
        <div className="max-w-3xl mx-auto py-8 px-4">
          <div className="mb-8">
            <Button variant="ghost" className="pl-0 hover:pl-2 transition-all" onClick={() => navigate('/agents')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('common.back')}
            </Button>
          </div>
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Límite de Agentes Alcanzado ({currentAgentCount}/{limits.agents})</AlertTitle>
            <AlertDescription>
              Has alcanzado el límite de agentes para tu plan <strong>{limits.label}</strong>.
              Por favor mejora tu plan para crear más agentes.
            </AlertDescription>
          </Alert>
          <div className="flex justify-center mt-4">
            <Button onClick={() => navigate('/billing')}>
              Ver Planes
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (isLoadingDraft) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const steps = [
    { id: 1, title: t('createAgent.basicInfo'), icon: Building2 },
    { id: 2, title: t('createAgent.objective'), icon: Target },
    { id: 3, title: t('createAgent.personality'), icon: Sparkles },
    { id: 4, title: t('createAgent.systemPrompt'), icon: FileText },
    { id: 5, title: t('editAgent.settings'), icon: Settings },
    { id: 6, title: 'Review', icon: Check },
  ];

  const objectives: { value: AgentObjective; label: string; description: string }[] = [
    { value: 'sales', label: t('createAgent.sales'), description: t('createAgent.salesDesc') || 'Califica leads y convierte visitantes en clientes' },
    { value: 'support', label: t('createAgent.support'), description: t('createAgent.supportDesc') || 'Ayuda a clientes a resolver dudas y problemas' },
    { value: 'information', label: t('createAgent.information'), description: t('createAgent.infoDesc') || 'Proporciona información sobre productos o servicios' },
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

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.name.trim() !== '' &&
          formData.company_name.trim() !== '' &&
          formData.company_description.trim() !== '';
      case 2: return formData.objective !== '';
      case 3: return formData.tone !== '';
      case 4: return formData.instructions.trim() !== '';
      default: return true;
    }
  };

  const handleNext = async () => {
    if (currentStep === 1 && !draftId) {
      // Create draft agent
      try {
        const newAgent = await createAgent.mutateAsync({
          name: formData.name,
          description: formData.description,
          objective: 'information', // Default temporary objective
          status: 'draft',
          system_prompt: '', // Empty initially
        });
        setSearchParams({ draftId: newAgent.id });
        setCurrentStep(currentStep + 1);
      } catch (error) {
        // Error handled by mutation toast
      }
    } else if (draftId) {
      // Update existing draft
      try {
        const updateData: any = {};
        if (currentStep === 1) {
          updateData.name = formData.name;
          updateData.description = formData.description;
        } else if (currentStep === 2) {
          updateData.objective = formData.objective;
        } else if (currentStep === 3) {
          updateData.tone = formData.tone;
          updateData.personality = formData.tone;
        } else if (currentStep === 4) {
          updateData.system_prompt = formData.instructions;
        } else if (currentStep === 5) {
          updateData.widget_color = formData.widget_color;
          updateData.widget_position = formData.widget_position;
        }

        await updateAgent.mutateAsync({ id: draftId, data: updateData });

        if (currentStep < steps.length) {
          setCurrentStep(currentStep + 1);
        }
      } catch (error) {
        // Error handled
      }
    } else {
      // Fallback for non-draft flow (shouldn't happen with new logic)
      if (currentStep < steps.length) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleGeneratePrompt = async () => {
    const result = await generatePrompt({
      agentName: formData.name,
      agentDescription: formData.description,
      companyName: formData.company_name,
      companyDescription: formData.company_description,
      productsServices: formData.products_services,
      targetAudience: formData.target_audience,
      companyWebsite: formData.company_website,
      objective: formData.objective || 'information', // Fallback
      tone: formData.tone || 'professional', // Fallback
      userInstructions: formData.user_instructions,
    });

    if (result) {
      setFormData(prev => ({
        ...prev,
        instructions: result.systemPrompt,
      }));
    }
  };

  const handleCreate = async () => {
    if (!draftId) return; // Should not happen

    try {
      await updateAgent.mutateAsync({
        id: draftId,
        data: {
          status: 'active'
        }
      });
      clearGeneratedConfig();
      navigate('/agents');
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <Button variant="ghost" onClick={() => navigate('/agents')} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('createAgent.back')}
          </Button>
          <h1 className="text-2xl font-bold text-foreground">{t('createAgent.title')}</h1>
          <p className="text-muted-foreground">
            {t('createAgent.subtitle')}
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-8">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className={cn(
                "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors",
                currentStep === step.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : currentStep > step.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground"
              )}>
                {currentStep > step.id ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <step.icon className="w-5 h-5" />
                )}
              </div>
              {index < steps.length - 1 && (
                <div className={cn(
                  "hidden sm:block w-12 lg:w-24 h-0.5 mx-2",
                  currentStep > step.id ? "bg-primary" : "bg-border"
                )} />
              )}
            </div>
          ))}
        </div>

        <Card className="bg-card">
          <CardHeader>
            <CardTitle>{steps[currentStep - 1].title}</CardTitle>
            <CardDescription>
              {currentStep === 1 && t('createAgent.basicInfoDesc')}
              {currentStep === 2 && t('createAgent.selectObjective')}
              {currentStep === 3 && t('createAgent.personalityDesc')}
              {currentStep === 4 && t('editAgent.promptsMessagesDesc')}
              {currentStep === 5 && t('editAgent.widgetSettingsDesc')}
              {currentStep === 6 && 'Revisa la configuración de tu agente'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {currentStep === 1 && (
              <>
                {/* Sección del Agente */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Bot className="w-4 h-4" />
                    Información del Agente
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">{t('createAgent.agentName')} *</Label>
                    <Input
                      id="name"
                      placeholder={t('createAgent.agentNamePlaceholder')}
                      value={formData.name}
                      onChange={(e) => updateFormData('name', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">{t('createAgent.description')}</Label>
                    <Textarea
                      id="description"
                      placeholder={t('createAgent.descriptionPlaceholder')}
                      value={formData.description}
                      onChange={(e) => updateFormData('description', e.target.value)}
                      rows={2}
                    />
                  </div>
                </div>

                {/* Separador */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">
                      <Building2 className="w-4 h-4 inline mr-1" />
                      Información de la Empresa
                    </span>
                  </div>
                </div>

                {/* Sección de la Empresa */}
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="company_name">{t('createAgent.companyName')} *</Label>
                      <Input
                        id="company_name"
                        placeholder={t('createAgent.companyNamePlaceholder')}
                        value={formData.company_name}
                        onChange={(e) => updateFormData('company_name', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company_website">{t('createAgent.companyWebsite')}</Label>
                      <Input
                        id="company_website"
                        placeholder={t('createAgent.companyWebsitePlaceholder')}
                        value={formData.company_website}
                        onChange={(e) => updateFormData('company_website', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company_description">{t('createAgent.companyDescription')} *</Label>
                    <Textarea
                      id="company_description"
                      placeholder={t('createAgent.companyDescriptionPlaceholder')}
                      value={formData.company_description}
                      onChange={(e) => updateFormData('company_description', e.target.value)}
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="products_services">{t('createAgent.productsServices')}</Label>
                    <Textarea
                      id="products_services"
                      placeholder={t('createAgent.productsServicesPlaceholder')}
                      value={formData.products_services}
                      onChange={(e) => updateFormData('products_services', e.target.value)}
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="target_audience">{t('createAgent.targetAudience')}</Label>
                    <Input
                      id="target_audience"
                      placeholder={t('createAgent.targetAudiencePlaceholder')}
                      value={formData.target_audience}
                      onChange={(e) => updateFormData('target_audience', e.target.value)}
                    />
                  </div>
                </div>
              </>
            )}

            {currentStep === 2 && (
              <RadioGroup
                value={formData.objective}
                onValueChange={(value) => updateFormData('objective', value)}
                className="space-y-3"
              >
                {objectives.map((obj) => (
                  <Label
                    key={obj.value}
                    htmlFor={obj.value}
                    className={cn(
                      "flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-colors",
                      formData.objective === obj.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <RadioGroupItem value={obj.value} id={obj.value} />
                    <div>
                      <p className="font-medium text-foreground">{obj.label}</p>
                      <p className="text-sm text-muted-foreground">{obj.description}</p>
                    </div>
                  </Label>
                ))}
              </RadioGroup>
            )}

            {currentStep === 3 && (
              <RadioGroup
                value={formData.tone}
                onValueChange={(value) => updateFormData('tone', value)}
                className="grid grid-cols-2 gap-3"
              >
                {tones.map((tone) => (
                  <Label
                    key={tone.value}
                    htmlFor={tone.value}
                    className={cn(
                      "flex flex-col p-4 rounded-lg border-2 cursor-pointer transition-colors",
                      formData.tone === tone.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <RadioGroupItem value={tone.value} id={tone.value} className="sr-only" />
                    <p className="font-medium text-foreground">{tone.label}</p>
                    <p className="text-sm text-muted-foreground">{tone.description}</p>
                  </Label>
                ))}
              </RadioGroup>
            )}

            {currentStep === 4 && (
              <div className="space-y-6">
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

                {/* Mostrar configuración generada */}
                {generatedConfig && (
                  <div className="space-y-4 p-4 rounded-lg border-2 border-primary/50 bg-primary/5">
                    <div className="flex items-center gap-2 text-primary font-medium">
                      <Sparkles className="w-5 h-5" />
                      Configuración Generada por IA
                    </div>

                    <div className="grid gap-4">
                      {/* Descripción del agente */}
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                          <Bot className="w-4 h-4" /> Descripción
                        </p>
                        <p className="text-sm">{generatedConfig.description}</p>
                      </div>

                      {/* Propósito */}
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                          <Target className="w-4 h-4" /> Propósito
                        </p>
                        <p className="text-sm">{generatedConfig.agent_purpose}</p>
                      </div>

                      {/* Productos/Servicios */}
                      {generatedConfig.products_services && (
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                            <ShoppingBag className="w-4 h-4" /> Productos/Servicios
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {Array.isArray(generatedConfig.products_services)
                              ? generatedConfig.products_services.map((p, i) => (
                                <Badge key={i} variant="secondary">{p}</Badge>
                              ))
                              : <Badge variant="secondary">{String(generatedConfig.products_services)}</Badge>
                            }
                          </div>
                        </div>
                      )}

                      {/* Público objetivo */}
                      {generatedConfig.target_audience && (
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                            <Users className="w-4 h-4" /> Público Objetivo
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {Array.isArray(generatedConfig.target_audience)
                              ? generatedConfig.target_audience.map((t, i) => (
                                <Badge key={i} variant="outline">{t}</Badge>
                              ))
                              : <Badge variant="outline">{String(generatedConfig.target_audience)}</Badge>
                            }
                          </div>
                        </div>
                      )}

                      {/* Estilo y tono */}
                      {generatedConfig.tone_and_style && (
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                            <MessageCircle className="w-4 h-4" /> Estilo de Comunicación
                          </p>
                          <p className="text-sm">{generatedConfig.tone_and_style.style}</p>
                          {generatedConfig.tone_and_style.conversational_goals?.length > 0 && (
                            <ul className="text-sm list-disc list-inside mt-2 space-y-1">
                              {generatedConfig.tone_and_style.conversational_goals.map((g, i) => (
                                <li key={i} className="text-muted-foreground">{g}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}

                      {/* Comportamiento */}
                      {generatedConfig.operational_instructions?.behavior?.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                            <Eye className="w-4 h-4" /> Comportamiento
                          </p>
                          <ul className="text-sm list-disc list-inside space-y-1">
                            {generatedConfig.operational_instructions.behavior.slice(0, 4).map((b, i) => (
                              <li key={i} className="text-muted-foreground">{b}</li>
                            ))}
                            {generatedConfig.operational_instructions.behavior.length > 4 && (
                              <li className="text-muted-foreground italic">
                                +{generatedConfig.operational_instructions.behavior.length - 4} más...
                              </li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}

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
                  <Label htmlFor="instructions">{t('editAgent.systemPrompt')}</Label>
                  <Textarea
                    id="instructions"
                    placeholder={t('editAgent.systemPromptPlaceholder')}
                    value={formData.instructions}
                    onChange={(e) => updateFormData('instructions', e.target.value)}
                    rows={10}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('editAgent.systemPromptHelp')}
                  </p>
                </div>
              </div>
            )}

            {currentStep === 5 && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Palette className="w-4 h-4" />
                    {t('editAgent.widgetSettings')}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t('editAgent.widgetSettingsDesc')}
                  </p>

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
                      {/* Preview */}
                      <div
                        className="w-12 h-12 rounded-full shadow-lg flex items-center justify-center"
                        style={{ backgroundColor: formData.widget_color }}
                      >
                        <MessageSquare className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>{t('editAgent.widgetPosition')}</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <Label
                        htmlFor="pos-bottom-right"
                        className={cn(
                          "flex flex-col items-center p-4 rounded-lg border-2 cursor-pointer transition-colors",
                          formData.widget_position === 'bottom-right'
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        <input
                          type="radio"
                          id="pos-bottom-right"
                          name="widget_position"
                          value="bottom-right"
                          checked={formData.widget_position === 'bottom-right'}
                          onChange={(e) => updateFormData('widget_position', e.target.value)}
                          className="sr-only"
                        />
                        <div className="w-16 h-12 border rounded relative mb-2">
                          <div
                            className="absolute bottom-1 right-1 w-3 h-3 rounded-full"
                            style={{ backgroundColor: formData.widget_color }}
                          />
                        </div>
                        <p className="font-medium text-sm">{t('editAgent.bottomRight')}</p>
                      </Label>
                      <Label
                        htmlFor="pos-bottom-left"
                        className={cn(
                          "flex flex-col items-center p-4 rounded-lg border-2 cursor-pointer transition-colors",
                          formData.widget_position === 'bottom-left'
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        <input
                          type="radio"
                          id="pos-bottom-left"
                          name="widget_position"
                          value="bottom-left"
                          checked={formData.widget_position === 'bottom-left'}
                          onChange={(e) => updateFormData('widget_position', e.target.value)}
                          className="sr-only"
                        />
                        <div className="w-16 h-12 border rounded relative mb-2">
                          <div
                            className="absolute bottom-1 left-1 w-3 h-3 rounded-full"
                            style={{ backgroundColor: formData.widget_color }}
                          />
                        </div>
                        <p className="font-medium text-sm">{t('editAgent.bottomLeft')}</p>
                      </Label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 6 && (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/30 space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">{t('createAgent.agentName')}</p>
                      <p className="font-medium text-foreground">{formData.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t('createAgent.companyName')}</p>
                      <p className="font-medium text-foreground">{formData.company_name}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('createAgent.companyDescription')}</p>
                    <p className="font-medium text-foreground text-sm">{formData.company_description}</p>
                  </div>
                  {formData.products_services && (
                    <div>
                      <p className="text-sm text-muted-foreground">{t('createAgent.productsServices')}</p>
                      <p className="font-medium text-foreground text-sm">{formData.products_services}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">{t('createAgent.objective')}</p>
                      <p className="font-medium text-foreground capitalize">{formData.objective}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t('createAgent.tone')}</p>
                      <p className="font-medium text-foreground capitalize">{formData.tone}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">{t('editAgent.widgetColor')}</p>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded-full border"
                          style={{ backgroundColor: formData.widget_color }}
                        />
                        <p className="font-medium text-foreground">{formData.widget_color}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t('editAgent.widgetPosition')}</p>
                      <p className="font-medium text-foreground">
                        {formData.widget_position === 'bottom-right' ? t('editAgent.bottomRight') : t('editAgent.bottomLeft')}
                      </p>
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">{t('createAgent.systemPrompt')}</p>
                    <div className="bg-muted/50 rounded p-3 max-h-48 overflow-y-auto">
                      <pre className="font-mono text-xs whitespace-pre-wrap">{formData.instructions}</pre>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-accent/30 text-accent-foreground">
                  <MessageSquare className="w-5 h-5" />
                  <p className="text-sm">
                    Después de crear, puedes subir documentos y conectar canales
                  </p>
                </div>
              </div>
            )}

            <div className="flex justify-between pt-4">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === 1}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Atrás
              </Button>
              {currentStep < steps.length ? (
                <Button onClick={handleNext} disabled={!canProceed()}>
                  Siguiente
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button onClick={handleCreate} disabled={createAgent.isPending}>
                  {createAgent.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4 mr-2" />
                  )}
                  {t('createAgent.create')}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default CreateAgentPage;
