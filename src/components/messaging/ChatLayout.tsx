import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { ConversationList } from "./ConversationList";
import { ChatWindow } from "./ChatWindow";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageSquarePlus } from "lucide-react";
import { NewConversationDialog } from "./NewConversationDialog";

export function ChatLayout() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [showNewConversation, setShowNewConversation] = useState(false);

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Veuillez vous connecter pour accéder aux messages.</p>
      </div>
    );
  }

  // Mobile: show either list or chat window
  if (isMobile) {
    if (selectedConversationId) {
      return (
        <div className="h-full flex flex-col">
          <div className="flex items-center gap-2 p-2 border-b">
            <Button variant="ghost" size="icon" onClick={() => setSelectedConversationId(null)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <span className="font-medium">Retour</span>
          </div>
          <div className="flex-1 overflow-hidden">
            <ChatWindow conversationId={selectedConversationId} />
          </div>
        </div>
      );
    }

    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h1 className="text-xl font-semibold">Messages</h1>
          <Button size="sm" onClick={() => setShowNewConversation(true)}>
            <MessageSquarePlus className="h-4 w-4 mr-1" />
            Nouveau
          </Button>
        </div>
        <div className="flex-1 overflow-hidden">
          <ConversationList
            selectedId={selectedConversationId}
            onSelect={setSelectedConversationId}
          />
        </div>
        <NewConversationDialog
          open={showNewConversation}
          onOpenChange={setShowNewConversation}
          onConversationCreated={setSelectedConversationId}
        />
      </div>
    );
  }

  // Desktop: side by side
  return (
    <div className="h-full flex">
      <div className="w-80 border-r flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h1 className="text-lg font-semibold">Messages</h1>
          <Button size="sm" variant="ghost" onClick={() => setShowNewConversation(true)}>
            <MessageSquarePlus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-hidden">
          <ConversationList
            selectedId={selectedConversationId}
            onSelect={setSelectedConversationId}
          />
        </div>
      </div>
      <div className="flex-1">
        {selectedConversationId ? (
          <ChatWindow conversationId={selectedConversationId} />
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageSquarePlus className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Sélectionnez une conversation</p>
              <p className="text-sm">ou démarrez une nouvelle discussion</p>
            </div>
          </div>
        )}
      </div>
      <NewConversationDialog
        open={showNewConversation}
        onOpenChange={setShowNewConversation}
        onConversationCreated={setSelectedConversationId}
      />
    </div>
  );
}
