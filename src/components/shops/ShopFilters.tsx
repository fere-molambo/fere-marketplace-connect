import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface ShopFiltersProps {
  filterType: string;
  setFilterType: (value: string) => void;
  filterCategories: string[];
  setFilterCategories: (value: string[]) => void;
  filterServiceTypes: string[];
  setFilterServiceTypes: (value: string[]) => void;
}

export const ShopFilters = ({
  filterType,
  setFilterType,
}: ShopFiltersProps) => {
  const { data: categories } = useQuery({
    queryKey: ["product-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_categories")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: serviceTypes } = useQuery({
    queryKey: ["service-provider-types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_provider_types")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <div className="space-y-2">
        <Label htmlFor="type-filter">Type de boutique</Label>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger id="type-filter">
            <SelectValue placeholder="Tous" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="fournisseur">Fournisseur</SelectItem>
            <SelectItem value="prestataire">Prestataire</SelectItem>
            <SelectItem value="les_deux">Les deux</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Catégories</Label>
        <Select disabled>
          <SelectTrigger>
            <SelectValue placeholder="Toutes" />
          </SelectTrigger>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Types de prestataire</Label>
        <Select disabled>
          <SelectTrigger>
            <SelectValue placeholder="Tous" />
          </SelectTrigger>
        </Select>
      </div>
    </div>
  );
};
