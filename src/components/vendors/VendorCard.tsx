import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Package, Wrench, ShieldCheck } from "lucide-react";

interface Shop {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  shop_type: string;
  is_official: boolean;
  address: string | null;
  average_rating: number;
  review_count: number;
  product_count: number;
  service_count: number;
}

interface VendorCardProps {
  shop: Shop;
}

export function VendorCard({ shop }: VendorCardProps) {
  return (
    <Link to={`/boutique/${shop.id}`}>
      <Card className="overflow-hidden h-full hover:shadow-lg transition-shadow group">
        {/* Banner */}
        <div className="relative h-24 bg-muted overflow-hidden">
          {shop.banner_url ? (
            <img
              src={shop.banner_url}
              alt=""
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-primary/20 to-primary/5" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
          
          {/* Logo */}
          <div className="absolute -bottom-8 left-4 h-16 w-16 rounded-lg border-2 border-background bg-background overflow-hidden shadow-md">
            {shop.logo_url ? (
              <img
                src={shop.logo_url}
                alt={shop.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                <span className="text-xl font-bold text-primary">
                  {shop.name.charAt(0)}
                </span>
              </div>
            )}
          </div>
        </div>

        <CardContent className="pt-10 pb-4 px-4">
          {/* Name and badges */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-semibold line-clamp-1">{shop.name}</h3>
            {shop.is_official && (
              <Badge variant="secondary" className="flex-shrink-0">
                <ShieldCheck className="h-3 w-3" />
              </Badge>
            )}
          </div>

          {/* Description */}
          {shop.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {shop.description}
            </p>
          )}

          {/* Stats */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              {shop.average_rating.toFixed(1)}
              <span className="text-muted-foreground/60">
                ({shop.review_count})
              </span>
            </span>
            <span className="flex items-center gap-1">
              <Package className="h-3 w-3" />
              {shop.product_count}
            </span>
            <span className="flex items-center gap-1">
              <Wrench className="h-3 w-3" />
              {shop.service_count}
            </span>
          </div>

          {/* Address */}
          {shop.address && (
            <p className="text-xs text-muted-foreground mt-2 line-clamp-1">
              📍 {shop.address}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
