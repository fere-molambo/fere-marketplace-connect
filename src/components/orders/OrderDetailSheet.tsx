import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { OrderStatusBadge } from "./OrderStatusBadge";
import { PaymentStatusBadge } from "./PaymentStatusBadge";
import { OrderTimeline } from "./OrderTimeline";
import { MapPin, Phone, Store, Truck, Package } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface OrderDetailSheetProps {
  order: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isVendorView?: boolean;
}

export function OrderDetailSheet({ order, open, onOpenChange, isVendorView = false }: OrderDetailSheetProps) {
  // Fetch platform settings for commission rates
  const { data: settings } = useQuery({
    queryKey: ["platform-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("delivery_commission_driver, delivery_commission_fere")
        .single();
      if (error) throw error;
      return data;
    },
  });

  if (!order) return null;

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return "0 FCFA";
    }
    return new Intl.NumberFormat("fr-FR").format(Math.round(amount)) + " FCFA";
  };

  // Calculate commission breakdown
  const subtotal = order.subtotal || 0;
  const deliveryFee = order.delivery_fee || 0;
  const commissionAmount = order.commission_amount || 0;
  
  // Vendor net = subtotal - platform commission on products
  const vendorNet = subtotal - commissionAmount;
  
  // Driver commission = delivery_fee × 85% (default)
  const driverCommissionRate = (settings?.delivery_commission_driver || 85) / 100;
  const driverCommission = Math.round(deliveryFee * driverCommissionRate);
  
  // Platform commission on delivery = delivery_fee × 15%
  const platformDeliveryCommission = deliveryFee - driverCommission;
  
  // Total platform commission = product commission + delivery commission
  const totalPlatformCommission = commissionAmount + platformDeliveryCommission;

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
                <><Store className="mr-1 h-3 w-3" />Retrait</>
              ) : (
                <><Truck className="mr-1 h-3 w-3" />Livraison</>
              )}
            </Badge>
          </div>

          {/* Timeline de suivi */}
          <div>
            <h3 className="text-sm font-semibold mb-2">Suivi de la commande</h3>
            <OrderTimeline status={order.status} />
          </div>

          {/* Client */}
          <div>
            <h3 className="text-sm font-semibold mb-2">Client</h3>
            <div className="rounded-lg bg-muted p-3 space-y-1">
              <p className="font-medium">{order.profiles?.nom_complet || "—"}</p>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Phone className="h-3 w-3" /> {order.profiles?.contact || "—"}
              </p>
            </div>
          </div>

          {/* Adresse de livraison */}
          {order.delivery_type === "delivery" && order.delivery_addresses && (
            <div>
              <h3 className="text-sm font-semibold mb-2">Adresse de livraison</h3>
              <div className="rounded-lg bg-muted p-3 space-y-1">
                <p className="font-medium">{order.delivery_addresses.label}</p>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {order.delivery_addresses.address}
                </p>
                {order.delivery_addresses.recipient_name && (
                  <p className="text-sm">{order.delivery_addresses.recipient_name} - {order.delivery_addresses.recipient_phone}</p>
                )}
              </div>
            </div>
          )}

          <Separator />

          {/* Produits */}
          <div>
            <h3 className="text-sm font-semibold mb-2">Produits ({order.order_items?.length || 0})</h3>
            <div className="space-y-2">
              {order.order_items?.map((item: any) => (
                <div key={item.id} className="flex items-center gap-3 rounded-lg border p-3">
                  <div className="h-12 w-12 rounded bg-muted flex items-center justify-center">
                    <Package className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.products?.name || "Produit"}</p>
                    <p className="text-xs text-muted-foreground">{item.shops?.name}</p>
                    <div className="flex gap-2 text-xs mt-1">
                      {item.selected_color && <Badge variant="outline">{item.selected_color}</Badge>}
                      {item.selected_size && <Badge variant="outline">{item.selected_size}</Badge>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(item.total_price)}</p>
                    <p className="text-xs text-muted-foreground">x{item.quantity}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Récapitulatif financier pour Admin */}
          <div>
            <h3 className="text-sm font-semibold mb-2">Récapitulatif financier</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sous-total</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {deliveryFee > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Frais de livraison</span>
                  <span>{formatCurrency(deliveryFee)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Total client</span>
                <span>{formatCurrency(order.total_amount || (subtotal + deliveryFee))}</span>
              </div>
              
              <Separator className="my-3" />
              
              {/* Répartition des commissions - Admin only */}
              {!isVendorView && (
                <>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Répartition</p>
                  
                  <div className="flex justify-between text-green-600">
                    <span>💰 Vendeur (net)</span>
                    <span className="font-medium">{formatCurrency(vendorNet)}</span>
                  </div>
                  
                  {deliveryFee > 0 && (
                    <div className="flex justify-between text-blue-600">
                      <span>🚗 Livreur ({Math.round(driverCommissionRate * 100)}%)</span>
                      <span className="font-medium">{formatCurrency(driverCommission)}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between text-orange-600">
                    <span>🏢 Plateforme</span>
                    <span className="font-medium">{formatCurrency(totalPlatformCommission)}</span>
                  </div>
                </>
              )}
              
              {/* Vendor view - Only show their net */}
              {isVendorView && (
                <div className="flex justify-between text-green-600 font-medium">
                  <span>💰 Votre commission (net)</span>
                  <span>{formatCurrency(vendorNet)}</span>
                </div>
              )}
              
              <Separator />
              
              <div className="flex justify-between text-green-600">
                <span>Avance payée</span>
                <span>{formatCurrency(order.advance_paid || 0)}</span>
              </div>
              {(order.remaining_amount || 0) > 0 && (
                <div className="flex justify-between text-orange-600">
                  <span>Reste à payer</span>
                  <span>{formatCurrency(order.remaining_amount)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Date */}
          <div className="text-xs text-muted-foreground">
            Créée le {format(new Date(order.created_at), "dd MMMM yyyy à HH:mm", { locale: fr })}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
