import { Play } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface Tutorial {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
}

interface TutorialVideoCardProps {
  tutorial: Tutorial;
  onPlay: () => void;
}

export function TutorialVideoCard({ tutorial, onPlay }: TutorialVideoCardProps) {
  return (
    <Card
      className="overflow-hidden cursor-pointer group hover:shadow-lg transition-shadow"
      onClick={onPlay}
    >
      <div className="relative aspect-video bg-muted">
        {tutorial.thumbnail_url ? (
          <img
            src={tutorial.thumbnail_url}
            alt={tutorial.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <Play className="h-12 w-12 text-primary/50" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center">
            <Play className="h-8 w-8 text-primary-foreground ml-1" />
          </div>
        </div>
      </div>
      <CardContent className="p-4">
        <h3 className="font-semibold line-clamp-2 mb-1">{tutorial.title}</h3>
        {tutorial.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {tutorial.description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
