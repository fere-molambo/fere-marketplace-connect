import { useState } from "react";
import { Filter, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ServiceFiltersProps {
  onFiltersChange: (filters: any) => void;
}

export const ServiceFilters = ({ onFiltersChange }: ServiceFiltersProps) => {
  const [showFilters, setShowFilters] = useState(false);

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

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1">
                Prix
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuCheckboxItem>0 - 10 000 FCFA</DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem>10 000 - 50 000 FCFA</DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem>50 000 - 100 000 FCFA</DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem>100 000+ FCFA</DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>

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
