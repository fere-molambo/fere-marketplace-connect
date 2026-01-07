import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { OrderStatusBadge } from "./OrderStatusBadge";
import { PaymentStatusBadge } from "./PaymentStatusBadge";
import { OrderTimeline } from "./OrderTimeline";
import { DeliveryProgressTracker } from "./DeliveryProgressTracker";
import { MapPin, Phone, Store, Truck, Package, Navigation, Clock, ExternalLink, Banknote, CreditCard, Bell } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

interface ClientOrderDetailSheetProps {
  order: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClientOrderDetailSheet({ order, open, onOpenChange }: ClientOrderDetailSheetProps) {
  const queryClient = useQueryClient();

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
          queryClient.invalidateQueries({ queryKey: ["delivery-request", order.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [order?.id, queryClient]);
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

  // Fetch delivery request status
  const { data: deliveryRequest } = useQuery({
    queryKey: ["delivery-request", order?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("delivery_requests")
        .select("*")
        .eq("order_id", order.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!order?.id && order?.delivery_type === "delivery",
  });

  if (!order) return null;

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return "0 FCFA";
    }
    return new Intl.NumberFormat("fr-FR").format(amount) + " FCFA";
  };

  const getDeliveryStatusLabel = (status: string) => {
    const statusLabels: Record<string, { label: string; color: string }> = {
      pending: { label: "En attente d'un livreur", color: "bg-yellow-100 text-yellow-800" },
      assigned: { label: "Livreur assigné", color: "bg-blue-100 text-blue-800" },
      in_progress: { label: "En route vers la boutique", color: "bg-purple-100 text-purple-800" },
      picked_up: { label: "Colis récupéré", color: "bg-indigo-100 text-indigo-800" },
      en_route_client: { label: "En route vers vous", color: "bg-cyan-100 text-cyan-800" },
      arrived: { label: "Livreur arrivé !", color: "bg-amber-100 text-amber-800" },
      delivered: { label: "Livré", color: "bg-green-100 text-green-800" },
      cancelled: { label: "Annulée", color: "bg-red-100 text-red-800" },
    };
    return statusLabels[status] || { label: status, color: "bg-gray-100 text-gray-800" };
  };

  const openGoogleMapsDirections = (lat: number, lng: number) => {
    // Try to get user's current position for directions
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const url = `https://www.google.com/maps/dir/${position.coords.latitude},${position.coords.longitude}/${lat},${lng}`;
          window.open(url, "_blank");
        },
        () => {
          // Fallback without origin
          const url = `https://www.google.com/maps?q=${lat},${lng}`;
          window.open(url, "_blank");
        }
      );
    } else {
      const url = `https://www.google.com/maps?q=${lat},${lng}`;
      window.open(url, "_blank");
    }
  };

  return (
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

          {/* Timeline de suivi */}
          <div>
            <h3 className="text-sm font-semibold mb-2">Suivi de votre commande</h3>
            <OrderTimeline status={order.status} />
          </div>

          {/* Suivi de livraison avec nouveau tracker */}
          {order.delivery_type === "delivery" && (
            <div>
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Truck className="h-4 w-4" />
                Suivi de livraison
              </h3>
              
              {/* Alerte si livreur est arrivé */}
              {deliveryRequest?.status === 'arrived' && (
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
                deliveryStatus={deliveryRequest?.status}
                paymentMethod={order.payment_method}
              />
              
              {/* Distance */}
              {deliveryRequest?.total_distance_meters && (
                <p className="text-sm text-muted-foreground mt-2">
                  Distance: {(deliveryRequest.total_distance_meters / 1000).toFixed(1)} km
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
            </div>
          )}

          <Separator />

          {/* Produits */}
          <div>
            <h3 className="text-sm font-semibold mb-2">Produits ({order.order_items?.length || 0})</h3>
            <div className="space-y-2">
              {order.order_items?.map((item: any) => {
                // Handle both naming conventions (product vs products)
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

          {/* Récapitulatif financier simplifié (sans TVA ni commission) */}
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
  );
}
