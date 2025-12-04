import { useState } from "react";
import { Heart, Star, BadgeCheck, Calendar, MessageCircle, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface PublicServiceCardProps {
  service: {
    id: string;
    name: string;
    description: string | null;
    main_media_url: string | null;
    hover_media_url: string | null;
    price: number;
    price_type: string;
    discount_percent: number | null;
    requires_booking: boolean;
    booking_advance_percent: number | null;
    shops: {
      id: string;
      name: string;
      logo_url: string | null;
      is_official: boolean;
    };
  };
}

export const PublicServiceCard = ({ service }: PublicServiceCardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  const discountedPrice = service.discount_percent
    ? service.price * (1 - service.discount_percent / 100)
    : service.price;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("fr-FR").format(price) + " FCFA";
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
            isHovered && service.hover_media_url
              ? service.hover_media_url
              : service.main_media_url || "/placeholder.svg"
          }
          alt={service.name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />

        {/* Discount Badge */}
        {service.discount_percent && service.discount_percent > 0 && (
          <Badge className="absolute top-2 left-2 bg-red-500 text-white">
            -{service.discount_percent}%
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
          <h3 className="font-semibold text-sm line-clamp-1">{service.name}</h3>
          {service.description && (
            <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
              {service.description}
            </p>
          )}
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-1">
          {service.price_type === "negoce" && (
            <Badge variant="secondary" className="text-xs">
              Négociable
            </Badge>
          )}
          {service.requires_booking && (
            <Badge variant="outline" className="text-xs">
              Sur réservation
            </Badge>
          )}
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-2">
          <span className="text-xs text-muted-foreground">À partir de</span>
          <span className="font-bold text-primary">
            {formatPrice(discountedPrice)}
          </span>
          {service.discount_percent && service.discount_percent > 0 && (
            <span className="text-xs text-muted-foreground line-through">
              {formatPrice(service.price)}
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button className="flex-1" size="sm">
            <Calendar className="h-3 w-3 mr-1" />
            Réserver
          </Button>
          <Button variant="outline" size="sm" className="px-2">
            <MessageCircle className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="px-2">
            <Phone className="h-4 w-4" />
          </Button>
        </div>

        {/* Rating & Reviews */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            <span>0</span>
          </div>
          <span>•</span>
          <span>0 avis</span>
          <span>•</span>
          <span>0 réalisations</span>
        </div>

        {/* Vendor Info */}
        <div className="flex items-center gap-2 pt-2 border-t">
          <div className="w-6 h-6 rounded-full overflow-hidden bg-muted flex-shrink-0">
            {service.shops.logo_url ? (
              <img
                src={service.shops.logo_url}
                alt={service.shops.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs font-bold">
                {service.shops.name.charAt(0)}
              </div>
            )}
          </div>
          <span className="text-xs truncate flex-1">{service.shops.name}</span>
          {service.shops.is_official && (
            <BadgeCheck className="h-4 w-4 text-primary flex-shrink-0" />
          )}
        </div>
      </div>
    </div>
  );
};
