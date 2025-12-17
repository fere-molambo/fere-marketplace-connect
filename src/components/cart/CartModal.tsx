import { useCart, CartItem as CartItemType } from "@/contexts/CartContext";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ShoppingCart, Trash2, Plus, Minus, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

const CartItemRow = ({ item }: { item: CartItemType }) => {
  const { updateQuantity, updateProposedPrice, removeFromCart, getValidationError } = useCart();
  const error = getValidationError(item);

  const handleQuantityChange = (delta: number) => {
    const newQuantity = Math.max(1, item.quantity + delta);
    if (item.product.quantity_available && newQuantity > item.product.quantity_available) {
      return;
    }
    updateQuantity(item.productId, newQuantity);
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-3">
        {/* Image */}
        <div className="w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
          {item.product.main_media_url ? (
            <img 
              src={item.product.main_media_url} 
              alt={item.product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ShoppingCart className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm truncate">{item.product.name}</h4>
          <p className="text-xs text-muted-foreground">{item.product.shops?.name}</p>
          
          {/* Color/Size */}
          {(item.selectedColor || item.selectedSize) && (
            <p className="text-xs text-muted-foreground mt-1">
              {item.selectedColor && `Couleur: ${item.selectedColor}`}
              {item.selectedColor && item.selectedSize && " • "}
              {item.selectedSize && `Taille: ${item.selectedSize}`}
            </p>
          )}

          {/* Unit price info */}
          <p className="text-xs text-muted-foreground mt-1">
            {item.unitPrice.toLocaleString()} FCFA / unité
          </p>
        </div>

        {/* Price & Actions */}
        <div className="flex flex-col items-end justify-between">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => removeFromCart(item.productId)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <p className="font-semibold text-sm">
            {item.totalPrice.toLocaleString()} FCFA
          </p>
        </div>
      </div>

      {/* Quantity Selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center border rounded-md">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => handleQuantityChange(-1)}
            disabled={item.quantity <= 1}
          >
            <Minus className="h-3 w-3" />
          </Button>
          <span className="w-10 text-center text-sm font-medium">{item.quantity}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => handleQuantityChange(1)}
            disabled={item.product.quantity_available !== null && item.quantity >= item.product.quantity_available}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>

        {/* Min quantity reminder for bulk */}
        {item.product.price_type === "en_gros" && item.product.min_quantity && (
          <span className="text-xs text-muted-foreground">
            Min: {item.product.min_quantity}
          </span>
        )}
      </div>

      {/* Negotiated price input */}
      {item.product.price_type === "negoce" && (
        <div className="space-y-1">
          <label className="text-xs font-medium">Prix proposé (FCFA)</label>
          <Input
            type="number"
            value={item.proposedPrice || ""}
            onChange={(e) => updateProposedPrice(item.productId, Number(e.target.value))}
            placeholder={`Min: ${item.product.min_auto_price?.toLocaleString()} FCFA`}
            className="h-8 text-sm"
          />
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="flex items-start gap-2 p-2 bg-destructive/10 border border-destructive/20 rounded-md">
          <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}
    </div>
  );
};

// Shared cart content component
const CartContent = () => {
  const { items, totalAmount, clearCart, getValidationError, setIsCartOpen } = useCart();
  const navigate = useNavigate();
  const hasErrors = items.some(item => getValidationError(item) !== null);

  const handleContinue = () => {
    setIsCartOpen(false);
    navigate("/checkout");
  };

  if (items.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-8 text-muted-foreground">
        <ShoppingCart className="h-12 w-12 mb-4" />
        <p>Votre panier est vide</p>
      </div>
    );
  }

  return (
    <>
      <ScrollArea className="flex-1 px-4">
        <div className="space-y-4 py-2">
          {items.map((item, index) => (
            <div key={`${item.productId}-${item.selectedColor}-${item.selectedSize}`}>
              <CartItemRow item={item} />
              {index < items.length - 1 && <Separator className="mt-4" />}
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="px-4 pt-4 border-t space-y-4">
        {/* Total */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Sous-total</span>
            <span className="font-bold text-lg">{totalAmount.toLocaleString()} FCFA</span>
          </div>
          {hasErrors && (
            <p className="text-xs text-destructive">
              Corrigez les erreurs avant de continuer
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <Button 
            onClick={handleContinue}
            disabled={items.length === 0 || hasErrors}
            className="w-full"
          >
            Continuer
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsCartOpen(false)} className="flex-1">
              Fermer
            </Button>
            <Button
              variant="ghost"
              onClick={clearCart}
              className="text-destructive hover:text-destructive"
            >
              Vider
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export const CartModal = () => {
  const { items, isCartOpen, setIsCartOpen } = useCart();
  const isMobile = useIsMobile();

  // Mobile: Use Drawer (slides from bottom)
  if (isMobile) {
    return (
      <Drawer open={isCartOpen} onOpenChange={setIsCartOpen}>
        <DrawerContent className="max-h-[85vh] flex flex-col">
          <DrawerHeader className="border-b pb-4">
            <DrawerTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Mon Panier ({items.length} article{items.length > 1 ? "s" : ""})
            </DrawerTitle>
          </DrawerHeader>
          <div className="flex-1 flex flex-col overflow-hidden">
            <CartContent />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop: Use Sheet (slides from right)
  return (
    <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Mon Panier ({items.length} article{items.length > 1 ? "s" : ""})
          </SheetTitle>
        </SheetHeader>
        <div className="flex-1 flex flex-col overflow-hidden">
          <CartContent />
        </div>
      </SheetContent>
    </Sheet>
  );
};
