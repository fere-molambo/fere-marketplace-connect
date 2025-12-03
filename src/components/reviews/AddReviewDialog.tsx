import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { StarRating } from "./StarRating";
import { Plus } from "lucide-react";

interface AddReviewDialogProps {
  shopId: string;
  onReviewAdded: () => void;
  hasExistingReview: boolean;
}

export const AddReviewDialog = ({
  shopId,
  onReviewAdded,
  hasExistingReview,
}: AddReviewDialogProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user) {
      toast.error("Vous devez être connecté pour laisser un avis");
      return;
    }

    if (rating === 0) {
      toast.error("Veuillez sélectionner une note");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("shop_reviews").insert({
        shop_id: shopId,
        user_id: user.id,
        rating,
        comment: comment.trim() || null,
      });

      if (error) {
        if (error.code === "23505") {
          toast.error("Vous avez déjà laissé un avis pour cette boutique");
        } else {
          throw error;
        }
        return;
      }

      toast.success("Avis ajouté avec succès");
      setOpen(false);
      setRating(0);
      setComment("");
      onReviewAdded();
    } catch (error) {
      console.error("Error adding review:", error);
      toast.error("Erreur lors de l'ajout de l'avis");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (hasExistingReview) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Ajouter un avis</span>
          <span className="sm:hidden">Avis</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Laisser un avis</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Votre note *</Label>
            <StarRating rating={rating} onRatingChange={setRating} size="lg" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="comment">Commentaire (optionnel)</Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Partagez votre expérience..."
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting || rating === 0}>
              {isSubmitting ? "Envoi..." : "Publier"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};