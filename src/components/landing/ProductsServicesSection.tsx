import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PublicProductCard } from "./PublicProductCard";
import { PublicServiceCard } from "./PublicServiceCard";
import { ProductFilters } from "./ProductFilters";
import { ServiceFilters } from "./ServiceFilters";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const ProductsServicesSection = () => {
  const [productFilters, setProductFilters] = useState({});
  const [serviceFilters, setServiceFilters] = useState({});

  const { data: products = [] } = useQuery({
    queryKey: ["public-products", productFilters],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select(`
          *,
          shops!inner (
            id,
            name,
            logo_url,
            is_official,
            is_active
          )
        `)
        .eq("is_active", true)
        .eq("shops.is_active", true)
        .order("created_at", { ascending: false })
        .limit(12);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const { data: services = [] } = useQuery({
    queryKey: ["public-services", serviceFilters],
    queryFn: async () => {
      let query = supabase
        .from("services")
        .select(`
          *,
          shops!inner (
            id,
            name,
            logo_url,
            is_official,
            is_active
          )
        `)
        .eq("is_active", true)
        .eq("shops.is_active", true)
        .order("created_at", { ascending: false })
        .limit(12);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  return (
    <section id="products" className="py-12 px-4 bg-muted/20">
      <div className="container mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl md:text-3xl font-bold">
            Nouvelles Offres Du Moment
          </h2>
          <Button variant="ghost" className="hidden md:flex items-center gap-1">
            Tout voir <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <Tabs defaultValue="products" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="products">Produits</TabsTrigger>
            <TabsTrigger value="services">Prestations</TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="space-y-6">
            <ProductFilters onFiltersChange={setProductFilters} />
            
            {products.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                Aucun produit disponible pour le moment
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {products.map((product: any) => (
                  <PublicProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="services" id="services" className="space-y-6">
            <ServiceFilters onFiltersChange={setServiceFilters} />
            
            {services.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                Aucune prestation disponible pour le moment
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {services.map((service: any) => (
                  <PublicServiceCard key={service.id} service={service} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="md:hidden mt-6 text-center">
          <Button variant="outline" className="w-full">
            Voir tout <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </section>
  );
};
