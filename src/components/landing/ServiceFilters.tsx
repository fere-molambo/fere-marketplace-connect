import { useState } from "react";
import { Filter, ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

interface ServiceFiltersProps {
  onFiltersChange: (filters: {
    price_type?: string[];
    minPrice?: number;
    maxPrice?: number;
    requires_booking?: boolean;
    onSale?: boolean;
  }) => void;
}

export const ServiceFilters = ({ onFiltersChange }: ServiceFiltersProps) => {
  const [showFilters, setShowFilters] = useState(false);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [pricePopoverOpen, setPricePopoverOpen] = useState(false);

  const applyPriceFilter = () => {
    onFiltersChange({
      minPrice: minPrice ? parseInt(minPrice) : undefined,
      maxPrice: maxPrice ? parseInt(maxPrice) : undefined,
    });
    setPricePopoverOpen(false);
  };

  const clearPriceFilter = () => {
    setMinPrice("");
    setMaxPrice("");
    onFiltersChange({
      minPrice: undefined,
      maxPrice: undefined,
    });
  };

  const hasPriceFilter = minPrice || maxPrice;
  const priceLabel = hasPriceFilter 
    ? `${minPrice || "0"} - ${maxPrice || "∞"} FCFA`
    : "Prix";

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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1">
                Type de prix
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuCheckboxItem>Prix fixe</DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem>Négociable</DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Price Range Filter */}
          <Popover open={pricePopoverOpen} onOpenChange={setPricePopoverOpen}>
            <PopoverTrigger asChild>
              <Button 
                variant={hasPriceFilter ? "default" : "outline"} 
                size="sm" 
                className="gap-1"
              >
                {priceLabel}
                {hasPriceFilter ? (
                  <X 
                    className="h-3 w-3 ml-1" 
                    onClick={(e) => {
                      e.stopPropagation();
                      clearPriceFilter();
                    }}
                  />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-4" align="start">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="minPriceService">Prix minimum (FCFA)</Label>
                  <Input
                    id="minPriceService"
                    type="number"
                    placeholder="0"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxPriceService">Prix maximum (FCFA)</Label>
                  <Input
                    id="maxPriceService"
                    type="number"
                    placeholder="∞"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="flex-1"
                    onClick={clearPriceFilter}
                  >
                    Effacer
                  </Button>
                  <Button 
                    size="sm" 
                    className="flex-1"
                    onClick={applyPriceFilter}
                  >
                    Appliquer
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1">
                Réservation
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuCheckboxItem>Avec réservation</DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem>Sans réservation</DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>

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