import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Package, Phone, Navigation, CheckCircle, Truck, Play, MapPin, Banknote, Clock } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DriverCancellationDialog } from "./DriverCancellationDialog";

interface DriverDeliveriesSectionProps {
  userId: string;
}

export function DriverDeliveriesSection({ userId }: DriverDeliveriesSectionProps) {
  const queryClient = useQueryClient();
  const [selectedDeliveryForAction, setSelectedDeliveryForAction] = useState<any>(null);
  const [showWaitingDialog, setShowWaitingDialog] = useState(false);

  // Realtime subscription for delivery updates
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('driver-deliveries-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'delivery_requests'
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ["my-deliveries"] });
          queryClient.invalidateQueries({ queryKey: ["pending-deliveries"] });
          queryClient.invalidateQueries({ queryKey: ["delivery-history"] });
          
          if (payload.eventType === 'UPDATE' && (payload.new as any)?.driver_id === userId) {
            const newStatus = (payload.new as any)?.status;
            if (newStatus === 'delivered') {
              toast.success("Livraison terminée ! Le client a payé le solde.");
            } else if (newStatus === 'cancelled') {
              toast.info("Commande annulée par le client. Retour du colis à initier.");
            } else {
              toast.info("Statut de livraison mis à jour");
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  // Fetch driver's active zones
  const { data: driverZones = [] } = useQuery({
    queryKey: ["driver-zones-active", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("driver_zones")
        .select("zone_id")
        .eq("driver_id", userId)
        .eq("is_active", true);
      if (error) throw error;
      return data.map(z => z.zone_id);
    },
    enabled: !!userId,
  });

  // Fetch pending deliveries in driver's zones
  const { data: pendingDeliveries = [], isLoading: isLoadingPending } = useQuery({
    queryKey: ["pending-deliveries", userId, driverZones],
    queryFn: async () => {
      if (driverZones.length === 0) {
        const { data, error } = await supabase
          .from("delivery_requests")
          .select(`*, delivery_zones (name, city)`)
          .eq("status", "pending")
          .is("zone_id", null)
          .order("created_at", { ascending: false });
        if (error) throw error;
        return data || [];
      }
      
      const { data, error } = await supabase
        .from("delivery_requests")
        .select(`*, delivery_zones (name, city)`)
        .eq("status", "pending")
        .or(`zone_id.in.(${driverZones.join(",")}),zone_id.is.null`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });

  // Fetch driver's assigned deliveries with order info (including return deliveries)
  const { data: myDeliveries = [], isLoading: isLoadingMine } = useQuery({
    queryKey: ["my-deliveries", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("delivery_requests")
        .select(`
          *, 
          delivery_zones (name, city),
          order:orders!order_id (id, order_number, payment_method, payment_status, user_id, subtotal, total_amount, balance_payment_status)
        `)
        .eq("driver_id", userId)
        .neq("status", "pending")
        .neq("status", "delivered")
        .neq("status", "cancelled")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });

  // Fetch driver's delivery history
  const { data: deliveryHistory = [], isLoading: isLoadingHistory } = useQuery({
    queryKey: ["delivery-history", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("delivery_requests")
        .select(`
          *, 
          delivery_zones (name, city),
          order:orders!order_id (id, order_number, payment_method, payment_status, user_id, subtotal, total_amount)
        `)
        .eq("driver_id", userId)
        .in("status", ["delivered", "cancelled"])
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;

      // Fetch cancellation details
      const cancelledOrderIds = (data || [])
        .filter(d => d.status === "cancelled" && d.order_id)
        .map(d => d.order_id);
      
      let cancellationsMap: Record<string, any> = {};
      if (cancelledOrderIds.length > 0) {
        const { data: cancellations } = await supabase
          .from("cancellations")
          .select("order_id, status_at_cancellation, custom_reason, delivery_fee_kept, canceller_role, reason_id, cancellation_reasons:reason_id(label)")
          .in("order_id", cancelledOrderIds);
        
        (cancellations || []).forEach((c: any) => {
          if (c.order_id) cancellationsMap[c.order_id] = c;
        });
      }

      // Fetch payout info
      const deliveryIds = (data || []).map(d => d.id);
      let payoutsMap: Record<string, any> = {};
      if (deliveryIds.length > 0) {
        const { data: payouts } = await supabase
          .from("pending_payouts")
          .select("delivery_request_id, status, amount")
          .in("delivery_request_id", deliveryIds)
          .eq("recipient_id", userId);
        
        (payouts || []).forEach((p: any) => {
          if (p.delivery_request_id) payoutsMap[p.delivery_request_id] = p;
        });
      }

      return (data || []).map(d => ({
        ...d,
        cancellation_info: cancellationsMap[d.order_id] || null,
        payout_info: payoutsMap[d.id] || null,
      }));
    },
    enabled: !!userId,
  });

  const isLoading = isLoadingPending || isLoadingMine;

  // Accept delivery mutation
  const acceptDelivery = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from("delivery_requests")
        .update({
          driver_id: userId,
          status: "assigned",
          assigned_at: new Date().toISOString(),
        })
        .eq("id", requestId)
        .eq("status", "pending");
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-deliveries"] });
      queryClient.invalidateQueries({ queryKey: ["my-deliveries"] });
      toast.success("Livraison acceptée !");
    },
    onError: (error) => {
      console.error("Accept error:", error);
      toast.error("Erreur lors de l'acceptation. La livraison a peut-être déjà été prise.");
    },
  });

  // Update status mutation (handles both standard and return deliveries)
  const updateStatus = useMutation({
    mutationFn: async ({ requestId, newStatus, isReturnDelivery }: { requestId: string; newStatus: string; isReturnDelivery?: boolean }) => {
      const updates: Record<string, any> = {};
      
      if (isReturnDelivery) {
        // Return deliveries: use standard status + return_status for tracking
        if (newStatus === "arrived_vendor") {
          updates.status = "arrived";
          updates.return_status = "arrived_vendor";
          updates.arrived_at_client_at = new Date().toISOString();
        }
      } else {
        // Standard delivery
        updates.status = newStatus;
        if (newStatus === "in_progress") {
          updates.started_at = new Date().toISOString();
        } else if (newStatus === "picked_up") {
          updates.picked_up_at = new Date().toISOString();
        } else if (newStatus === "en_route_client") {
          updates.en_route_client_at = new Date().toISOString();
        } else if (newStatus === "arrived") {
          updates.arrived_at_client_at = new Date().toISOString();
        }
      }
      
      const { error } = await supabase
        .from("delivery_requests")
        .update(updates)
        .eq("id", requestId)
        .eq("driver_id", userId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-deliveries"] });
      toast.success("Statut mis à jour !");
    },
    onError: (error) => {
      console.error("Update error:", error);
      toast.error("Erreur lors de la mise à jour du statut");
    },
  });

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      assigned: "bg-blue-100 text-blue-800",
      in_progress: "bg-purple-100 text-purple-800",
      picked_up: "bg-indigo-100 text-indigo-800",
      en_route_client: "bg-cyan-100 text-cyan-800",
      arrived: "bg-amber-100 text-amber-800",
      delivered: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
    };
    const labels: Record<string, string> = {
      pending: "Disponible",
      assigned: "Acceptée",
      in_progress: "Vers pickup",
      picked_up: "Récupérée",
      en_route_client: "Vers client",
      arrived: "Arrivé",
      delivered: "Livrée",
      cancelled: "Annulée",
    };
    return (
      <Badge className={styles[status] || "bg-gray-100 text-gray-800"}>
        {labels[status] || status}
      </Badge>
    );
  };

  const openNavigation = (lat: number, lng: number) => {
    const url = `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=;${lat},${lng}`;
    window.open(url, "_blank");
  };

  // Next status action - no more "delivered" from driver side
  const getNextStatusAction = (delivery: any) => {
    const status = delivery.status;
    const returnStatus = delivery.return_status;
    const isReturn = delivery.is_return;

    // Return delivery: use return_status to determine step
    if (isReturn) {
      switch (returnStatus) {
        case "en_route_vendor":
          return { label: "Arrivé chez vendeur", nextStatus: "arrived_vendor", icon: MapPin, isReturnDelivery: true };
        case "arrived_vendor":
          // Vendor confirms reception - no driver action
          return null;
        case "returned":
          return null;
        default:
          return null;
      }
    }

    // Standard delivery
    switch (status) {
      case "assigned":
        return { label: "Démarrer vers vendeur", nextStatus: "in_progress", icon: Play };
      case "in_progress":
        return { label: "Colis récupéré", nextStatus: "picked_up", icon: Package };
      case "picked_up":
        return { label: "En route vers client", nextStatus: "en_route_client", icon: Truck };
      case "en_route_client":
        return { label: "Arrivé chez client", nextStatus: "arrived", icon: MapPin };
      case "arrived":
        // Driver waits for client to pay - no action
        return null;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Available Deliveries */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Livraisons disponibles
          </CardTitle>
          <CardDescription>
            Commandes en attente d'un livreur dans vos zones
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingDeliveries.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              Aucune livraison disponible pour le moment
            </p>
          ) : (
            <div className="space-y-3">
              {pendingDeliveries.map((delivery) => {
                const pickupPoints = delivery.pickup_points as any[] || [];
                const deliveryPoint = delivery.delivery_point as any;
                
                return (
                  <div key={delivery.id} className="p-4 rounded-lg border space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        {getStatusBadge(delivery.status)}
                        <p className="text-sm text-muted-foreground mt-1">
                          Zone: {delivery.delivery_zones?.name || "Non définie"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-green-600">
                          {delivery.driver_earnings?.toLocaleString()} FCFA
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {((delivery.total_distance_meters || 0) / 1000).toFixed(1)} km
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-sm">
                      <p className="font-medium">Collecte ({pickupPoints.length} point(s)):</p>
                      {pickupPoints.slice(0, 2).map((point: any, idx: number) => (
                        <p key={idx} className="text-muted-foreground truncate">
                          • {point.shop_name || "Boutique"}
                        </p>
                      ))}
                      {pickupPoints.length > 2 && (
                        <p className="text-muted-foreground">+ {pickupPoints.length - 2} autres</p>
                      )}
                    </div>
                    
                    {deliveryPoint && (
                      <div className="text-sm">
                        <p className="font-medium">Livraison:</p>
                        <p className="text-muted-foreground truncate">{deliveryPoint.address}</p>
                      </div>
                    )}
                    
                    <Button
                      onClick={() => acceptDelivery.mutate(delivery.id)}
                      disabled={acceptDelivery.isPending}
                      className="w-full"
                    >
                      {acceptDelivery.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Truck className="h-4 w-4 mr-2" />
                      )}
                      Accepter cette livraison
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* My Deliveries */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Mes livraisons
          </CardTitle>
          <CardDescription>
            Livraisons que vous avez acceptées
          </CardDescription>
        </CardHeader>
        <CardContent>
          {myDeliveries.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              Vous n'avez pas encore accepté de livraisons
            </p>
          ) : (
            <div className="space-y-4">
              {myDeliveries.map((delivery) => {
                const pickupPoints = delivery.pickup_points as any[] || [];
                const deliveryPoint = delivery.delivery_point as any;
                const pickupPoint = delivery.pickup_point as any;
                const nextAction = getNextStatusAction(delivery);
                const isReturn = delivery.is_return;
                
                return (
                  <div key={delivery.id} className="p-4 rounded-lg border space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        {isReturn ? (
                          <Badge className="bg-amber-100 text-amber-800">
                            <Truck className="h-3 w-3 mr-1" />
                            Retour
                          </Badge>
                        ) : (
                          getStatusBadge(delivery.status)
                        )}
                        {isReturn && pickupPoint?.label && (
                          <p className="text-sm font-medium mt-1">{pickupPoint.label}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(delivery.created_at), "dd MMM yyyy HH:mm", { locale: fr })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-green-600">
                          {delivery.driver_earnings?.toLocaleString()} FCFA
                        </p>
                      </div>
                    </div>
                    
                    {/* Pickup Points with Navigation */}
                    <div className="space-y-2">
                      <p className="font-medium text-sm">Points de collecte:</p>
                      {pickupPoints.map((point: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-muted rounded">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{point.shop_name}</p>
                            <p className="text-xs text-muted-foreground truncate">{point.address}</p>
                          </div>
                          {point.lat && point.lng && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openNavigation(point.lat, point.lng)}
                            >
                              <Navigation className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                    
                    {/* Delivery Point with Navigation */}
                    {deliveryPoint && (
                      <div className="space-y-2">
                        <p className="font-medium text-sm">Point de livraison:</p>
                        <div className="flex items-center justify-between p-2 bg-primary/10 rounded">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{deliveryPoint.recipient_name || "Client"}</p>
                            <p className="text-xs text-muted-foreground truncate">{deliveryPoint.address}</p>
                            {deliveryPoint.recipient_phone && (
                              <a 
                                href={`tel:${deliveryPoint.recipient_phone}`}
                                className="text-xs text-primary flex items-center gap-1 mt-1"
                              >
                                <Phone className="h-3 w-3" />
                                {deliveryPoint.recipient_phone}
                              </a>
                            )}
                          </div>
                          {deliveryPoint.lat && deliveryPoint.lng && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openNavigation(deliveryPoint.lat, deliveryPoint.lng)}
                            >
                              <Navigation className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Waiting for client at arrived status (standard delivery) */}
                    {!isReturn && delivery.status === 'arrived' && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
                        <p className="text-amber-800 font-medium flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          En attente de vérification par le client
                        </p>
                        <p className="text-sm text-amber-600">
                          Le client doit vérifier le colis et payer le solde via Paystack.
                          La livraison sera automatiquement marquée comme terminée.
                        </p>
                        {delivery.driver_earnings > 0 && (
                          <div className="p-2 bg-green-50 border border-green-200 rounded">
                            <p className="text-green-700 font-semibold text-sm flex items-center gap-2">
                              <Banknote className="h-4 w-4" />
                              Vos gains : {delivery.driver_earnings.toLocaleString()} FCFA
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Return delivery: waiting for vendor confirmation */}
                    {isReturn && delivery.return_status === 'arrived_vendor' && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
                        <p className="text-amber-800 font-medium flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          En attente de confirmation du vendeur
                        </p>
                        <p className="text-sm text-amber-600">
                          Le vendeur doit confirmer la réception du colis retourné.
                        </p>
                      </div>
                    )}
                    
                    {/* Action button - not at arrived (client handles that) */}
                    {nextAction && nextAction.nextStatus && (
                      <Button
                        onClick={() => updateStatus.mutate({ 
                          requestId: delivery.id, 
                          newStatus: nextAction.nextStatus!,
                          isReturnDelivery: (nextAction as any).isReturnDelivery || false,
                        })}
                        disabled={updateStatus.isPending}
                        className="w-full"
                        variant="outline"
                      >
                        {updateStatus.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <nextAction.icon className="h-4 w-4 mr-2" />
                        )}
                        {nextAction.label}
                      </Button>
                    )}
                    
                    {delivery.status === "delivered" && !delivery.is_return && (
                      <div className="flex items-center justify-center gap-2 text-green-600 py-2">
                        <CheckCircle className="h-5 w-5" />
                        <span className="font-medium">Livraison terminée</span>
                      </div>
                    )}
                    {delivery.status === "delivered" && delivery.is_return && (
                      <div className="flex items-center justify-center gap-2 text-green-600 py-2">
                        <CheckCircle className="h-5 w-5" />
                        <span className="font-medium">Retour confirmé</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delivery History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Historique
          </CardTitle>
          <CardDescription>
            Livraisons terminées ou annulées
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingHistory ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : deliveryHistory.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              Aucun historique de livraison
            </p>
          ) : (
            <div className="space-y-3">
              {/* Daily total */}
              {(() => {
                const today = new Date().toDateString();
                const todayEarnings = deliveryHistory
                  .filter(d => {
                    const date = new Date(d.delivered_at || d.updated_at || d.created_at).toDateString();
                    return date === today && !d.is_return && (d.status === "delivered" || (d.status === "cancelled" && d.cancellation_info?.delivery_fee_kept));
                  })
                  .reduce((sum, d) => sum + (d.driver_earnings || 0), 0);
                
                return todayEarnings > 0 ? (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg mb-2">
                    <p className="text-green-800 font-semibold text-sm flex items-center gap-2">
                      <Banknote className="h-4 w-4" />
                      Total du jour : {todayEarnings.toLocaleString()} FCFA
                    </p>
                  </div>
                ) : null;
              })()}

              {deliveryHistory.map((delivery) => {
                const pickupPoints = delivery.pickup_points as any[] || [];
                const deliveryPoint = delivery.delivery_point as any;
                const cancellation = delivery.cancellation_info;
                const payout = delivery.payout_info;
                const statusLabels: Record<string, string> = {
                  assigned: "Acceptée", in_progress: "Vers pickup", picked_up: "Récupérée",
                  en_route_client: "Vers client", arrived: "Arrivé chez client",
                };
                
                return (
                  <div key={delivery.id} className="p-4 rounded-lg border space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {delivery.is_return && delivery.return_status === "returned" ? (
                            <Badge className="bg-green-100 text-green-800 border-green-200">✅ Retourné</Badge>
                          ) : delivery.is_return ? (
                            <Badge className="bg-amber-100 text-amber-800 border-amber-200">📦 Retour en cours</Badge>
                          ) : getStatusBadge(delivery.status)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(delivery.created_at), "dd MMM yyyy HH:mm", { locale: fr })}
                        </p>
                        {delivery.order?.order_number && (
                          <p className="text-xs text-muted-foreground">
                            {delivery.order.order_number}
                          </p>
                        )}
                      </div>
                      <div className="text-right space-y-1">
                        {delivery.driver_earnings > 0 && !delivery.is_return &&
                         (delivery.status === "delivered" || 
                          (delivery.status === "cancelled" && delivery.cancellation_info?.delivery_fee_kept)) && (
                          <p className="font-semibold text-green-600">
                            +{delivery.driver_earnings?.toLocaleString()} FCFA
                          </p>
                        )}
                        {payout && (
                          <Badge variant={payout.status === "paid" ? "default" : "secondary"} className="text-xs">
                            {payout.status === "paid" ? "Payé" : payout.status === "processing" ? "En cours" : "En attente"}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Cancellation details */}
                    {delivery.status === "cancelled" && cancellation && (
                      <div className="p-2 bg-red-50 border border-red-100 rounded text-xs space-y-1">
                        <p className="text-red-700 font-medium">
                          Annulée à l'étape : {statusLabels[cancellation.status_at_cancellation] || cancellation.status_at_cancellation}
                        </p>
                        {cancellation.cancellation_reasons?.label && (
                          <p className="text-red-600">Motif : {cancellation.cancellation_reasons.label}</p>
                        )}
                        {cancellation.custom_reason && (
                          <p className="text-red-600">{cancellation.custom_reason}</p>
                        )}
                      </div>
                    )}
                    
                    {pickupPoints.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {pickupPoints.map((p: any) => p.shop_name).join(", ")}
                      </p>
                    )}
                    {deliveryPoint?.address && (
                      <p className="text-xs text-muted-foreground truncate">
                        → {deliveryPoint.address}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Waiting Dialog (informational only) */}
      {selectedDeliveryForAction && (
        <DriverCancellationDialog
          open={showWaitingDialog}
          onOpenChange={setShowWaitingDialog}
          delivery={selectedDeliveryForAction}
          userId={userId}
        />
      )}
    </div>
  );
}
