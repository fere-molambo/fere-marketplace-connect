import { MapPin, Clock, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ShopPickupInfoProps {
  shop: {
    id: string;
    name: string;
    address?: string | null;
    geolocation_lat?: number | null;
    geolocation_lng?: number | null;
    opening_time?: string | null;
    closing_time?: string | null;
    support_phone?: string | null;
  };
}

export function ShopPickupInfo({ shop }: ShopPickupInfoProps) {
  const hasLocation = shop.geolocation_lat && shop.geolocation_lng;
  const mapsUrl = hasLocation
    ? `https://www.google.com/maps?q=${shop.geolocation_lat},${shop.geolocation_lng}`
    : null;

  return (
    <div className="mt-4 p-4 bg-muted/50 rounded-lg space-y-3">
      <div className="flex items-center gap-2">
        <Badge variant="secondary">Point de retrait</Badge>
        <span className="font-medium">{shop.name}</span>
      </div>

      {shop.address && (
        <div className="flex items-start gap-2 text-sm">
          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
          <div>
            <p>{shop.address}</p>
            {mapsUrl && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline text-xs"
              >
                Voir sur Google Maps
              </a>
            )}
          </div>
        </div>
      )}

      {(shop.opening_time || shop.closing_time) && (
        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span>
            {shop.opening_time || "?"} - {shop.closing_time || "?"}
          </span>
        </div>
      )}

      {shop.support_phone && (
        <div className="flex items-center gap-2 text-sm">
          <Phone className="h-4 w-4 text-muted-foreground" />
          <a href={`tel:${shop.support_phone}`} className="text-primary hover:underline">
            {shop.support_phone}
          </a>
        </div>
      )}
    </div>
  );
}