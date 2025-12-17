import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, Zap } from "lucide-react";
import { ShopViewToggle } from "../ShopViewToggle";
import { CreateProductDialog } from "../CreateProductDialog";
import { CreateServiceDialog } from "../CreateServiceDialog";
import { CreateFlashSaleDialog } from "../CreateFlashSaleDialog";
import { ProductCard } from "../ProductCard";
import { ServiceCard } from "../ServiceCard";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ProductsServicesTabProps {
  shopId: string;
}

export const ProductsServicesTab = ({ shopId }: ProductsServicesTabProps) => {
  const [createProductOpen, setCreateProductOpen] = useState(false);
  const [createServiceOpen, setCreateServiceOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"cards" | "list">("cards");

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ["shop-products", shopId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("shop_id", shopId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch warehouse stock for this shop's products
  const { data: warehouseStockMap = {} } = useQuery({
    queryKey: ["warehouse-stock-for-shop", shopId, products],
    queryFn: async () => {
      if (products.length === 0) return {};
      const productIds = products.map((p: any) => p.id);
      const { data, error } = await supabase
        .from("warehouse_stock")
        .select("product_id, quantity, warehouses(name)")
        .eq("is_active", true)
        .in("product_id", productIds);
      if (error) throw error;

      // Build map: product_id -> total warehouse quantity
      const map: Record<string, { total: number; warehouses: string[] }> = {};
      data.forEach((s: any) => {
        if (!map[s.product_id]) {
          map[s.product_id] = { total: 0, warehouses: [] };
        }
        map[s.product_id].total += s.quantity || 0;
        if (s.warehouses?.name && !map[s.product_id].warehouses.includes(s.warehouses.name)) {
          map[s.product_id].warehouses.push(s.warehouses.name);
        }
      });
      return map;
    },
    enabled: products.length > 0,
  });

  const { data: services = [], isLoading: servicesLoading } = useQuery({
    queryKey: ["shop-services", shopId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("shop_id", shopId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-4">
      <Tabs defaultValue="products" className="w-full">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <TabsList>
            <TabsTrigger value="products">Produits ({products.length})</TabsTrigger>
            <TabsTrigger value="services">Prestations ({services.length})</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <CreateFlashSaleDialog shopId={shopId} />
            <ShopViewToggle viewMode={viewMode} setViewMode={setViewMode} />
          </div>
        </div>

        <TabsContent value="products" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setCreateProductOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un produit
            </Button>
          </div>
          
          {productsLoading ? (
            <div className="text-center py-8 text-muted-foreground">Chargement...</div>
          ) : products.length === 0 ? (
            <div className="text-center py-12 border border-dashed rounded-lg">
              <p className="text-muted-foreground mb-4">Aucun produit pour le moment</p>
              <Button onClick={() => setCreateProductOpen(true)} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Créer votre premier produit
              </Button>
            </div>
          ) : (
            <div className={viewMode === "cards" 
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" 
              : "space-y-2"
            }>
              {products.map((product) => (
                <ProductCard 
                  key={product.id} 
                  product={product} 
                  viewMode={viewMode}
                  warehouseStock={warehouseStockMap[product.id]}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="services" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setCreateServiceOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter une prestation
            </Button>
          </div>
          
          {servicesLoading ? (
            <div className="text-center py-8 text-muted-foreground">Chargement...</div>
          ) : services.length === 0 ? (
            <div className="text-center py-12 border border-dashed rounded-lg">
              <p className="text-muted-foreground mb-4">Aucune prestation pour le moment</p>
              <Button onClick={() => setCreateServiceOpen(true)} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Créer votre première prestation
              </Button>
            </div>
          ) : (
            <div className={viewMode === "cards" 
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" 
              : "space-y-2"
            }>
              {services.map((service) => (
                <ServiceCard key={service.id} service={service} viewMode={viewMode} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <CreateProductDialog 
        shopId={shopId}
        open={createProductOpen}
        onOpenChange={setCreateProductOpen}
      />
      
      <CreateServiceDialog 
        shopId={shopId}
        open={createServiceOpen}
        onOpenChange={setCreateServiceOpen}
      />
    </div>
  );
};
