import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { CatalogFiltersState } from "@/pages/ProductsServices";

interface CatalogFiltersProps {
  filters: CatalogFiltersState;
  onFiltersChange: (filters: CatalogFiltersState) => void;
  categories: any[];
  activeTab: "products" | "services";
}

const collections = [
  { id: "all", label: "Tous" },
  { id: "bestsellers", label: "Best sellers" },
  { id: "new", label: "Nouveautés" },
  { id: "promo", label: "En promo" },
];

const conditions = [
  { id: "neuf", label: "Neuf" },
  { id: "2ème main", label: "2ème main" },
];

const priceTypes = [
  { id: "unitaire", label: "Prix fixe" },
  { id: "negoce", label: "Négociable" },
  { id: "en_gros", label: "En gros" },
];

export const CatalogFilters = ({ 
  filters, 
  onFiltersChange, 
  categories,
  activeTab 
}: CatalogFiltersProps) => {
  
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

  const handleCollectionChange = (collection: string) => {
    if (collection === "promo") {
      onFiltersChange({ ...filters, collection, onPromo: true });
    } else {
      onFiltersChange({ ...filters, collection, onPromo: null });
    }
  };

  const resetFilters = () => {
    onFiltersChange({
      collection: "all",
      categories: [],
      priceRange: [0, 1000000],
      condition: [],
      priceType: [],
      onPromo: null,
    });
  };

  const parentCategories = categories.filter(c => !c.parent_id);
  const hasActiveFilters = 
    filters.categories.length > 0 || 
    filters.condition.length > 0 || 
    filters.priceType.length > 0 ||
    filters.onPromo !== null ||
    filters.priceRange[0] > 0 ||
    filters.priceRange[1] < 1000000;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("fr-FR").format(price) + " FCFA";
  };

  return (
    <div className="space-y-4">
      {/* Collections badges */}
      <div className="flex flex-wrap gap-2">
        {collections.map((col) => (
          <Badge
            key={col.id}
            variant={filters.collection === col.id ? "default" : "outline"}
            className="cursor-pointer hover:bg-primary/90 transition-colors"
            onClick={() => handleCollectionChange(col.id)}
          >
            {col.label}
          </Badge>
        ))}
      </div>

      <Accordion type="multiple" defaultValue={["categories", "price", "condition", "priceType"]} className="w-full">
        {/* Categories - only for products */}
        {activeTab === "products" && (
          <AccordionItem value="categories">
            <AccordionTrigger className="text-sm font-medium">
              Catégories
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {parentCategories.map((category) => {
                  const subCategories = categories.filter(c => c.parent_id === category.id);
                  return (
                    <div key={category.id}>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={category.id}
                          checked={filters.categories.includes(category.id)}
                          onCheckedChange={() => handleCategoryToggle(category.id)}
                        />
                        <Label htmlFor={category.id} className="text-sm cursor-pointer">
                          {category.name}
                        </Label>
                      </div>
                      {subCategories.length > 0 && (
                        <div className="ml-6 mt-1 space-y-1">
                          {subCategories.map((sub) => (
                            <div key={sub.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={sub.id}
                                checked={filters.categories.includes(sub.id)}
                                onCheckedChange={() => handleCategoryToggle(sub.id)}
                              />
                              <Label htmlFor={sub.id} className="text-xs cursor-pointer text-muted-foreground">
                                {sub.name}
                              </Label>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
                {parentCategories.length === 0 && (
                  <p className="text-sm text-muted-foreground">Aucune catégorie</p>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Price Range */}
        <AccordionItem value="price">
          <AccordionTrigger className="text-sm font-medium">
            Prix
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pt-2">
              <Slider
                min={0}
                max={1000000}
                step={5000}
                value={filters.priceRange}
                onValueChange={(value) => 
                  onFiltersChange({ ...filters, priceRange: value as [number, number] })
                }
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{formatPrice(filters.priceRange[0])}</span>
                <span>{formatPrice(filters.priceRange[1])}</span>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Condition - only for products */}
        {activeTab === "products" && (
          <AccordionItem value="condition">
            <AccordionTrigger className="text-sm font-medium">
              État
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2">
                {conditions.map((cond) => (
                  <div key={cond.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`cond-${cond.id}`}
                      checked={filters.condition.includes(cond.id)}
                      onCheckedChange={() => handleConditionToggle(cond.id)}
                    />
                    <Label htmlFor={`cond-${cond.id}`} className="text-sm cursor-pointer">
                      {cond.label}
                    </Label>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Price Type */}
        <AccordionItem value="priceType">
          <AccordionTrigger className="text-sm font-medium">
            Type de prix
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2">
              {(activeTab === "products" ? priceTypes : priceTypes.slice(0, 2)).map((type) => (
                <div key={type.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`type-${type.id}`}
                    checked={filters.priceType.includes(type.id)}
                    onCheckedChange={() => handlePriceTypeToggle(type.id)}
                  />
                  <Label htmlFor={`type-${type.id}`} className="text-sm cursor-pointer">
                    {type.label}
                  </Label>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Reset button */}
      {hasActiveFilters && (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={resetFilters}
          className="w-full"
        >
          Réinitialiser les filtres
        </Button>
      )}
    </div>
  );
};
