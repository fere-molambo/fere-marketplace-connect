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
      console.log("🔍 Fetching users...");
      
      let query = supabase
        .from("profiles")
        .select(`
          *,
          roles:user_roles(role)
        `)
        .order("created_at", { ascending: false });

      if (searchQuery) {
        query = query.or(
          `nom_complet.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,contact.ilike.%${searchQuery}%`
        );
      }

      const { data, error } = await query;
      
      console.log("📊 Query result:", { data, error });
      console.log("👥 Users count:", data?.length);
      console.log("🎭 First user roles:", data?.[0]?.roles);
      
      if (error) throw error;

      return data || [];
    },
  });

  useEffect(() => {
    if (error) {
      console.error("❌ Query error:", error);
    }
  }, [error]);

  const handleRefresh = () => {
    console.log("🔄 Manual refresh triggered");
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

      {isLoading ? (
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
