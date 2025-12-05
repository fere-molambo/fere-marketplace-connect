import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
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

  // Fetch flash sales
  const { data: flashSales = [] } = useQuery({
    queryKey: ["flash-sales"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("flash_sales")
        .select("*")
        .eq("is_active", true)
        .gt("ends_at", new Date().toISOString());
      if (error) throw error;
      return data || [];
    },
  });

  // Map flash sales to products/services
  const getFlashSale = (id: string, type: "product" | "service") => {
    return flashSales.find(fs => 
      type === "product" ? fs.product_id === id : fs.service_id === id
    );
  };

  return (
    <section id="products" className="py-6 px-4 bg-muted/20">
      <div className="container mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl md:text-2xl font-bold">
            Produits et prestations
          </h2>
          <Link to="/produits-services">
            <Button variant="ghost" className="hidden md:flex items-center gap-1">
              Tout voir <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        <Tabs defaultValue="products" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="products">Produits</TabsTrigger>
            <TabsTrigger value="services">Prestations</TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="space-y-4">
            <ProductFilters onFiltersChange={setProductFilters} />
            
            {products.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Aucun produit disponible pour le moment
              </div>
            ) : (
              <>
                {/* Mobile: 2 columns grid, max 6 items */}
                <div className="grid grid-cols-2 gap-3 md:hidden">
                  {products.slice(0, 6).map((product: any) => (
                    <Link key={product.id} to={`/product/${product.id}`}>
                      <PublicProductCard 
                        product={product} 
                        flashSale={getFlashSale(product.id, "product")}
                      />
                    </Link>
                  ))}
                </div>
                {/* Desktop/Tablet: horizontal scroll */}
                <div className="hidden md:flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                  {products.map((product: any) => (
                    <Link key={product.id} to={`/product/${product.id}`} className="flex-shrink-0 w-[280px]">
                      <PublicProductCard 
                        product={product}
                        flashSale={getFlashSale(product.id, "product")}
                      />
                    </Link>
                  ))}
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="services" id="services" className="space-y-4">
            <ServiceFilters onFiltersChange={setServiceFilters} />
            
            {services.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Aucune prestation disponible pour le moment
              </div>
            ) : (
              <>
                {/* Mobile: 2 columns grid, max 6 items */}
                <div className="grid grid-cols-2 gap-3 md:hidden">
                  {services.slice(0, 6).map((service: any) => (
                    <Link key={service.id} to={`/service/${service.id}`}>
                      <PublicServiceCard 
                        service={service}
                        flashSale={getFlashSale(service.id, "service")}
                      />
                    </Link>
                  ))}
                </div>
                {/* Desktop/Tablet: horizontal scroll */}
                <div className="hidden md:flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                  {services.map((service: any) => (
                    <Link key={service.id} to={`/service/${service.id}`} className="flex-shrink-0 w-[280px]">
                      <PublicServiceCard 
                        service={service}
                        flashSale={getFlashSale(service.id, "service")}
                      />
                    </Link>
                  ))}
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>

        <div className="md:hidden mt-4 text-center">
          <Link to="/produits-services">
            <Button variant="outline" className="w-full">
              Voir tout <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};
