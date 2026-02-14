import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { PaymentStatusBadge } from "@/components/orders/PaymentStatusBadge";
import { DeliveryStatusBadge } from "@/components/orders/DeliveryStatusBadge";
import { OrderDetailSheet } from "@/components/orders/OrderDetailSheet";
import { BookingDetailSheet } from "@/components/orders/BookingDetailSheet";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Package, Calendar, Eye, MessageSquare, Truck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface OrdersTabProps {
  shopId: string;
}

export const OrdersTab = ({ shopId }: OrdersTabProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  // Realtime subscription for order and booking updates
  useEffect(() => {
    const ordersChannel = supabase
      .channel('vendor-orders-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["shop-order-items", shopId] });
        }
      )
      .subscribe();

    const bookingsChannel = supabase
      .channel('vendor-bookings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'service_bookings'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["shop-bookings", shopId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(bookingsChannel);
    };
  }, [queryClient, shopId]);

  // Fetch product orders for this shop with delivery request status
  const { data: orderItems = [], isLoading: loadingOrders } = useQuery({
    queryKey: ["shop-order-items", shopId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_items")
        .select(`
          *,
          order:orders!order_id (
            id,
            order_number,
            status,
            payment_status,
            delivery_type,
            total_amount,
            subtotal,
            commission_amount,
            delivery_fee,
            advance_paid,
            created_at,
            user_id,
            profiles:user_id (nom_complet, contact, email),
            delivery_addresses:delivery_address_id (label, address, recipient_name, recipient_phone)
          ),
          product:products!product_id (name, main_media_url)
        `)
        .eq("shop_id", shopId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      
      // Fetch delivery requests for all orders (including return deliveries)
      const orderIds = [...new Set(data?.map(item => item.order?.id).filter(Boolean))];
      if (orderIds.length > 0) {
        const { data: deliveryRequests } = await supabase
          .from("delivery_requests")
          .select("id, order_id, status, return_status, is_return, pickup_point, driver_id, arrived_at_client_at")
          .in("order_id", orderIds);
        
        // Map delivery status to each order item
        return data?.map(item => ({
          ...item,
          deliveryStatus: deliveryRequests?.find(dr => dr.order_id === item.order?.id && !dr.is_return)?.status,
          returnStatus: deliveryRequests?.find(dr => dr.order_id === item.order?.id && !dr.is_return)?.return_status,
          returnDelivery: deliveryRequests?.find(dr => dr.order_id === item.order?.id && dr.is_return),
        })) || [];
      }
      
      return data || [];
    },
  });

  // Get items pending return (check both original return_status AND return delivery return_status)
  const returningItems = orderItems.filter((item: any) => 
    item.returnStatus === "returning" || 
    (item.returnDelivery && !["delivered", "cancelled"].includes(item.returnDelivery.status) && item.returnDelivery.return_status !== "returned")
  );

  // Fetch service bookings for this shop with delivery address
  const { data: bookings = [], isLoading: loadingBookings } = useQuery({
    queryKey: ["shop-bookings", shopId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_bookings")
        .select(`
          *,
          service:services!service_id (name, shop_id, price),
          customer:profiles!customer_id (nom_complet, contact, email),
          delivery_address:delivery_addresses!delivery_address_id (
            id, label, address, city, country, recipient_name, recipient_phone,
            geolocation_lat, geolocation_lng, google_maps_link
          )
        `)
        .eq("service.shop_id", shopId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data?.filter(b => b.service) || [];
    },
  });

  const formatCurrency = (amount: number) => {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return "0 FCFA";
    }
    return new Intl.NumberFormat("fr-FR").format(amount) + " FCFA";
  };

  const handleMessage = (userId: string) => {
    navigate(`/dashboard/messages?userId=${userId}`);
  };

  if (loadingOrders || loadingBookings) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <Tabs defaultValue="orders" className="space-y-4">
      <TabsList>
        <TabsTrigger value="orders" className="gap-2">
          <Package className="h-4 w-4" />
          Commandes ({orderItems.length})
        </TabsTrigger>
        <TabsTrigger value="bookings" className="gap-2">
          <Calendar className="h-4 w-4" />
          Réservations ({bookings.length})
        </TabsTrigger>
        {returningItems.length > 0 && (
          <TabsTrigger value="returns" className="gap-2">
            <Truck className="h-4 w-4" />
            Retours ({returningItems.length})
          </TabsTrigger>
        )}
      </TabsList>

      <TabsContent value="orders">
        <Card>
          <CardHeader>
            <CardTitle>Commandes produits</CardTitle>
            <CardDescription>Commandes reçues pour vos produits</CardDescription>
          </CardHeader>
          <CardContent>
            {orderItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Aucune commande pour le moment
              </div>
            ) : (
              <div className="space-y-4">
                {orderItems.map((item: any) => (
                  <div
                    key={item.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      {item.product?.main_media_url && (
                        <img
                          src={item.product.main_media_url}
                          alt={item.product.name}
                          className="w-12 h-12 object-cover rounded"
                        />
                      )}
                      <div>
                        <p className="font-medium">{item.product?.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.order?.order_number} • {item.quantity} x {formatCurrency(item.unit_price)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {item.order?.profiles?.nom_complet}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{formatCurrency(item.total_price)}</Badge>
                      <OrderStatusBadge status={item.order?.status} />
                      <PaymentStatusBadge status={item.order?.payment_status} />
                      {item.order?.delivery_type === "delivery" && item.deliveryStatus && (
                        <div className="flex items-center gap-1">
                          <Truck className="h-3 w-3 text-muted-foreground" />
                          <DeliveryStatusBadge status={item.deliveryStatus} />
                        </div>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedOrder(item.order)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {item.order?.user_id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleMessage(item.order.user_id)}
                        >
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="bookings">
        <Card>
          <CardHeader>
            <CardTitle>Réservations services</CardTitle>
            <CardDescription>Réservations reçues pour vos services</CardDescription>
          </CardHeader>
          <CardContent>
            {bookings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Aucune réservation pour le moment
              </div>
            ) : (
              <div className="space-y-4">
                {bookings.map((booking: any) => (
                  <div
                    key={booking.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{booking.service?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(booking.booking_date), "dd MMM yyyy", { locale: fr })} à {booking.booking_time}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {booking.customer?.nom_complet} • {booking.customer?.contact}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{formatCurrency(booking.total_price)}</Badge>
                      <OrderStatusBadge status={booking.status} />
                      <PaymentStatusBadge status={booking.payment_status} />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedBooking(booking)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {booking.customer_id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleMessage(booking.customer_id)}
                        >
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="returns">
        <Card>
          <CardHeader>
            <CardTitle>Retours en cours</CardTitle>
            <CardDescription>
              Produits en cours de retour suite à une annulation client
            </CardDescription>
          </CardHeader>
          <CardContent>
            {returningItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Aucun retour en attente
              </div>
            ) : (
              <div className="space-y-4">
                {returningItems.map((item: any) => (
                  <div
                    key={item.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border rounded-lg bg-amber-50/50 border-amber-200"
                  >
                    <div className="flex items-center gap-4">
                      {item.product?.main_media_url && (
                        <img
                          src={item.product.main_media_url}
                          alt={item.product.name}
                          className="w-12 h-12 object-cover rounded"
                        />
                      )}
                      <div>
                        <p className="font-medium">{item.product?.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.order?.order_number} • {item.quantity} unité(s)
                        </p>
                         <p className="text-sm text-amber-600">
                          {item.returnDelivery?.return_status === "arrived_vendor" 
                            ? "Livreur arrivé - Confirmez la réception" 
                            : item.returnDelivery?.return_status === "en_route_vendor"
                            ? "Livreur en route vers vous"
                            : "Retour initié"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                       <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300">
                        <Truck className="h-3 w-3 mr-1" />
                        {item.returnDelivery?.return_status === "arrived_vendor" ? "Arrivé" : item.returnDelivery?.return_status === "en_route_vendor" ? "En route" : "En attente"}
                      </Badge>
                      <Button
                        variant="default"
                        size="sm"
                        disabled={item.returnDelivery?.return_status !== "arrived_vendor"}
                        onClick={async () => {
                          try {
                            // 1. Update original delivery return_status to "returned"
                            await supabase
                              .from("delivery_requests")
                              .update({ return_status: "returned" })
                              .eq("order_id", item.order?.id)
                              .eq("is_return", false);
                            
                            // 2. Update return delivery status to "delivered" + return_status "returned"
                            if (item.returnDelivery?.id) {
                              await supabase
                                .from("delivery_requests")
                                .update({ status: "delivered", return_status: "returned", delivered_at: new Date().toISOString() })
                                .eq("id", item.returnDelivery.id);
                            }
                            
                            // 3. Restore product stock
                            const currentQty = item.product?.quantity_available ?? 0;
                            await supabase
                              .from("products")
                              .update({ quantity_available: currentQty + item.quantity })
                              .eq("id", item.product_id);
                            
                            queryClient.invalidateQueries({ queryKey: ["shop-order-items", shopId] });
                            toast.success("Retour confirmé - Stock restauré");
                          } catch {
                            toast.error("Erreur lors de la confirmation");
                          }
                        }}
                      >
                        Confirmer réception
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {selectedOrder && (
        <OrderDetailSheet
          order={selectedOrder}
          open={!!selectedOrder}
          onOpenChange={(open) => !open && setSelectedOrder(null)}
          isVendorView={true}
        />
      )}

      {selectedBooking && (
        <BookingDetailSheet
          booking={selectedBooking}
          open={!!selectedBooking}
          onOpenChange={(open) => !open && setSelectedBooking(null)}
          shopId={shopId}
        />
      )}
    </Tabs>
  );
};
