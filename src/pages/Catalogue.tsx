import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { PublicProductCard } from "@/components/landing/PublicProductCard";
import { PublicServiceCard } from "@/components/landing/PublicServiceCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Search, SlidersHorizontal, Grid3X3, List, X } from "lucide-react";

const Catalogue = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [priceRange, setPriceRange] = useState([0, 500000]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [activeTab, setActiveTab] = useState("products");

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ["product-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_categories")
        .select("*")
        .eq("is_active", true)
        .is("parent_id", null)
        .order("display_order");
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch products
  const { data: products = [] } = useQuery({
    queryKey: ["catalogue-products", searchQuery, priceRange, selectedCategories, selectedConditions],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select(`
          *,
          shops!inner (id, name, logo_url, is_official, is_active)
        `)
        .eq("is_active", true)
        .eq("shops.is_active", true)
        .gte("price", priceRange[0])
        .lte("price", priceRange[1])
        .order("created_at", { ascending: false });

      if (searchQuery) {
        query = query.ilike("name", `%${searchQuery}%`);
      }

      if (selectedCategories.length > 0) {
        query = query.in("category_id", selectedCategories);
      }

      if (selectedConditions.length > 0) {
        query = query.in("condition", selectedConditions);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch services
  const { data: services = [] } = useQuery({
    queryKey: ["catalogue-services", searchQuery, priceRange],
    queryFn: async () => {
      let query = supabase
        .from("services")
        .select(`
          *,
          shops!inner (id, name, logo_url, is_official, is_active)
        `)
        .eq("is_active", true)
        .eq("shops.is_active", true)
        .gte("price", priceRange[0])
        .lte("price", priceRange[1])
        .order("created_at", { ascending: false });

      if (searchQuery) {
        query = query.ilike("name", `%${searchQuery}%`);
      }

      const { data, error } = await query;
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

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat("fr-FR").format(value);
  };

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(c => c !== categoryId)
        : [...prev, categoryId]
    );
  };

  const toggleCondition = (condition: string) => {
    setSelectedConditions(prev =>
      prev.includes(condition)
        ? prev.filter(c => c !== condition)
        : [...prev, condition]
    );
  };

  const clearFilters = () => {
    setSearchQuery("");
    setPriceRange([0, 500000]);
    setSelectedCategories([]);
    setSelectedConditions([]);
  };

  const hasActiveFilters = searchQuery || priceRange[0] > 0 || priceRange[1] < 500000 || selectedCategories.length > 0 || selectedConditions.length > 0;

  const FiltersContent = () => (
    <div className="space-y-6">
      {/* Collections */}
      <div>
        <h3 className="font-semibold mb-3">Collections</h3>
        <div className="space-y-2">
          <Button variant="ghost" size="sm" className="w-full justify-start">
            Tous les articles
          </Button>
          <Button variant="ghost" size="sm" className="w-full justify-start">
            Meilleures ventes
          </Button>
          <Button variant="ghost" size="sm" className="w-full justify-start">
            Nouveautés
          </Button>
          <Button variant="ghost" size="sm" className="w-full justify-start">
            En promotion
          </Button>
        </div>
      </div>

      <Separator />

      {/* Categories */}
      <div>
        <h3 className="font-semibold mb-3">Catégories</h3>
        <div className="space-y-2">
          {categories.map((category: any) => (
            <div key={category.id} className="flex items-center space-x-2">
              <Checkbox
                id={category.id}
                checked={selectedCategories.includes(category.id)}
                onCheckedChange={() => toggleCategory(category.id)}
              />
              <label htmlFor={category.id} className="text-sm cursor-pointer">
                {category.name}
              </label>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Price Range */}
      <div>
        <h3 className="font-semibold mb-3">Fourchette de prix</h3>
        <Slider
          value={priceRange}
          onValueChange={setPriceRange}
          max={500000}
          min={0}
          step={1000}
          className="mt-2"
        />
        <div className="flex items-center gap-2 mt-3">
          <Input
            type="number"
            value={priceRange[0]}
            onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])}
            className="h-8 text-sm"
            placeholder="Min"
          />
          <span>—</span>
          <Input
            type="number"
            value={priceRange[1]}
            onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
            className="h-8 text-sm"
            placeholder="Max"
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          {formatPrice(priceRange[0])} — {formatPrice(priceRange[1])} FCFA
        </p>
      </div>

      <Separator />

      {/* Condition */}
      <div>
        <h3 className="font-semibold mb-3">État</h3>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="neuf"
              checked={selectedConditions.includes("neuf")}
              onCheckedChange={() => toggleCondition("neuf")}
            />
            <label htmlFor="neuf" className="text-sm cursor-pointer">
              Neuf
            </label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="occasion"
              checked={selectedConditions.includes("occasion")}
              onCheckedChange={() => toggleCondition("occasion")}
            />
            <label htmlFor="occasion" className="text-sm cursor-pointer">
              2ème main
            </label>
          </div>
        </div>
      </div>

      {hasActiveFilters && (
        <>
          <Separator />
          <Button variant="outline" className="w-full" onClick={clearFilters}>
            <X className="h-4 w-4 mr-2" />
            Effacer les filtres
          </Button>
        </>
      )}
    </div>
  );

  const currentItems = activeTab === "products" ? products : services;
  const itemCount = currentItems.length;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Catalogue</h1>
          <p className="text-muted-foreground">
            Découvrez nos produits et prestations
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-24 bg-background border rounded-lg p-4">
              <FiltersContent />
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Search & Controls */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un produit, une prestation ou un vendeur..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="flex items-center gap-2">
                {/* Mobile Filter Button */}
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="icon" className="lg:hidden">
                      <SlidersHorizontal className="h-4 w-4" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-80 overflow-y-auto">
                    <h2 className="font-semibold text-lg mb-4">Filtres</h2>
                    <FiltersContent />
                  </SheetContent>
                </Sheet>

                {/* View Toggle */}
                <div className="flex items-center border rounded-lg">
                  <Button
                    variant={viewMode === "grid" ? "secondary" : "ghost"}
                    size="icon"
                    onClick={() => setViewMode("grid")}
                    className="rounded-r-none"
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "secondary" : "ghost"}
                    size="icon"
                    onClick={() => setViewMode("list")}
                    className="rounded-l-none"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Active Filters */}
            {hasActiveFilters && (
              <div className="flex flex-wrap gap-2 mb-4">
                {searchQuery && (
                  <Badge variant="secondary" className="gap-1">
                    Recherche: {searchQuery}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => setSearchQuery("")} />
                  </Badge>
                )}
                {selectedCategories.map(catId => {
                  const cat = categories.find((c: any) => c.id === catId);
                  return cat ? (
                    <Badge key={catId} variant="secondary" className="gap-1">
                      {cat.name}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => toggleCategory(catId)} />
                    </Badge>
                  ) : null;
                })}
                {selectedConditions.map(cond => (
                  <Badge key={cond} variant="secondary" className="gap-1">
                    {cond === "neuf" ? "Neuf" : "2ème main"}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => toggleCondition(cond)} />
                  </Badge>
                ))}
              </div>
            )}

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="flex items-center justify-between mb-4">
                <TabsList>
                  <TabsTrigger value="products">Produits</TabsTrigger>
                  <TabsTrigger value="services">Prestations</TabsTrigger>
                </TabsList>
                <span className="text-sm text-muted-foreground">
                  {itemCount} résultat{itemCount > 1 ? "s" : ""}
                </span>
              </div>

              <TabsContent value="products">
                {products.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    Aucun produit trouvé
                  </div>
                ) : (
                  <div className={
                    viewMode === "grid"
                      ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
                      : "space-y-4"
                  }>
                    {products.map((product: any) => (
                      <Link key={product.id} to={`/product/${product.id}`}>
                        <PublicProductCard
                          product={product}
                          flashSale={getFlashSale(product.id, "product")}
                        />
                      </Link>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="services">
                {services.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    Aucune prestation trouvée
                  </div>
                ) : (
                  <div className={
                    viewMode === "grid"
                      ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
                      : "space-y-4"
                  }>
                    {services.map((service: any) => (
                      <Link key={service.id} to={`/service/${service.id}`}>
                        <PublicServiceCard
                          service={service}
                          flashSale={getFlashSale(service.id, "service")}
                        />
                      </Link>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Catalogue;