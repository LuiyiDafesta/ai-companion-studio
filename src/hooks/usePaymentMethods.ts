import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface PaymentMethod {
    has_payment_method: boolean;
    card_last_four?: string;
    card_brand?: string;
    card_exp_month?: number;
    card_exp_year?: number;
}

interface SavePaymentMethodParams {
    cardLastFour: string;
    cardBrand: string;
    cardExpMonth: number;
    cardExpYear: number;
}

export const usePaymentMethods = () => {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Fetch current payment method
    const { data: paymentMethod, isLoading, refetch } = useQuery({
        queryKey: ['paymentMethod'],
        queryFn: async (): Promise<PaymentMethod> => {
            const { data, error } = await (supabase.rpc as any)('get_my_payment_method');
            if (error) throw error;
            return data;
        },
    });

    // Save payment method
    const savePaymentMethod = useMutation({
        mutationFn: async (params: SavePaymentMethodParams) => {
            const { data, error } = await (supabase.rpc as any)('save_payment_method', {
                p_card_last_four: params.cardLastFour,
                p_card_brand: params.cardBrand,
                p_card_exp_month: params.cardExpMonth,
                p_card_exp_year: params.cardExpYear,
            });
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['paymentMethod'] });
            queryClient.invalidateQueries({ queryKey: ['subscription'] });
            toast({
                title: "Tarjeta guardada",
                description: "Tu método de pago ha sido actualizado.",
            });
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "No se pudo guardar la tarjeta",
                variant: "destructive",
            });
        },
    });

    // Check if can delete
    const checkCanDelete = useMutation({
        mutationFn: async () => {
            const { data, error } = await (supabase.rpc as any)('can_delete_payment_method');
            if (error) throw error;
            return data;
        },
    });

    // Delete payment method
    const deletePaymentMethod = useMutation({
        mutationFn: async () => {
            const { data, error } = await (supabase.rpc as any)('delete_payment_method');
            if (error) throw error;
            if (!data.success) {
                throw new Error(data.reason || 'No se puede eliminar la tarjeta');
            }
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['paymentMethod'] });
            toast({
                title: "Tarjeta eliminada",
                description: "Tu método de pago ha sido eliminado.",
            });
        },
        onError: (error: any) => {
            toast({
                title: "No se puede eliminar",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    return {
        paymentMethod,
        isLoading,
        refetch,
        savePaymentMethod,
        checkCanDelete,
        deletePaymentMethod,
        hasPaymentMethod: paymentMethod?.has_payment_method ?? false,
    };
};

// Helper to detect card brand from number
export const detectCardBrand = (cardNumber: string): string => {
    const cleanNumber = cardNumber.replace(/\s/g, '');
    if (/^4/.test(cleanNumber)) return 'visa';
    if (/^5[1-5]/.test(cleanNumber)) return 'mastercard';
    if (/^3[47]/.test(cleanNumber)) return 'amex';
    if (/^6(?:011|5)/.test(cleanNumber)) return 'discover';
    return 'unknown';
};

// Helper to get last 4 digits
export const getLastFour = (cardNumber: string): string => {
    const cleanNumber = cardNumber.replace(/\s/g, '');
    return cleanNumber.slice(-4);
};

// Helper to parse expiry
export const parseExpiry = (expiry: string): { month: number; year: number } | null => {
    const parts = expiry.split('/');
    if (parts.length !== 2) return null;
    const month = parseInt(parts[0], 10);
    const year = parseInt(parts[1], 10) + 2000; // Assuming 2-digit year
    if (isNaN(month) || isNaN(year) || month < 1 || month > 12) return null;
    return { month, year };
};
