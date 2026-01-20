import { useState, useEffect } from 'react';
import { Check, CreditCard, Zap, Loader2, AlertTriangle, Calendar, X, History, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useCredits } from '@/hooks/useCredits';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { PaymentMethodCard } from '@/components/billing/PaymentMethodCard';
import { usePaymentMethods } from '@/hooks/usePaymentMethods';
import { useUserRole } from '@/hooks/useUserRole';
import { PayPalButtons } from '@paypal/react-paypal-js';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Test card numbers for development
const TEST_CARDS = {
  visa: '4242 4242 4242 4242',
  mastercard: '5555 5555 5555 4444',
  amex: '3782 822463 10005',
};

// Plan configurations (IDs match database enum: free, pro, business)
const PLANS = [
  {
    id: 'free',
    name: 'Starter (Free)',
    price: 0,
    period: '/mes',
    description: 'Perfecto para probar',
    credits: 50,
    features: [
      '1 Agente IA',
      '50 créditos/mes',
      'RAG Limitado',
    ],
    popular: false,
    canBuyExtras: false,
  },
  {
    id: 'pro',
    name: 'Professional',
    price: 25,
    period: '/mes',
    description: 'Para creadores serios',
    credits: 500,
    features: [
      '3 Agentes IA',
      '500 créditos/mes',
      'RAG Completo',
      'Soporte por Email',
      'Compra de créditos extra',
    ],
    popular: true,
    canBuyExtras: true,
  },
  {
    id: 'business',
    name: 'Business',
    price: 75,
    period: '/mes',
    description: 'Para agencias y empresas',
    credits: 2000,
    features: [
      '5 Agentes IA',
      '2000 créditos/mes',
      'RAG Completo',
      'Soporte Prioritario (Email/Chat)',
      'API Access',
      'Compra de créditos extra',
    ],
    popular: false,
    canBuyExtras: true,
  },
];

// Credit packages
const CREDIT_PACKAGES = [
  { amount: 500, price: 25, label: 'Paquete Básico' },
  { amount: 2000, price: 60, label: 'Paquete Pro', popular: true },
  { amount: 5000, price: 130, label: 'Paquete Enterprise' },
];

