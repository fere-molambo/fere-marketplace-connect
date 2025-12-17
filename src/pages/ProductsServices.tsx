import { useState, useEffect } from "react";
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
import { SlidersHorizontal, Grid3X3, List, Loader2 } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

export interface CatalogFiltersState {
  collection: string;
  categories: string[];
  priceRange: [number, number];
  condition: string[];
  priceType: string[];
  onPromo: boolean | null;
}

const ITEMS_PER_PAGE = 12;

const ProductsServices = () => {
  const [activeTab, setActiveTab] = useState<"products" | "services">("products");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<CatalogFiltersState>({
    collection: "all",
    categories: [],
    priceRange: [0, 1000000],
    condition: [],
    priceType: [],
    onPromo: null,
  });

  // Reset page when filters or tab change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, activeTab]);

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

  // Fetch flash sales (needed for promo filter)
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

  // Fetch warehouse product IDs for 24h badge
  const { data: warehouseProductIds = [] } = useQuery({
    queryKey: ["warehouse-product-ids"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("warehouse_stock")
        .select("product_id")
        .eq("is_active", true)
        .gt("quantity", 0);
      if (error) throw error;
      return data.map((s) => s.product_id);
    },
  });

  const isInWarehouse = (productId: string) => warehouseProductIds.includes(productId);

  // Fetch products with server-side pagination and filtering
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ["catalog-products", currentPage, filters, flashSales],
    queryFn: async () => {
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

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
        `, { count: "exact" })
        .eq("is_active", true)
        .eq("shops.is_active", true);

      // Apply server-side filters
      if (filters.categories.length > 0) {
        query = query.or(`category_id.in.(${filters.categories.join(",")}),subcategory_id.in.(${filters.categories.join(",")})`);
      }
      if (filters.condition.length > 0) {
        query = query.in("condition", filters.condition);
      }
      if (filters.priceType.length > 0) {
        query = query.in("price_type", filters.priceType);
      }
      if (filters.priceRange[0] > 0) {
        query = query.gte("price", filters.priceRange[0]);
      }
      if (filters.priceRange[1] < 1000000) {
        query = query.lte("price", filters.priceRange[1]);
      }

      // For promo filter, we need to filter in memory after fetching (due to flash_sales join complexity)
      if (filters.onPromo === true) {
        query = query.or(`discount_percent.gt.0,id.in.(${flashSales.filter(fs => fs.product_id).map(fs => fs.product_id).join(",") || "00000000-0000-0000-0000-000000000000"})`);
      }

      query = query.order("created_at", { ascending: false }).range(from, to);

      const { data, error, count } = await query;
      if (error) throw error;
      return { items: data || [], totalCount: count || 0 };
    },
    enabled: activeTab === "products",
  });

  // Fetch services with server-side pagination and filtering
  const { data: servicesData, isLoading: servicesLoading } = useQuery({
    queryKey: ["catalog-services", currentPage, filters, flashSales],
    queryFn: async () => {
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

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
        `, { count: "exact" })
        .eq("is_active", true)
        .eq("shops.is_active", true);

      // Apply server-side filters
      if (filters.priceType.length > 0) {
        query = query.in("price_type", filters.priceType);
      }
      if (filters.priceRange[0] > 0) {
        query = query.gte("price", filters.priceRange[0]);
      }
      if (filters.priceRange[1] < 1000000) {
        query = query.lte("price", filters.priceRange[1]);
      }

      // For promo filter
      if (filters.onPromo === true) {
        query = query.or(`discount_percent.gt.0,id.in.(${flashSales.filter(fs => fs.service_id).map(fs => fs.service_id).join(",") || "00000000-0000-0000-0000-000000000000"})`);
      }

      query = query.order("created_at", { ascending: false }).range(from, to);

      const { data, error, count } = await query;
      if (error) throw error;
      return { items: data || [], totalCount: count || 0 };
    },
    enabled: activeTab === "services",
  });

  const getFlashSale = (id: string, type: "product" | "service") => {
    return flashSales.find(fs => 
      type === "product" ? fs.product_id === id : fs.service_id === id
    );
  };

  const currentItems = activeTab === "products" 
    ? (productsData?.items || []) 
    : (servicesData?.items || []);
  const totalCount = activeTab === "products" 
    ? (productsData?.totalCount || 0) 
    : (servicesData?.totalCount || 0);
  const isLoading = activeTab === "products" ? productsLoading : servicesLoading;
  
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
  const startItem = totalCount > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0;
  const endItem = Math.min(currentPage * ITEMS_PER_PAGE, totalCount);

  // Generate page numbers with ellipsis
  const getPageNumbers = (): (number | "...")[] => {
    const pages: (number | "...")[] = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, "...", totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
      }
    }
    return pages;
  };

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
                    {totalCount > 0 ? `${startItem}-${endItem} sur ${totalCount}` : "0 résultat"}
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
                {totalCount > 0 ? `Affichage ${startItem}-${endItem} sur ${totalCount}` : "0 résultat"}
              </p>

              {/* Loading State */}
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : currentItems.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>Aucun {activeTab === "products" ? "produit" : "prestation"} trouvé</p>
                  <p className="text-sm mt-2">Essayez de modifier vos filtres</p>
                </div>
              ) : (
                <>
                  {/* Items Grid/List */}
                  <div className={
                    viewMode === "grid" 
                      ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                      : "flex flex-col gap-4"
                  }>
                    {activeTab === "products" ? (
                      currentItems.map((product: any) => (
                        <Link key={product.id} to={`/product/${product.id}`}>
                          <PublicProductCard 
                            product={product}
                            flashSale={getFlashSale(product.id, "product")}
                            viewMode={viewMode}
                            isInWarehouse={isInWarehouse(product.id)}
                          />
                        </Link>
                      ))
                    ) : (
                      currentItems.map((service: any) => (
                        <Link key={service.id} to={`/service/${service.id}`}>
                          <PublicServiceCard 
                            service={service}
                            flashSale={getFlashSale(service.id, "service")}
                            viewMode={viewMode}
                          />
                        </Link>
                      ))
                    )}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="mt-8 flex justify-center">
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious 
                              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                              className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                          </PaginationItem>
                          
                          {getPageNumbers().map((page, index) => (
                            <PaginationItem key={index}>
                              {page === "..." ? (
                                <PaginationEllipsis />
                              ) : (
                                <PaginationLink 
                                  isActive={page === currentPage}
                                  onClick={() => setCurrentPage(page)}
                                  className="cursor-pointer"
                                >
                                  {page}
                                </PaginationLink>
                              )}
                            </PaginationItem>
                          ))}
                          
                          <PaginationItem>
                            <PaginationNext 
                              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                              className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    </div>
                  )}
                </>
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
