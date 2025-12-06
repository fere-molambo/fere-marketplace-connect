import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Search, Store } from "lucide-react";
import { Input } from "@/components/ui/input";
import { VendorCard } from "@/components/vendors/VendorCard";

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
  support_phone: string | null;
}

interface ShopWithStats extends Shop {
  average_rating: number;
  review_count: number;
  product_count: number;
  service_count: number;
}

export default function Vendors() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: shops = [], isLoading } = useQuery({
    queryKey: ["public-shops"],
    queryFn: async () => {
      // Get active shops
      const { data: shopsData, error } = await supabase
        .from("shops")
        .select("id, name, slug, description, logo_url, banner_url, shop_type, is_official, address, support_phone")
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (error) throw error;

      // Get stats for each shop
      const shopsWithStats: ShopWithStats[] = await Promise.all(
        (shopsData || []).map(async (shop) => {
          // Get reviews stats
          const { data: reviews } = await supabase
            .from("shop_reviews")
            .select("rating")
            .eq("shop_id", shop.id);

          const reviewCount = reviews?.length || 0;
          const averageRating =
            reviewCount > 0
              ? reviews!.reduce((sum, r) => sum + r.rating, 0) / reviewCount
              : 0;

          // Get product count
          const { count: productCount } = await supabase
            .from("products")
            .select("*", { count: "exact", head: true })
            .eq("shop_id", shop.id)
            .eq("is_active", true);

          // Get service count
          const { count: serviceCount } = await supabase
            .from("services")
            .select("*", { count: "exact", head: true })
            .eq("shop_id", shop.id)
            .eq("is_active", true);

          return {
            ...shop,
            average_rating: averageRating,
            review_count: reviewCount,
            product_count: productCount || 0,
            service_count: serviceCount || 0,
          };
        })
      );

      return shopsWithStats;
    },
  });

  const filteredShops = shops.filter(
    (shop) =>
      shop.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shop.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-12 md:py-16 bg-gradient-to-b from-primary/5 to-background">
          <div className="container mx-auto px-4 text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Store className="h-8 w-8 text-primary" />
              <h1 className="text-3xl md:text-4xl font-bold">Nos Vendeurs</h1>
            </div>
            <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
              Découvrez tous les vendeurs et prestataires de services sur notre
              plateforme. Trouvez les meilleurs produits et services près de chez
              vous.
            </p>

            {/* Search */}
            <div className="relative max-w-md mx-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un vendeur..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </section>

        {/* Vendors Grid */}
        <section className="py-8 md:py-12">
          <div className="container mx-auto px-4">
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <div
                    key={i}
                    className="h-72 bg-muted animate-pulse rounded-lg"
                  />
                ))}
              </div>
            ) : filteredShops.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {searchQuery
                  ? "Aucun vendeur ne correspond à votre recherche"
                  : "Aucun vendeur disponible pour le moment"}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredShops.map((shop) => (
                  <VendorCard key={shop.id} shop={shop} />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
