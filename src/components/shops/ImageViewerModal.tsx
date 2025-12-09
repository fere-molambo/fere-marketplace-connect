import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, BookOpen, Copy, MessageSquare, Trash2, ChevronLeft, ChevronRight } from "lucide-react";

interface ImageViewerModalProps {
  imageUrl: string | null;
  prompt?: string;
  onClose: () => void;
  onCreateStory?: () => void;
  onCopyLink?: () => void;
  onSendMessage?: () => void;
  onDelete?: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
}

export const ImageViewerModal = ({
  imageUrl,
  prompt,
  onClose,
  onCreateStory,
  onCopyLink,
  onSendMessage,
  onDelete,
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
}: ImageViewerModalProps) => {
  if (!imageUrl) return null;

  return (
    <Dialog open={!!imageUrl} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-none">
        <div className="relative w-full h-full flex flex-col">
          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="absolute top-4 right-4 z-50 text-white hover:bg-white/20"
          >
            <X className="h-6 w-6" />
          </Button>

          {/* Navigation arrows */}
          {hasPrevious && onPrevious && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onPrevious}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-50 text-white hover:bg-white/20 h-12 w-12"
            >
              <ChevronLeft className="h-8 w-8" />
            </Button>
          )}
          {hasNext && onNext && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-50 text-white hover:bg-white/20 h-12 w-12"
            >
              <ChevronRight className="h-8 w-8" />
            </Button>
          )}

          {/* Image */}
          <div className="flex-1 flex items-center justify-center p-4 min-h-[60vh]">
            <img
              src={imageUrl}
              alt={prompt || "Image générée"}
              className="max-w-full max-h-[70vh] object-contain rounded-lg"
            />
          </div>

          {/* Bottom bar with prompt and actions */}
          <div className="bg-black/80 p-4 space-y-3">
            {prompt && (
              <p className="text-white/80 text-sm text-center line-clamp-2">
                {prompt}
              </p>
            )}
            
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {onCreateStory && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onCreateStory}
                  className="bg-white/10 hover:bg-white/20 text-white border-none"
                >
                  <BookOpen className="mr-2 h-4 w-4" />
                  Créer une Story
                </Button>
              )}
              {onCopyLink && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onCopyLink}
                  className="bg-white/10 hover:bg-white/20 text-white border-none"
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copier le lien
                </Button>
              )}
              {onSendMessage && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onSendMessage}
                  className="bg-white/10 hover:bg-white/20 text-white border-none"
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Envoyer
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onDelete}
                  className="bg-destructive/80 hover:bg-destructive text-white border-none"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Supprimer
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
