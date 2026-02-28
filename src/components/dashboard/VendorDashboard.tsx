import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PeriodSelector, PeriodKey, getDateRange } from "./PeriodSelector";
import { StatCard } from "./StatCard";
import { RevenueChart } from "./RevenueChart";
import { TopProductsTable } from "./TopProductsTable";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, ShoppingBag, CalendarCheck, Star, Wallet } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachMonthOfInterval } from "date-fns";
import { fr } from "date-fns/locale";

export const VendorDashboard = () => {
  const { user } = useAuth();
  const [period, setPeriod] = useState<PeriodKey>("30d");
  const { startDate, endDate } = getDateRange(period);
  const startISO = startDate.toISOString();

  // Get vendor's shop
  const { data: shop } = useQuery({
    queryKey: ["vendor-shop", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shops")
        .select("id, name, owner_id")
        .eq("owner_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const shopId = shop?.id;

  // Orders
  const { data: orders, isLoading: l1 } = useQuery({
    queryKey: ["vendor-dash-orders", shopId, startISO],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, subtotal, status, payment_status, created_at")
        .eq("shop_id", shopId!)
        .gte("created_at", startISO);
      if (error) throw error;
      return data || [];
    },
    enabled: !!shopId,
  });

  // Order items
  const { data: orderItems, isLoading: l2 } = useQuery({
    queryKey: ["vendor-dash-items", shopId, startISO],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_items")
        .select("total_price, quantity, created_at, product:products!product_id(name), order:orders!order_id(status, payment_status)")
        .eq("shop_id", shopId!)
        .gte("created_at", startISO);
      if (error) throw error;
      return data || [];
    },
    enabled: !!shopId,
  });

  // Service bookings
  const { data: bookings, isLoading: l3 } = useQuery({
    queryKey: ["vendor-dash-bookings", shopId, startISO],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_bookings")
        .select("id, total_price, status, payment_status, created_at, service:services!service_id(shop_id)")
        .gte("created_at", startISO);
      if (error) throw error;
      return (data || []).filter((b: any) => b.service?.shop_id === shopId);
    },
    enabled: !!shopId,
  });

  // Reviews
  const { data: reviews } = useQuery({
    queryKey: ["vendor-dash-reviews", shopId],
    queryFn: async () => {
      const { data: shopReviews } = await supabase.from("shop_reviews").select("rating").eq("shop_id", shopId!);
      const { data: products } = await supabase.from("products").select("id").eq("shop_id", shopId!);
      let productRatings: number[] = [];
      if (products?.length) {
        const { data: pReviews } = await supabase.from("product_reviews").select("rating").in("product_id", products.map((p) => p.id));
        productRatings = (pReviews || []).map((r) => r.rating);
      }
      const all = [...(shopReviews || []).map((r) => r.rating), ...productRatings];
      return { count: all.length, average: all.length > 0 ? all.reduce((s, r) => s + r, 0) / all.length : 0 };
    },
    enabled: !!shopId,
  });

  // Pending payouts
  const { data: payouts } = useQuery({
    queryKey: ["vendor-dash-payouts", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pending_payouts")
        .select("id, amount, status, created_at")
        .eq("recipient_id", user!.id)
        .eq("recipient_type", "vendor")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      const pending = (data || []).filter((p) => p.status === "pending").reduce((s, p) => s + p.amount, 0);
      return { pending, items: data || [] };
    },
    enabled: !!user,
  });

  const isLoading = l1 || l2 || l3 || !shop;

  // Calculations
  const kpis = useMemo(() => {
    const paidOrders = (orders || []).filter((o) => o.status === "delivered" || o.payment_status === "paid");
    const completedBookings = (bookings || []).filter((b: any) => b.status === "completed" || b.payment_status === "paid");
    const productRevenue = (orderItems || [])
      .filter((item: any) => item.order?.status === "delivered" || item.order?.payment_status === "paid")
      .reduce((s: number, item: any) => s + (item.total_price || 0), 0);
    const serviceRevenue = completedBookings.reduce((s: number, b: any) => s + (b.total_price || 0), 0);
    return { totalRevenue: productRevenue + serviceRevenue, productRevenue, serviceRevenue, ordersCount: (orders || []).length, paidOrders: paidOrders.length, bookingsCount: (bookings || []).length, completedBookings: completedBookings.length };
  }, [orders, orderItems, bookings]);

  // Monthly revenue
  const revenueData = useMemo(() => {
    if (!orderItems || !bookings) return [];
    const months = eachMonthOfInterval({ start: startDate, end: endDate });
    return months.map((month) => {
      const ms = startOfMonth(month);
      const me = endOfMonth(month);
      const prodRev = (orderItems || [])
        .filter((item: any) => { const d = new Date(item.created_at); return d >= ms && d <= me && (item.order?.status === "delivered" || item.order?.payment_status === "paid"); })
        .reduce((s: number, item: any) => s + (item.total_price || 0), 0);
      const svcRev = (bookings || [])
        .filter((b: any) => { const d = new Date(b.created_at); return d >= ms && d <= me && (b.status === "completed" || b.payment_status === "paid"); })
        .reduce((s: number, b: any) => s + (b.total_price || 0), 0);
      return { name: format(month, "MMM yy", { locale: fr }), produits: prodRev, services: svcRev };
    });
  }, [orderItems, bookings, startDate, endDate]);

  // Top products
  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; revenue: number }>();
    (orderItems || [])
      .filter((item: any) => item.order?.status === "delivered" || item.order?.payment_status === "paid")
      .forEach((item: any) => {
        const name = item.product?.name || "Produit supprimé";
        const e = map.get(name) || { name, qty: 0, revenue: 0 };
        e.qty += item.quantity;
        e.revenue += item.total_price || 0;
        map.set(name, e);
      });
    return [...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [orderItems]);

  if (isLoading) {
    return (
      <div className="space-y-4 lg:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-full sm:w-[200px]" />
        </div>
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  }

  if (!shopId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Vous n'avez pas encore de boutique. Créez-en une pour voir vos statistiques.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">Ma boutique</h2>
          <p className="text-sm text-muted-foreground">{shop.name}</p>
        </div>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {/* KPI Cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        <StatCard title="Chiffre d'affaires" value={`${kpis.totalRevenue.toLocaleString()} F`} icon={TrendingUp} />
        <StatCard title="Commandes" value={`${kpis.paidOrders}/${kpis.ordersCount}`} icon={ShoppingBag} />
        <StatCard title="Réservations" value={`${kpis.completedBookings}/${kpis.bookingsCount}`} icon={CalendarCheck} />
        <StatCard title="Note moyenne" value={reviews?.average ? `${reviews.average.toFixed(1)}/5` : "—"} icon={Star} />
        <StatCard title="En attente" value={`${(payouts?.pending || 0).toLocaleString()} F`} icon={Wallet} />
      </div>

      {/* Revenue Chart */}
      <RevenueChart data={revenueData} title="Revenus par mois" description="Produits vs Services" />

      {/* Bottom section */}
      <div className="grid gap-4 lg:gap-6 grid-cols-1 xl:grid-cols-2">
        <TopProductsTable products={topProducts} title="Top produits vendus" limit={5} />

        {/* Pending payouts */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base sm:text-lg">Recettes en attente</CardTitle>
              <CardDescription>{(payouts?.pending || 0).toLocaleString()} FCFA à recevoir</CardDescription>
            </div>
            <Wallet className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {!payouts?.items.length ? (
              <p className="text-sm text-muted-foreground text-center py-4">Aucun paiement en attente</p>
            ) : (
              <div className="overflow-x-auto">
                <Table className="min-w-[350px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Montant</TableHead>
                      <TableHead>Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payouts.items.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="text-sm">{format(new Date(p.created_at!), "dd MMM", { locale: fr })}</TableCell>
                        <TableCell className="text-right font-medium whitespace-nowrap">{p.amount.toLocaleString()} FCFA</TableCell>
                        <TableCell>
                          <Badge variant={p.status === "pending" ? "secondary" : "default"}>
                            {p.status === "pending" ? "En attente" : "Versé"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
