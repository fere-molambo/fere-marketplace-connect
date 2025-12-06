import { Navbar } from "@/components/landing/Navbar";
import { ChatLayout } from "@/components/messaging/ChatLayout";

export default function PublicMessages() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="h-[calc(100vh-4rem)]">
        <ChatLayout />
      </div>
    </div>
  );
}
