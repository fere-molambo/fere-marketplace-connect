import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface UseFavoriteOptions {
  productId?: string;
  serviceId?: string;
}

export const useFavorite = ({ productId, serviceId }: UseFavoriteOptions) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const queryKey = productId 
    ? ["favorite", "product", productId, user?.id]
    : ["favorite", "service", serviceId, user?.id];

  // Check if item is favorited
  const { data: favoriteData, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!user?.id) return null;

      let query = supabase
        .from("favorites")
        .select("id")
        .eq("user_id", user.id);

      if (productId) {
        query = query.eq("product_id", productId);
      } else if (serviceId) {
        query = query.eq("service_id", serviceId);
      }

      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && !!(productId || serviceId),
  });

  const isFavorite = !!favoriteData;

  // Toggle favorite mutation
  const toggleMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Non authentifié");

      if (isFavorite && favoriteData?.id) {
        // Remove from favorites
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("id", favoriteData.id);
        
        if (error) throw error;
        return { action: "removed" };
      } else {
        // Add to favorites
        const insertData: any = { user_id: user.id };
        if (productId) {
          insertData.product_id = productId;
        } else if (serviceId) {
          insertData.service_id = serviceId;
        }

        const { error } = await supabase
          .from("favorites")
          .insert(insertData);
        
        if (error) throw error;
        return { action: "added" };
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ["favorites-products", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["favorites-services", user?.id] });
      
      if (result.action === "added") {
        toast.success("Ajouté aux favoris");
      } else {
        toast.success("Retiré des favoris");
      }
    },
    onError: () => {
      toast.error("Erreur lors de la mise à jour des favoris");
    },
  });

  const toggleFavorite = () => {
    if (!user) {
      toast.error("Connectez-vous pour ajouter aux favoris");
      return;
    }
    toggleMutation.mutate();
  };

  return {
    isFavorite,
    isLoading,
    toggleFavorite,
    isToggling: toggleMutation.isPending,
  };
};