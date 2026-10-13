import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Bike, Check, Ban, X, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type DriverStatus = "pending" | "approved" | "rejected" | "suspended";

const STATUS_LABEL: Record<DriverStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "En attente", variant: "secondary" },
  approved: { label: "Validé", variant: "default" },
  rejected: { label: "Refusé", variant: "destructive" },
  suspended: { label: "Suspendu", variant: "destructive" },
};

/** Nombre de livreurs en attente, pour la pastille de l'onglet. */
export function usePendingDriversCount() {
  const { data = 0 } = useQuery({
    queryKey: ["pending-drivers-count"],
    queryFn: async () => {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "livreur");

      const ids = (roles || []).map((r: any) => r.user_id);
      if (ids.length === 0) return 0;

      // types.ts est genere et ne connait pas encore driver_status.
      const { count } = await (supabase as any)
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .in("id", ids)
        .eq("driver_status", "pending");

      return count || 0;
    },
  });
  return data;
}

export function DriversTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [reason, setReason] = useState("");

  const { data: drivers = [], isLoading } = useQuery({
    queryKey: ["drivers-validation"],
    queryFn: async () => {
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "livreur");
      if (rolesError) throw rolesError;

      const ids = (roles || []).map((r: any) => r.user_id);
      if (ids.length === 0) return [];

      const { data, error } = await (supabase as any)
        .from("profiles")
        .select(
          "id, nom_complet, contact, email, vehicle_type, vehicle_plate, created_at, driver_status, driver_status_reason, driver_status_changed_at",
        )
        .in("id", ids)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const changeStatus = async (driverId: string, status: DriverStatus, motif?: string) => {
    const { error } = await (supabase as any).rpc("set_driver_status", {
      p_driver_id: driverId,
      p_status: status,
      p_reason: motif || null,
    });

    if (error) {
      toast.error(error.message || "Impossible de modifier le statut");
      return;
    }

    toast.success(
      status === "approved"
        ? "Livreur validé, il peut recevoir des courses"
        : status === "suspended"
          ? "Livreur suspendu, il ne recevra plus de courses"
          : "Statut mis à jour",
    );
    setReason("");
    queryClient.invalidateQueries({ queryKey: ["drivers-validation"] });
    queryClient.invalidateQueries({ queryKey: ["pending-drivers-count"] });
  };

  const filtered = drivers.filter((d: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      d.nom_complet?.toLowerCase().includes(q) ||
      d.contact?.toLowerCase().includes(q) ||
      d.email?.toLowerCase().includes(q)
    );
  });

  const pending = filtered.filter((d: any) => d.driver_status === "pending");
  const others = filtered.filter((d: any) => d.driver_status !== "pending");
  const ordered = [...pending, ...others];

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bike className="h-5 w-5" />
          Livreurs
        </CardTitle>
        <CardDescription>
          Un livreur ne reçoit aucune course tant que son compte n'est pas validé. Les livreurs
          suspendus gardent l'accès à leurs courses en cours.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher un livreur..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {ordered.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Aucun livreur.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Livreur</TableHead>
                  <TableHead>Véhicule</TableHead>
                  <TableHead>Inscrit le</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ordered.map((d: any) => {
                  const status = (d.driver_status || "pending") as DriverStatus;
                  const badge = STATUS_LABEL[status] ?? STATUS_LABEL.pending;

                  return (
                    <TableRow key={d.id}>
                      <TableCell>
                        <p className="font-medium">{d.nom_complet || "—"}</p>
                        <p className="text-sm text-muted-foreground">{d.contact}</p>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {d.vehicle_type || "—"}
                        {d.vehicle_plate ? ` · ${d.vehicle_plate}` : ""}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {d.created_at ? format(new Date(d.created_at), "dd MMM yyyy", { locale: fr }) : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                        {d.driver_status_reason && (
                          <p className="mt-1 text-xs italic text-muted-foreground">
                            {d.driver_status_reason}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          {status !== "approved" && (
                            <Button size="sm" onClick={() => changeStatus(d.id, "approved")}>
                              <Check className="mr-1 h-3.5 w-3.5" />
                              Valider
                            </Button>
                          )}

                          {status === "pending" && (
                            <RefusalDialog
                              title="Refuser ce livreur ?"
                              description="Il ne pourra recevoir aucune course. Vous pouvez indiquer un motif, qui lui sera affiché dans l'application."
                              reason={reason}
                              onReasonChange={setReason}
                              onConfirm={() => changeStatus(d.id, "rejected", reason)}
                              trigger={
                                <Button size="sm" variant="outline">
                                  <X className="mr-1 h-3.5 w-3.5" />
                                  Refuser
                                </Button>
                              }
                            />
                          )}

                          {status === "approved" && (
                            <RefusalDialog
                              title="Suspendre ce livreur ?"
                              description="Il ne recevra plus de nouvelles courses. Celles déjà acceptées restent accessibles pour qu'aucune livraison ne reste en plan."
                              reason={reason}
                              onReasonChange={setReason}
                              onConfirm={() => changeStatus(d.id, "suspended", reason)}
                              trigger={
                                <Button size="sm" variant="outline">
                                  <Ban className="mr-1 h-3.5 w-3.5" />
                                  Suspendre
                                </Button>
                              }
                            />
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RefusalDialog({
  title,
  description,
  reason,
  onReasonChange,
  onConfirm,
  trigger,
}: {
  title: string;
  description: string;
  reason: string;
  onReasonChange: (v: string) => void;
  onConfirm: () => void;
  trigger: React.ReactNode;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        <Input
          placeholder="Motif (facultatif)"
          value={reason}
          onChange={(e) => onReasonChange(e.target.value)}
        />

        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Confirmer</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
