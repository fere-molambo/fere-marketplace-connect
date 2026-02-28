import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PeriodSelector, PeriodKey, getDateRange } from "./PeriodSelector";
import { StatCard } from "./StatCard";
import { RevenueChart } from "./RevenueChart";
import { OrdersChart } from "./OrdersChart";
import { TopProductsTable } from "./TopProductsTable";
import { ZoneStatsCard } from "./ZoneStatsCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, ShoppingBag, CalendarCheck, Percent, Truck, UserPlus } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, eachWeekOfInterval, startOfWeek, endOfWeek } from "date-fns";
import { fr } from "date-fns/locale";

export const AdminDashboard = () => {
  const [period, setPeriod] = useState<PeriodKey>("30d");
  const { startDate, endDate } = useMemo(() => getDateRange(period), [period]);
  const startISO = startDate.toISOString();

  // Fetch orders in period
  const { data: orders, isLoading: l1 } = useQuery({
    queryKey: ["admin-dash-orders", startISO],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, subtotal, total_amount, commission_amount, delivery_fee, status, payment_status, shop_id, created_at")
        .gte("created_at", startISO);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch order items
  const { data: orderItems, isLoading: l2 } = useQuery({
    queryKey: ["admin-dash-items", startISO],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_items")
        .select("total_price, quantity, shop_id, created_at, product:products!product_id(name), order:orders!order_id(status, payment_status)")
        .gte("created_at", startISO);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch service bookings
  const { data: bookings, isLoading: l3 } = useQuery({
    queryKey: ["admin-dash-bookings", startISO],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_bookings")
        .select("id, total_price, status, payment_status, created_at")
        .gte("created_at", startISO);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch delivery requests
  const { data: deliveries, isLoading: l4 } = useQuery({
    queryKey: ["admin-dash-deliveries", startISO],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("delivery_requests")
        .select("id, status, delivery_fee, zone_id, order_id, created_at")
        .gte("created_at", startISO);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch new users
  const { data: newUsersCount, isLoading: l5 } = useQuery({
    queryKey: ["admin-dash-users", startISO],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("created_at", startISO);
      if (error) throw error;
      return count || 0;
    },
  });

  // Fetch shops for top shops
  const { data: shops } = useQuery({
    queryKey: ["admin-dash-shops"],
    queryFn: async () => {
      const { data, error } = await supabase.from("shops").select("id, name");
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch zones
  const { data: zones } = useQuery({
    queryKey: ["admin-dash-zones"],
    queryFn: async () => {
      const { data, error } = await supabase.from("delivery_zones").select("id, name").eq("is_active", true);
      if (error) throw error;
      return data || [];
    },
  });

  const isLoading = l1 || l2 || l3 || l4 || l5;

  // KPI calculations
  const kpis = useMemo(() => {
    if (!orders) return null;
    const paidOrders = orders.filter((o) => o.status === "delivered" || o.payment_status === "paid");
    const totalRevenue = paidOrders.reduce((s, o) => s + (o.total_amount || 0), 0);
    const totalCommissions = paidOrders.reduce((s, o) => s + (o.commission_amount || 0), 0);
    const completedBookings = (bookings || []).filter((b: any) => b.status === "completed" || b.payment_status === "paid");
    const serviceRevenue = completedBookings.reduce((s: number, b: any) => s + (b.total_price || 0), 0);
    const deliveredCount = (deliveries || []).filter((d) => d.status === "delivered").length;

    return {
      totalRevenue: totalRevenue + serviceRevenue,
      ordersCount: orders.length,
      bookingsCount: (bookings || []).length,
      totalCommissions,
      deliveredCount,
      newUsers: newUsersCount || 0,
    };
  }, [orders, bookings, deliveries, newUsersCount]);

  // Monthly revenue chart data
  const revenueData = useMemo(() => {
    if (!orders || !orderItems || !bookings) return [];
    const months = eachMonthOfInterval({ start: startDate, end: endDate });
    return months.map((month) => {
      const ms = startOfMonth(month);
      const me = endOfMonth(month);
      const monthItems = (orderItems || []).filter((item: any) => {
        const d = new Date(item.created_at);
        const order = item.order;
        return d >= ms && d <= me && (order?.status === "delivered" || order?.payment_status === "paid");
      });
      const prodRev = monthItems.reduce((s: number, item: any) => s + (item.total_price || 0), 0);
      const svcRev = (bookings || [])
        .filter((b: any) => {
          const d = new Date(b.created_at);
          return d >= ms && d <= me && (b.status === "completed" || b.payment_status === "paid");
        })
        .reduce((s: number, b: any) => s + (b.total_price || 0), 0);
      const delRev = (orders || [])
        .filter((o) => {
          const d = new Date(o.created_at!);
          return d >= ms && d <= me && (o.status === "delivered" || o.payment_status === "paid");
        })
        .reduce((s, o) => s + (o.delivery_fee || 0), 0);

      return {
        name: format(month, "MMM yy", { locale: fr }),
        produits: prodRev,
        services: svcRev,
        livraisons: delRev,
      };
    });
  }, [orders, orderItems, bookings, startDate, endDate]);

  // Orders volume chart
  const volumeData = useMemo(() => {
    if (!orders || !bookings) return [];
    const useWeeks = period === "7d" || period === "30d";
    if (useWeeks) {
      const weeks = eachWeekOfInterval({ start: startDate, end: endDate }, { weekStartsOn: 1 });
      return weeks.map((week) => {
        const ws = startOfWeek(week, { weekStartsOn: 1 });
        const we = endOfWeek(week, { weekStartsOn: 1 });
        return {
          name: format(ws, "dd MMM", { locale: fr }),
          commandes: orders.filter((o) => { const d = new Date(o.created_at!); return d >= ws && d <= we; }).length,
          reservations: (bookings || []).filter((b: any) => { const d = new Date(b.created_at); return d >= ws && d <= we; }).length,
        };
      });
    }
    const months = eachMonthOfInterval({ start: startDate, end: endDate });
    return months.map((month) => {
      const ms = startOfMonth(month);
      const me = endOfMonth(month);
      return {
        name: format(month, "MMM yy", { locale: fr }),
        commandes: orders.filter((o) => { const d = new Date(o.created_at!); return d >= ms && d <= me; }).length,
        reservations: (bookings || []).filter((b: any) => { const d = new Date(b.created_at); return d >= ms && d <= me; }).length,
      };
    });
  }, [orders, bookings, period, startDate, endDate]);

  // Top products
  const topProducts = useMemo(() => {
    if (!orderItems) return [];
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
    return [...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  }, [orderItems]);

  // Top shops
  const topShops = useMemo(() => {
    if (!orders || !shops) return [];
    const map = new Map<string, { name: string; ordersCount: number; revenue: number }>();
    orders
      .filter((o) => o.status === "delivered" || o.payment_status === "paid")
      .forEach((o) => {
        const shop = shops.find((s) => s.id === o.shop_id);
        const name = shop?.name || "Boutique inconnue";
        const e = map.get(o.shop_id || "") || { name, ordersCount: 0, revenue: 0 };
        e.ordersCount += 1;
        e.revenue += o.total_amount || 0;
        map.set(o.shop_id || "", e);
      });
    return [...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  }, [orders, shops]);

  // Zone stats
  const zoneStats = useMemo(() => {
    if (!zones || !deliveries || !orders) return [];
    return zones.map((zone) => {
      const zoneDeliveries = (deliveries || []).filter((d) => d.zone_id === zone.id);
      const zoneOrderIds = new Set(zoneDeliveries.map((d) => d.order_id));
      const zoneOrders = orders.filter((o) => zoneOrderIds.has(o.id));
      const revenue = zoneOrders
        .filter((o) => o.status === "delivered" || o.payment_status === "paid")
        .reduce((s, o) => s + (o.total_amount || 0), 0);
      return {
        name: zone.name,
        ordersCount: zoneOrders.length,
        deliveriesCount: zoneDeliveries.filter((d) => d.status === "delivered").length,
        revenue,
      };
    }).filter((z) => z.ordersCount > 0 || z.deliveriesCount > 0);
  }, [zones, deliveries, orders]);

  if (isLoading) {
    return (
      <div className="space-y-4 lg:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-full sm:w-[200px]" />
        </div>
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-sm text-muted-foreground">Vue d'ensemble de la plateforme Fere</p>
        </div>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {/* KPI Cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard title="CA total" value={`${(kpis?.totalRevenue || 0).toLocaleString()} F`} icon={DollarSign} />
        <StatCard title="Commandes" value={kpis?.ordersCount || 0} icon={ShoppingBag} />
        <StatCard title="Réservations" value={kpis?.bookingsCount || 0} icon={CalendarCheck} />
        <StatCard title="Commissions" value={`${(kpis?.totalCommissions || 0).toLocaleString()} F`} icon={Percent} />
        <StatCard title="Livraisons" value={kpis?.deliveredCount || 0} icon={Truck} />
        <StatCard title="Nouveaux utilisateurs" value={kpis?.newUsers || 0} icon={UserPlus} />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:gap-6 grid-cols-1 xl:grid-cols-2">
        <RevenueChart data={revenueData} description="Produits, services et livraisons" />
        <OrdersChart data={volumeData} description={period === "7d" || period === "30d" ? "Par semaine" : "Par mois"} />
      </div>

      {/* Tables */}
      <div className="grid gap-4 lg:gap-6 grid-cols-1 xl:grid-cols-2">
        <TopProductsTable products={topProducts} title="Top 10 produits vendus" />

        {/* Top shops */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base sm:text-lg">Top boutiques par CA</CardTitle>
          </CardHeader>
          <CardContent>
            {topShops.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Aucune vente enregistrée</p>
            ) : (
              <div className="overflow-x-auto">
                <Table className="min-w-[400px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Boutique</TableHead>
                      <TableHead className="text-right">Commandes</TableHead>
                      <TableHead className="text-right">CA</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topShops.map((s, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                        <TableCell className="font-medium truncate max-w-[200px]">{s.name}</TableCell>
                        <TableCell className="text-right">{s.ordersCount}</TableCell>
                        <TableCell className="text-right whitespace-nowrap">{s.revenue.toLocaleString()} FCFA</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Zone stats */}
      <ZoneStatsCard zones={zoneStats} />
    </div>
  );
};
