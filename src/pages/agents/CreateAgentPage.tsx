import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  ArrowRight, 
  Bot, 
  Target, 
  Sparkles, 
  FileText,
  MessageSquare,
  Check,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { cn } from '@/lib/utils';
import { useCreateAgent } from '@/hooks/useAgents';
import { AgentObjective } from '@/types/database';

const steps = [
  { id: 1, title: 'Basic Info', icon: Bot },
  { id: 2, title: 'Objective', icon: Target },
  { id: 3, title: 'Personality', icon: Sparkles },
  { id: 4, title: 'Instructions', icon: FileText },
  { id: 5, title: 'Review', icon: Check },
];

const objectives: { value: AgentObjective; label: string; description: string }[] = [
  { value: 'sales', label: 'Sales', description: 'Qualify leads and convert visitors into customers' },
  { value: 'support', label: 'Customer Support', description: 'Help customers resolve issues and answer questions' },
  { value: 'information', label: 'Information', description: 'Provide information about products or services' },
];

const tones = [
  { value: 'professional', label: 'Professional', description: 'Formal and business-like communication' },
  { value: 'friendly', label: 'Friendly', description: 'Warm and approachable conversation style' },
  { value: 'casual', label: 'Casual', description: 'Relaxed and informal tone' },
  { value: 'enthusiastic', label: 'Enthusiastic', description: 'Energetic and excited communication' },
];

export const CreateAgentPage = () => {
  const navigate = useNavigate();
  const createAgent = useCreateAgent();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    objective: '' as AgentObjective | '',
    tone: '',
    instructions: '',
  });

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1: return formData.name.trim() !== '' && formData.description.trim() !== '';
      case 2: return formData.objective !== '';
      case 3: return formData.tone !== '';
      case 4: return formData.instructions.trim() !== '';
      default: return true;
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCreate = async () => {
    if (!formData.objective) return;
    
    try {
      await createAgent.mutateAsync({
        name: formData.name,
        description: formData.description,
        objective: formData.objective as AgentObjective,
        tone: formData.tone,
        system_prompt: formData.instructions,
      });
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
            Back to Agents
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Create New Agent</h1>
          <p className="text-muted-foreground">
            Set up your AI agent in a few simple steps
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
              {currentStep === 1 && "Give your agent a name and description"}
              {currentStep === 2 && "What should your agent help with?"}
              {currentStep === 3 && "How should your agent communicate?"}
              {currentStep === 4 && "Describe what your agent should do"}
              {currentStep === 5 && "Review your agent configuration"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {currentStep === 1 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">Agent Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Sales Assistant"
                    value={formData.name}
                    onChange={(e) => updateFormData('name', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Briefly describe what this agent will do..."
                    value={formData.description}
                    onChange={(e) => updateFormData('description', e.target.value)}
                    rows={3}
                  />
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
              <div className="space-y-2">
                <Label htmlFor="instructions">Natural Language Instructions</Label>
                <Textarea
                  id="instructions"
                  placeholder="Describe in natural language how your agent should behave, what it should know, and how it should interact with users...

Example: 'You are a helpful sales assistant for our software company. You should be knowledgeable about our product features, pricing plans, and be able to schedule demos. Always be polite and try to understand the customer's needs before recommending solutions.'"
                  value={formData.instructions}
                  onChange={(e) => updateFormData('instructions', e.target.value)}
                  rows={8}
                />
                <p className="text-xs text-muted-foreground">
                  This will be transformed into a professional AI prompt for your agent
                </p>
              </div>
            )}

            {currentStep === 5 && (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/30 space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="font-medium text-foreground">{formData.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Description</p>
                    <p className="font-medium text-foreground">{formData.description}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Objective</p>
                    <p className="font-medium text-foreground capitalize">{formData.objective}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tone</p>
                    <p className="font-medium text-foreground capitalize">{formData.tone}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Instructions</p>
                    <p className="font-medium text-foreground text-sm">{formData.instructions}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-accent/30 text-accent-foreground">
                  <MessageSquare className="w-5 h-5" />
                  <p className="text-sm">
                    After creating, you can upload documents and connect channels
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
                Back
              </Button>
              {currentStep < steps.length ? (
                <Button onClick={handleNext} disabled={!canProceed()}>
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button onClick={handleCreate} disabled={createAgent.isPending}>
                  {createAgent.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4 mr-2" />
                  )}
                  Create Agent
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
