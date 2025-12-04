import { useState } from "react";
import { Heart, Star, BadgeCheck, Minus, Plus, ShoppingCart, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
    };
  };
}

export const PublicProductCard = ({ product }: PublicProductCardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showOrderUI, setShowOrderUI] = useState(false);
  const [quantity, setQuantity] = useState(product.min_quantity || 1);

  const discountedPrice = product.discount_percent
    ? product.price * (1 - product.discount_percent / 100)
    : product.price;

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

  return (
    <div
      className="bg-background rounded-xl border overflow-hidden group"
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

        {/* Discount Badge */}
        {product.discount_percent && product.discount_percent > 0 && (
          <Badge className="absolute top-2 left-2 bg-red-500 text-white">
            -{product.discount_percent}%
          </Badge>
        )}

        {/* Favorite Button */}
        <button
          onClick={() => setIsFavorite(!isFavorite)}
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
      <div className="p-4 space-y-3">
        {/* Title & Description */}
        <div>
          <h3 className="font-semibold text-sm line-clamp-1">{product.name}</h3>
          {product.description && (
            <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
              {product.description}
            </p>
          )}
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-1">
          {product.condition && (
            <Badge variant="outline" className="text-xs">
              {product.condition === "neuf" ? "Neuf" : "2ème main"}
            </Badge>
          )}
          {getPriceTypeLabel(product.price_type) && (
            <Badge variant="secondary" className="text-xs">
              {getPriceTypeLabel(product.price_type)}
            </Badge>
          )}
          {product.min_quantity && product.min_quantity > 1 && (
            <Badge variant="outline" className="text-xs">
              Min: {product.min_quantity}
            </Badge>
          )}
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-2">
          <span className="font-bold text-primary">
            {formatPrice(discountedPrice)}
          </span>
          {product.discount_percent && product.discount_percent > 0 && (
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
          <div className="flex items-center gap-2">
            <div className="flex items-center border rounded-lg">
              <button
                onClick={() => setQuantity(Math.max(product.min_quantity || 1, quantity - 1))}
                className="p-2 hover:bg-muted"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="px-3 text-sm">{quantity}</span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="p-2 hover:bg-muted"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
            <Button size="sm" className="flex-1">
              <ShoppingCart className="h-3 w-3 mr-1" />
              Ajouter
            </Button>
            <button
              onClick={() => setShowOrderUI(false)}
              className="p-2 hover:bg-muted rounded"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <Button
            onClick={() => setShowOrderUI(true)}
            className="w-full"
            size="sm"
            disabled={product.quantity_available === 0}
          >
            Commander
          </Button>
        )}

        {/* Rating & Reviews */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            <span>0</span>
          </div>
          <span>•</span>
          <span>0 avis</span>
          <span>•</span>
          <span>0 vendus</span>
        </div>

        {/* Vendor Info */}
        <div className="flex items-center gap-2 pt-2 border-t">
          <div className="w-6 h-6 rounded-full overflow-hidden bg-muted flex-shrink-0">
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
            <BadgeCheck className="h-4 w-4 text-primary flex-shrink-0" />
          )}
        </div>
      </div>
    </div>
  );
};
