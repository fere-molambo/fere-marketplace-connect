import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { fr } from "date-fns/locale";
import { TrendingUp, ShoppingBag, CalendarCheck, Star, Wallet } from "lucide-react";

interface StatsTabProps {
  shopId: string;
}

export const StatsTab = ({ shopId }: StatsTabProps) => {
  // Fetch orders for this shop
  const { data: ordersData, isLoading: loadingOrders } = useQuery({
    queryKey: ["shop-stats-orders", shopId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, subtotal, status, payment_status, created_at")
        .eq("shop_id", shopId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!shopId,
  });

  // Fetch order items for revenue and top products
  const { data: orderItems, isLoading: loadingItems } = useQuery({
    queryKey: ["shop-stats-items", shopId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_items")
        .select(`
          total_price, quantity, created_at,
          product:products!product_id (name),
          order:orders!order_id (status, payment_status)
        `)
        .eq("shop_id", shopId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!shopId,
  });

  // Fetch service bookings
  const { data: bookings, isLoading: loadingBookings } = useQuery({
    queryKey: ["shop-stats-bookings", shopId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_bookings")
        .select("id, total_price, status, payment_status, created_at, service:services!service_id (shop_id)")
        .eq("service.shop_id", shopId);
      if (error) throw error;
      return (data || []).filter((b: any) => b.service?.shop_id === shopId);
    },
    enabled: !!shopId,
  });

  // Fetch reviews
  const { data: reviews, isLoading: loadingReviews } = useQuery({
    queryKey: ["shop-stats-reviews", shopId],
    queryFn: async () => {
      const { data: shopReviews } = await supabase
        .from("shop_reviews")
        .select("rating")
        .eq("shop_id", shopId);

      const { data: products } = await supabase
        .from("products")
        .select("id")
        .eq("shop_id", shopId);

      let productRatings: number[] = [];
      if (products && products.length > 0) {
        const productIds = products.map((p) => p.id);
        const { data: pReviews } = await supabase
          .from("product_reviews")
          .select("rating")
          .in("product_id", productIds);
        productRatings = (pReviews || []).map((r) => r.rating);
      }

      const allRatings = [
        ...(shopReviews || []).map((r) => r.rating),
        ...productRatings,
      ];

      return {
        count: allRatings.length,
        average: allRatings.length > 0
          ? allRatings.reduce((s, r) => s + r, 0) / allRatings.length
          : 0,
      };
    },
    enabled: !!shopId,
  });

  // Fetch pending payouts
  const { data: payouts, isLoading: loadingPayouts } = useQuery({
    queryKey: ["shop-stats-payouts", shopId],
    queryFn: async () => {
      // Get shop owner
      const { data: shop } = await supabase
        .from("shops")
        .select("owner_id")
        .eq("id", shopId)
        .single();

      if (!shop) return { pending: 0, items: [] };

      const { data, error } = await supabase
        .from("pending_payouts")
        .select("id, amount, status, created_at, order_id, booking_id")
        .eq("recipient_id", shop.owner_id)
        .eq("recipient_type", "vendor")
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      const pending = (data || [])
        .filter((p) => p.status === "pending")
        .reduce((s, p) => s + p.amount, 0);
      return { pending, items: data || [] };
    },
    enabled: !!shopId,
  });

  const isLoading = loadingOrders || loadingItems || loadingBookings || loadingReviews || loadingPayouts;

  // Compute stats
  const paidOrders = ordersData?.filter(
    (o) => o.status === "delivered" || o.payment_status === "paid"
  ) || [];
  const completedBookings = bookings?.filter(
    (b: any) => b.status === "completed" || b.payment_status === "paid"
  ) || [];

  const productRevenue = (orderItems || [])
    .filter((item: any) => {
      const order = item.order;
      return order?.status === "delivered" || order?.payment_status === "paid";
    })
    .reduce((s: number, item: any) => s + (item.total_price || 0), 0);

  const serviceRevenue = completedBookings.reduce(
    (s: number, b: any) => s + (b.total_price || 0), 0
  );

  const totalRevenue = productRevenue + serviceRevenue;

  // Monthly revenue chart (last 6 months)
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const date = subMonths(new Date(), 5 - i);
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);

    const monthProductRev = (orderItems || [])
      .filter((item: any) => {
        const order = item.order;
        const d = new Date(item.created_at);
        return (
          (order?.status === "delivered" || order?.payment_status === "paid") &&
          d >= monthStart && d <= monthEnd
        );
      })
      .reduce((s: number, item: any) => s + (item.total_price || 0), 0);

    const monthServiceRev = completedBookings
      .filter((b: any) => {
        const d = new Date(b.created_at);
        return d >= monthStart && d <= monthEnd;
      })
      .reduce((s: number, b: any) => s + (b.total_price || 0), 0);

    return {
      name: format(date, "MMM yy", { locale: fr }),
      produits: monthProductRev,
      services: monthServiceRev,
    };
  });

  // Top 5 products
  const productSales = new Map<string, { name: string; qty: number; revenue: number }>();
  (orderItems || [])
    .filter((item: any) => {
      const order = item.order;
      return order?.status === "delivered" || order?.payment_status === "paid";
    })
    .forEach((item: any) => {
      const name = item.product?.name || "Produit supprimé";
      const existing = productSales.get(name) || { name, qty: 0, revenue: 0 };
      existing.qty += item.quantity;
      existing.revenue += item.total_price || 0;
      productSales.set(name, existing);
    });

  const topProducts = [...productSales.values()]
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chiffre d'affaires</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRevenue.toLocaleString()} FCFA</div>
            <p className="text-xs text-muted-foreground">
              Produits: {productRevenue.toLocaleString()} · Services: {serviceRevenue.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Commandes</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ordersData?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              {paidOrders.length} livrée(s) / payée(s)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Réservations</CardTitle>
            <CalendarCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bookings?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              {completedBookings.length} complétée(s)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Note moyenne</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reviews?.average ? reviews.average.toFixed(1) : "—"}
              <span className="text-sm font-normal text-muted-foreground"> /5</span>
            </div>
            <p className="text-xs text-muted-foreground">{reviews?.count || 0} avis</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Revenus par mois</CardTitle>
          <CardDescription>Derniers 6 mois</CardDescription>
        </CardHeader>
        <CardContent>
          {monthlyData.every((d) => d.produits === 0 && d.services === 0) ? (
            <div className="flex items-center justify-center h-48 text-muted-foreground">
              Aucune donnée de revenus pour cette période
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis className="text-xs" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    `${value.toLocaleString()} FCFA`,
                    name === "produits" ? "Produits" : "Services",
                  ]}
                />
                <Bar dataKey="produits" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="services" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top produits vendus</CardTitle>
          </CardHeader>
          <CardContent>
            {topProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Aucune vente enregistrée</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produit</TableHead>
                    <TableHead className="text-right">Qté</TableHead>
                    <TableHead className="text-right">Revenu</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topProducts.map((p, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium truncate max-w-[150px]">{p.name}</TableCell>
                      <TableCell className="text-right">{p.qty}</TableCell>
                      <TableCell className="text-right">{p.revenue.toLocaleString()} FCFA</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Pending Payouts */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">Recettes en attente</CardTitle>
              <CardDescription>{payouts?.pending.toLocaleString()} FCFA à recevoir</CardDescription>
            </div>
            <Wallet className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {!payouts?.items.length ? (
              <p className="text-sm text-muted-foreground text-center py-4">Aucun paiement en attente</p>
            ) : (
              <Table>
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
                      <TableCell className="text-sm">
                        {format(new Date(p.created_at!), "dd MMM", { locale: fr })}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {p.amount.toLocaleString()} FCFA
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.status === "pending" ? "secondary" : p.status === "processed" ? "default" : "outline"}>
                          {p.status === "pending" ? "En attente" : p.status === "processed" ? "Versé" : p.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
