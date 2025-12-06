import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Tutorial {
  id: string;
  title: string;
  description: string | null;
  video_url: string | null;
}

interface VideoPlayerDialogProps {
  tutorial: Tutorial | null;
  onClose: () => void;
}

export function VideoPlayerDialog({ tutorial, onClose }: VideoPlayerDialogProps) {
  if (!tutorial) return null;

  // Check if it's a YouTube URL
  const isYouTube = tutorial.video_url?.includes("youtube.com") || tutorial.video_url?.includes("youtu.be");
  
  // Extract YouTube video ID
  const getYouTubeId = (url: string) => {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
    return match ? match[1] : null;
  };

  const youtubeId = tutorial.video_url ? getYouTubeId(tutorial.video_url) : null;

  return (
    <Dialog open={!!tutorial} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle>{tutorial.title}</DialogTitle>
        </DialogHeader>
        <div className="aspect-video bg-black">
          {isYouTube && youtubeId ? (
            <iframe
              src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1`}
              title={tutorial.title}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : tutorial.video_url ? (
            <video
              src={tutorial.video_url}
              controls
              autoPlay
              className="w-full h-full"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white">
              Vidéo non disponible
            </div>
          )}
        </div>
        {tutorial.description && (
          <div className="p-4 pt-2">
            <p className="text-sm text-muted-foreground">{tutorial.description}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
