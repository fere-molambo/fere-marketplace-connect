import { useState } from "react";
import { Filter, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ProductFiltersProps {
  onFiltersChange: (filters: any) => void;
}

export const ProductFilters = ({ onFiltersChange }: ProductFiltersProps) => {
  const [showFilters, setShowFilters] = useState(false);

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

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1">
                Prix
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuCheckboxItem>0 - 5 000 FCFA</DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem>5 000 - 20 000 FCFA</DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem>20 000 - 50 000 FCFA</DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem>50 000+ FCFA</DropdownMenuCheckboxItem>
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
