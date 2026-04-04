import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Check, X, Trash2, Clock } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export function DeletionRequestsTab() {
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [action, setAction] = useState<"approve" | "reject" | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: requests, isLoading } = useQuery({
    queryKey: ["deletion-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("account_deletion_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch profiles for user_ids
      const userIds = (data || []).filter(r => r.user_id).map(r => r.user_id);
      let profiles: any[] = [];
      if (userIds.length > 0) {
        const { data: p } = await supabase
          .from("profiles")
          .select("id, nom_complet, contact, email")
          .in("id", userIds);
        profiles = p || [];
      }

      return (data || []).map(r => ({
        ...r,
        profile: profiles.find(p => p.id === r.user_id),
      }));
    },
  });

  const pendingCount = requests?.filter(r => r.status === "pending").length || 0;

  const handleApprove = async () => {
    if (!selectedRequest) return;
    setIsProcessing(true);
    try {
      if (selectedRequest.user_id) {
        const { error } = await supabase.functions.invoke("delete-user", {
          body: { userId: selectedRequest.user_id },
        });
        if (error) throw error;
      }

      await supabase
        .from("account_deletion_requests")
        .update({
          status: "completed",
          admin_note: adminNote || null,
          processed_at: new Date().toISOString(),
        } as any)
        .eq("id", selectedRequest.id);

      toast.success("Compte supprimé et demande traitée");
      queryClient.invalidateQueries({ queryKey: ["deletion-requests"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    } catch (err: any) {
      toast.error("Erreur: " + (err.message || "Impossible de supprimer"));
    } finally {
      setIsProcessing(false);
      setSelectedRequest(null);
      setAction(null);
      setAdminNote("");
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    setIsProcessing(true);
    try {
      await supabase
        .from("account_deletion_requests")
        .update({
          status: "rejected",
          admin_note: adminNote || null,
          processed_at: new Date().toISOString(),
        } as any)
        .eq("id", selectedRequest.id);

      toast.success("Demande rejetée");
      queryClient.invalidateQueries({ queryKey: ["deletion-requests"] });
    } catch (err: any) {
      toast.error("Erreur lors du rejet");
    } finally {
      setIsProcessing(false);
      setSelectedRequest(null);
      setAction(null);
      setAdminNote("");
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="text-amber-600 border-amber-300"><Clock className="h-3 w-3 mr-1" />En attente</Badge>;
      case "approved":
        return <Badge className="bg-blue-500">Approuvée</Badge>;
      case "completed":
        return <Badge className="bg-green-600">Terminée</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejetée</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)}
      </div>
    );
  }

  if (!requests || requests.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Aucune demande de suppression</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {requests.map((req) => (
          <div key={req.id} className="border rounded-lg p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium text-foreground truncate">
                  {req.profile?.nom_complet || req.contact_info || "Utilisateur inconnu"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {req.profile?.contact || req.profile?.email || req.contact_info || "—"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(req.created_at), "dd MMM yyyy à HH:mm", { locale: fr })}
                </p>
              </div>
              {statusBadge(req.status)}
            </div>

            {req.reason && (
              <p className="text-sm text-muted-foreground bg-muted rounded p-2">
                <strong>Raison :</strong> {req.reason}
              </p>
            )}

            {req.admin_note && (
              <p className="text-sm text-muted-foreground bg-muted rounded p-2">
                <strong>Note admin :</strong> {req.admin_note}
              </p>
            )}

            {req.status === "pending" && (
              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => { setSelectedRequest(req); setAction("approve"); }}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Supprimer le compte
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { setSelectedRequest(req); setAction("reject"); }}
                >
                  <X className="h-3 w-3 mr-1" />
                  Rejeter
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      <AlertDialog open={!!action} onOpenChange={() => { setAction(null); setSelectedRequest(null); setAdminNote(""); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {action === "approve" ? "Confirmer la suppression du compte" : "Rejeter la demande"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {action === "approve"
                ? "Cette action supprimera définitivement le compte utilisateur et toutes ses données. Cette action est irréversible."
                : "La demande sera marquée comme rejetée. L'utilisateur conservera son compte."
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Textarea
              placeholder="Note admin (optionnel)"
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              rows={2}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={action === "approve" ? handleApprove : handleReject}
              disabled={isProcessing}
              className={action === "approve" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
            >
              {isProcessing ? "Traitement..." : action === "approve" ? "Supprimer définitivement" : "Rejeter"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function useDeletionRequestsCount() {
  const { data } = useQuery({
    queryKey: ["deletion-requests-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("account_deletion_requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");
      if (error) return 0;
      return count || 0;
    },
  });
  return data || 0;
}
