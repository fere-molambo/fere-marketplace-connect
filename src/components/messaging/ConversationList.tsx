import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConversationListProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function ConversationList({ selectedId, onSelect }: ConversationListProps) {
  const { user } = useAuth();

  const { data: conversations, isLoading } = useQuery({
    queryKey: ["conversations", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get conversations where user is participant
      const { data: participations, error: partError } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", user.id);

      if (partError) throw partError;
      if (!participations?.length) return [];

      const conversationIds = participations.map((p) => p.conversation_id);

      // Get conversation details with last message
      const { data: convs, error: convError } = await supabase
        .from("conversations")
        .select("*")
        .in("id", conversationIds)
        .order("last_message_at", { ascending: false });

      if (convError) throw convError;

      // For each conversation, get the other participant and last message
      const enrichedConversations = await Promise.all(
        convs.map(async (conv) => {
          // Get other participant
          const { data: participants } = await supabase
            .from("conversation_participants")
            .select("user_id, profiles(id, nom_complet, photo_profil)")
            .eq("conversation_id", conv.id)
            .neq("user_id", user.id);

          const otherUser = participants?.[0]?.profiles as any;

          // Get last message
          const { data: lastMessages } = await supabase
            .from("messages")
            .select("content, media_type, created_at, sender_id, status")
            .eq("conversation_id", conv.id)
            .order("created_at", { ascending: false })
            .limit(1);

          const lastMessage = lastMessages?.[0];

          // Count unread messages
          const { count: unreadCount } = await supabase
            .from("messages")
            .select("id", { count: "exact", head: true })
            .eq("conversation_id", conv.id)
            .neq("sender_id", user.id)
            .neq("status", "read");

          return {
            ...conv,
            otherUser,
            lastMessage,
            unreadCount: unreadCount || 0,
          };
        })
      );

      return enrichedConversations;
    },
    enabled: !!user?.id,
    refetchInterval: 10000,
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

  const getMessagePreview = (message: any) => {
    if (!message) return "Aucun message";
    if (message.media_type === "image") return "📷 Image";
    if (message.media_type === "audio") return "🎤 Note vocale";
    return message.content?.slice(0, 40) + (message.content?.length > 40 ? "..." : "") || "";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!conversations?.length) {
    return (
      <div className="flex items-center justify-center h-full text-center p-4">
        <p className="text-muted-foreground text-sm">
          Aucune conversation.<br />
          Démarrez une nouvelle discussion !
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="divide-y">
        {conversations.map((conv) => (
          <button
            key={conv.id}
            onClick={() => onSelect(conv.id)}
            className={cn(
              "w-full p-3 flex items-start gap-3 hover:bg-muted/50 transition-colors text-left",
              selectedId === conv.id && "bg-muted"
            )}
          >
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarImage src={conv.otherUser?.photo_profil || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                {getInitials(conv.otherUser?.nom_complet)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="font-medium truncate text-sm">
                  {conv.otherUser?.nom_complet || "Utilisateur"}
                </p>
                {conv.lastMessage && (
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatDistanceToNow(new Date(conv.lastMessage.created_at), {
                      addSuffix: false,
                      locale: fr,
                    })}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground truncate">
                  {getMessagePreview(conv.lastMessage)}
                </p>
                {conv.unreadCount > 0 && (
                  <span className="ml-2 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center shrink-0">
                    {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                  </span>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </ScrollArea>
  );
}
