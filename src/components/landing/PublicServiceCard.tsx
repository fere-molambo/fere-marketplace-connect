import { useState } from "react";
import { Heart, Star, BadgeCheck, Calendar, MessageCircle, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FlashSaleBadge } from "@/components/ui/FlashSaleCountdown";
import { ContactVendorDialog } from "@/components/contact/ContactVendorDialog";

interface FlashSale {
  id: string;
  flash_price: number;
  ends_at: string;
}

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
    duration?: number | null;
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
}

export const PublicServiceCard = ({ service, flashSale }: PublicServiceCardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showContactDialog, setShowContactDialog] = useState(false);

  const basePrice = flashSale ? flashSale.flash_price : service.price;
  const discountedPrice = service.discount_percent
    ? basePrice * (1 - service.discount_percent / 100)
    : basePrice;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("fr-FR").format(price) + " FCFA";
  };

  const formatDuration = (minutes: number | null | undefined) => {
    if (!minutes) return null;
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  };

  const handleCall = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (service.shops.support_phone) {
      window.location.href = `tel:${service.shops.support_phone}`;
    }
  };

  const handleMessage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowContactDialog(true);
  };

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
              isHovered && service.hover_media_url
                ? service.hover_media_url
                : service.main_media_url || "/placeholder.svg"
            }
            alt={service.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />

          {/* Flash Sale Badge */}
          {flashSale && <FlashSaleBadge endsAt={flashSale.ends_at} />}

          {/* Discount Badge */}
          {!flashSale && service.discount_percent && service.discount_percent > 0 && (
            <Badge className="absolute top-2 left-2 bg-red-500 text-white">
              -{service.discount_percent}%
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
            <h3 className="font-semibold text-sm line-clamp-1">{service.name}</h3>
            {service.description && (
              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                {service.description}
              </p>
            )}
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-1">
            {service.duration && (
              <Badge variant="outline" className="text-xs py-0">
                {formatDuration(service.duration)}
              </Badge>
            )}
            {service.price_type === "negoce" && (
              <Badge variant="secondary" className="text-xs py-0">
                Négociable
              </Badge>
            )}
            {service.requires_booking && (
              <Badge variant="outline" className="text-xs py-0">
                Sur RDV
              </Badge>
            )}
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="font-bold text-primary text-sm">
              {formatPrice(discountedPrice)}
            </span>
            {(flashSale || (service.discount_percent && service.discount_percent > 0)) && (
              <span className="text-xs text-muted-foreground line-through">
                {formatPrice(service.price)}
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-1">
            <Button className="flex-1 text-xs h-8" size="sm" onClick={(e) => e.preventDefault()}>
              <Calendar className="h-3 w-3 mr-1" />
              Réserver
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
              disabled={!service.shops.support_phone}
            >
              <Phone className="h-3 w-3" />
            </Button>
          </div>

          {/* Rating & Reviews */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            <span>0</span>
            <span>•</span>
            <span>0 réalisations</span>
          </div>

          {/* Vendor Info */}
          <div className="flex items-center gap-2 pt-2 border-t">
            <div className="w-5 h-5 rounded-full overflow-hidden bg-muted flex-shrink-0">
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
              <BadgeCheck className="h-3 w-3 text-primary flex-shrink-0" />
            )}
          </div>
        </div>
      </div>

      {/* Contact Dialog */}
      {service.shops.owner_id && (
        <ContactVendorDialog
          open={showContactDialog}
          onOpenChange={setShowContactDialog}
          vendorId={service.shops.owner_id}
          vendorName={service.shops.name}
          shopId={service.shops.id}
          supportPhone={service.shops.support_phone}
        />
      )}
    </>
  );
};
