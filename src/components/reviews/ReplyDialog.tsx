import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface ReplyDialogProps {
  reviewId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReplyAdded: () => void;
}

export const ReplyDialog = ({
  reviewId,
  open,
  onOpenChange,
  onReplyAdded,
}: ReplyDialogProps) => {
  const { user } = useAuth();
  const [reply, setReply] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user) {
      toast.error("Vous devez être connecté pour répondre");
      return;
    }

    if (!reply.trim()) {
      toast.error("Veuillez entrer une réponse");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("review_replies").insert({
        review_id: reviewId,
        user_id: user.id,
        reply: reply.trim(),
      });

      if (error) throw error;

      toast.success("Réponse ajoutée");
      onOpenChange(false);
      setReply("");
      onReplyAdded();
    } catch (error) {
      console.error("Error adding reply:", error);
      toast.error("Erreur lors de l'ajout de la réponse");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Répondre à l'avis</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reply">Votre réponse</Label>
            <Textarea
              id="reply"
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Écrivez votre réponse..."
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting || !reply.trim()}>
              {isSubmitting ? "Envoi..." : "Répondre"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};