import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  is_published: boolean;
}

interface CreateFaqDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  faq: FaqItem | null;
}

export function CreateFaqDialog({ open, onOpenChange, faq }: CreateFaqDialogProps) {
  const queryClient = useQueryClient();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [category, setCategory] = useState("");

  useEffect(() => {
    if (faq) {
      setQuestion(faq.question);
      setAnswer(faq.answer);
      setCategory(faq.category || "");
    } else {
      setQuestion("");
      setAnswer("");
      setCategory("");
    }
  }, [faq, open]);

  const mutation = useMutation({
    mutationFn: async () => {
      const data = {
        question,
        answer,
        category: category || null,
        is_published: faq?.is_published ?? true,
      };

      if (faq) {
        const { error } = await supabase
          .from("faq_items")
          .update(data)
          .eq("id", faq.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("faq_items").insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["faq-admin"] });
      queryClient.invalidateQueries({ queryKey: ["faq-public"] });
      toast.success(faq ? "Question modifiée" : "Question créée");
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Erreur lors de l'enregistrement");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {faq ? "Modifier" : "Ajouter"} une question FAQ
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Question */}
          <div className="space-y-2">
            <Label htmlFor="question">Question *</Label>
            <Input
              id="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Comment puis-je...?"
            />
          </div>

          {/* Answer */}
          <div className="space-y-2">
            <Label htmlFor="answer">Réponse *</Label>
            <Textarea
              id="answer"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Voici comment..."
              rows={4}
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Catégorie</Label>
            <Input
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="ex: Compte, Paiement, Livraison..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button
              onClick={() => mutation.mutate()}
              disabled={!question || !answer || mutation.isPending}
            >
              {mutation.isPending ? "Enregistrement..." : faq ? "Modifier" : "Créer"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
