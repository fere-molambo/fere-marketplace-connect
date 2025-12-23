import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ShoppingCart, Loader2, Lock } from "lucide-react";
import { CartItem } from "@/contexts/CartContext";

interface OrderSummaryProps {
  items: CartItem[];
  subtotal: number;
  tvaAmount: number;
  tvaRate: number;
  commissionAmount: number;
  deliveryFee: number;
  deliveryType: "pickup" | "delivery";
  totalTTC: number;
  advancePercent: number;
  advanceAmount: number;
  remainingAmount: number;
  paymentMethod: "online" | "cash";
  onSubmit: () => void;
  isLoading: boolean;
}

export function OrderSummary({
  items,
  subtotal,
  tvaAmount,
  tvaRate,
  commissionAmount,
  deliveryFee,
  deliveryType,
  totalTTC,
  advancePercent,
  advanceAmount,
  remainingAmount,
  paymentMethod,
  onSubmit,
  isLoading,
}: OrderSummaryProps) {
  const formatPrice = (price: number) => price.toLocaleString() + " FCFA";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" />
          Résumé ({items.length} article{items.length > 1 ? "s" : ""})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Items list */}
        <ScrollArea className="max-h-48">
          <div className="space-y-2 pr-4">
            {items.map((item) => (
              <div key={item.productId} className="flex items-start gap-2 text-sm">
                <div className="w-10 h-10 rounded bg-muted flex-shrink-0 overflow-hidden">
                  {item.product.main_media_url ? (
                    <img src={item.product.main_media_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs">
                      {item.product.name.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{item.product.name}</p>
                  <p className="text-muted-foreground text-xs">
                    {item.quantity} × {item.unitPrice.toLocaleString()} FCFA
                  </p>
                </div>
                <span className="font-medium">{formatPrice(item.totalPrice)}</span>
              </div>
            ))}
          </div>
        </ScrollArea>

        <Separator />

        {/* Calculations */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Sous-total</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          {deliveryType === "delivery" && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Frais de livraison</span>
              <span>{formatPrice(deliveryFee)}</span>
            </div>
          )}
          {deliveryType === "pickup" && (
            <div className="flex justify-between text-green-600">
              <span>Retrait en boutique</span>
              <span>Gratuit</span>
            </div>
          )}
        </div>

        <Separator />

        {/* Total */}
        <div className="flex justify-between items-center">
          <span className="font-semibold">Total TTC</span>
          <span className="text-xl font-bold text-primary">{formatPrice(totalTTC)}</span>
        </div>

        {/* Payment breakdown */}
        {paymentMethod === "online" && advancePercent < 100 && (
          <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span>À payer maintenant ({advancePercent}%)</span>
              <span className="font-medium">{formatPrice(advanceAmount)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Reste à la livraison</span>
              <span>{formatPrice(remainingAmount)}</span>
            </div>
          </div>
        )}

        {paymentMethod === "cash" && (
          <div className="bg-muted/50 rounded-lg p-3 text-sm">
            <p className="text-center text-muted-foreground">
              Montant à payer à la livraison: <span className="font-medium">{formatPrice(totalTTC)}</span>
            </p>
          </div>
        )}

        {/* Submit button */}
        <Button onClick={onSubmit} disabled={isLoading} className="w-full" size="lg">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Lock className="h-4 w-4 mr-2" />
          )}
          {paymentMethod === "online"
            ? `Payer ${formatPrice(advanceAmount)}`
            : "Confirmer la commande"}
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          Paiement sécurisé par Paystack
        </p>
      </CardContent>
    </Card>
  );
}