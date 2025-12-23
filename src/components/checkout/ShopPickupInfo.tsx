import { MapPin, Clock, Phone, Store, ExternalLink, Navigation } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ShopInfo {
  id: string;
  name: string;
  address?: string | null;
  google_maps_link?: string | null;
  geolocation_lat?: number | null;
  geolocation_lng?: number | null;
  opening_time?: string | null;
  closing_time?: string | null;
  support_phone?: string | null;
}

interface ShopPickupInfoProps {
  shop?: ShopInfo;
  shops?: ShopInfo[];
}

export function ShopPickupInfo({ shop, shops }: ShopPickupInfoProps) {
  // Support both single shop and multiple shops
  const shopList = shops || (shop ? [shop] : []);

  if (shopList.length === 0) return null;

  const openGoogleMapsDirections = (shopData: ShopInfo) => {
    if (shopData.google_maps_link) {
      window.open(shopData.google_maps_link, "_blank");
      return;
    }

    if (shopData.geolocation_lat && shopData.geolocation_lng) {
      // Try to get user's current position for directions
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const url = `https://www.google.com/maps/dir/${position.coords.latitude},${position.coords.longitude}/${shopData.geolocation_lat},${shopData.geolocation_lng}`;
            window.open(url, "_blank");
          },
          () => {
            // Fallback without origin
            const url = `https://www.google.com/maps?q=${shopData.geolocation_lat},${shopData.geolocation_lng}`;
            window.open(url, "_blank");
          }
        );
      } else {
        const url = `https://www.google.com/maps?q=${shopData.geolocation_lat},${shopData.geolocation_lng}`;
        window.open(url, "_blank");
      }
    }
  };

  const hasLocation = (s: ShopInfo) => s.google_maps_link || (s.geolocation_lat && s.geolocation_lng);

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center gap-2">
        <Store className="h-4 w-4 text-primary" />
        <span className="font-medium text-sm">
          {shopList.length > 1 
            ? `Points de retrait (${shopList.length} boutiques)` 
            : "Point de retrait"}
        </span>
      </div>

      <div className="space-y-3">
        {shopList.map((shopData) => (
          <div 
            key={shopData.id} 
            className="p-4 bg-muted/50 rounded-lg space-y-2"
          >
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{shopData.name}</Badge>
            </div>

            {shopData.address && (
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <p>{shopData.address}</p>
              </div>
            )}

            {(shopData.opening_time || shopData.closing_time) && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>
                  {shopData.opening_time || "?"} - {shopData.closing_time || "?"}
                </span>
              </div>
            )}

            {shopData.support_phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a href={`tel:${shopData.support_phone}`} className="text-primary hover:underline">
                  {shopData.support_phone}
                </a>
              </div>
            )}

            {/* Navigation Button */}
            {hasLocation(shopData) && (
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2"
                onClick={() => openGoogleMapsDirections(shopData)}
              >
                {shopData.google_maps_link ? (
                  <>
                    <ExternalLink className="h-3 w-3 mr-2" />
                    Voir sur Google Maps
                  </>
                ) : (
                  <>
                    <Navigation className="h-3 w-3 mr-2" />
                    Voir l'itinéraire
                  </>
                )}
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
