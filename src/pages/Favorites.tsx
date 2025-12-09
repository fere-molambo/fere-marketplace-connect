import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Heart, Package, Wrench, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Link, Navigate } from "react-router-dom";
import { PublicProductCard } from "@/components/landing/PublicProductCard";
import { PublicServiceCard } from "@/components/landing/PublicServiceCard";

const Favorites = () => {
  const { user, session, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("products");

  // Fetch favorite products
  const { data: favoriteProducts = [], isLoading: loadingProducts } = useQuery({
    queryKey: ["favorites-products", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("favorites")
        .select(`
          id,
          product_id,
          products (
            *,
            shops (id, name, logo_url, is_official)
          )
        `)
        .eq("user_id", user?.id)
        .not("product_id", "is", null);
      
      if (error) throw error;
      return data?.filter(f => f.products) || [];
    },
    enabled: !!user?.id,
  });

  // Fetch favorite services
  const { data: favoriteServices = [], isLoading: loadingServices } = useQuery({
    queryKey: ["favorites-services", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("favorites")
        .select(`
          id,
          service_id,
          services (
            *,
            shops (id, name, logo_url, is_official)
          )
        `)
        .eq("user_id", user?.id)
        .not("service_id", "is", null);
      
      if (error) throw error;
      return data?.filter(f => f.services) || [];
    },
    enabled: !!user?.id,
  });

  // Remove from favorites mutation
  const removeFavoriteMutation = useMutation({
    mutationFn: async (favoriteId: string) => {
      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("id", favoriteId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorites-products", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["favorites-services", user?.id] });
      toast.success("Retiré des favoris");
    },
    onError: () => {
      toast.error("Erreur lors de la suppression");
    },
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session || !user) {
    return <Navigate to="/auth" replace />;
  }

  const isLoading = loadingProducts || loadingServices;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <Heart className="h-8 w-8 text-red-500 fill-red-500" />
            <h1 className="text-2xl font-bold">Mes Favoris</h1>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="products" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Produits ({favoriteProducts.length})
              </TabsTrigger>
              <TabsTrigger value="services" className="flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                Prestations ({favoriteServices.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="products">
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : favoriteProducts.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Aucun produit en favoris</h3>
                  <p className="text-muted-foreground mb-4">
                    Explorez notre catalogue et ajoutez des produits à vos favoris
                  </p>
                  <Link to="/produits-services">
                    <Button>Voir les produits</Button>
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {favoriteProducts.map((fav) => (
                    <div key={fav.id} className="relative group">
                      <PublicProductCard product={fav.products as any} />
                      <Button
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          removeFavoriteMutation.mutate(fav.id);
                        }}
                      >
                        <Heart className="h-4 w-4 fill-current" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="services">
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : favoriteServices.length === 0 ? (
                <div className="text-center py-12">
                  <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Aucune prestation en favoris</h3>
                  <p className="text-muted-foreground mb-4">
                    Explorez notre catalogue et ajoutez des prestations à vos favoris
                  </p>
                  <Link to="/produits-services">
                    <Button>Voir les prestations</Button>
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {favoriteServices.map((fav) => (
                    <div key={fav.id} className="relative group">
                      <PublicServiceCard service={fav.services as any} />
                      <Button
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          removeFavoriteMutation.mutate(fav.id);
                        }}
                      >
                        <Heart className="h-4 w-4 fill-current" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Favorites;