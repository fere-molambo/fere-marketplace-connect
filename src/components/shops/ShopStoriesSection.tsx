import { useQuery } from "@tanstack/react-query";
import { Share2, Eye, EyeOff, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { AddStoryDialog } from "./AddStoryDialog";
import { toast } from "sonner";

interface Story {
  id: string;
  media_url: string;
  media_type: string;
  caption: string | null;
  visibility: "public" | "clients_only" | "private";
  created_at: string;
  expires_at: string;
}

export const ShopStoriesSection = ({ shopId }: { shopId: string }) => {
  const { data: stories, isLoading, refetch } = useQuery({
    queryKey: ["shop-stories", shopId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shop_stories")
        .select("*")
        .eq("shop_id", shopId)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Story[];
    },
  });

  const handleShare = async (storyId: string) => {
    const url = `${window.location.origin}/story/${storyId}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Lien copié dans le presse-papier");
    } catch (error) {
      toast.error("Erreur lors de la copie du lien");
    }
  };

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case "public":
        return <Eye className="h-4 w-4" />;
      case "clients_only":
        return <Users className="h-4 w-4" />;
      case "private":
        return <EyeOff className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getVisibilityLabel = (visibility: string) => {
    switch (visibility) {
      case "public":
        return "Public";
      case "clients_only":
        return "Clients";
      case "private":
        return "Privé";
      default:
        return "";
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Stories</h2>
          <AddStoryDialog shopId={shopId} onSuccess={refetch} />
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 w-24 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Stories</h2>
        <AddStoryDialog shopId={shopId} onSuccess={refetch} />
      </div>

      {!stories || stories.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Aucune story pour le moment. Ajoutez votre première story!
          </p>
        </div>
      ) : (
        <Carousel
          opts={{
            align: "start",
            loop: false,
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-2 md:-ml-4">
            {stories.map((story) => (
              <CarouselItem key={story.id} className="basis-auto pl-2 md:pl-4">
                <div className="group relative flex flex-col items-center gap-2">
                  <div className="relative h-32 w-24 overflow-hidden rounded-xl border-2 border-primary bg-muted shadow-lg transition-transform hover:scale-105 md:h-40 md:w-32">
                    {story.media_type === "video" ? (
                      <video
                        src={story.media_url}
                        className="h-full w-full object-cover"
                        muted
                        loop
                        playsInline
                      />
                    ) : (
                      <img
                        src={story.media_url}
                        alt={story.caption || "Story"}
                        className="h-full w-full object-cover"
                      />
                    )}
                    
                    {/* Overlay with actions */}
                    <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-white hover:bg-white/20"
                        onClick={() => handleShare(story.id)}
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Visibility badge */}
                    <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-black/70 px-2 py-1 text-xs text-white">
                      {getVisibilityIcon(story.visibility)}
                      <span className="hidden md:inline">{getVisibilityLabel(story.visibility)}</span>
                    </div>
                  </div>

                  {story.caption && (
                    <p className="w-24 truncate text-center text-xs text-muted-foreground md:w-32">
                      {story.caption}
                    </p>
                  )}
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="hidden md:flex" />
          <CarouselNext className="hidden md:flex" />
        </Carousel>
      )}
    </div>
  );
};
