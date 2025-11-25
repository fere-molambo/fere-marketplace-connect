import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Pencil, Store, Award } from "lucide-react";

interface ShopListItemProps {
  shop: any;
}

export const ShopListItem = ({ shop }: ShopListItemProps) => {
  const shopTypeLabels = {
    fournisseur: "Fournisseur",
    prestataire: "Prestataire",
    les_deux: "Les deux",
  };

  const categories = shop.shop_categories?.map((sc: any) => sc.product_categories?.name).filter(Boolean) || [];

  return (
    <div className="flex items-center gap-4 rounded-lg border bg-card p-4 hover:bg-accent/50">
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
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-foreground">{shop.name}</h3>
          {shop.is_official && (
            <Badge variant="default" className="h-5">
              <Award className="mr-1 h-3 w-3" />
              Officielle
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">@{shop.owner?.nom_complet}</p>
      </div>

      <div className="hidden gap-2 sm:flex">
        <Badge variant="outline">{shopTypeLabels[shop.shop_type as keyof typeof shopTypeLabels]}</Badge>
        {categories.length > 0 && (
          <Badge variant="secondary">{categories.length} catégories</Badge>
        )}
        <Badge variant={shop.verification_status === "verified" ? "default" : "secondary"}>
          {shop.verification_status === "verified" ? "✓ Vérifié" : "En attente"}
        </Badge>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link to={`/dashboard/shops/${shop.id}`}>
            <Eye className="h-4 w-4" />
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link to={`/dashboard/shops/${shop.id}`}>
            <Pencil className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
};
