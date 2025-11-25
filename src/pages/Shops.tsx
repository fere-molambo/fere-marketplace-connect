import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserRoles } from "@/hooks/useUserRoles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw, Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateShopDialog } from "@/components/shops/CreateShopDialog";
import { ShopCard } from "@/components/shops/ShopCard";
import { ShopListItem } from "@/components/shops/ShopListItem";
import { ShopFilters } from "@/components/shops/ShopFilters";
import { ShopViewToggle } from "@/components/shops/ShopViewToggle";

export default function Shops() {
  const { isSuperAdmin, isAdmin } = useUserRoles();
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"cards" | "list">("cards");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterCategories, setFilterCategories] = useState<string[]>([]);
  const [filterServiceTypes, setFilterServiceTypes] = useState<string[]>([]);

  const { data: shops, isLoading, refetch } = useQuery({
    queryKey: ["shops"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shops")
        .select(`
          *,
          owner:profiles!owner_id (nom_complet, contact, email),
          shop_categories (
            product_categories (id, name)
          ),
          shop_service_types (
            service_provider_types (id, name)
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const handleRefresh = () => {
    refetch();
  };

  const filteredShops = shops?.filter((shop) => {
    const matchesSearch = shop.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "all" || shop.shop_type === filterType;
    const matchesCategories = filterCategories.length === 0 || 
      shop.shop_categories?.some((sc: any) => 
        filterCategories.includes(sc.product_categories?.id)
      );
    const matchesServiceTypes = filterServiceTypes.length === 0 || 
      shop.shop_service_types?.some((st: any) => 
        filterServiceTypes.includes(st.service_provider_types?.id)
      );

    return matchesSearch && matchesType && matchesCategories && matchesServiceTypes;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Boutiques</h1>
          <p className="text-sm text-muted-foreground">
            Gérez toutes les boutiques de la plateforme
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          {(isSuperAdmin || isAdmin) && (
            <CreateShopDialog onShopCreated={handleRefresh} />
          )}
        </div>
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

      <ShopFilters
        filterType={filterType}
        setFilterType={setFilterType}
        filterCategories={filterCategories}
        setFilterCategories={setFilterCategories}
        filterServiceTypes={filterServiceTypes}
        setFilterServiceTypes={setFilterServiceTypes}
      />

      <ShopViewToggle viewMode={viewMode} setViewMode={setViewMode} />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      ) : !filteredShops || filteredShops.length === 0 ? (
        <div className="flex min-h-[400px] items-center justify-center rounded-lg border border-dashed">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Aucune boutique trouvée</p>
          </div>
        </div>
      ) : viewMode === "cards" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredShops.map((shop) => (
            <ShopCard key={shop.id} shop={shop} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredShops.map((shop) => (
            <ShopListItem key={shop.id} shop={shop} />
          ))}
        </div>
      )}
    </div>
  );
}
