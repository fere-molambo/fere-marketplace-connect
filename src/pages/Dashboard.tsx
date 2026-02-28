import { useUserRoles } from "@/hooks/useUserRoles";
import { AdminDashboard } from "@/components/dashboard/AdminDashboard";
import { VendorDashboard } from "@/components/dashboard/VendorDashboard";
import { StatCard } from "@/components/dashboard/StatCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Users } from "lucide-react";

export default function Dashboard() {
  const { isSuperAdmin, isAdmin, isVendeur, isLoading } = useUserRoles();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28" />)}
        </div>
      </div>
    );
  }

  if (isSuperAdmin || isAdmin) {
    return <AdminDashboard />;
  }

  if (isVendeur) {
    return <VendorDashboard />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-sm text-muted-foreground">Bienvenue sur votre espace Fere</p>
      </div>
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard title="Mon espace" value="Actif" icon={Users} />
      </div>
    </div>
  );
}
