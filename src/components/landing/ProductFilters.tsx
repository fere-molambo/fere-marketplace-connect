import { useState } from "react";
import { Filter, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ProductFiltersProps {
  onFiltersChange: (filters: any) => void;
}

export const ProductFilters = ({ onFiltersChange }: ProductFiltersProps) => {
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState([0, 500000]);

  const filterOptions = [
    {
      label: "État",
      key: "condition",
      options: [
        { value: "neuf", label: "Neuf" },
        { value: "occasion", label: "2ème main" },
      ],
    },
    {
      label: "Type de prix",
      key: "price_type",
      options: [
        { value: "unitaire", label: "Prix fixe" },
        { value: "negoce", label: "Négociable" },
        { value: "en_gros", label: "En gros" },
      ],
    },
  ];

  const handlePriceChange = (values: number[]) => {
    setPriceRange(values);
    onFiltersChange({ priceMin: values[0], priceMax: values[1] });
  };

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat("fr-FR").format(value);
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowFilters(!showFilters)}
        className="gap-2"
      >
        <Filter className="h-4 w-4" />
        Filtres
      </Button>

      {showFilters && (
        <>
          {filterOptions.map((filter) => (
            <DropdownMenu key={filter.key}>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1">
                  {filter.label}
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {filter.options.map((option) => (
                  <DropdownMenuCheckboxItem key={option.value}>
                    {option.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ))}

          {/* Price Range Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1">
                Prix
                <ChevronDown className="h-3 w-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="start">
              <div className="space-y-4">
                <Label>Fourchette de prix (FCFA)</Label>
                <Slider
                  value={priceRange}
                  onValueChange={handlePriceChange}
                  max={500000}
                  min={0}
                  step={1000}
                  className="mt-2"
                />
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground">Min</Label>
                    <Input
                      type="number"
                      value={priceRange[0]}
                      onChange={(e) => handlePriceChange([Number(e.target.value), priceRange[1]])}
                      className="h-8 text-sm"
                    />
                  </div>
                  <span className="mt-5">—</span>
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground">Max</Label>
                    <Input
                      type="number"
                      value={priceRange[1]}
                      onChange={(e) => handlePriceChange([priceRange[0], Number(e.target.value)])}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  {formatPrice(priceRange[0])} — {formatPrice(priceRange[1])} FCFA
                </p>
              </div>
            </PopoverContent>
          </Popover>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1">
                En promo
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuCheckboxItem>Oui</DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem>Non</DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      )}
    </div>
  );
};