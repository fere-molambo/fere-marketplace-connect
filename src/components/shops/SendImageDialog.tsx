import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Search, Send, User } from "lucide-react";
import { toast } from "sonner";

interface SendImageDialogProps {
  imageUrl: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Profile {
  id: string;
  nom_complet: string;
  photo_profil: string | null;
  email: string | null;
}

export const SendImageDialog = ({ imageUrl, open, onOpenChange }: SendImageDialogProps) => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);

  // Search users
  const { data: users = [], isLoading: isSearching } = useQuery({
    queryKey: ["search-users-for-message", searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim() || searchQuery.length < 2) return [];

      const { data, error } = await supabase
        .from("profiles")
        .select("id, nom_complet, photo_profil, email")
        .neq("id", user?.id)
        .or(`nom_complet.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
        .limit(10);

      if (error) throw error;
      return data as Profile[];
    },
    enabled: searchQuery.length >= 2 && open,
  });

  // Send message mutation
  const sendMutation = useMutation({
    mutationFn: async (recipientId: string) => {
      if (!user) throw new Error("Non authentifié");

      // Check for existing conversation
      const { data: existingParticipations } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", user.id);

      let conversationId: string | null = null;

      if (existingParticipations && existingParticipations.length > 0) {
        // Check if any of these conversations include the recipient
        for (const participation of existingParticipations) {
          const { data: recipientParticipation } = await supabase
            .from("conversation_participants")
            .select("id")
            .eq("conversation_id", participation.conversation_id)
            .eq("user_id", recipientId)
            .single();

          if (recipientParticipation) {
            // Check if this is a 2-person conversation
            const { count } = await supabase
              .from("conversation_participants")
              .select("*", { count: "exact", head: true })
              .eq("conversation_id", participation.conversation_id);

            if (count === 2) {
              conversationId = participation.conversation_id;
              break;
            }
          }
        }
      }

      // Create new conversation if none exists
      if (!conversationId) {
        const { data: newConversation, error: convError } = await supabase
          .from("conversations")
          .insert({ created_by: user.id })
          .select()
          .single();

        if (convError) throw convError;
        conversationId = newConversation.id;

        // Add participants
        const { error: participantsError } = await supabase
          .from("conversation_participants")
          .insert([
            { conversation_id: conversationId, user_id: user.id },
            { conversation_id: conversationId, user_id: recipientId },
          ]);

        if (participantsError) throw participantsError;
      }

      // Send the image message
      const { error: messageError } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: user.id,
        media_url: imageUrl,
        media_type: "image",
        status: "sent",
      });

      if (messageError) throw messageError;

      // Update conversation last_message_at
      await supabase
        .from("conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", conversationId);

      return conversationId;
    },
    onSuccess: () => {
      toast.success("Image envoyée avec succès !");
      onOpenChange(false);
      setSearchQuery("");
      setSelectedUser(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erreur lors de l'envoi");
    },
  });

  const handleSend = () => {
    if (selectedUser) {
      sendMutation.mutate(selectedUser.id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Envoyer l'image</DialogTitle>
          <DialogDescription>
            Sélectionnez un destinataire pour envoyer cette image
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Image Preview */}
          <div className="rounded-lg border overflow-hidden">
            <img src={imageUrl} alt="Image à envoyer" className="w-full h-32 object-cover" />
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un utilisateur..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedUser(null);
              }}
              className="pl-9"
            />
          </div>

          {/* Selected User */}
          {selectedUser && (
            <div className="flex items-center gap-3 p-3 rounded-lg border bg-primary/5 border-primary/20">
              <Avatar className="h-10 w-10">
                <AvatarImage src={selectedUser.photo_profil || undefined} />
                <AvatarFallback>
                  <User className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{selectedUser.nom_complet}</p>
                <p className="text-sm text-muted-foreground truncate">{selectedUser.email}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedUser(null)}
              >
                Changer
              </Button>
            </div>
          )}

          {/* Search Results */}
          {!selectedUser && searchQuery.length >= 2 && (
            <ScrollArea className="h-[200px]">
              {isSearching ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Aucun utilisateur trouvé
                </div>
              ) : (
                <div className="space-y-1">
                  {users.map((profile) => (
                    <button
                      key={profile.id}
                      onClick={() => setSelectedUser(profile)}
                      className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors text-left"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={profile.photo_profil || undefined} />
                        <AvatarFallback>
                          <User className="h-5 w-5" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{profile.nom_complet}</p>
                        <p className="text-sm text-muted-foreground truncate">{profile.email}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          )}

          {/* Send Button */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleSend}
              disabled={!selectedUser || sendMutation.isPending}
            >
              {sendMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Envoyer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
