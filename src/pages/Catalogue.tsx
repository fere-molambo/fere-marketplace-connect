import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { SearchBar } from "@/components/landing/SearchBar";
import { CatalogueSidebar, CatalogueFilters } from "@/components/landing/CatalogueSidebar";
import { PublicProductCard } from "@/components/landing/PublicProductCard";
import { PublicServiceCard } from "@/components/landing/PublicServiceCard";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { SlidersHorizontal, Grid3X3, List } from "lucide-react";

const Catalogue = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<CatalogueFilters>({
    type: "all",
    categories: [],
    priceRange: [0, 1000000],
    condition: [],
    priceType: [],
    onPromotion: null,
  });

  // Fetch products
  const { data: products = [] } = useQuery({
    queryKey: ["catalogue-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          shops!inner (id, name, logo_url, is_official, is_active)
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
    queryKey: ["catalogue-services"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select(`
          *,
          shops!inner (id, name, logo_url, is_official, is_active)
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
    queryKey: ["flash-sales-catalogue"],
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

  // Filter and search logic
  const filteredItems = useMemo(() => {
    let items: { type: "product" | "service"; data: any }[] = [];

    // Add products
    if (filters.type === "all" || filters.type === "products") {
      items.push(...products.map(p => ({ type: "product" as const, data: p })));
    }

    // Add services
    if (filters.type === "all" || filters.type === "services") {
      items.push(...services.map(s => ({ type: "service" as const, data: s })));
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      items = items.filter(item => 
        item.data.name?.toLowerCase().includes(query) ||
        item.data.description?.toLowerCase().includes(query) ||
        item.data.shops?.name?.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (filters.categories.length > 0) {
      items = items.filter(item => {
        if (item.type === "product") {
          return filters.categories.includes(item.data.category_id) || 
                 filters.categories.includes(item.data.subcategory_id);
        }
        return true; // Services don't have categories in current schema
      });
    }

    // Price range filter
    items = items.filter(item => {
      const price = item.data.price || 0;
      return price >= filters.priceRange[0] && price <= filters.priceRange[1];
    });

    // Condition filter (products only)
    if (filters.condition.length > 0) {
      items = items.filter(item => {
        if (item.type === "product") {
          return filters.condition.includes(item.data.condition || "neuf");
        }
        return true;
      });
    }

    // Price type filter
    if (filters.priceType.length > 0) {
      items = items.filter(item => {
        return filters.priceType.includes(item.data.price_type);
      });
    }

    // Promotion filter
    if (filters.onPromotion !== null) {
      items = items.filter(item => {
        const hasFlashSale = getFlashSale(item.data.id, item.type) !== undefined;
        const hasDiscount = (item.data.discount_percent || 0) > 0;
        const isOnPromo = hasFlashSale || hasDiscount;
        return filters.onPromotion ? isOnPromo : !isOnPromo;
      });
    }

    return items;
  }, [products, services, filters, searchQuery, flashSales]);

  const totalCount = (filters.type === "all" || filters.type === "products" ? products.length : 0) +
                     (filters.type === "all" || filters.type === "services" ? services.length : 0);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold mb-4">Produits et prestations</h1>
          
          {/* Search Bar */}
          <div className="flex gap-3">
            <div className="flex-1">
              <SearchBar value={searchQuery} onChange={setSearchQuery} />
            </div>
            
            {/* Mobile Filter Button */}
            <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="lg:hidden h-11 w-11">
                  <SlidersHorizontal className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] p-4 overflow-y-auto">
                <CatalogueSidebar 
                  filters={filters} 
                  onFiltersChange={setFilters}
                  onClose={() => setMobileFiltersOpen(false)}
                  showCloseButton
                />
              </SheetContent>
            </Sheet>
          </div>
        </div>

        <div className="flex gap-6">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:block w-[280px] flex-shrink-0">
            <div className="sticky top-20 bg-card border rounded-lg p-4">
              <h2 className="font-semibold mb-4">Filtres</h2>
              <CatalogueSidebar filters={filters} onFiltersChange={setFilters} />
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Results Header */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                Affichage de <span className="font-medium text-foreground">{filteredItems.length}</span> résultats sur {totalCount}
              </p>
              
              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => setViewMode("grid")}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => setViewMode("list")}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Items Grid/List */}
            {filteredItems.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>Aucun résultat trouvé</p>
                <p className="text-sm mt-1">Essayez de modifier vos filtres ou votre recherche</p>
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredItems.map((item) => (
                  <Link 
                    key={`${item.type}-${item.data.id}`} 
                    to={item.type === "product" ? `/product/${item.data.id}` : `/service/${item.data.id}`}
                  >
                    {item.type === "product" ? (
                      <PublicProductCard 
                        product={item.data} 
                        flashSale={getFlashSale(item.data.id, "product")}
                      />
                    ) : (
                      <PublicServiceCard 
                        service={item.data}
                        flashSale={getFlashSale(item.data.id, "service")}
                      />
                    )}
                  </Link>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredItems.map((item) => (
                  <Link 
                    key={`${item.type}-${item.data.id}`} 
                    to={item.type === "product" ? `/product/${item.data.id}` : `/service/${item.data.id}`}
                    className="block"
                  >
                    <div className="flex gap-4 p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors">
                      <div className="w-24 h-24 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                        <img 
                          src={item.data.main_media_url || "/placeholder.svg"} 
                          alt={item.data.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-semibold truncate">{item.data.name}</h3>
                            <p className="text-sm text-muted-foreground line-clamp-2">{item.data.description}</p>
                          </div>
                          <p className="text-primary font-bold whitespace-nowrap">
                            {item.data.price?.toLocaleString()} FCFA
                          </p>
                        </div>
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                          <span>{item.data.shops?.name}</span>
                          <span>•</span>
                          <span className="capitalize">{item.type === "product" ? "Produit" : "Prestation"}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Catalogue;
