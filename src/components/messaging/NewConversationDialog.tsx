import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Search } from "lucide-react";
import { toast } from "sonner";

interface NewConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConversationCreated: (id: string) => void;
}

export function NewConversationDialog({
  open,
  onOpenChange,
  onConversationCreated,
}: NewConversationDialogProps) {
  const { user } = useAuth();
  const [search, setSearch] = useState("");

  const { data: users, isLoading } = useQuery({
    queryKey: ["users-for-chat", search],
    queryFn: async () => {
      let query = supabase
        .from("profiles")
        .select("id, nom_complet, photo_profil")
        .neq("id", user?.id || "")
        .limit(20);

      if (search) {
        query = query.ilike("nom_complet", `%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: open && !!user?.id,
  });

  const createConversation = useMutation({
    mutationFn: async (otherUserId: string) => {
      if (!user?.id) throw new Error("Not authenticated");

      // Check if conversation already exists
      const { data: existingParticipations } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", user.id);

      if (existingParticipations?.length) {
        const conversationIds = existingParticipations.map((p) => p.conversation_id);

        const { data: otherParticipations } = await supabase
          .from("conversation_participants")
          .select("conversation_id")
          .eq("user_id", otherUserId)
          .in("conversation_id", conversationIds);

        if (otherParticipations?.length) {
          // Conversation already exists
          return otherParticipations[0].conversation_id;
        }
      }

      // Create new conversation
      const { data: conv, error: convError } = await supabase
        .from("conversations")
        .insert({ created_by: user.id })
        .select("id")
        .single();

      if (convError) throw convError;

      // Add participants
      const { error: partError } = await supabase
        .from("conversation_participants")
        .insert([
          { conversation_id: conv.id, user_id: user.id },
          { conversation_id: conv.id, user_id: otherUserId },
        ]);

      if (partError) throw partError;

      return conv.id;
    },
    onSuccess: (conversationId) => {
      onConversationCreated(conversationId);
      onOpenChange(false);
      setSearch("");
    },
    onError: () => {
      toast.error("Erreur lors de la création de la conversation");
    },
  });

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nouvelle conversation</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un utilisateur..."
            className="pl-9"
          />
        </div>

        <ScrollArea className="h-[300px] mt-2">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : users?.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              Aucun utilisateur trouvé
            </div>
          ) : (
            <div className="space-y-1">
              {users?.map((u) => (
                <button
                  key={u.id}
                  onClick={() => createConversation.mutate(u.id)}
                  disabled={createConversation.isPending}
                  className="w-full p-3 flex items-center gap-3 hover:bg-muted rounded-lg transition-colors text-left"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={u.photo_profil || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {getInitials(u.nom_complet)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{u.nom_complet}</span>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
