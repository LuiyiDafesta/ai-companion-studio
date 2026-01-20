import { useState } from 'react';
import { CreditCard, Trash2, Edit2, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { usePaymentMethods, detectCardBrand, getLastFour, parseExpiry } from '@/hooks/usePaymentMethods';

// Test card numbers
const TEST_CARDS = {
    visa: '4242 4242 4242 4242',
    mastercard: '5555 5555 5555 4444',
    amex: '3782 822463 10005',
};

interface PaymentMethodCardProps {
    canDelete?: boolean;
    onPaymentMethodChange?: () => void;
    showTestCardHint?: boolean;
}

export const PaymentMethodCard = ({ canDelete = true, onPaymentMethodChange, showTestCardHint = false }: PaymentMethodCardProps) => {
    const { paymentMethod, isLoading, savePaymentMethod, deletePaymentMethod, hasPaymentMethod } = usePaymentMethods();
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [cardNumber, setCardNumber] = useState('');
    const [cardExpiry, setCardExpiry] = useState('');
    const [cardCvc, setCardCvc] = useState('');

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

    const formatExpiry = (value: string) => {
        const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
        if (v.length >= 2) {
            return v.substring(0, 2) + '/' + v.substring(2, 4);
        }
        return v;
    };

    const validateTestCard = () => {
        const cleanCard = cardNumber.replace(/\s/g, '');
        const validCards = Object.values(TEST_CARDS).map(c => c.replace(/\s/g, ''));
        return validCards.includes(cleanCard) && cardExpiry.length >= 5 && cardCvc.length >= 3;
    };

    const handleSave = async () => {
        if (!validateTestCard()) return;

        const expiry = parseExpiry(cardExpiry);
        if (!expiry) return;

        await savePaymentMethod.mutateAsync({
            cardLastFour: getLastFour(cardNumber),
            cardBrand: detectCardBrand(cardNumber),
            cardExpMonth: expiry.month,
            cardExpYear: expiry.year,
        });

        setShowEditDialog(false);
        setCardNumber('');
        setCardExpiry('');
        setCardCvc('');
        onPaymentMethodChange?.();
    };

    const handleDelete = async () => {
        await deletePaymentMethod.mutateAsync();
        onPaymentMethodChange?.();
    };

    const getBrandIcon = (brand: string) => {
        switch (brand) {
            case 'visa': return '💳 Visa';
            case 'mastercard': return '💳 Mastercard';
            case 'amex': return '💳 Amex';
            default: return '💳 Tarjeta';
        }
    };

    if (isLoading) {
        return (
            <Card className="bg-card">
                <CardContent className="p-6 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        );
    }

    return (
        <>
            <Card className="bg-card">
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <CreditCard className="w-5 h-5" />
                        Método de Pago
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {hasPaymentMethod && paymentMethod ? (
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-8 rounded bg-gradient-to-r from-slate-700 to-slate-800 flex items-center justify-center text-white text-xs font-bold">
                                    {paymentMethod.card_brand?.toUpperCase().slice(0, 4)}
                                </div>
                                <div>
                                    <p className="font-medium text-foreground">
                                        {getBrandIcon(paymentMethod.card_brand || '')} terminada en {paymentMethod.card_last_four}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        Expira: {paymentMethod.card_exp_month?.toString().padStart(2, '0')}/{paymentMethod.card_exp_year}
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => setShowEditDialog(true)}>
                                    <Edit2 className="w-4 h-4 mr-1" />
                                    Cambiar
                                </Button>
                                {canDelete && (
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>¿Eliminar tarjeta?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Esta acción no se puede deshacer. Si tienes un plan activo, no podrás eliminar tu tarjeta.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                <AlertDialogAction
                                                    onClick={handleDelete}
                                                    className="bg-destructive text-destructive-foreground"
                                                >
                                                    Eliminar
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between">
                            <p className="text-muted-foreground">No tienes una tarjeta registrada</p>
                            <Button onClick={() => setShowEditDialog(true)}>
                                <CreditCard className="w-4 h-4 mr-2" />
                                Agregar Tarjeta
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Card Edit Dialog */}
            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {hasPaymentMethod ? 'Cambiar Tarjeta' : 'Agregar Tarjeta'}
                        </DialogTitle>
                        <DialogDescription>
                            Ingresa los datos de tu tarjeta de prueba
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="cardNumber">Número de tarjeta</Label>
                            <Input
                                id="cardNumber"
                                placeholder="4242 4242 4242 4242"
                                value={cardNumber}
                                onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                                maxLength={19}
                            />
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

                        {/* Test cards hint - Solo si showTestCardHint */}
                        {showTestCardHint && (
                            <div className="p-3 rounded bg-blue-500/10 border border-blue-500/30 text-sm">
                                <p className="font-medium text-blue-500 mb-1">Tarjetas de prueba:</p>
                                <p className="text-muted-foreground font-mono text-xs">{TEST_CARDS.visa}</p>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={!validateTestCard() || savePaymentMethod.isPending}
                        >
                            {savePaymentMethod.isPending ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : null}
                            Guardar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default PaymentMethodCard;
