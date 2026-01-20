import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    DollarSign, Users, TrendingUp, Calendar, Zap, Download, RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Plan prices
const PLAN_PRICES: Record<string, number> = {
    free: 0,
    pro: 25,
    business: 75,
};

const PLAN_NAMES: Record<string, string> = {
    free: 'Starter',
    pro: 'Professional',
    business: 'Business',
};

export const AdminBillingPage = () => {
    const [dateFilter, setDateFilter] = useState('30');

    // Fetch all subscriptions using RPC
    const { data: subscriptions, isLoading: loadingSubs, refetch: refetchSubs } = useQuery({
        queryKey: ['admin-subscriptions'],
        queryFn: async () => {
            const { data, error } = await (supabase.rpc as any)('get_admin_subscriptions');
            if (error) throw error;
            return data || [];
        },
    });

    // Fetch all credit transactions using RPC
    const { data: transactions, isLoading: loadingTx } = useQuery({
        queryKey: ['admin-transactions', dateFilter],
        queryFn: async () => {
            const { data, error } = await (supabase.rpc as any)('get_admin_transactions', {
                days_limit: parseInt(dateFilter)
            });
            if (error) throw error;
            return data || [];
        },
    });

    // Fetch all credits balances using RPC
    const { data: creditBalances } = useQuery({
        queryKey: ['admin-credits'],
        queryFn: async () => {
            const { data, error } = await (supabase.rpc as any)('get_admin_credit_balances');
            if (error) throw error;
            return data || [];
        },
    });

    // Calculate metrics
    const metrics = {
        totalRevenue: subscriptions?.reduce((acc: number, sub: any) => {
            return acc + (PLAN_PRICES[sub.plan_type] || 0);
        }, 0) || 0,

        creditPurchases: transactions?.filter((t: any) => t.type === 'purchase').reduce((acc: number, t: any) => {
            const amount = t.amount;
            if (amount === 500) return acc + 15;
            if (amount === 2000) return acc + 50;
            if (amount === 5000) return acc + 100;
            return acc;
        }, 0) || 0,

        activeSubscriptions: subscriptions?.filter((s: any) => s.status === 'active' && s.plan_type !== 'free').length || 0,

        planDistribution: {
            free: subscriptions?.filter((s: any) => s.plan_type === 'free').length || 0,
            pro: subscriptions?.filter((s: any) => s.plan_type === 'pro').length || 0,
            business: subscriptions?.filter((s: any) => s.plan_type === 'business').length || 0,
        },

        totalCreditsInSystem: creditBalances?.reduce((acc: number, c: any) => acc + (c.balance || 0), 0) || 0,

        pendingCancellations: subscriptions?.filter((s: any) => s.cancel_at_period_end).length || 0,
    };

    const totalMonthlyRevenue = metrics.totalRevenue + metrics.creditPurchases;

    // Export data as CSV
    const exportToCSV = () => {
        if (!subscriptions) return;

        const csvContent = [
            ['Usuario', 'Email', 'Plan', 'Estado', 'Fecha Inicio', 'Fecha Fin', 'Cancelación Pendiente'].join(','),
            ...subscriptions.map((s: any) => [
                s.user_full_name || 'N/A',
                s.user_email || 'N/A',
                PLAN_NAMES[s.plan_type] || s.plan_type,
                s.status,
                s.created_at?.split('T')[0],
                s.current_period_end?.split('T')[0] || 'N/A',
                s.cancel_at_period_end ? 'Sí' : 'No'
            ].map(v => `"${v}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `suscripciones_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Suscripciones y Facturación</h1>
                        <p className="text-muted-foreground">
                            Gestión completa de planes, créditos e ingresos
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => refetchSubs()}>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Actualizar
                        </Button>
                        <Button variant="outline" onClick={exportToCSV}>
                            <Download className="w-4 h-4 mr-2" />
                            Exportar CSV
                        </Button>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Ingresos Mensuales
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-2">
                                <DollarSign className="w-8 h-8 text-green-500" />
                                <span className="text-3xl font-bold text-foreground">
                                    ${totalMonthlyRevenue.toLocaleString()}
                                </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Planes: ${metrics.totalRevenue} | Extras: ${metrics.creditPurchases}
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Suscripciones Activas
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-2">
                                <Users className="w-8 h-8 text-blue-500" />
                                <span className="text-3xl font-bold text-foreground">
                                    {metrics.activeSubscriptions}
                                </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Pro: {metrics.planDistribution.pro} | Business: {metrics.planDistribution.business}
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border-yellow-500/20">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Créditos en Sistema
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-2">
                                <Zap className="w-8 h-8 text-yellow-500" />
                                <span className="text-3xl font-bold text-foreground">
                                    {metrics.totalCreditsInSystem.toLocaleString()}
                                </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Total de créditos disponibles
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Cancelaciones Pendientes
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-2">
                                <Calendar className="w-8 h-8 text-orange-500" />
                                <span className="text-3xl font-bold text-foreground">
                                    {metrics.pendingCancellations}
                                </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Usuarios que cancelarán al fin del período
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Plan Distribution */}
                <Card>
                    <CardHeader>
                        <CardTitle>Distribución de Planes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="text-center p-4 rounded-lg bg-muted/30">
                                <p className="text-3xl font-bold">{metrics.planDistribution.free}</p>
                                <p className="text-sm text-muted-foreground">Starter (Free)</p>
                                <p className="text-xs text-muted-foreground">$0/mes</p>
                            </div>
                            <div className="text-center p-4 rounded-lg bg-blue-500/10">
                                <p className="text-3xl font-bold text-blue-500">{metrics.planDistribution.pro}</p>
                                <p className="text-sm text-muted-foreground">Professional</p>
                                <p className="text-xs text-blue-500">${metrics.planDistribution.pro * 25}/mes</p>
                            </div>
                            <div className="text-center p-4 rounded-lg bg-purple-500/10">
                                <p className="text-3xl font-bold text-purple-500">{metrics.planDistribution.business}</p>
                                <p className="text-sm text-muted-foreground">Business</p>
                                <p className="text-xs text-purple-500">${metrics.planDistribution.business * 75}/mes</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Tabs for different views */}
                <Tabs defaultValue="subscriptions" className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="subscriptions">Suscripciones</TabsTrigger>
                        <TabsTrigger value="transactions">Transacciones</TabsTrigger>
                        <TabsTrigger value="credits">Saldos de Créditos</TabsTrigger>
                    </TabsList>

                    {/* Subscriptions Tab */}
                    <TabsContent value="subscriptions">
                        <Card>
                            <CardHeader>
                                <CardTitle>Lista de Suscripciones</CardTitle>
                                <CardDescription>
                                    Todas las suscripciones activas y sus fechas de vencimiento
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Usuario</TableHead>
                                            <TableHead>Plan</TableHead>
                                            <TableHead>Estado</TableHead>
                                            <TableHead>Vencimiento</TableHead>
                                            <TableHead>Ingreso/mes</TableHead>
                                            <TableHead>Notas</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loadingSubs ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center py-8">
                                                    Cargando...
                                                </TableCell>
                                            </TableRow>
                                        ) : subscriptions?.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                                    No hay suscripciones
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            subscriptions?.map((sub: any) => (
                                                <TableRow key={sub.id}>
                                                    <TableCell>
                                                        <div>
                                                            <p className="font-medium">{sub.user_full_name || 'Sin nombre'}</p>
                                                            <p className="text-xs text-muted-foreground">{sub.user_email}</p>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant={sub.plan_type === 'business' ? 'default' : sub.plan_type === 'pro' ? 'secondary' : 'outline'}>
                                                            {PLAN_NAMES[sub.plan_type] || sub.plan_type}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant={sub.status === 'active' ? 'default' : 'destructive'} className="bg-green-500/20 text-green-600">
                                                            {sub.status}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        {sub.current_period_end
                                                            ? new Date(sub.current_period_end).toLocaleDateString()
                                                            : '-'
                                                        }
                                                    </TableCell>
                                                    <TableCell className="font-medium">
                                                        ${PLAN_PRICES[sub.plan_type] || 0}
                                                    </TableCell>
                                                    <TableCell>
                                                        {sub.cancel_at_period_end && (
                                                            <Badge variant="destructive">Cancela al vencer</Badge>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Transactions Tab */}
                    <TabsContent value="transactions">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>Historial de Transacciones</CardTitle>
                                    <CardDescription>
                                        Compras de créditos y movimientos
                                    </CardDescription>
                                </div>
                                <Select value={dateFilter} onValueChange={setDateFilter}>
                                    <SelectTrigger className="w-40">
                                        <SelectValue placeholder="Período" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="7">Últimos 7 días</SelectItem>
                                        <SelectItem value="30">Últimos 30 días</SelectItem>
                                        <SelectItem value="90">Últimos 90 días</SelectItem>
                                        <SelectItem value="365">Último año</SelectItem>
                                    </SelectContent>
                                </Select>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Fecha</TableHead>
                                            <TableHead>Usuario</TableHead>
                                            <TableHead>Tipo</TableHead>
                                            <TableHead>Créditos</TableHead>
                                            <TableHead>Valor</TableHead>
                                            <TableHead>Descripción</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loadingTx ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center py-8">
                                                    Cargando...
                                                </TableCell>
                                            </TableRow>
                                        ) : transactions?.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                                    No hay transacciones en este período
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            transactions?.map((tx: any) => {
                                                const value = tx.type === 'purchase'
                                                    ? (tx.amount === 500 ? 15 : tx.amount === 2000 ? 50 : tx.amount === 5000 ? 100 : 0)
                                                    : 0;
                                                return (
                                                    <TableRow key={tx.id}>
                                                        <TableCell className="text-sm">
                                                            {new Date(tx.created_at).toLocaleDateString()}
                                                        </TableCell>
                                                        <TableCell>
                                                            <div>
                                                                <p className="font-medium text-sm">{tx.user_full_name || 'N/A'}</p>
                                                                <p className="text-xs text-muted-foreground">{tx.user_email}</p>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant={tx.type === 'purchase' ? 'default' : tx.type === 'usage' ? 'secondary' : 'outline'}>
                                                                {tx.type === 'purchase' ? 'Compra' : tx.type === 'usage' ? 'Uso' : tx.type}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            <span className={tx.type === 'usage' ? 'text-red-500' : 'text-green-500'}>
                                                                {tx.type === 'usage' ? '-' : '+'}{tx.amount}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell className="font-medium text-green-600">
                                                            {value > 0 ? `$${value}` : '-'}
                                                        </TableCell>
                                                        <TableCell className="text-sm text-muted-foreground">
                                                            {tx.description || '-'}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Credits Tab */}
                    <TabsContent value="credits">
                        <Card>
                            <CardHeader>
                                <CardTitle>Saldos de Créditos por Usuario</CardTitle>
                                <CardDescription>
                                    Créditos disponibles actualmente
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Usuario</TableHead>
                                            <TableHead className="text-right">Créditos Disponibles</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {creditBalances?.map((credit: any) => (
                                            <TableRow key={credit.id}>
                                                <TableCell>
                                                    <div>
                                                        <p className="font-medium">{credit.user_full_name || 'Sin nombre'}</p>
                                                        <p className="text-xs text-muted-foreground">{credit.user_email}</p>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Badge variant="outline" className="gap-1">
                                                        <Zap className="w-3 h-3 text-yellow-500" />
                                                        {credit.balance?.toLocaleString() || 0}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </DashboardLayout>
    );
};

export default AdminBillingPage;
