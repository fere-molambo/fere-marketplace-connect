import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { OrderStatusBadge } from "./OrderStatusBadge";
import { PaymentStatusBadge } from "./PaymentStatusBadge";
import { MapPin, Phone, Store, Truck, Package } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface OrderDetailSheetProps {
  order: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OrderDetailSheet({ order, open, onOpenChange }: OrderDetailSheetProps) {
  if (!order) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR").format(amount) + " FCFA";
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
                <><Store className="mr-1 h-3 w-3" />Retrait</>
              ) : (
                <><Truck className="mr-1 h-3 w-3" />Livraison</>
              )}
            </Badge>
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

          {/* Récapitulatif financier */}
          <div>
            <h3 className="text-sm font-semibold mb-2">Récapitulatif</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sous-total</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">TVA</span>
                <span>{formatCurrency(order.tva_amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Commission</span>
                <span>{formatCurrency(order.commission_amount)}</span>
              </div>
              {order.delivery_fee > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Livraison</span>
                  <span>{formatCurrency(order.delivery_fee)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Total TTC</span>
                <span>{formatCurrency(order.total_amount)}</span>
              </div>
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