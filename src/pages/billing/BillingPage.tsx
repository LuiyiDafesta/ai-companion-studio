import { Check, CreditCard, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useCredits } from '@/hooks/useCredits';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

export const BillingPage = () => {
  const { data: credits } = useCredits();
  const { t } = useLanguage();
  const usedCredits = credits?.total_used || 0;
  const totalCredits = (credits?.balance || 0) + usedCredits;
  const usagePercentage = totalCredits > 0 ? (usedCredits / totalCredits) * 100 : 0;

  const plans = [
    {
      name: 'Starter',
      price: '$29',
      period: '/mes',
      description: 'Perfecto para pequeños negocios',
      credits: 5000,
      features: [
        '2 Agentes IA',
        '5,000 créditos/mes',
        'Widget de chat web',
        'Soporte por email',
      ],
      current: false,
    },
    {
      name: 'Professional',
      price: '$99',
      period: '/mes',
      description: 'Para equipos en crecimiento',
      credits: 25000,
      features: [
        '10 Agentes IA',
        '25,000 créditos/mes',
        'Chat web + WhatsApp',
        'Carga de documentos',
        'Soporte prioritario',
        'Panel de analíticas',
      ],
      current: true,
      popular: true,
    },
    {
      name: 'Enterprise',
      price: '$299',
      period: '/mes',
      description: 'Para grandes organizaciones',
      credits: 100000,
      features: [
        'Agentes IA ilimitados',
        '100,000 créditos/mes',
        'Todos los canales',
        'Integraciones personalizadas',
        'Soporte dedicado',
        'Garantía SLA',
        'Entrenamiento personalizado',
      ],
      current: false,
    },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('billing.title')}</h1>
          <p className="text-muted-foreground">
            {t('billing.subtitle')}
          </p>
        </div>

        <Card className="bg-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Uso Actual</CardTitle>
                <CardDescription>Tu consumo de créditos en este período de facturación</CardDescription>
              </div>
              <Badge variant="outline" className="gap-1.5 py-1.5">
                <Zap className="w-3 h-3" />
                {credits?.balance.toLocaleString() || 0} restantes
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Créditos usados</span>
                <span className="font-medium text-foreground">
                  {usedCredits.toLocaleString()} / {totalCredits.toLocaleString()}
                </span>
              </div>
              <Progress value={usagePercentage} className="h-2" />
            </div>
            <p className="text-sm text-muted-foreground">
              Los créditos se reinician con tu ciclo de facturación
            </p>
          </CardContent>
        </Card>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Elige Tu Plan</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <Card 
                key={plan.name} 
                className={cn(
                  "bg-card relative",
                  plan.popular && "border-primary shadow-lg"
                )}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                    Más Popular
                  </Badge>
                )}
                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="pt-2">
                    <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-primary flex-shrink-0" />
                        <span className="text-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    className="w-full" 
                    variant={plan.current ? "outline" : plan.popular ? "default" : "secondary"}
                    disabled={plan.current}
                  >
                    {plan.current ? 'Plan Actual' : 'Mejorar'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <Card className="bg-card">
          <CardHeader>
            <CardTitle>Método de Pago</CardTitle>
            <CardDescription>Gestiona tu información de pago</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg border border-border">
              <div className="flex items-center gap-4">
                <div className="w-12 h-8 rounded bg-muted/30 flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-foreground">•••• •••• •••• 4242</p>
                  <p className="text-sm text-muted-foreground">Expira 12/2027</p>
                </div>
              </div>
              <Button variant="outline">Actualizar</Button>
            </div>
            <Button variant="ghost">+ Añadir método de pago</Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default BillingPage;
