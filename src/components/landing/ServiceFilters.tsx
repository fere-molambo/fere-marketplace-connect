import { useState } from "react";
import { Filter, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
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

interface ServiceFiltersProps {
  onFiltersChange: (filters: any) => void;
}

export const ServiceFilters = ({ onFiltersChange }: ServiceFiltersProps) => {
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState([0, 200000]);

  const formatPrice = (value: number) => {
    return value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value.toString();
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
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1">
                Prix: {formatPrice(priceRange[0])} - {formatPrice(priceRange[1])} FCFA
                <ChevronDown className="h-3 w-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span>{priceRange[0].toLocaleString()} FCFA</span>
                  <span>{priceRange[1].toLocaleString()} FCFA</span>
                </div>
                <Slider
                  value={priceRange}
                  onValueChange={setPriceRange}
                  max={200000}
                  min={0}
                  step={1000}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0 FCFA</span>
                  <span>200 000 FCFA</span>
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