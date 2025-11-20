import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type AppRole = "super_admin" | "admin" | "vendeur" | "livreur" | "membre" | "equipe";

export const useUserRoles = () => {
  const { user } = useAuth();

  const { data: roles, isLoading } = useQuery({
    queryKey: ["user-roles", user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .rpc("get_user_roles", { _user_id: user.id });
      
      if (error) throw error;
      return data as AppRole[];
    },
    enabled: !!user,
  });

  const hasRole = (role: AppRole) => roles?.includes(role) || false;

  const getCreatableRoles = (): AppRole[] => {
    if (hasRole("super_admin")) {
      return ["super_admin", "admin", "vendeur", "livreur", "membre", "equipe"];
    }
    
    if (hasRole("admin")) {
      return ["admin", "vendeur", "livreur", "membre", "equipe"];
    }
    
    if (hasRole("vendeur")) {
      return ["equipe"];
    }
    
    return [];
  };

  const canCreateUsers = () => {
    return hasRole("super_admin") || hasRole("admin") || hasRole("vendeur");
  };

  return {
    roles: roles || [],
    isLoading,
    hasRole,
    getCreatableRoles,
    canCreateUsers,
    isSuperAdmin: hasRole("super_admin"),
    isAdmin: hasRole("admin"),
    isVendeur: hasRole("vendeur"),
    isLivreur: hasRole("livreur"),
    isMembre: hasRole("membre"),
    isEquipe: hasRole("equipe"),
  };
};
