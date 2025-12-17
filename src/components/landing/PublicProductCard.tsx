import { useState } from "react";
import { Heart, Star, BadgeCheck, Minus, Plus, ShoppingCart, X, MessageCircle, Phone, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FlashSaleBadge } from "@/components/ui/FlashSaleCountdown";
import { ContactVendorDialog } from "@/components/contact/ContactVendorDialog";

interface FlashSale {
  id: string;
  flash_price: number;
  ends_at: string;
}

interface PublicProductCardProps {
  product: {
    id: string;
    name: string;
    description: string | null;
    main_media_url: string | null;
    hover_media_url: string | null;
    price: number;
    price_type: string;
    condition: string | null;
    min_quantity: number | null;
    quantity_available: number | null;
    discount_percent: number | null;
    shops: {
      id: string;
      name: string;
      logo_url: string | null;
      is_official: boolean;
      owner_id?: string;
      support_phone?: string | null;
    };
  };
  flashSale?: FlashSale | null;
  viewMode?: "grid" | "list";
  isInWarehouse?: boolean;
}

export const PublicProductCard = ({ product, flashSale, viewMode = "grid", isInWarehouse = false }: PublicProductCardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showOrderUI, setShowOrderUI] = useState(false);
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [quantity, setQuantity] = useState(product.min_quantity || 1);

  const basePrice = flashSale ? flashSale.flash_price : product.price;
  const discountedPrice = product.discount_percent
    ? basePrice * (1 - product.discount_percent / 100)
    : basePrice;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("fr-FR").format(price) + " FCFA";
  };

  const getPriceTypeLabel = (type: string) => {
    switch (type) {
      case "negoce":
        return "Négociable";
      case "en_gros":
        return "En gros";
      default:
        return null;
    }
  };

  const getConditionLabel = (condition: string | null) => {
    if (condition === "neuf") return "Neuf";
    if (condition === "occasion") return "Occasion";
    return condition;
  };

  const handleCall = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (product.shops.support_phone) {
      window.location.href = `tel:${product.shops.support_phone}`;
    }
  };

  const handleMessage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowContactDialog(true);
  };

  // List view layout
  if (viewMode === "list") {
    return (
      <>
        <div className="bg-background rounded-lg border p-3 flex gap-3 hover:shadow-md transition-shadow">
          {/* Image */}
          <div className="relative w-20 h-20 md:w-24 md:h-24 flex-shrink-0 rounded-md overflow-hidden">
            <img
              src={product.main_media_url || "/placeholder.svg"}
              alt={product.name}
              className="w-full h-full object-cover"
            />
            {isInWarehouse && (
              <Badge className="absolute top-1 left-1 bg-green-600 text-white text-[10px] px-1.5 py-0.5 flex items-center gap-0.5">
                <CheckCircle className="h-2.5 w-2.5" />
                24h
              </Badge>
            )}
            {flashSale && !isInWarehouse && (
              <div className="absolute top-1 left-1">
                <Badge className="bg-red-500 text-white text-[10px] px-1 py-0">Flash</Badge>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-sm line-clamp-1">{product.name}</h3>
                <button
                  onClick={(e) => { e.preventDefault(); setIsFavorite(!isFavorite); }}
                  className="p-1 rounded-full hover:bg-muted transition-colors flex-shrink-0"
                >
                  <Heart className={`h-4 w-4 ${isFavorite ? "fill-red-500 text-red-500" : "text-muted-foreground"}`} />
                </button>
              </div>
              {product.description && (
                <p className="text-xs text-muted-foreground line-clamp-1">{product.description}</p>
              )}
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {product.condition && (
                  <Badge variant="outline" className="text-[10px] py-0 h-5">{getConditionLabel(product.condition)}</Badge>
                )}
                {product.quantity_available !== null && product.quantity_available > 0 && (
                  <span className="text-[10px] text-muted-foreground">{product.quantity_available} en stock</span>
                )}
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  <span>0</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 mt-2">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full overflow-hidden bg-muted flex-shrink-0">
                  {product.shops.logo_url ? (
                    <img src={product.shops.logo_url} alt={product.shops.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] font-bold">
                      {product.shops.name.charAt(0)}
                    </div>
                  )}
                </div>
                <span className="text-xs text-muted-foreground truncate max-w-[80px]">{product.shops.name}</span>
                {product.shops.is_official && <BadgeCheck className="h-3 w-3 text-primary flex-shrink-0" />}
              </div>

              <div className="flex items-center gap-2">
                <span className="font-bold text-primary text-sm whitespace-nowrap">
                  {formatPrice(discountedPrice)}
                </span>
                <div className="flex gap-1">
                  <Button size="sm" className="h-7 text-xs px-2" onClick={(e) => e.preventDefault()}>
                    <ShoppingCart className="h-3 w-3" />
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 px-2" onClick={handleMessage}>
                    <MessageCircle className="h-3 w-3" />
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 px-2" onClick={handleCall} disabled={!product.shops.support_phone}>
                    <Phone className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {product.shops.owner_id && (
          <ContactVendorDialog
            open={showContactDialog}
            onOpenChange={setShowContactDialog}
            vendorId={product.shops.owner_id}
            vendorName={product.shops.name}
            shopId={product.shops.id}
            supportPhone={product.shops.support_phone}
          />
        )}
      </>
    );
  }

  // Grid view layout (default)
  return (
    <>
      <div
        className="bg-background rounded-xl border overflow-hidden group h-full"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Image Container */}
        <div className="relative aspect-square overflow-hidden">
          <img
            src={
              isHovered && product.hover_media_url
                ? product.hover_media_url
                : product.main_media_url || "/placeholder.svg"
            }
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />

          {/* Warehouse 24h Badge */}
          {isInWarehouse && (
            <Badge className="absolute top-2 left-2 bg-green-600 text-white flex items-center gap-1 z-10">
              <CheckCircle className="h-3 w-3" />
              24h
            </Badge>
          )}

          {/* Flash Sale Badge */}
          {flashSale && !isInWarehouse && <FlashSaleBadge endsAt={flashSale.ends_at} />}

          {/* Discount Badge */}
          {!flashSale && !isInWarehouse && product.discount_percent && product.discount_percent > 0 && (
            <Badge className="absolute top-2 left-2 bg-red-500 text-white">
              -{product.discount_percent}%
            </Badge>
          )}

          {/* Favorite Button */}
          <button
            onClick={(e) => { e.preventDefault(); setIsFavorite(!isFavorite); }}
            className="absolute top-2 right-2 p-2 rounded-full bg-white/80 hover:bg-white transition-colors"
          >
            <Heart
              className={`h-4 w-4 ${
                isFavorite ? "fill-red-500 text-red-500" : "text-gray-600"
              }`}
            />
          </button>
        </div>

        {/* Content */}
        <div className="p-3 space-y-2">
          {/* Title & Description */}
          <div>
            <h3 className="font-semibold text-sm line-clamp-1">{product.name}</h3>
            {product.description && (
              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                {product.description}
              </p>
            )}
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-1">
            {product.condition && (
              <Badge variant="outline" className="text-xs py-0">
                {product.condition === "neuf" ? "Neuf" : "2ème main"}
              </Badge>
            )}
            {getPriceTypeLabel(product.price_type) && (
              <Badge variant="secondary" className="text-xs py-0">
                {getPriceTypeLabel(product.price_type)}
              </Badge>
            )}
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="font-bold text-primary text-sm">
              {formatPrice(discountedPrice)}
            </span>
            {(flashSale || (product.discount_percent && product.discount_percent > 0)) && (
              <span className="text-xs text-muted-foreground line-through">
                {formatPrice(product.price)}
              </span>
            )}
          </div>

          {/* Stock */}
          {product.quantity_available !== null && (
            <p className="text-xs text-muted-foreground">
              {product.quantity_available > 0
                ? `${product.quantity_available} en stock`
                : "Rupture de stock"}
            </p>
          )}

          {/* Order UI */}
          {showOrderUI ? (
            <div className="flex items-center gap-1">
              <div className="flex items-center border rounded-lg">
                <button
                  onClick={(e) => { e.preventDefault(); setQuantity(Math.max(product.min_quantity || 1, quantity - 1)); }}
                  className="p-1.5 hover:bg-muted"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <span className="px-2 text-xs">{quantity}</span>
                <button
                  onClick={(e) => { e.preventDefault(); setQuantity(quantity + 1); }}
                  className="p-1.5 hover:bg-muted"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
              <Button size="sm" className="flex-1 text-xs h-7" onClick={(e) => e.preventDefault()}>
                <ShoppingCart className="h-3 w-3 mr-1" />
                Ajouter
              </Button>
              <button
                onClick={(e) => { e.preventDefault(); setShowOrderUI(false); }}
                className="p-1.5 hover:bg-muted rounded"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <div className="flex gap-1">
              <Button
                onClick={(e) => { e.preventDefault(); setShowOrderUI(true); }}
                className="flex-1 text-xs h-8"
                size="sm"
                disabled={product.quantity_available === 0}
              >
                Commander
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="px-2 h-8" 
                onClick={handleMessage}
              >
                <MessageCircle className="h-3 w-3" />
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="px-2 h-8" 
                onClick={handleCall}
                disabled={!product.shops.support_phone}
              >
                <Phone className="h-3 w-3" />
              </Button>
            </div>
          )}

          {/* Rating & Reviews */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            <span>0</span>
            <span>•</span>
            <span>0 vendus</span>
          </div>

          {/* Vendor Info */}
          <div className="flex items-center gap-2 pt-2 border-t">
            <div className="w-5 h-5 rounded-full overflow-hidden bg-muted flex-shrink-0">
              {product.shops.logo_url ? (
                <img
                  src={product.shops.logo_url}
                  alt={product.shops.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs font-bold">
                  {product.shops.name.charAt(0)}
                </div>
              )}
            </div>
            <span className="text-xs truncate flex-1">{product.shops.name}</span>
            {product.shops.is_official && (
              <BadgeCheck className="h-3 w-3 text-primary flex-shrink-0" />
            )}
          </div>
        </div>
      </div>

      {/* Contact Dialog */}
      {product.shops.owner_id && (
        <ContactVendorDialog
          open={showContactDialog}
          onOpenChange={setShowContactDialog}
          vendorId={product.shops.owner_id}
          vendorName={product.shops.name}
          shopId={product.shops.id}
          supportPhone={product.shops.support_phone}
        />
      )}
    </>
  );
};
