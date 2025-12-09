import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRoles } from "@/hooks/useUserRoles";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MessageCircle, MessageSquare, Phone } from "lucide-react";
import { toast } from "sonner";

interface ContactVendorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendorId: string;
  vendorName: string;
  shopId: string;
  supportPhone?: string | null;
}

export function ContactVendorDialog({
  open,
  onOpenChange,
  vendorId,
  vendorName,
  shopId,
  supportPhone,
}: ContactVendorDialogProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { roles } = useUserRoles();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);

  const hasDashboardAccess = roles?.some(r => 
    ["super_admin", "admin", "vendeur", "equipe"].includes(r)
  );

  const createConversation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Non connecté");

      // Check if conversation already exists
      const { data: existingParticipants } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", user.id);

      if (existingParticipants && existingParticipants.length > 0) {
        for (const p of existingParticipants) {
          const { data: otherParticipant } = await supabase
            .from("conversation_participants")
            .select("user_id")
            .eq("conversation_id", p.conversation_id)
            .eq("user_id", vendorId)
            .single();
          
          if (otherParticipant) {
            return p.conversation_id;
          }
        }
      }

      // Create new conversation
      const { data: conversation, error: convError } = await supabase
        .from("conversations")
        .insert({ created_by: user.id })
        .select()
        .single();

      if (convError) throw convError;

      // Add participants
      const { error: partError } = await supabase
        .from("conversation_participants")
        .insert([
          { conversation_id: conversation.id, user_id: user.id },
          { conversation_id: conversation.id, user_id: vendorId },
        ]);

      if (partError) throw partError;

      return conversation.id;
    },
    onSuccess: (conversationId) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      onOpenChange(false);
      const messagesPath = hasDashboardAccess ? "/dashboard/messages" : "/messages";
      navigate(`${messagesPath}?conversation=${conversationId}`);
    },
    onError: () => {
      toast.error("Erreur lors de la création de la conversation");
    },
  });

  const handleFereMessage = async () => {
    if (!user) {
      toast.info("Connectez-vous pour envoyer un message");
      navigate("/auth");
      onOpenChange(false);
      return;
    }

    setIsCreating(true);
    await createConversation.mutateAsync();
    setIsCreating(false);
  };

  const handleWhatsApp = () => {
    if (!supportPhone) {
      toast.error("Numéro WhatsApp non disponible");
      return;
    }
    const cleanPhone = supportPhone.replace(/\s+/g, "").replace(/^0/, "");
    const whatsappUrl = `https://wa.me/${cleanPhone}`;
    window.open(whatsappUrl, "_blank");
    onOpenChange(false);
  };

  const handleSMS = () => {
    if (!supportPhone) {
      toast.error("Numéro non disponible");
      return;
    }
    window.location.href = `sms:${supportPhone}`;
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Contacter {vendorName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 pt-4">
          {/* Fere Messages */}
          <Button
            variant="outline"
            className="w-full justify-start h-auto py-4"
            onClick={handleFereMessage}
            disabled={isCreating}
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
              <div className="text-left">
                <p className="font-medium">Via Fere Messages</p>
                <p className="text-xs text-muted-foreground">
                  Gratuit • Sécurisé • Historique conservé
                </p>
              </div>
            </div>
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">ou</span>
            </div>
          </div>

          {/* WhatsApp */}
          {supportPhone && (
            <Button
              variant="outline"
              className="w-full justify-start h-auto py-4"
              onClick={handleWhatsApp}
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="h-5 w-5 text-green-600" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                </div>
                <div className="text-left">
                  <p className="font-medium">Via WhatsApp</p>
                  <p className="text-xs text-muted-foreground">
                    Ouvre l'application WhatsApp
                  </p>
                </div>
              </div>
            </Button>
          )}

          {/* SMS */}
          {supportPhone && (
            <Button
              variant="outline"
              className="w-full justify-start h-auto py-4"
              onClick={handleSMS}
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <Phone className="h-5 w-5 text-blue-600" />
                </div>
                <div className="text-left">
                  <p className="font-medium">Via SMS</p>
                  <p className="text-xs text-muted-foreground">
                    Envoyer un SMS au vendeur
                  </p>
                </div>
              </div>
            </Button>
          )}

          {!supportPhone && (
            <p className="text-sm text-muted-foreground text-center py-2">
              Le vendeur n'a pas configuré de numéro de contact externe
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}