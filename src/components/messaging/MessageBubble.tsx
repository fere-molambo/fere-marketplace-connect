import { useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MessageStatusIcon } from "./MessageStatusIcon";
import { AlertCircle, RotateCcw, Trash2, Play, Pause } from "lucide-react";

interface MessageBubbleProps {
  message: {
    id: string;
    content: string | null;
    media_url: string | null;
    media_type: string;
    status: string;
    created_at: string;
  };
  isOwn: boolean;
  onRetry: () => void;
  onDelete: () => void;
}

export function MessageBubble({ message, isOwn, onRetry, onDelete }: MessageBubbleProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null);

  const handlePlayAudio = () => {
    if (!audioRef && message.media_url) {
      const audio = new Audio(message.media_url);
      audio.onended = () => setIsPlaying(false);
      setAudioRef(audio);
      audio.play();
      setIsPlaying(true);
    } else if (audioRef) {
      if (isPlaying) {
        audioRef.pause();
        setIsPlaying(false);
      } else {
        audioRef.play();
        setIsPlaying(true);
      }
    }
  };

  const isFailed = message.status === "failed";

  return (
    <div
      className={cn(
        "flex gap-2",
        isOwn ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-4 py-2",
          isOwn
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-muted rounded-bl-md",
          isFailed && "opacity-60"
        )}
      >
        {/* Text message */}
        {message.media_type === "text" && message.content && (
          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
        )}

        {/* Image message */}
        {message.media_type === "image" && message.media_url && (
          <div className="space-y-1">
            <img
              src={message.media_url}
              alt="Image"
              className="rounded-lg max-w-full max-h-60 object-cover cursor-pointer"
              onClick={() => window.open(message.media_url!, "_blank")}
            />
            {message.content && (
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            )}
          </div>
        )}

        {/* Audio message */}
        {message.media_type === "audio" && message.media_url && (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-8 w-8 rounded-full",
                isOwn ? "hover:bg-primary-foreground/20" : "hover:bg-background/50"
              )}
              onClick={handlePlayAudio}
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
            <div className="flex-1 h-1 bg-current opacity-30 rounded-full">
              <div className="h-full w-1/3 bg-current rounded-full" />
            </div>
          </div>
        )}

        {/* Timestamp and status */}
        <div
          className={cn(
            "flex items-center gap-1 mt-1",
            isOwn ? "justify-end" : "justify-start"
          )}
        >
          <span className={cn("text-xs opacity-70")}>
            {format(new Date(message.created_at), "HH:mm", { locale: fr })}
          </span>
          {isOwn && <MessageStatusIcon status={message.status} />}
        </div>

        {/* Failed message actions */}
        {isFailed && isOwn && (
          <div className="flex items-center gap-1 mt-2 pt-2 border-t border-current/20">
            <AlertCircle className="h-3 w-3 text-destructive" />
            <span className="text-xs opacity-70">Échec de l'envoi</span>
            <div className="flex-1" />
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onRetry}
            >
              <RotateCcw className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onDelete}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