export const BillingPage = () => {
  const { data: credits, refetch: refetchCredits } = useCredits();
  const { data: userRole } = useUserRole();
  const { t } = useLanguage();
  const { toast } = useToast();

  const isAdmin = userRole?.isAdmin || false;
  const { hasPaymentMethod, paymentMethod } = usePaymentMethods();

  const [subscription, setSubscription] = useState<any>(null);
  const [creditHistory, setCreditHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [selectedCredits, setSelectedCredits] = useState<string | null>(null);

  // Test payment form
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [cardName, setCardName] = useState('');

  // Paginación del historial
  const [historyPage, setHistoryPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Load subscription data
  useEffect(() => {
    loadSubscription();
    loadCreditHistory();
  }, []);

  const loadSubscription = async () => {
    try {
      const { data, error } = await (supabase.rpc as any)('get_my_subscription');
      if (error) throw error;
      setSubscription(data);
    } catch (error) {
      console.error('Error loading subscription:', error);
      // Default to free if no subscription
      setSubscription({ plan: 'free', credits_balance: 50 });
    } finally {
      setIsLoading(false);
    }
  };

  const loadCreditHistory = async () => {
    try {
      const { data, error } = await (supabase.rpc as any)('get_credit_history', { p_limit: 50 });
      if (error) throw error;
      setCreditHistory(data || []);
    } catch (error) {
      console.error('Error loading credit history:', error);
    }
  };

  // Format card number with spaces
  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    return parts.length ? parts.join(' ') : value;
  };

  // Format expiry date
  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

  // Handle plan change
  const handlePlanChange = async () => {
    if (!selectedPlan) return;

    setIsProcessing(true);
    try {
      // Si no tiene método de pago Y el plan no es free, necesita tarjeta
      if (selectedPlan !== 'free' && !hasPaymentMethod && !validateTestCard()) {
        toast({
          title: "Tarjeta inválida",
          description: "Por favor ingresa una tarjeta de prueba válida",
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }

      const { data, error } = await (supabase.rpc as any)('change_subscription_plan', {
        new_plan: selectedPlan
      });

      if (error) throw error;

      if (data.success) {
        const message = data.action === 'downgrade_scheduled'
          ? data.message
          : `Ahora tienes el plan ${selectedPlan}. Créditos: ${data.credits_added || data.credits}`;
        toast({
          title: data.action === 'downgrade_scheduled' ? "Cambio programado" : "Plan actualizado",
          description: message,
        });
        setShowPaymentDialog(false);
        loadSubscription();
        refetchCredits();
        loadCreditHistory();
      } else {
        throw new Error(data.message || 'Error al cambiar plan');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle credit purchase
  const handleCreditPurchase = async () => {
    if (!selectedCredits) return;

    setIsProcessing(true);
    try {
      // Si no tiene método de pago, necesita tarjeta
      if (!hasPaymentMethod && !validateTestCard()) {
        toast({
          title: "Tarjeta inválida",
          description: "Por favor ingresa una tarjeta de prueba válida",
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }

      const { data, error } = await (supabase.rpc as any)('purchase_extra_credits', {
        package: selectedCredits
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Créditos comprados",
          description: `Se agregaron ${data.credits_added} créditos a tu cuenta.`,
        });
        setShowPaymentDialog(false);
        loadSubscription();
        refetchCredits();
        loadCreditHistory();
      } else {
        toast({
          title: "No disponible",
          description: data.message,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setSelectedCredits(null);
    }
  };

  // Validate test card
  const validateTestCard = () => {
    const cleanCard = cardNumber.replace(/\s/g, '');
    const validCards = Object.values(TEST_CARDS).map(c => c.replace(/\s/g, ''));
    return validCards.includes(cleanCard) && cardExpiry.length >= 5 && cardCvc.length >= 3;
  };

  // Handle cancel subscription
  const handleCancelSubscription = async () => {
    setIsProcessing(true);
    try {
      const { data, error } = await (supabase.rpc as any)('cancel_subscription');

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Suscripción cancelada",
          description: `Tu plan se mantendrá hasta ${new Date(data.cancels_at).toLocaleDateString()}`,
        });
        loadSubscription();
      } else {
        toast({
          title: "Información",
          description: data.message,
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Open payment dialog
  const openPaymentDialog = (planId: string) => {
    setSelectedPlan(planId);
    setSelectedCredits(null);
    setShowPaymentDialog(true);
  };

  const openCreditsDialog = (amount: string) => {
    setSelectedCredits(amount);
    setSelectedPlan(null);
    setShowPaymentDialog(true);
  };

  const currentPlanId = subscription?.plan || 'free';
  const canBuyExtras = currentPlanId === 'pro' || currentPlanId === 'business';
  const balance = credits?.balance || subscription?.credits_balance || 0;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('billing.title')}</h1>
          <p className="text-muted-foreground">{t('billing.subtitle')}</p>
        </div>

        {/* Current Plan Status */}
        <Card className="bg-card border-primary/30">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  Plan Actual:
                  <Badge variant="default" className="text-base">
                    {PLANS.find(p => p.id === currentPlanId)?.name || 'Starter'}
                  </Badge>
                </CardTitle>
                <CardDescription className="mt-1">
                  {subscription?.current_period_end && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Próxima renovación: {new Date(subscription.current_period_end).toLocaleDateString()}
                    </span>
                  )}
                </CardDescription>
              </div>
              <Badge variant="outline" className="gap-1.5 py-1.5 text-lg px-3">
                <Zap className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                {balance.toLocaleString()} créditos
              </Badge>
            </div>
          </CardHeader>
          {subscription?.cancel_at_period_end && (
            <CardContent>
              <div className="p-3 rounded bg-yellow-500/10 border border-yellow-500/30 text-yellow-600">
                <p className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Tu suscripción se cancelará al final del período actual
                </p>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Payment Method Section */}
        <PaymentMethodCard
          canDelete={currentPlanId === 'free' || subscription?.cancel_at_period_end}
          onPaymentMethodChange={() => {
            loadSubscription();
            refetchCredits();
          }}
          showTestCardHint={isAdmin}
        />

        {/* Pending Plan Info */}
        {subscription?.pending_plan && (
          <Card className="bg-orange-500/10 border-orange-500/30">
            <CardContent className="py-4">
              <p className="text-sm text-orange-600 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Tu plan cambiará a <strong>{subscription.pending_plan}</strong> el {new Date(subscription.current_period_end).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Plans Section */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Planes de Suscripción</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PLANS.map((plan) => {
              const isCurrentPlan = currentPlanId === plan.id;
              const isDowngrade = PLANS.findIndex(p => p.id === plan.id) < PLANS.findIndex(p => p.id === currentPlanId);

              return (
                <Card
                  key={plan.id}
                  className={cn(
                    "bg-card relative",
                    plan.popular && !isCurrentPlan && "border-primary shadow-lg",
                    isCurrentPlan && "border-green-500 border-2"
                  )}
                >
                  {plan.popular && !isCurrentPlan && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                      Más Popular
                    </Badge>
                  )}
                  {isCurrentPlan && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-500 hover:bg-green-600">
                      Plan Actual
                    </Badge>
                  )}
                  <CardHeader>
                    <CardTitle>{plan.name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                    <div className="pt-2">
                      <span className="text-3xl font-bold text-foreground">${plan.price}</span>
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

                    {isCurrentPlan ? (
                      currentPlanId !== 'free' && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" className="w-full text-destructive">
                              <X className="w-4 h-4 mr-2" />
                              Cancelar Suscripción
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Cancelar suscripción?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tu plan se mantendrá activo hasta el final del período actual.
                                Después pasarás automáticamente al plan Starter con 50 créditos.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>No, mantener</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={handleCancelSubscription}
                                className="bg-destructive text-destructive-foreground"
                              >
                                Sí, cancelar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )
                    ) : isDowngrade ? (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" className="w-full">
                            Bajar a este plan
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-destructive">
                              ⚠️ Perderás créditos
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Al bajar de plan, tus créditos actuales se reiniciarán a {plan.credits}.
                              Los créditos sobrantes se perderán.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => openPaymentDialog(plan.id)}>
                              Continuar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    ) : (
                      <Button
                        className="w-full"
                        variant={plan.popular ? "default" : "secondary"}
                        onClick={() => openPaymentDialog(plan.id)}
                      >
                        {plan.price === 0 ? 'Activar' : 'Mejorar Plan'}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Extra Credits Section */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">Comprar Créditos Extra</h2>
          {!canBuyExtras && (
            <p className="text-sm text-muted-foreground mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
              Necesitas un plan Professional o Business para comprar créditos extra
            </p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {CREDIT_PACKAGES.map((pack) => (
              <Card
                key={pack.amount}
                className={cn(
                  "bg-card flex flex-col justify-between",
                  !canBuyExtras && "opacity-50"
                )}
              >
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle>{pack.amount.toLocaleString()} Créditos</CardTitle>
                    {pack.popular && <Badge variant="secondary">Popular</Badge>}
                  </div>
                  <CardDescription>{pack.label}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold mb-4">${pack.price}</div>
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => openCreditsDialog(pack.amount.toString())}
                    disabled={!canBuyExtras}
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    Comprar
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Test Card Info - Solo para Admin */}
        {isAdmin && (
          <Card className="bg-blue-500/5 border-blue-500/30">
            <CardHeader>
              <CardTitle className="text-blue-500">🧪 Modo de Prueba (Solo Admin)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                Usa estas tarjetas de prueba para simular pagos:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="p-3 rounded bg-background border">
                  <p className="font-medium">Visa</p>
                  <p className="font-mono text-muted-foreground">{TEST_CARDS.visa}</p>
                </div>
                <div className="p-3 rounded bg-background border">
                  <p className="font-medium">Mastercard</p>
                  <p className="font-mono text-muted-foreground">{TEST_CARDS.mastercard}</p>
                </div>
                <div className="p-3 rounded bg-background border">
                  <p className="font-medium">Amex</p>
                  <p className="font-mono text-muted-foreground">{TEST_CARDS.amex}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Cualquier fecha futura y CVC de 3 dígitos funcionará.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Credit History Section */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <History className="w-5 h-5" />
            Historial de Créditos
          </h2>
          <Card className="bg-card">
            <CardContent className="p-0">
              {creditHistory.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  No hay transacciones registradas
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left p-3 font-medium">Fecha</th>
                          <th className="text-left p-3 font-medium">Tipo</th>
                          <th className="text-left p-3 font-medium">Descripción</th>
                          <th className="text-right p-3 font-medium">Créditos</th>
                        </tr>
                      </thead>
                      <tbody>
                        {creditHistory
                          .slice((historyPage - 1) * ITEMS_PER_PAGE, historyPage * ITEMS_PER_PAGE)
                          .map((item: any, index: number) => (
                            <tr key={index} className="border-t border-border hover:bg-muted/30">
                              <td className="p-3 text-muted-foreground">
                                {new Date(item.created_at).toLocaleDateString('es-AR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </td>
                              <td className="p-3">
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    item.type === 'usage' && 'bg-red-500/10 text-red-500 border-red-500/30',
                                    item.type === 'purchase' && 'bg-green-500/10 text-green-500 border-green-500/30',
                                    item.type === 'bonus' && 'bg-blue-500/10 text-blue-500 border-blue-500/30',
                                    item.type === 'refund' && 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30'
                                  )}
                                >
                                  {item.type === 'usage' && 'Consumo'}
                                  {item.type === 'purchase' && 'Compra'}
                                  {item.type === 'bonus' && 'Bonus'}
                                  {item.type === 'refund' && 'Reembolso'}
                                </Badge>
                              </td>
                              <td className="p-3 text-foreground">{item.description}</td>
                              <td className={cn(
                                "p-3 text-right font-medium flex items-center justify-end gap-1",
                                item.amount >= 0 ? 'text-green-500' : 'text-red-500'
                              )}>
                                {item.amount >= 0 ? (
                                  <ArrowUpCircle className="w-4 h-4" />
                                ) : (
                                  <ArrowDownCircle className="w-4 h-4" />
                                )}
                                {item.amount >= 0 ? '+' : ''}{item.amount}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Paginación */}
                  {creditHistory.length > ITEMS_PER_PAGE && (
                    <div className="flex items-center justify-between p-4 border-t border-border">
                      <p className="text-sm text-muted-foreground">
                        Mostrando {((historyPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(historyPage * ITEMS_PER_PAGE, creditHistory.length)} de {creditHistory.length}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                          disabled={historyPage === 1}
                        >
                          Anterior
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setHistoryPage(p => p + 1)}
                          disabled={historyPage * ITEMS_PER_PAGE >= creditHistory.length}
                        >
                          Siguiente
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedPlan
                ? `Contratar ${PLANS.find(p => p.id === selectedPlan)?.name}`
                : `Comprar ${selectedCredits} créditos`
              }
            </DialogTitle>
            <DialogDescription>
              {selectedPlan && selectedPlan !== 'free'
                ? `$${PLANS.find(p => p.id === selectedPlan)?.price}/mes`
                : selectedCredits
                  ? `$${CREDIT_PACKAGES.find(p => p.amount.toString() === selectedCredits)?.price}`
                  : 'Plan gratuito'
              }
            </DialogDescription>
          </DialogHeader>

          {(selectedPlan === 'free') ? (
            <div className="py-4">
              <p className="text-center text-muted-foreground">
                El plan Starter es gratuito. ¿Confirmas el cambio?
              </p>
            </div>
          ) : hasPaymentMethod ? (
            // Si ya tiene tarjeta guardada, solo mostrar confirmación
            <div className="py-4 space-y-4">
              <div className="p-4 rounded-lg bg-muted/50 border">
                <p className="text-sm text-muted-foreground mb-2">Se cobrará con tu tarjeta guardada:</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-6 rounded bg-gradient-to-r from-slate-700 to-slate-800 flex items-center justify-center text-white text-xs font-bold">
                    {paymentMethod?.card_brand?.toUpperCase().slice(0, 4)}
                  </div>
                  <div>
                    <p className="font-medium">•••• {paymentMethod?.card_last_four}</p>
                    <p className="text-xs text-muted-foreground">
                      Expira: {paymentMethod?.card_exp_month?.toString().padStart(2, '0')}/{paymentMethod?.card_exp_year}
                    </p>
                  </div>
                </div>
              </div>
              {selectedPlan && PLANS.findIndex(p => p.id === selectedPlan) < PLANS.findIndex(p => p.id === currentPlanId) && (
                <div className="p-3 rounded bg-orange-500/10 border border-orange-500/30 text-sm">
                  <p className="text-orange-500">
                    ⚠️ El cambio se aplicará al final del período actual
                  </p>
                </div>
              )}
            </div>
          ) : (
            // Si no tiene método de pago, mostrar PayPal + opción de tarjeta de prueba (admin)
            <div className="py-4 space-y-4">
              <p className="text-sm text-muted-foreground text-center mb-4">
                Paga de forma segura con PayPal o tarjeta
              </p>
              <PayPalButtons
                style={{
                  layout: "vertical",
                  color: "blue",
                  shape: "rect",
                  label: "pay"
                }}
                createOrder={(data, actions) => {
                  const price = selectedPlan
                    ? PLANS.find(p => p.id === selectedPlan)?.price || 0
                    : CREDIT_PACKAGES.find(p => p.amount.toString() === selectedCredits)?.price || 0;

                  return actions.order.create({
                    intent: "CAPTURE",
                    purchase_units: [{
                      amount: {
                        currency_code: "USD",
                        value: price.toString()
                      },
                      description: selectedPlan
                        ? `Suscripción ${PLANS.find(p => p.id === selectedPlan)?.name}`
                        : `${selectedCredits} créditos extra`
                    }]
                  });
                }}
                onApprove={async (data, actions) => {
                  try {
                    // Capturar el pago
                    const details = await actions.order?.capture();
                    console.log('Pago capturado:', details);

                    // Guardar método de pago (PayPal)
                    const payerEmail = details?.payer?.email_address;
                    const payerId = details?.payer?.payer_id;

                    if (payerEmail && payerId) {
                      await (supabase.rpc as any)('save_payment_method', {
                        p_provider: 'paypal',
                        p_paypal_email: payerEmail,
                        p_paypal_payer_id: payerId
                      });
                    }

                    // Ejecutar la acción correspondiente
                    if (selectedPlan) {
                      await handlePlanChange();
                    } else if (selectedCredits) {
                      await handleCreditPurchase();
                    }

                    toast({
                      title: "¡Pago exitoso!",
                      description: `Transacción completada: ${details?.id}`,
                    });
                  } catch (error: any) {
                    console.error('Error en pago:', error);
                    toast({
                      title: "Error en el pago",
                      description: error.message || 'No se pudo completar el pago',
                      variant: "destructive",
                    });
                  }
                }}
                onError={(err) => {
                  console.error('PayPal Error:', err);
                  toast({
                    title: "Error de PayPal",
                    description: "Hubo un problema con PayPal. Inténtalo de nuevo.",
                    variant: "destructive",
                  });
                }}
                onCancel={() => {
                  toast({
                    title: "Pago cancelado",
                    description: "Has cancelado el proceso de pago.",
                  });
                }}
              />

              {/* Formulario de tarjeta de prueba - Solo Admin */}
              {isAdmin && (
                <>
                  <div className="relative my-4">
                    <Separator />
                    <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-xs text-muted-foreground">
                      O usar tarjeta de prueba (Admin)
                    </span>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="cardName">Nombre en la tarjeta</Label>
                      <Input
                        id="cardName"
                        placeholder="Juan Pérez"
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cardNumber">Número de tarjeta</Label>
                      <div className="relative">
                        <Input
                          id="cardNumber"
                          placeholder="4242 4242 4242 4242"
                          value={cardNumber}
                          onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                          maxLength={19}
                        />
                        <CreditCard className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="expiry">Vencimiento</Label>
                        <Input
                          id="expiry"
                          placeholder="MM/YY"
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                          maxLength={5}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cvc">CVC</Label>
                        <Input
                          id="cvc"
                          placeholder="123"
                          value={cardCvc}
                          onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                          maxLength={4}
                        />
                      </div>
                    </div>
                    <Button
                      className="w-full"
                      onClick={selectedPlan ? handlePlanChange : handleCreditPurchase}
                      disabled={isProcessing || !validateTestCard()}
                    >
                      {isProcessing ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : null}
                      Pagar con Tarjeta de Prueba
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
              Cancelar
            </Button>
            {(selectedPlan === 'free' || hasPaymentMethod) && (
              <Button
                onClick={selectedPlan ? handlePlanChange : handleCreditPurchase}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                {selectedPlan === 'free' ? 'Confirmar' : 'Pagar'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default BillingPage;
