import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Store, Package, Truck } from "lucide-react";
import { CartItem } from "@/contexts/CartContext";

interface ShopGroup {
  shopId: string;
  shopName: string;
  shopLogo: string | null;
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
}

interface OrdersByVendorSummaryProps {
  itemsByShop: Record<string, CartItem[]>;
  deliveryFeePerShop: Record<string, number>;
}

export function OrdersByVendorSummary({ itemsByShop, deliveryFeePerShop }: OrdersByVendorSummaryProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR").format(amount) + " FCFA";
  };

  const shopGroups: ShopGroup[] = Object.entries(itemsByShop).map(([shopId, items]) => {
    const firstItem = items[0];
    const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
    const deliveryFee = deliveryFeePerShop[shopId] || 0;

    return {
      shopId,
      shopName: firstItem.product.shops.name,
      shopLogo: firstItem.product.shops.logo_url,
      items,
      subtotal,
      deliveryFee,
      total: subtotal + deliveryFee,
    };
  });

  const grandTotal = shopGroups.reduce((sum, group) => sum + group.total, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Store className="h-4 w-4" />
          {shopGroups.length} commande{shopGroups.length > 1 ? "s" : ""} à créer
        </h3>
        <Badge variant="secondary">{shopGroups.length} vendeur{shopGroups.length > 1 ? "s" : ""}</Badge>
      </div>

      <div className="space-y-3">
        {shopGroups.map((group, index) => (
          <Card key={group.shopId} className="border-dashed">
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm flex items-center gap-2">
                {group.shopLogo ? (
                  <img src={group.shopLogo} alt="" className="h-6 w-6 rounded-full object-cover" />
                ) : (
                  <Store className="h-4 w-4" />
                )}
                <span className="truncate">{group.shopName}</span>
                <Badge variant="outline" className="ml-auto text-xs">
                  Commande {index + 1}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="py-2 px-4 space-y-2">
              {/* Produits */}
              <div className="space-y-1">
                {group.items.map((item) => (
                  <div key={item.productId} className="flex justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Package className="h-3 w-3" />
                      {item.product.name} x{item.quantity}
                    </span>
                    <span>{formatCurrency(item.totalPrice)}</span>
                  </div>
                ))}
              </div>
              
              {/* Livraison */}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Truck className="h-3 w-3" />
                  Livraison
                </span>
                <span>{formatCurrency(group.deliveryFee)}</span>
              </div>

              <Separator className="my-2" />
              
              {/* Total commande */}
              <div className="flex justify-between font-medium text-sm">
                <span>Total commande</span>
                <span>{formatCurrency(group.total)}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {shopGroups.length > 1 && (
        <>
          <Separator />
          <div className="flex justify-between font-bold">
            <span>Total général ({shopGroups.length} commandes)</span>
            <span>{formatCurrency(grandTotal)}</span>
          </div>
        </>
      )}
    </div>
  );
}
