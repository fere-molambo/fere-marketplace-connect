import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DeliveryProgressTracker } from "./DeliveryProgressTracker";
import { DeliveryStatusBadge } from "./DeliveryStatusBadge";
import { MapPin, Package, Store, XCircle } from "lucide-react";

interface SubDeliveryCardProps {
  deliveryRequest: any;
  orderItems: any[];
  shop: any;
  onRequestCancellation: () => void;
  paymentMethod: string;
}

export function SubDeliveryCard({
  deliveryRequest,
  orderItems,
  shop,
  onRequestCancellation,
  paymentMethod,
}: SubDeliveryCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR").format(amount) + " FCFA";
  };

  // Check if cancellation is allowed - client cannot cancel after pickup
  const canCancel = deliveryRequest?.status && 
    !["delivered", "cancelled", "picked_up", "en_route_client", "arrived"].includes(deliveryRequest.status);

  const isInDriverHands = deliveryRequest?.status && 
    ["picked_up", "en_route_client", "arrived"].includes(deliveryRequest.status);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3 bg-muted/50">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Store className="h-4 w-4 text-primary" />
            <span className="font-semibold">{shop?.name || "Boutique"}</span>
          </div>
          <DeliveryStatusBadge status={deliveryRequest?.status} />
        </div>
        {deliveryRequest?.zone?.name && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3 w-3" />
            Zone: {deliveryRequest.zone.name}
          </div>
        )}
      </CardHeader>
      
      <CardContent className="pt-4 space-y-4">
        {/* Products in this sub-delivery */}
        <div className="space-y-2">
          {orderItems.map((item: any) => {
            const product = item.product || item.products;
            return (
              <div key={item.id} className="flex items-center gap-3">
                <div className="h-10 w-10 rounded bg-muted flex items-center justify-center overflow-hidden shrink-0">
                  {product?.main_media_url ? (
                    <img 
                      src={product.main_media_url} 
                      alt={product?.name} 
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Package className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{product?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    ×{item.quantity} • {formatCurrency(item.total_price)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Delivery progress */}
        <DeliveryProgressTracker 
          deliveryStatus={deliveryRequest?.status}
          paymentMethod={paymentMethod}
        />

        {/* Cancel button - only before pickup */}
        {canCancel && (
          <div className="pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={onRequestCancellation}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Annuler cette livraison
            </Button>
          </div>
        )}

        {/* Info message when delivery is in driver's hands */}
        {isInDriverHands && (
          <div className="pt-2 border-t">
            <p className="text-xs text-amber-600 flex items-center gap-1">
              ⚠️ Colis en cours de livraison. Seul le livreur peut gérer l'annulation à ce stade.
            </p>
          </div>
        )}

        {/* Already delivered/cancelled */}
        {deliveryRequest?.status === "delivered" && (
          <Badge variant="secondary" className="w-full justify-center">
            ✓ Livré
          </Badge>
        )}
        {deliveryRequest?.status === "cancelled" && (
          <Badge variant="destructive" className="w-full justify-center">
            Annulée
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}
