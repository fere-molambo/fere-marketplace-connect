import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRoles } from "@/hooks/useUserRoles";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageBubble } from "./MessageBubble";
import { MessageInput } from "./MessageInput";
import { BlockUserDialog } from "./BlockUserDialog";
import { ExportConversationDialog } from "./ExportConversationDialog";
import { Loader2, MoreVertical, Ban, Download, Trash2, CheckSquare, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface ChatWindowProps {
  conversationId: string;
}

export function ChatWindow({ conversationId }: ChatWindowProps) {
  const { user } = useAuth();
  const { roles } = useUserRoles();
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());

  const isAdmin = roles.includes("super_admin") || roles.includes("admin");

  // Get conversation details and other participant
  const { data: conversationData, isLoading: loadingConversation } = useQuery({
    queryKey: ["conversation", conversationId],
    queryFn: async () => {
      const { data: participants } = await supabase
        .from("conversation_participants")
        .select("user_id, profiles(id, nom_complet, photo_profil)")
        .eq("conversation_id", conversationId)
        .neq("user_id", user?.id || "");

      const otherUser = participants?.[0]?.profiles as any;
      return { otherUser };
    },
    enabled: !!conversationId && !!user?.id,
  });

  // Get messages
  const { data: messages, isLoading: loadingMessages } = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!conversationId,
    refetchInterval: 3000,
  });

  // Subscribe to realtime messages
  useEffect(() => {
    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
          queryClient.invalidateQueries({ queryKey: ["conversations", user?.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient, user?.id]);

  // Mark messages as read
  useEffect(() => {
    if (!messages || !user?.id) return;

    const unreadMessages = messages.filter(
      (m) => m.sender_id !== user.id && m.status !== "read"
    );

    if (unreadMessages.length > 0) {
      supabase
        .from("messages")
        .update({ status: "read", read_at: new Date().toISOString() })
        .in(
          "id",
          unreadMessages.map((m) => m.id)
        )
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
          queryClient.invalidateQueries({ queryKey: ["conversations", user?.id] });
        });
    }
  }, [messages, user?.id, conversationId, queryClient]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async ({
      content,
      mediaUrl,
      mediaType,
    }: {
      content?: string;
      mediaUrl?: string;
      mediaType: "text" | "image" | "audio";
    }) => {
      const { error } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: user?.id,
        content,
        media_url: mediaUrl,
        media_type: mediaType,
        status: "sent",
      });

      if (error) throw error;

      // Update conversation last_message_at
      await supabase
        .from("conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", conversationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations", user?.id] });
    },
    onError: () => {
      toast.error("Erreur lors de l'envoi du message");
    },
  });

  // Retry failed message
  const retryMessage = useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase
        .from("messages")
        .update({ status: "sent", retry_count: 0 })
        .eq("id", messageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
    },
  });

  // Delete message
  const deleteMessage = useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase.from("messages").delete().eq("id", messageId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      toast.success("Message supprimé");
    },
  });

  // Delete selected messages
  const deleteSelectedMessages = useMutation({
    mutationFn: async () => {
      // Only delete own messages
      const ownMessages = messages?.filter(
        m => selectedMessages.has(m.id) && m.sender_id === user?.id
      ).map(m => m.id) || [];

      if (ownMessages.length === 0) {
        throw new Error("Aucun message à supprimer");
      }

      const { error } = await supabase
        .from("messages")
        .delete()
        .in("id", ownMessages);
      if (error) throw error;
      
      return ownMessages.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      setSelectedMessages(new Set());
      setSelectionMode(false);
      toast.success(`${count} message(s) supprimé(s)`);
    },
    onError: () => {
      toast.error("Erreur lors de la suppression");
    },
  });

  const toggleMessageSelection = (messageId: string) => {
    setSelectedMessages(prev => {
      const next = new Set(prev);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return next;
    });
  };

  const cancelSelection = () => {
    setSelectionMode(false);
    setSelectedMessages(new Set());
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (loadingConversation || loadingMessages) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const otherUser = conversationData?.otherUser;

  // Count only own messages in selection (for display)
  const ownSelectedCount = messages?.filter(
    m => selectedMessages.has(m.id) && m.sender_id === user?.id
  ).length || 0;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-3 border-b flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={otherUser?.photo_profil || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary text-sm">
              {getInitials(otherUser?.nom_complet)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-sm">{otherUser?.nom_complet || "Utilisateur"}</p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setSelectionMode(true)}>
              <CheckSquare className="h-4 w-4 mr-2" />
              Sélectionner
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setShowBlockDialog(true)}>
              <Ban className="h-4 w-4 mr-2" />
              Bloquer
            </DropdownMenuItem>
            {isAdmin && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowExportDialog(true)}>
                  <Download className="h-4 w-4 mr-2" />
                  Exporter
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Selection bar */}
      {selectionMode && (
        <div className="p-3 bg-muted border-b flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={cancelSelection}>
              <X className="h-4 w-4 mr-1" />
              Annuler
            </Button>
            <span className="text-sm font-medium">
              {ownSelectedCount} sélectionné(s)
            </span>
          </div>
          <Button 
            variant="destructive" 
            size="sm"
            disabled={ownSelectedCount === 0 || deleteSelectedMessages.isPending}
            onClick={() => deleteSelectedMessages.mutate()}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Supprimer
          </Button>
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-2">
          {messages?.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              isOwn={message.sender_id === user?.id}
              onRetry={() => retryMessage.mutate(message.id)}
              onDelete={() => deleteMessage.mutate(message.id)}
              selectionMode={selectionMode}
              isSelected={selectedMessages.has(message.id)}
              onToggleSelect={() => toggleMessageSelection(message.id)}
            />
          ))}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-3 border-t shrink-0">
        <MessageInput
          onSend={(content, mediaUrl, mediaType) =>
            sendMessage.mutate({ content, mediaUrl, mediaType })
          }
          conversationId={conversationId}
          disabled={sendMessage.isPending}
        />
      </div>

      {/* Dialogs */}
      <BlockUserDialog
        open={showBlockDialog}
        onOpenChange={setShowBlockDialog}
        userId={otherUser?.id}
        userName={otherUser?.nom_complet}
      />
      {isAdmin && (
        <ExportConversationDialog
          open={showExportDialog}
          onOpenChange={setShowExportDialog}
          conversationId={conversationId}
        />
      )}
    </div>
  );
}
