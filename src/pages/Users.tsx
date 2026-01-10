import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserRoles } from "@/hooks/useUserRoles";
import { CreateUserDialog } from "@/components/users/CreateUserDialog";
import { UserTable } from "@/components/users/UserTable";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Users() {
  const [searchQuery, setSearchQuery] = useState("");
  const { canCreateUsers } = useUserRoles();
  const queryClient = useQueryClient();

  const { data: users, isLoading, error, refetch } = useQuery({
    queryKey: ["users", searchQuery],
    queryFn: async () => {
      // Fetch all profiles with search filter
      let profilesQuery = supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (searchQuery) {
        profilesQuery = profilesQuery.or(
          `nom_complet.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,contact.ilike.%${searchQuery}%`
        );
      }

      // Fetch user roles (filtered by RLS based on current user's role)
      const rolesQuery = supabase
        .from("user_roles")
        .select("user_id, role");

      const [
        { data: profiles, error: profilesError },
        { data: roles, error: rolesError }
      ] = await Promise.all([profilesQuery, rolesQuery]);

      if (profilesError) throw profilesError;
      if (rolesError) throw rolesError;

      // Combine profiles with their roles on client side
      const usersWithRoles = (profiles || []).map((profile) => ({
        ...profile,
        roles: (roles || [])
          .filter((r) => r.user_id === profile.id)
          .map((r) => ({ role: r.role })),
      }));

      return usersWithRoles;
    },
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["users"] });
    refetch();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Utilisateurs</h2>
          <p className="text-muted-foreground">
            Gérez tous les utilisateurs de la plateforme
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh} size="icon">
            <RefreshCw className="h-4 w-4" />
          </Button>
          {canCreateUsers() && (
            <CreateUserDialog onUserCreated={refetch} />
          )}
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher par nom, email ou contact..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {error ? (
        <div className="text-center py-12">
          <p className="text-destructive font-semibold mb-2">
            Erreur lors du chargement des utilisateurs
          </p>
          <p className="text-muted-foreground text-sm">
            Vérifiez la console pour plus de détails
          </p>
        </div>
      ) : isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : users && users.length > 0 ? (
        <UserTable users={users} onUserUpdated={refetch} />
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Aucun utilisateur trouvé</p>
        </div>
      )}
    </div>
  );
}
