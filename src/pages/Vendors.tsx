import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Store, Star, BadgeCheck, Package, Briefcase } from "lucide-react";

const Vendors = () => {
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch active shops (vendors)
  const { data: vendors = [], isLoading } = useQuery({
    queryKey: ["public-vendors", searchQuery],
    queryFn: async () => {
      let query = supabase
        .from("shops")
        .select(`
          id,
          name,
          slug,
          description,
          logo_url,
          banner_url,
          is_official,
          shop_type,
          address,
          owner_id
        `)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (searchQuery) {
        query = query.ilike("name", `%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch product counts for each shop
  const { data: productCounts = {} } = useQuery({
    queryKey: ["vendor-product-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("shop_id")
        .eq("is_active", true);
      
      if (error) throw error;
      
      const counts: Record<string, number> = {};
      data?.forEach(p => {
        counts[p.shop_id] = (counts[p.shop_id] || 0) + 1;
      });
      return counts;
    },
  });

  // Fetch service counts for each shop
  const { data: serviceCounts = {} } = useQuery({
    queryKey: ["vendor-service-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("shop_id")
        .eq("is_active", true);
      
      if (error) throw error;
      
      const counts: Record<string, number> = {};
      data?.forEach(s => {
        counts[s.shop_id] = (counts[s.shop_id] || 0) + 1;
      });
      return counts;
    },
  });

  const getShopTypeLabel = (type: string) => {
    switch (type) {
      case "produits":
        return "Produits";
      case "services":
        return "Services";
      case "les_deux":
        return "Produits & Services";
      default:
        return type;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Nos Vendeurs</h1>
          <p className="text-muted-foreground">
            Découvrez nos partenaires et leurs boutiques
          </p>
        </div>

        {/* Search */}
        <div className="relative max-w-md mb-8">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un vendeur..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Results count */}
        <p className="text-sm text-muted-foreground mb-6">
          {vendors.length} vendeur{vendors.length > 1 ? "s" : ""} trouvé{vendors.length > 1 ? "s" : ""}
        </p>

        {/* Vendors Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : vendors.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            Aucun vendeur trouvé
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {vendors.map((vendor: any) => (
              <Card key={vendor.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                {/* Banner */}
                <div className="h-24 bg-gradient-to-r from-primary/20 to-primary/5 relative">
                  {vendor.banner_url && (
                    <img 
                      src={vendor.banner_url} 
                      alt="" 
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>

                <CardContent className="pt-0 -mt-8 relative">
                  {/* Logo */}
                  <div className="relative inline-block mb-3">
                    <div className="w-16 h-16 rounded-full border-4 border-background bg-muted overflow-hidden">
                      {vendor.logo_url ? (
                        <img 
                          src={vendor.logo_url} 
                          alt={vendor.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Store className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    {vendor.is_official && (
                      <BadgeCheck className="absolute -bottom-1 -right-1 h-5 w-5 text-primary fill-primary/20" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg line-clamp-1">{vendor.name}</h3>
                    
                    {vendor.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {vendor.description}
                      </p>
                    )}

                    {/* Badges */}
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="secondary" className="text-xs">
                        {getShopTypeLabel(vendor.shop_type)}
                      </Badge>
                      {vendor.is_official && (
                        <Badge variant="outline" className="text-xs">
                          Officiel
                        </Badge>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <span>4.5</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Package className="h-3 w-3" />
                        <span>{productCounts[vendor.id] || 0} produits</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Briefcase className="h-3 w-3" />
                        <span>{serviceCounts[vendor.id] || 0} services</span>
                      </div>
                    </div>

                    {/* Action Button */}
                    <Link to={`/boutique/${vendor.id}`}>
                      <Button className="w-full mt-3" size="sm">
                        <Store className="h-4 w-4 mr-2" />
                        Voir la boutique
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Vendors;