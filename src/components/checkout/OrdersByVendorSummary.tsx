import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Store, Package, Truck, Info } from "lucide-react";
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
  advanceAmount: number;
  balanceAmount: number;
  deliveryCommission: number;
  productCommission: number;
  advancePaystackFees: number;
  balancePaystackFees: number;
}

export function OrdersByVendorSummary({ 
  itemsByShop, 
  deliveryFeePerShop,
  advanceAmount,
  balanceAmount,
  deliveryCommission,
  productCommission,
  advancePaystackFees,
  balancePaystackFees,
}: OrdersByVendorSummaryProps) {
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

  const totalDelivery = shopGroups.reduce((sum, g) => sum + g.deliveryFee, 0);
  const totalProducts = shopGroups.reduce((sum, g) => sum + g.subtotal, 0);

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
              {group.items.map((item) => (
                <div key={item.productId} className="flex justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Package className="h-3 w-3" />
                    {item.product.name} x{item.quantity}
                  </span>
                  <span>{formatCurrency(item.totalPrice)}</span>
                </div>
              ))}
              
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Truck className="h-3 w-3" />
                  Livraison
                </span>
                <span>{formatCurrency(group.deliveryFee)}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Separator />

      {/* Détail des montants */}
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Sous-total produits</span>
          <span>{formatCurrency(totalProducts)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Frais de livraison</span>
          <span>{formatCurrency(totalDelivery)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Commission livraison</span>
          <span>{formatCurrency(deliveryCommission)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Commission produit</span>
          <span>{formatCurrency(productCommission)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Frais transaction acompte (1%)</span>
          <span>{formatCurrency(advancePaystackFees)}</span>
        </div>
      </div>

      <Separator />

      {/* Acompte */}
      <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
        <div className="flex justify-between font-bold text-primary">
          <span>Acompte à payer maintenant</span>
          <span>{formatCurrency(advanceAmount)}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Livraison + commissions
        </p>
      </div>

      {/* Solde */}
      <div className="p-3 bg-muted rounded-lg">
        <div className="flex justify-between font-medium">
          <span className="flex items-center gap-1">
            <Info className="h-3 w-3" />
            Solde à payer à la livraison
          </span>
          <span>{formatCurrency(balanceAmount)}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Produits + frais de transaction (1%)
        </p>
      </div>
    </div>
  );
}
