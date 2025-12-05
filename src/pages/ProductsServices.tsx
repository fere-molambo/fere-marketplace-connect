import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { PublicProductCard } from "@/components/landing/PublicProductCard";
import { PublicServiceCard } from "@/components/landing/PublicServiceCard";
import { CatalogFilters } from "@/components/landing/CatalogFilters";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SlidersHorizontal, Grid3X3, List } from "lucide-react";

export interface CatalogFiltersState {
  collection: string;
  categories: string[];
  priceRange: [number, number];
  condition: string[];
  priceType: string[];
  onPromo: boolean | null;
}

const ProductsServices = () => {
  const [activeTab, setActiveTab] = useState<"products" | "services">("products");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filters, setFilters] = useState<CatalogFiltersState>({
    collection: "all",
    categories: [],
    priceRange: [0, 1000000],
    condition: [],
    priceType: [],
    onPromo: null,
  });

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ["product-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_categories")
        .select("*")
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch products
  const { data: products = [] } = useQuery({
    queryKey: ["catalog-products"],
    queryFn: async () => {
      const { data, error } = await supabase
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
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch services
  const { data: services = [] } = useQuery({
    queryKey: ["catalog-services"],
    queryFn: async () => {
      const { data, error } = await supabase
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
        .order("created_at", { ascending: false });

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

  const getFlashSale = (id: string, type: "product" | "service") => {
    return flashSales.find(fs => 
      type === "product" ? fs.product_id === id : fs.service_id === id
    );
  };

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter((product: any) => {
      // Category filter
      if (filters.categories.length > 0) {
        if (!filters.categories.includes(product.category_id) && 
            !filters.categories.includes(product.subcategory_id)) {
          return false;
        }
      }
      // Price range filter
      if (product.price < filters.priceRange[0] || product.price > filters.priceRange[1]) {
        return false;
      }
      // Condition filter
      if (filters.condition.length > 0 && !filters.condition.includes(product.condition)) {
        return false;
      }
      // Price type filter
      if (filters.priceType.length > 0 && !filters.priceType.includes(product.price_type)) {
        return false;
      }
      // Promo filter
      if (filters.onPromo === true) {
        const hasDiscount = product.discount_percent > 0;
        const hasFlashSale = flashSales.some(fs => fs.product_id === product.id);
        if (!hasDiscount && !hasFlashSale) return false;
      }
      return true;
    });
  }, [products, filters, flashSales]);

  // Filter services
  const filteredServices = useMemo(() => {
    return services.filter((service: any) => {
      // Price range filter
      if (service.price < filters.priceRange[0] || service.price > filters.priceRange[1]) {
        return false;
      }
      // Price type filter
      if (filters.priceType.length > 0 && !filters.priceType.includes(service.price_type)) {
        return false;
      }
      // Promo filter
      if (filters.onPromo === true) {
        const hasDiscount = service.discount_percent > 0;
        const hasFlashSale = flashSales.some(fs => fs.service_id === service.id);
        if (!hasDiscount && !hasFlashSale) return false;
      }
      return true;
    });
  }, [services, filters, flashSales]);

  const currentItems = activeTab === "products" ? filteredProducts : filteredServices;
  const totalItems = activeTab === "products" ? products.length : services.length;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <main className="flex-1">
        <div className="container mx-auto px-4 py-6">
          {/* Page Header */}
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Produits & Prestations
            </h1>
            <p className="text-muted-foreground mt-1">
              Découvrez notre sélection de produits et services
            </p>
          </div>

          <div className="flex gap-6">
            {/* Desktop Sidebar Filters */}
            <aside className="hidden lg:block w-64 flex-shrink-0">
              <CatalogFilters 
                filters={filters} 
                onFiltersChange={setFilters}
                categories={categories}
                activeTab={activeTab}
              />
            </aside>

            {/* Main Content */}
            <div className="flex-1">
              {/* Tabs and Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "products" | "services")}>
                  <TabsList>
                    <TabsTrigger value="products">Produits</TabsTrigger>
                    <TabsTrigger value="services">Prestations</TabsTrigger>
                  </TabsList>
                </Tabs>

                <div className="flex items-center gap-3">
                  {/* Mobile Filter Button */}
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button variant="outline" size="sm" className="lg:hidden">
                        <SlidersHorizontal className="h-4 w-4 mr-2" />
                        Filtres
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-80 p-0">
                      <div className="p-4">
                        <h2 className="font-semibold text-lg mb-4">Filtres</h2>
                        <CatalogFilters 
                          filters={filters} 
                          onFiltersChange={setFilters}
                          categories={categories}
                          activeTab={activeTab}
                        />
                      </div>
                    </SheetContent>
                  </Sheet>

                  {/* Results count */}
                  <span className="text-sm text-muted-foreground hidden sm:inline">
                    {currentItems.length} sur {totalItems} résultats
                  </span>

                  {/* View toggle */}
                  <div className="flex border rounded-md">
                    <Button
                      variant={viewMode === "grid" ? "default" : "ghost"}
                      size="sm"
                      className="rounded-r-none"
                      onClick={() => setViewMode("grid")}
                    >
                      <Grid3X3 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={viewMode === "list" ? "default" : "ghost"}
                      size="sm"
                      className="rounded-l-none"
                      onClick={() => setViewMode("list")}
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Mobile Results count */}
              <p className="text-sm text-muted-foreground mb-4 sm:hidden">
                Affichage de {currentItems.length} résultats sur {totalItems}
              </p>

              {/* Items Grid/List */}
              {currentItems.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>Aucun {activeTab === "products" ? "produit" : "prestation"} trouvé</p>
                  <p className="text-sm mt-2">Essayez de modifier vos filtres</p>
                </div>
              ) : (
                <div className={
                  viewMode === "grid" 
                    ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                    : "flex flex-col gap-4"
                }>
                  {activeTab === "products" ? (
                    filteredProducts.map((product: any) => (
                      <Link key={product.id} to={`/product/${product.id}`}>
                        <PublicProductCard 
                          product={product}
                          flashSale={getFlashSale(product.id, "product")}
                        />
                      </Link>
                    ))
                  ) : (
                    filteredServices.map((service: any) => (
                      <Link key={service.id} to={`/service/${service.id}`}>
                        <PublicServiceCard 
                          service={service}
                          flashSale={getFlashSale(service.id, "service")}
                        />
                      </Link>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ProductsServices;
