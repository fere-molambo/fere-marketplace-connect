import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { OrderStatusBadge } from "./OrderStatusBadge";
import { PaymentStatusBadge } from "./PaymentStatusBadge";
import { OrderTimeline } from "./OrderTimeline";
import { DeliveryProgressTracker } from "./DeliveryProgressTracker";
import { SubDeliveryCard } from "./SubDeliveryCard";
import { RequestCancellationDialog } from "./RequestCancellationDialog";
import { MapPin, Phone, Store, Truck, Package, Navigation, Clock, ExternalLink, CreditCard, Bell, XCircle, Loader2, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface ClientOrderDetailSheetProps {
  order: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClientOrderDetailSheet({ order, open, onOpenChange }: ClientOrderDetailSheetProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [showCancellationDialog, setShowCancellationDialog] = useState(false);
  const [selectedDeliveryForCancel, setSelectedDeliveryForCancel] = useState<any>(null);

  // Realtime subscription for delivery updates
  useEffect(() => {
    if (!order?.id) return;

    const channel = supabase
      .channel(`client-order-${order.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'delivery_requests',
          filter: `order_id=eq.${order.id}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["delivery-requests", order.id] });
          queryClient.invalidateQueries({ queryKey: ["client-orders", user?.id] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${order.id}`
        },
        (payload) => {
          const newStatus = (payload.new as any)?.status;
          if (newStatus === 'cancelled') {
            queryClient.invalidateQueries({ queryKey: ["client-orders", user?.id] });
            onOpenChange(false);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [order?.id, queryClient, user?.id, onOpenChange]);

  // Fetch shops info for pickup orders
  const { data: shopsInfo = [] } = useQuery({
    queryKey: ["order-shops", order?.id],
    queryFn: async () => {
      if (!order?.order_items) return [];
      
      const shopIdSet = new Set<string>();
      order.order_items.forEach((item: any) => {
        if (item.shop_id) shopIdSet.add(String(item.shop_id));
      });
      const shopIds = Array.from(shopIdSet);
      
      const { data, error } = await supabase
        .from("shops")
        .select("id, name, address, google_maps_link, geolocation_lat, geolocation_lng, opening_time, closing_time, support_phone")
        .in("id", shopIds);
      
      if (error) throw error;
      return data;
    },
    enabled: !!order?.id && order?.delivery_type === "pickup",
  });

  // Fetch ALL delivery requests for this order
  const { data: deliveryRequests = [] } = useQuery({
    queryKey: ["delivery-requests", order?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("delivery_requests")
        .select(`
          *,
          zone:delivery_zones!zone_id (id, name)
        `)
        .eq("order_id", order.id)
        .eq("is_return", false)
        .order("created_at");
      
      if (error) throw error;
      return data;
    },
    enabled: !!order?.id && order?.delivery_type === "delivery",
  });

  // Fetch shop info for delivery requests
  const { data: shopsMap = {} } = useQuery({
    queryKey: ["order-shops-map", order?.id],
    queryFn: async () => {
      if (!order?.order_items) return {};
      
      const shopIdSet = new Set<string>();
      order.order_items.forEach((item: any) => {
        if (item.shop_id) shopIdSet.add(String(item.shop_id));
      });
      const shopIds = Array.from(shopIdSet);
      
      const { data, error } = await supabase
        .from("shops")
        .select("id, name, delivery_zone_id")
        .in("id", shopIds);
      
      if (error) throw error;
      
      const map: Record<string, any> = {};
      data?.forEach((shop) => {
        map[shop.id] = shop;
      });
      return map;
    },
    enabled: !!order?.id,
  });

  // Pay balance mutation
  const payBalance = useMutation({
    mutationFn: async () => {
      if (!user || !order) throw new Error("Non authentifié");
      
      const balanceAmount = order.balance_amount || order.subtotal;
      
      const response = await supabase.functions.invoke("paystack-payment", {
        body: {
          action: "initialize",
          amount: balanceAmount,
          email: user.email,
          payment_type: "order_balance",
          related_id: order.id,
          metadata: {
            order_number: order.order_number,
            is_balance_payment: true,
          },
          callback_url: `${window.location.origin}/payment/callback`,
        },
      });

      if (response.data?.authorization_url) {
        sessionStorage.setItem('paystack_payment_type', 'order_balance');
        window.location.href = response.data.authorization_url;
      } else {
        throw new Error("Erreur d'initialisation du paiement du solde");
      }
    },
    onError: (error) => {
      console.error("Balance payment error:", error);
      toast.error("Erreur lors de l'initialisation du paiement");
    },
  });

  if (!order) return null;

  const isMultiZone = deliveryRequests.length > 1;
  const singleDelivery = deliveryRequests.length === 1 ? deliveryRequests[0] : null;

  // Group order items by zone/delivery_request
  const getItemsByZone = () => {
    if (!order.order_items || deliveryRequests.length === 0) return {};
    
    const itemsByZoneId: Record<string, any[]> = {};
    
    order.order_items.forEach((item: any) => {
      const shop = shopsMap[item.shop_id];
      const zoneId = shop?.delivery_zone_id;
      
      const matchingDelivery = deliveryRequests.find((dr: any) => dr.zone_id === zoneId);
      const key = matchingDelivery?.id || 'unknown';
      
      if (!itemsByZoneId[key]) {
        itemsByZoneId[key] = [];
      }
      itemsByZoneId[key].push(item);
    });
    
    return itemsByZoneId;
  };

  const itemsByZone = getItemsByZone();

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return "0 FCFA";
    }
    return new Intl.NumberFormat("fr-FR").format(amount) + " FCFA";
  };

  // Can cancel only before pickup
  const canCancelBeforePickup = () => {
    if (order.status === "cancelled" || order.status === "delivered") return false;
    if (order.balance_payment_status === "paid") return false;
    if (order.delivery_type === "delivery") {
      const hasPickedUp = deliveryRequests.some((dr: any) =>
        ["picked_up", "en_route_client", "arrived", "delivered"].includes(dr.status)
      );
      return !hasPickedUp;
    }
    return true;
  };

  // Check if driver has arrived and balance not yet paid
  const isDriverArrived = order.delivery_type === "delivery" && 
    deliveryRequests.some((dr: any) => dr.status === "arrived") &&
    order.balance_payment_status !== "paid";

  const openGoogleMapsDirections = (lat: number, lng: number) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const url = `https://www.google.com/maps/dir/${position.coords.latitude},${position.coords.longitude}/${lat},${lng}`;
          window.open(url, "_blank");
        },
        () => {
          const url = `https://www.google.com/maps?q=${lat},${lng}`;
          window.open(url, "_blank");
        }
      );
    } else {
      const url = `https://www.google.com/maps?q=${lat},${lng}`;
      window.open(url, "_blank");
    }
  };

  const handleCancelClick = (deliveryRequest?: any) => {
    setSelectedDeliveryForCancel(deliveryRequest || singleDelivery);
    setShowCancellationDialog(true);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Commande {order.order_number}</SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Statuts */}
            <div className="flex flex-wrap gap-2">
              <OrderStatusBadge status={order.status} />
              <PaymentStatusBadge status={order.payment_status} />
              <Badge variant="outline">
                {order.delivery_type === "pickup" ? (
                  <><Store className="mr-1 h-3 w-3" />Retrait en boutique</>
                ) : (
                  <><Truck className="mr-1 h-3 w-3" />Livraison</>
                )}
              </Badge>
              {isMultiZone && (
                <Badge variant="secondary">Multi-zones</Badge>
              )}
              <Badge variant="secondary">
                <CreditCard className="mr-1 h-3 w-3" />
                {order.balance_payment_status === "paid" ? "Payé intégralement" : "Acompte payé"}
              </Badge>
            </div>

            {/* Cancelled order info */}
            {order.status === "cancelled" && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 font-medium text-sm">Commande annulée</p>
                <p className="text-sm text-red-600 mt-1">
                  {order.advance_paid > 0 
                    ? "L'admin traitera le remboursement de votre acompte selon les conditions d'annulation."
                    : "Aucun montant à rembourser."}
                </p>
              </div>
            )}

            {/* Timeline de suivi - hide for cancelled */}
            {order.status !== "cancelled" && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Suivi de votre commande</h3>
                <OrderTimeline status={order.status} />
              </div>
            )}

            {/* Driver arrived - Action buttons for client */}
            {isDriverArrived && (
              <div className="p-4 bg-primary/5 border-2 border-primary/30 rounded-lg space-y-3">
                <div className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" />
                  <p className="font-semibold text-primary">Le livreur est arrivé !</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  Vérifiez votre colis. Si tout est conforme, payez le solde pour finaliser la livraison.
                </p>

                <div className="space-y-2">
                  <Button
                    onClick={() => payBalance.mutate()}
                    disabled={payBalance.isPending}
                    className="w-full bg-green-600 hover:bg-green-700"
                    size="lg"
                  >
                    {payBalance.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    Colis vérifié, payer {formatCurrency(order.balance_amount || order.subtotal)}
                  </Button>

                  <Button
                    variant="destructive"
                    onClick={() => handleCancelClick()}
                    disabled={payBalance.isPending}
                    className="w-full"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Annuler la commande
                  </Button>
                </div>
              </div>
            )}

            {/* SINGLE ZONE DELIVERY */}
            {order.delivery_type === "delivery" && !isMultiZone && singleDelivery && order.status !== "cancelled" && (
              <div>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  Suivi de livraison
                </h3>
                
                {/* Tracker visuel 7 étapes */}
                <DeliveryProgressTracker 
                  deliveryStatus={singleDelivery.status}
                  paymentMethod={order.payment_method}
                />
                
                {/* Distance */}
                {singleDelivery.total_distance_meters && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Distance: {(singleDelivery.total_distance_meters / 1000).toFixed(1)} km
                  </p>
                )}
                  
                {/* Adresse de livraison */}
                {order.delivery_addresses && (
                  <div className="pt-3 mt-3 border-t border-border/50">
                    <p className="font-medium text-sm">{order.delivery_addresses.label}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {order.delivery_addresses.address}
                    </p>
                  </div>
                )}

                {/* Cancel button - only before pickup */}
                {canCancelBeforePickup() && singleDelivery.status !== "delivered" && (
                  <Button
                    variant="outline"
                    className="w-full mt-4 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleCancelClick()}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Annuler la commande
                  </Button>
                )}

                {/* Info message when colis picked up but not arrived yet */}
                {["picked_up", "en_route_client"].includes(singleDelivery.status) && (
                  <div className="mt-4 p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      Le colis est en cours de livraison. Vous pourrez vérifier et payer à l'arrivée du livreur.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* MULTI-ZONE DELIVERY */}
            {order.delivery_type === "delivery" && isMultiZone && order.status !== "cancelled" && (
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  Vos sous-livraisons ({deliveryRequests.length})
                </h3>
                
                {order.delivery_addresses && (
                  <div className="p-3 bg-muted rounded-lg mb-4">
                    <p className="font-medium text-sm">{order.delivery_addresses.label}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {order.delivery_addresses.address}
                    </p>
                  </div>
                )}

                <div className="space-y-4">
                  {deliveryRequests.map((delivery: any) => {
                    const items = itemsByZone[delivery.id] || [];
                    const shopId = items[0]?.shop_id;
                    const shop = shopsMap[shopId];
                    
                    return (
                      <SubDeliveryCard
                        key={delivery.id}
                        deliveryRequest={delivery}
                        orderItems={items}
                        shop={shop}
                        paymentMethod={order.payment_method}
                        onRequestCancellation={() => handleCancelClick(delivery)}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Points de retrait pour les commandes pickup */}
            {order.delivery_type === "pickup" && shopsInfo.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2">
                  Points de retrait ({shopsInfo.length})
                </h3>
                <div className="space-y-3">
                  {shopsInfo.map((shop: any) => (
                    <div key={shop.id} className="rounded-lg bg-muted p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <Store className="h-4 w-4 text-primary" />
                        <span className="font-medium">{shop.name}</span>
                      </div>
                      
                      {shop.address && (
                        <p className="text-sm text-muted-foreground flex items-start gap-1">
                          <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                          {shop.address}
                        </p>
                      )}
                      
                      {(shop.opening_time || shop.closing_time) && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {shop.opening_time || "?"} - {shop.closing_time || "?"}
                        </p>
                      )}
                      
                      {shop.support_phone && (
                        <a 
                          href={`tel:${shop.support_phone}`}
                          className="text-sm text-primary flex items-center gap-1 hover:underline"
                        >
                          <Phone className="h-3 w-3" />
                          {shop.support_phone}
                        </a>
                      )}
                      
                      <div className="flex gap-2 pt-2">
                        {shop.google_maps_link ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => window.open(shop.google_maps_link, "_blank")}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Voir sur Maps
                          </Button>
                        ) : shop.geolocation_lat && shop.geolocation_lng ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => openGoogleMapsDirections(shop.geolocation_lat, shop.geolocation_lng)}
                          >
                            <Navigation className="h-3 w-3 mr-1" />
                            Itinéraire
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>

                {canCancelBeforePickup() && (
                  <Button
                    variant="outline"
                    className="w-full mt-4 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleCancelClick()}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Annuler la commande
                  </Button>
                )}
              </div>
            )}

            <Separator />

            {/* Produits */}
            {(!isMultiZone || order.delivery_type === "pickup") && (
              <>
                <div>
                  <h3 className="text-sm font-semibold mb-2">Produits ({order.order_items?.length || 0})</h3>
                  <div className="space-y-2">
                    {order.order_items?.map((item: any) => {
                      const product = item.product || item.products;
                      const imageUrl = product?.main_media_url;
                      const productName = product?.name || "Produit";
                      
                      return (
                      <div key={item.id} className="flex items-center gap-3 rounded-lg border p-3">
                        <div className="h-12 w-12 rounded bg-muted flex items-center justify-center overflow-hidden">
                          {imageUrl ? (
                            <img 
                              src={imageUrl} 
                              alt={productName} 
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Package className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{productName}</p>
                          <div className="flex gap-2 text-xs mt-1 flex-wrap">
                            {item.selected_color && <Badge variant="outline">{item.selected_color}</Badge>}
                            {item.selected_size && <Badge variant="outline">{item.selected_size}</Badge>}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(item.total_price)}</p>
                          <p className="text-xs text-muted-foreground">x{item.quantity}</p>
                        </div>
                      </div>
                    )})}
                  </div>
                </div>

                <Separator />
              </>
            )}

            {/* Récapitulatif financier */}
            <div>
              <h3 className="text-sm font-semibold mb-2">Récapitulatif</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sous-total produits</span>
                  <span>{formatCurrency(order.subtotal)}</span>
                </div>
                {(order.delivery_fee || 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Frais de livraison</span>
                    <span>{formatCurrency(order.delivery_fee)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-green-600">
                  <span>Acompte payé</span>
                  <span>{formatCurrency(order.advance_paid || 0)}</span>
                </div>
                {order.balance_payment_status === "paid" ? (
                  <div className="flex justify-between text-green-600">
                    <span>Solde payé</span>
                    <span>{formatCurrency(order.balance_amount || order.subtotal)}</span>
                  </div>
                ) : order.status !== "cancelled" && (
                  <div className="flex justify-between text-orange-600 font-medium">
                    <span>Solde à payer à la livraison</span>
                    <span>{formatCurrency(order.balance_amount || order.subtotal)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            {order.notes && (
              <div>
                <h3 className="text-sm font-semibold mb-1">Notes</h3>
                <p className="text-sm text-muted-foreground">{order.notes}</p>
              </div>
            )}

            {/* Date */}
            <div className="text-xs text-muted-foreground">
              Commandé le {format(new Date(order.created_at), "dd MMMM yyyy à HH:mm", { locale: fr })}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Cancellation Dialog - only for pre-pickup cancellation */}
      <RequestCancellationDialog
        open={showCancellationDialog}
        onOpenChange={setShowCancellationDialog}
        order={order}
        deliveryRequest={selectedDeliveryForCancel}
        type="order"
      />
    </>
  );
}
