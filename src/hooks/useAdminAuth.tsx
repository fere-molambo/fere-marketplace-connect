import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./useAuth";
import { useUserRoles } from "./useUserRoles";

export const useAdminAuth = () => {
  const { user, loading: authLoading } = useAuth();
  const { roles, isLoading: rolesLoading } = useUserRoles();
  const navigate = useNavigate();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (authLoading || rolesLoading) return;

    if (!user) {
      navigate("/auth");
      return;
    }

    const hasAdminRole = 
      roles?.includes("super_admin") || 
      roles?.includes("admin") ||
      roles?.includes("vendeur") ||
      roles?.includes("equipe");

    if (hasAdminRole) {
      setIsAuthorized(true);
    } else {
      navigate("/");
    }
  }, [user, roles, authLoading, rolesLoading, navigate]);

  return {
    isAuthorized,
    loading: authLoading || rolesLoading,
  };
};
