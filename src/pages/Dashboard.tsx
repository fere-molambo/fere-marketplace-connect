import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StatCard } from "@/components/dashboard/StatCard";
import { Users, ShoppingBag, Truck, UserCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [usersCount, vendeursCount, livreursCount, membresCount] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "vendeur"),
        supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "livreur"),
        supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "membre"),
      ]);

      return {
        totalUsers: usersCount.count || 0,
        vendeurs: vendeursCount.count || 0,
        livreurs: livreursCount.count || 0,
        membres: membresCount.count || 0,
      };
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Vue d'ensemble de votre plateforme Fere
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Vue d'ensemble de votre plateforme Fere
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total utilisateurs"
          value={stats?.totalUsers || 0}
          icon={Users}
        />
        <StatCard
          title="Vendeurs actifs"
          value={stats?.vendeurs || 0}
          icon={ShoppingBag}
        />
        <StatCard
          title="Livreurs actifs"
          value={stats?.livreurs || 0}
          icon={Truck}
        />
        <StatCard
          title="Membres inscrits"
          value={stats?.membres || 0}
          icon={UserCheck}
        />
      </div>
    </div>
  );
}
