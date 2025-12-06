import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRoles } from "@/hooks/useUserRoles";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface BlockUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId?: string;
  userName?: string;
}

export function BlockUserDialog({
  open,
  onOpenChange,
  userId,
  userName,
}: BlockUserDialogProps) {
  const { user } = useAuth();
  const { roles } = useUserRoles();
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");

  const isAdmin = roles.includes("super_admin") || roles.includes("admin");

  const blockUser = useMutation({
    mutationFn: async () => {
      if (!user?.id || !userId) throw new Error("Missing data");

      const { error } = await supabase.from("blocked_users").insert({
        blocker_id: user.id,
        blocked_id: userId,
        blocked_by_admin: isAdmin,
        reason: reason.trim() || null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      toast.success(`${userName || "Utilisateur"} a été bloqué`);
      onOpenChange(false);
      setReason("");
    },
    onError: () => {
      toast.error("Erreur lors du blocage");
    },
  });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Bloquer {userName || "cet utilisateur"} ?</AlertDialogTitle>
          <AlertDialogDescription>
            Vous ne pourrez plus recevoir ni envoyer de messages à cette personne.
            {isAdmin && " En tant qu'administrateur, ce blocage sera visible par les autres admins."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {isAdmin && (
          <div className="space-y-2">
            <Label htmlFor="reason">Raison (optionnel)</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Raison du blocage..."
              rows={2}
            />
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => blockUser.mutate()}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Bloquer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
