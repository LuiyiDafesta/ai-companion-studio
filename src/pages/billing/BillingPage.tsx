import { Check, CreditCard, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

const plans = [
  {
    name: 'Starter',
    price: '$29',
    period: '/month',
    description: 'Perfect for small businesses',
    credits: 5000,
    features: [
      '2 AI Agents',
      '5,000 credits/month',
      'Web chat widget',
      'Email support',
    ],
    current: false,
  },
  {
    name: 'Professional',
    price: '$99',
    period: '/month',
    description: 'For growing teams',
    credits: 25000,
    features: [
      '10 AI Agents',
      '25,000 credits/month',
      'Web chat + WhatsApp',
      'Document uploads',
      'Priority support',
      'Analytics dashboard',
    ],
    current: true,
    popular: true,
  },
  {
    name: 'Enterprise',
    price: '$299',
    period: '/month',
    description: 'For large organizations',
    credits: 100000,
    features: [
      'Unlimited AI Agents',
      '100,000 credits/month',
      'All channels',
      'Custom integrations',
      'Dedicated support',
      'SLA guarantee',
      'Custom training',
    ],
    current: false,
  },
];

export const BillingPage = () => {
  const { user } = useAuth();
  const usedCredits = 3200;
  const totalCredits = 5000;
  const usagePercentage = (usedCredits / totalCredits) * 100;

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Billing & Subscription</h1>
          <p className="text-muted-foreground">
            Manage your subscription and payment methods
          </p>
        </div>

        <Card className="bg-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Current Usage</CardTitle>
                <CardDescription>Your credit consumption this billing period</CardDescription>
              </div>
              <Badge variant="outline" className="gap-1.5 py-1.5">
                <Zap className="w-3 h-3" />
                {user?.credits.toLocaleString()} remaining
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Credits used</span>
                <span className="font-medium text-foreground">
                  {usedCredits.toLocaleString()} / {totalCredits.toLocaleString()}
                </span>
              </div>
              <Progress value={usagePercentage} className="h-2" />
            </div>
            <p className="text-sm text-muted-foreground">
              Resets on February 1, 2026 • 23 days remaining
            </p>
          </CardContent>
        </Card>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Choose Your Plan</h2>
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
                    Most Popular
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
                    {plan.current ? 'Current Plan' : 'Upgrade'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <Card className="bg-card">
          <CardHeader>
            <CardTitle>Payment Method</CardTitle>
            <CardDescription>Manage your payment information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg border border-border">
              <div className="flex items-center gap-4">
                <div className="w-12 h-8 rounded bg-muted/30 flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-foreground">•••• •••• •••• 4242</p>
                  <p className="text-sm text-muted-foreground">Expires 12/2027</p>
                </div>
              </div>
              <Button variant="outline">Update</Button>
            </div>
            <Button variant="ghost">+ Add payment method</Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default BillingPage;
