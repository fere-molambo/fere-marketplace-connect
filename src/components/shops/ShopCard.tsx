import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Eye, Pencil, Store, Award } from "lucide-react";

interface ShopCardProps {
  shop: any;
}

export const ShopCard = ({ shop }: ShopCardProps) => {
  const shopTypeLabels = {
    fournisseur: "Fournisseur",
    prestataire: "Prestataire",
    les_deux: "Les deux",
  };

  const categories = shop.shop_categories?.map((sc: any) => sc.product_categories?.name).filter(Boolean) || [];

  return (
    <Card className="overflow-hidden">
      <div className="relative h-32 bg-muted">
        {shop.banner_url ? (
          <img
            src={shop.banner_url}
            alt="Banner"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Store className="h-12 w-12 text-muted-foreground" />
          </div>
        )}
        {shop.is_official && (
          <Badge className="absolute right-2 top-2 bg-primary">
            <Award className="mr-1 h-3 w-3" />
            Officielle
          </Badge>
        )}
      </div>

      <CardContent className="pt-4">
        <div className="flex items-start gap-3">
          {shop.logo_url ? (
            <img
              src={shop.logo_url}
              alt={shop.name}
              className="h-12 w-12 rounded-lg object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
              <Store className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 space-y-1">
            <h3 className="font-semibold text-foreground">{shop.name}</h3>
            <p className="text-xs text-muted-foreground">@{shop.owner?.nom_complet}</p>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Type:</span>
            <Badge variant="outline">{shopTypeLabels[shop.shop_type as keyof typeof shopTypeLabels]}</Badge>
          </div>
          {categories.length > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Catégories:</span>
              <span className="text-foreground">{categories.length}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Statut:</span>
            <Badge variant={shop.verification_status === "verified" ? "default" : "secondary"}>
              {shop.verification_status === "verified" ? "✓ Vérifié" : "En attente"}
            </Badge>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex gap-2">
        <Button variant="outline" size="sm" asChild className="flex-1">
          <Link to={`/dashboard/shops/${shop.id}`}>
            <Eye className="mr-2 h-4 w-4" />
            Voir
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild className="flex-1">
          <Link to={`/dashboard/shops/${shop.id}`}>
            <Pencil className="mr-2 h-4 w-4" />
            Modifier
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
};
