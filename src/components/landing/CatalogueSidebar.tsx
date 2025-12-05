import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { PriceRangeFilter } from "./PriceRangeFilter";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export interface CatalogueFilters {
  type: "all" | "products" | "services";
  categories: string[];
  priceRange: [number, number];
  condition: string[];
  priceType: string[];
  onPromotion: boolean | null;
}

interface CatalogueSidebarProps {
  filters: CatalogueFilters;
  onFiltersChange: (filters: CatalogueFilters) => void;
  onClose?: () => void;
  showCloseButton?: boolean;
}

export const CatalogueSidebar = ({ 
  filters, 
  onFiltersChange, 
  onClose,
  showCloseButton = false 
}: CatalogueSidebarProps) => {
  const { data: categories = [] } = useQuery({
    queryKey: ["product-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_categories")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const parentCategories = categories.filter(c => !c.parent_id);
  const getSubcategories = (parentId: string) => categories.filter(c => c.parent_id === parentId);

  const handleTypeChange = (value: string) => {
    onFiltersChange({ ...filters, type: value as CatalogueFilters["type"] });
  };

  const handleCategoryToggle = (categoryId: string) => {
    const newCategories = filters.categories.includes(categoryId)
      ? filters.categories.filter(c => c !== categoryId)
      : [...filters.categories, categoryId];
    onFiltersChange({ ...filters, categories: newCategories });
  };

  const handleConditionToggle = (condition: string) => {
    const newConditions = filters.condition.includes(condition)
      ? filters.condition.filter(c => c !== condition)
      : [...filters.condition, condition];
    onFiltersChange({ ...filters, condition: newConditions });
  };

  const handlePriceTypeToggle = (priceType: string) => {
    const newPriceTypes = filters.priceType.includes(priceType)
      ? filters.priceType.filter(p => p !== priceType)
      : [...filters.priceType, priceType];
    onFiltersChange({ ...filters, priceType: newPriceTypes });
  };

  const handlePromotionChange = (value: string) => {
    onFiltersChange({ 
      ...filters, 
      onPromotion: value === "yes" ? true : value === "no" ? false : null 
    });
  };

  const resetFilters = () => {
    onFiltersChange({
      type: "all",
      categories: [],
      priceRange: [0, 1000000],
      condition: [],
      priceType: [],
      onPromotion: null,
    });
  };

  return (
    <div className="space-y-6">
      {showCloseButton && (
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Filtres</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
      )}

      {/* Type Filter */}
      <div className="space-y-3">
        <h3 className="font-medium text-sm">Type</h3>
        <RadioGroup value={filters.type} onValueChange={handleTypeChange}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="all" id="type-all" />
            <Label htmlFor="type-all" className="text-sm font-normal cursor-pointer">Tous</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="products" id="type-products" />
            <Label htmlFor="type-products" className="text-sm font-normal cursor-pointer">Produits</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="services" id="type-services" />
            <Label htmlFor="type-services" className="text-sm font-normal cursor-pointer">Prestations</Label>
          </div>
        </RadioGroup>
      </div>

      <Separator />

      {/* Categories */}
      <div className="space-y-3">
        <h3 className="font-medium text-sm">Catégories</h3>
        <div className="space-y-2 max-h-[200px] overflow-y-auto">
          {parentCategories.map((category) => (
            <div key={category.id} className="space-y-1">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`cat-${category.id}`}
                  checked={filters.categories.includes(category.id)}
                  onCheckedChange={() => handleCategoryToggle(category.id)}
                />
                <Label htmlFor={`cat-${category.id}`} className="text-sm font-normal cursor-pointer">
                  {category.name}
                </Label>
              </div>
              {getSubcategories(category.id).map((sub) => (
                <div key={sub.id} className="flex items-center space-x-2 pl-6">
                  <Checkbox
                    id={`cat-${sub.id}`}
                    checked={filters.categories.includes(sub.id)}
                    onCheckedChange={() => handleCategoryToggle(sub.id)}
                  />
                  <Label htmlFor={`cat-${sub.id}`} className="text-sm font-normal cursor-pointer">
                    {sub.name}
                  </Label>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Price Range */}
      <div className="space-y-3">
        <h3 className="font-medium text-sm">Prix</h3>
        <PriceRangeFilter
          minPrice={0}
          maxPrice={1000000}
          value={filters.priceRange}
          onChange={(value) => onFiltersChange({ ...filters, priceRange: value })}
        />
      </div>

      <Separator />

      {/* Condition (only for products) */}
      {filters.type !== "services" && (
        <>
          <div className="space-y-3">
            <h3 className="font-medium text-sm">Condition</h3>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="condition-neuf"
                  checked={filters.condition.includes("neuf")}
                  onCheckedChange={() => handleConditionToggle("neuf")}
                />
                <Label htmlFor="condition-neuf" className="text-sm font-normal cursor-pointer">Neuf</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="condition-occasion"
                  checked={filters.condition.includes("2ème main")}
                  onCheckedChange={() => handleConditionToggle("2ème main")}
                />
                <Label htmlFor="condition-occasion" className="text-sm font-normal cursor-pointer">2ème main</Label>
              </div>
            </div>
          </div>
          <Separator />
        </>
      )}

      {/* Price Type */}
      <div className="space-y-3">
        <h3 className="font-medium text-sm">Type de prix</h3>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="price-fixed"
              checked={filters.priceType.includes("fixe") || filters.priceType.includes("unitaire")}
              onCheckedChange={() => handlePriceTypeToggle(filters.type === "services" ? "fixe" : "unitaire")}
            />
            <Label htmlFor="price-fixed" className="text-sm font-normal cursor-pointer">Prix fixe</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="price-nego"
              checked={filters.priceType.includes("negoce")}
              onCheckedChange={() => handlePriceTypeToggle("negoce")}
            />
            <Label htmlFor="price-nego" className="text-sm font-normal cursor-pointer">Négociable</Label>
          </div>
          {filters.type !== "services" && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="price-bulk"
                checked={filters.priceType.includes("en_gros")}
                onCheckedChange={() => handlePriceTypeToggle("en_gros")}
              />
              <Label htmlFor="price-bulk" className="text-sm font-normal cursor-pointer">En gros</Label>
            </div>
          )}
        </div>
      </div>

      <Separator />

      {/* Promotion */}
      <div className="space-y-3">
        <h3 className="font-medium text-sm">En promotion</h3>
        <RadioGroup 
          value={filters.onPromotion === true ? "yes" : filters.onPromotion === false ? "no" : "all"}
          onValueChange={handlePromotionChange}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="all" id="promo-all" />
            <Label htmlFor="promo-all" className="text-sm font-normal cursor-pointer">Tous</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="yes" id="promo-yes" />
            <Label htmlFor="promo-yes" className="text-sm font-normal cursor-pointer">En promo</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="no" id="promo-no" />
            <Label htmlFor="promo-no" className="text-sm font-normal cursor-pointer">Sans promo</Label>
          </div>
        </RadioGroup>
      </div>

      <Separator />

      <Button variant="outline" className="w-full" onClick={resetFilters}>
        Réinitialiser les filtres
      </Button>
    </div>
  );
};
