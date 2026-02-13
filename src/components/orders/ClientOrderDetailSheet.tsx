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
import { MapPin, Phone, Store, Truck, Package, Navigation, Clock, ExternalLink, Banknote, CreditCard, Bell, XCircle } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ClientOrderDetailSheetProps {
  order: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClientOrderDetailSheet({ order, open, onOpenChange }: ClientOrderDetailSheetProps) {
  const queryClient = useQueryClient();
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
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [order?.id, queryClient]);

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

  // Fetch ALL delivery requests for this order (supports multi-zone)
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
      
      // Create a map: shop_id -> shop
      const map: Record<string, any> = {};
      data?.forEach((shop) => {
        map[shop.id] = shop;
      });
      return map;
    },
    enabled: !!order?.id,
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
      
      // Find matching delivery request
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

  const canCancelOrder = () => {
    if (order.status === "cancelled" || order.status === "delivered") return false;
    // For delivery orders, check if any delivery is still cancellable
    if (order.delivery_type === "delivery") {
      // Block cancellation if any delivery has been picked up or beyond
      const hasPickedUp = deliveryRequests.some((dr: any) =>
        ["picked_up", "en_route_client", "arrived"].includes(dr.status)
      );
      if (hasPickedUp) return false;
      return deliveryRequests.some((dr: any) => 
        !["delivered", "cancelled"].includes(dr.status)
      );
    }
    // For pickup, can cancel if not delivered/cancelled
    return true;
  };

  // Check if delivery is in driver's hands (for informational message)
  const isDeliveryInDriverHands = order.delivery_type === "delivery" && 
    deliveryRequests.some((dr: any) => 
      ["picked_up", "en_route_client", "arrived"].includes(dr.status)
    );

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
              {/* Mode de paiement */}
              {order.payment_method === "cash" ? (
                <Badge variant="secondary">
                  <Banknote className="mr-1 h-3 w-3" />Cash à la livraison
                </Badge>
              ) : order.advance_percent && order.advance_percent < 100 ? (
                <Badge variant="secondary">
                  <CreditCard className="mr-1 h-3 w-3" />{order.advance_percent}% payé
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <CreditCard className="mr-1 h-3 w-3" />Payé intégralement
                </Badge>
              )}
            </div>

            {/* Cancelled order info */}
            {order.status === "cancelled" && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 font-medium text-sm">Commande annulée</p>
                {order.payment_method === "online" && (
                  <p className="text-sm text-red-600 mt-1">
                    Un remboursement du montant des produits est en cours de traitement. Les frais de livraison sont retenus.
                  </p>
                )}
              </div>
            )}

            {/* Timeline de suivi - hide for cancelled */}
            {order.status !== "cancelled" && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Suivi de votre commande</h3>
                <OrderTimeline status={order.status} />
              </div>
            )}

            {/* SINGLE ZONE DELIVERY - Original display */}
            {order.delivery_type === "delivery" && !isMultiZone && singleDelivery && order.status !== "cancelled" && (
              <div>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  Suivi de livraison
                </h3>
                
                {/* Alerte si livreur est arrivé */}
                {singleDelivery.status === 'arrived' && (
                  <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg mb-3">
                    <p className="font-medium text-primary flex items-center gap-2">
                      <Bell className="h-4 w-4" />
                      Le livreur est arrivé !
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Vérifiez votre commande avant d'accepter.
                      Aucune annulation possible après acceptation.
                    </p>
                  </div>
                )}
                
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

                {/* Bouton Annulation - Commande simple */}
                {canCancelOrder() && singleDelivery.status !== "delivered" && (
                  <Button
                    variant="outline"
                    className="w-full mt-4 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleCancelClick()}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Demander l'annulation
                  </Button>
                )}

                {/* Message when delivery is in driver's hands */}
                {isDeliveryInDriverHands && !canCancelOrder() && singleDelivery.status !== "delivered" && singleDelivery.status !== "cancelled" && (
                  <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-amber-700">
                      ⚠️ Le colis est entre les mains du livreur. Seul le livreur peut gérer l'annulation à ce stade.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* MULTI-ZONE DELIVERY - Sub-deliveries cards */}
            {order.delivery_type === "delivery" && isMultiZone && order.status !== "cancelled" && (
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  Vos sous-livraisons ({deliveryRequests.length})
                </h3>
                
                {/* Adresse de livraison */}
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
                      
                      {/* Boutons navigation */}
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

                {/* Bouton Annulation - Pickup */}
                {canCancelOrder() && (
                  <Button
                    variant="outline"
                    className="w-full mt-4 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleCancelClick()}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Demander l'annulation
                  </Button>
                )}
              </div>
            )}

            <Separator />

            {/* Produits - Only show for single zone or pickup */}
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
                  <span className="text-muted-foreground">Sous-total</span>
                  <span>{formatCurrency(order.subtotal)}</span>
                </div>
                {(order.delivery_fee || 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Frais de livraison</span>
                    <span>{formatCurrency(order.delivery_fee)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-semibold text-base">
                  <span>Total TTC</span>
                  <span>{formatCurrency(order.total_amount)}</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>Payé</span>
                  <span>{formatCurrency(order.advance_paid || 0)}</span>
                </div>
                {(order.remaining_amount || 0) > 0 && (
                  <div className="flex justify-between text-orange-600 font-medium">
                    <span>Reste à payer</span>
                    <span>{formatCurrency(order.remaining_amount)}</span>
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

      {/* Cancellation Dialog */}
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
