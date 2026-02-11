import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Package, Phone, Navigation, CheckCircle, Truck, Play, MapPin, AlertTriangle, Banknote, XCircle } from "lucide-react";
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
  const [showCancellationDialog, setShowCancellationDialog] = useState(false);

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
          
          if (payload.eventType === 'UPDATE' && (payload.new as any)?.driver_id === userId) {
            toast.info("Statut de livraison mis à jour");
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

  // Fetch pending deliveries in driver's zones (available to accept)
  const { data: pendingDeliveries = [], isLoading: isLoadingPending } = useQuery({
    queryKey: ["pending-deliveries", userId, driverZones],
    queryFn: async () => {
      if (driverZones.length === 0) {
        // Also fetch deliveries with null zone (generic requests)
        const { data, error } = await supabase
          .from("delivery_requests")
          .select(`*, delivery_zones (name, city)`)
          .eq("status", "pending")
          .is("zone_id", null)
          .order("created_at", { ascending: false });
        if (error) throw error;
        return data || [];
      }
      
      // Fetch pending deliveries in driver's zones OR with null zone_id
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

  // Fetch driver's assigned deliveries with order info
  const { data: myDeliveries = [], isLoading: isLoadingMine } = useQuery({
    queryKey: ["my-deliveries", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("delivery_requests")
        .select(`
          *, 
          delivery_zones (name, city),
          order:orders!order_id (id, payment_method, payment_status, user_id, subtotal, total_amount, payment_reference)
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

  const isLoading = isLoadingPending || isLoadingMine;

  // Accept delivery mutation - le trigger DB sync automatiquement orders.status
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
      // Le trigger sync_order_status_from_delivery met à jour orders.status automatiquement
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

  // Update status mutation - avec les nouveaux statuts du workflow 7 étapes
  const updateStatus = useMutation({
    mutationFn: async ({ requestId, newStatus }: { requestId: string; newStatus: string }) => {
      const updates: Record<string, any> = { status: newStatus };
      
      if (newStatus === "in_progress") {
        updates.started_at = new Date().toISOString();
      } else if (newStatus === "picked_up") {
        updates.picked_up_at = new Date().toISOString();
      } else if (newStatus === "en_route_client") {
        updates.en_route_client_at = new Date().toISOString();
      } else if (newStatus === "arrived") {
        updates.arrived_at_client_at = new Date().toISOString();
      } else if (newStatus === "delivered") {
        updates.delivered_at = new Date().toISOString();
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
    // Use OpenStreetMap for navigation
    const url = `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=;${lat},${lng}`;
    window.open(url, "_blank");
  };

  // Nouveau workflow 7 étapes
  const getNextStatusAction = (status: string, delivery: any) => {
    const paymentMethod = delivery.order?.payment_method;
    
    switch (status) {
      case "assigned":
        return { label: "Démarrer vers vendeur", nextStatus: "in_progress", icon: Play, description: "En route vers la boutique" };
      case "in_progress":
        return { label: "Colis récupéré", nextStatus: "picked_up", icon: Package, description: "Colis récupéré chez le vendeur" };
      case "picked_up":
        return { label: "En route vers client", nextStatus: "en_route_client", icon: Truck, description: "Départ vers le client" };
      case "en_route_client":
        return { label: "Arrivé chez client", nextStatus: "arrived", icon: MapPin, description: "Vous êtes arrivé" };
      case "arrived":
        // Afficher le dialog d'options
        return { label: "Vérification client", nextStatus: null, icon: AlertTriangle, showPaymentOptions: true };
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
                    
                    {/* Pickup Points */}
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
                    
                    {/* Delivery Point */}
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
                const nextAction = getNextStatusAction(delivery.status, delivery);
                
                return (
                  <div key={delivery.id} className="p-4 rounded-lg border space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        {getStatusBadge(delivery.status)}
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

                    {/* Message vérification client (statut arrived) */}
                    {delivery.status === 'arrived' && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <p className="text-amber-800 font-medium flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4" />
                          Client doit vérifier le colis
                        </p>
                        <p className="text-sm text-amber-600 mt-1">
                          Demandez au client de vérifier avant d'accepter.
                          Aucune annulation possible après acceptation.
                        </p>
                      </div>
                    )}
                    
                    {/* Boutons au statut arrived - utiliser le dialog */}
                    {delivery.status === 'arrived' ? (
                      <Button 
                        onClick={() => {
                          setSelectedDeliveryForAction(delivery);
                          setShowCancellationDialog(true);
                        }}
                        className="w-full"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Gérer la livraison
                      </Button>
                    ) : nextAction && nextAction.nextStatus && (
                      <Button
                        onClick={() => updateStatus.mutate({ 
                          requestId: delivery.id, 
                          newStatus: nextAction.nextStatus! 
                        })}
                        disabled={updateStatus.isPending}
                        className="w-full"
                        variant={nextAction.nextStatus === "delivered" ? "default" : "outline"}
                      >
                        {updateStatus.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <nextAction.icon className="h-4 w-4 mr-2" />
                        )}
                        {nextAction.label}
                      </Button>
                    )}
                    
                    {delivery.status === "delivered" && (
                      <div className="flex items-center justify-center gap-2 text-green-600 py-2">
                        <CheckCircle className="h-5 w-5" />
                        <span className="font-medium">Livraison terminée</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Driver Cancellation Dialog */}
      {selectedDeliveryForAction && (
        <DriverCancellationDialog
          open={showCancellationDialog}
          onOpenChange={setShowCancellationDialog}
          delivery={selectedDeliveryForAction}
          userId={userId}
        />
      )}
    </div>
  );
}
