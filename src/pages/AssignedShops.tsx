import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw, Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ShopCard } from "@/components/shops/ShopCard";
import { ShopListItem } from "@/components/shops/ShopListItem";
import { ShopViewToggle } from "@/components/shops/ShopViewToggle";

export default function AssignedShops() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"cards" | "list">("cards");

  const { data: shops, isLoading, refetch } = useQuery({
    queryKey: ["assigned-shops", user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("shop_team_members")
        .select(`
          shop_id,
          shops (
            *,
            owner:profiles!owner_id (nom_complet, contact, email),
            shop_categories (
              product_categories (id, name)
            ),
            shop_service_types (
              service_provider_types (id, name)
            )
          )
        `)
        .eq("member_id", user.id);

      if (error) throw error;
      return data.map(item => item.shops).filter(Boolean);
    },
    enabled: !!user,
  });

  const handleRefresh = () => {
    refetch();
  };

  const filteredShops = shops?.filter((shop: any) => {
    return shop.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Mes Boutiques</h1>
          <p className="text-sm text-muted-foreground">
            Boutiques auxquelles vous êtes assigné
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Rechercher une boutique..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <ShopViewToggle viewMode={viewMode} setViewMode={setViewMode} />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      ) : !filteredShops || filteredShops.length === 0 ? (
        <div className="flex min-h-[400px] items-center justify-center rounded-lg border border-dashed">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Aucune boutique assignée</p>
          </div>
        </div>
      ) : viewMode === "cards" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {filteredShops.map((shop: any) => (
            <ShopCard key={shop.id} shop={shop} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredShops.map((shop: any) => (
            <ShopListItem key={shop.id} shop={shop} />
          ))}
        </div>
      )}
    </div>
  );
}
