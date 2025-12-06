import { useState, useMemo } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { MessageStatusIcon } from "./MessageStatusIcon";
import { AlertCircle, RotateCcw, Trash2, Play, Pause, Loader2, Download } from "lucide-react";
import { toast } from "sonner";

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
  selectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
}

export function MessageBubble({ 
  message, 
  isOwn, 
  onRetry, 
  onDelete,
  selectionMode = false,
  isSelected = false,
  onToggleSelect
}: MessageBubbleProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioError, setAudioError] = useState(false);

  // Generate static waveform bars based on message id for consistency
  const waveformBars = useMemo(() => {
    const seed = message.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return Array.from({ length: 28 }, (_, i) => {
      const random = Math.sin(seed + i * 0.7) * 0.5 + 0.5;
      return 25 + random * 75; // Heights between 25% and 100%
    });
  }, [message.id]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const currentBar = useMemo(() => {
    if (duration === 0) return 0;
    return Math.floor((currentTime / duration) * waveformBars.length);
  }, [currentTime, duration, waveformBars.length]);

  const handlePlayAudio = async () => {
    if (!message.media_url || audioError) return;

    try {
      if (!audioRef) {
        setIsLoading(true);
        const audio = new Audio(message.media_url);

        audio.onerror = (e) => {
          console.error("Audio playback error:", e);
          setAudioError(true);
          setIsLoading(false);
          setIsPlaying(false);
        };

        audio.onloadedmetadata = () => {
          setDuration(audio.duration);
          setIsLoading(false);
        };

        audio.ontimeupdate = () => {
          setCurrentTime(audio.currentTime);
        };

        audio.onended = () => {
          setIsPlaying(false);
          setCurrentTime(0);
        };

        setAudioRef(audio);
        await audio.play();
        setIsPlaying(true);
      } else {
        if (isPlaying) {
          audioRef.pause();
          setIsPlaying(false);
        } else {
          await audioRef.play();
          setIsPlaying(true);
        }
      }
    } catch (error) {
      console.error('Audio error:', error);
      setAudioError(true);
      setIsLoading(false);
    }
  };

  const isFailed = message.status === "failed";

  const handleClick = () => {
    if (selectionMode && isOwn && onToggleSelect) {
      onToggleSelect();
    }
  };

  return (
    <div
      className={cn(
        "flex gap-2 group relative",
        isOwn ? "justify-end" : "justify-start",
        selectionMode && isOwn && "cursor-pointer"
      )}
      onClick={handleClick}
    >
      {/* Checkbox for selection mode (own messages only) */}
      {selectionMode && isOwn && (
        <div className="flex items-center self-center">
          <Checkbox 
            checked={isSelected} 
            onCheckedChange={onToggleSelect}
            className="h-5 w-5"
          />
        </div>
      )}

      {/* Delete button for own messages (visible on hover, hidden in selection mode) */}
      {isOwn && !isFailed && !selectionMode && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity self-center"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
        </Button>
      )}

      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-4 py-2",
          isOwn
            ? "bg-[#003E2F] text-white rounded-br-md"
            : "bg-muted rounded-bl-md",
          isFailed && "opacity-60",
          selectionMode && isSelected && "ring-2 ring-primary"
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
              onClick={(e) => {
                e.stopPropagation();
                if (!selectionMode) window.open(message.media_url!, "_blank");
              }}
            />
            {message.content && (
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            )}
          </div>
        )}

        {/* Audio message - WhatsApp style */}
        {message.media_type === "audio" && message.media_url && (
          <>
            {audioError ? (
              // Show download option if audio format not supported
              <div className="flex items-center gap-3 min-w-[220px] py-1">
                <span className={cn("text-xs", isOwn ? "text-white/80" : "text-muted-foreground")}>
                  Format non supporté
                </span>
                <a 
                  href={message.media_url} 
                  download
                  onClick={(e) => e.stopPropagation()}
                  className={cn(
                    "flex items-center gap-1 text-xs underline",
                    isOwn ? "text-white hover:text-white/80" : "text-primary hover:text-primary/80"
                  )}
                >
                  <Download className="h-3 w-3" />
                  Télécharger
                </a>
              </div>
            ) : (
              <div className="flex items-center gap-3 min-w-[220px] py-1">
                {/* Play/Pause button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlayAudio();
                  }}
                  disabled={isLoading}
                  className={cn(
                    "flex-shrink-0 h-11 w-11 rounded-full flex items-center justify-center transition-all",
                    isOwn
                      ? "bg-white/20 hover:bg-white/30"
                      : "bg-[#003E2F] hover:bg-[#003E2F]/90"
                  )}
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-white" />
                  ) : isPlaying ? (
                    <Pause className="h-5 w-5 text-white" />
                  ) : (
                    <Play className="h-5 w-5 ml-0.5 text-white" />
                  )}
                </button>

                {/* Waveform visualization */}
                <div className="flex-1 flex items-center gap-[2px] h-8">
                  {waveformBars.map((height, i) => (
                    <div
                      key={i}
                      className={cn(
                        "w-[3px] rounded-full transition-all duration-100",
                        isOwn
                          ? i <= currentBar && isPlaying
                            ? "bg-white"
                            : "bg-white/50"
                          : i <= currentBar && isPlaying
                            ? "bg-[#003E2F]"
                            : "bg-[#003E2F]/40"
                      )}
                      style={{ height: `${height}%` }}
                    />
                  ))}
                </div>

                {/* Duration */}
                <span
                  className={cn(
                    "text-xs font-medium min-w-[36px] text-right tabular-nums",
                    isOwn ? "text-white/80" : "text-muted-foreground"
                  )}
                >
                  {formatDuration(isPlaying ? currentTime : duration)}
                </span>
              </div>
            )}
          </>
        )}

        {/* Timestamp and status */}
        <div
          className={cn(
            "flex items-center gap-1 mt-1",
            isOwn ? "justify-end" : "justify-start"
          )}
        >
          <span className={cn("text-xs", isOwn ? "text-white/70" : "opacity-70")}>
            {format(new Date(message.created_at), "HH:mm", { locale: fr })}
          </span>
          {isOwn && <MessageStatusIcon status={message.status} />}
        </div>

        {/* Failed message actions */}
        {isFailed && isOwn && (
          <div className={cn(
            "flex items-center gap-1 mt-2 pt-2 border-t",
            isOwn ? "border-white/20" : "border-current/20"
          )}>
            <AlertCircle className="h-3 w-3 text-red-400" />
            <span className="text-xs text-white/70">Échec de l'envoi</span>
            <div className="flex-1" />
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 hover:bg-white/10"
              onClick={(e) => {
                e.stopPropagation();
                onRetry();
              }}
            >
              <RotateCcw className="h-3 w-3 text-white" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 hover:bg-white/10"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <Trash2 className="h-3 w-3 text-white" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
