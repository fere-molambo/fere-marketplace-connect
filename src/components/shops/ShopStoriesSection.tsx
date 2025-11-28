import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Share2, Eye, EyeOff, Users, X, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Dialog, DialogContent } from "@/components/ui/dialog";
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
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  
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

  const handleDeleteStory = async (storyId: string, mediaUrl: string) => {
    try {
      const { error } = await supabase
        .from("shop_stories")
        .delete()
        .eq("id", storyId);

      if (error) throw error;

      if (mediaUrl.includes("shop-stories")) {
        const path = mediaUrl.split("/shop-stories/")[1]?.split("?")[0];
        if (path) {
          await supabase.storage.from("shop-stories").remove([path]);
        }
      }

      toast.success("Story supprimée");
      refetch();
    } catch (error) {
      console.error("Error deleting story:", error);
      toast.error("Erreur lors de la suppression");
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
            <div key={i} className="h-20 w-20 md:h-24 md:w-24 animate-pulse rounded-full bg-muted" />
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
          <CarouselContent className="py-3 -ml-2 md:-ml-4">
            {stories?.map((story) => (
              <CarouselItem key={story.id} className="basis-auto pl-2 md:pl-4 pr-2 pt-2">
                <div className="group relative flex flex-col items-center gap-2">
                  {/* Delete button - outside the main button to avoid clipping */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteStory(story.id, story.media_url);
                    }}
                    className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-600 z-10"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>

                  <button
                    onClick={() => setSelectedStory(story)}
                    className="relative h-20 w-20 md:h-24 md:w-24 rounded-full bg-gradient-to-tr from-primary via-primary/80 to-primary/60 p-[2px] transition-transform hover:scale-105 cursor-pointer"
                  >
                    <div className="h-full w-full overflow-hidden rounded-full bg-background p-[2px]">
                      {story.media_type === "video" ? (
                        <video
                          src={story.media_url}
                          className="h-full w-full object-cover"
                          muted
                        />
                      ) : (
                        <img
                          src={story.media_url}
                          alt={story.caption || "Story"}
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>

                    {/* Visibility badge */}
                    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-xs text-white">
                      {getVisibilityIcon(story.visibility)}
                    </div>
                  </button>

                  {story.caption && (
                    <p className="w-20 md:w-24 truncate text-center text-xs text-muted-foreground mt-2">
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

      {/* Story Viewer Dialog */}
      <Dialog open={!!selectedStory} onOpenChange={(open) => !open && setSelectedStory(null)}>
        <DialogContent className="max-w-4xl h-[90vh] p-0 bg-black/95 border-none backdrop-blur-sm">
          {selectedStory && (
            <div className="relative h-full w-full flex flex-col items-center justify-center">
              {/* Close button */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 z-10 text-white hover:bg-white/20"
                onClick={() => setSelectedStory(null)}
              >
                <X className="h-6 w-6" />
              </Button>

              {/* Media content */}
              <div className="flex-1 w-full flex items-center justify-center p-4">
                {selectedStory.media_type === "video" ? (
                  <video
                    src={selectedStory.media_url}
                    className="max-h-full max-w-full object-contain"
                    controls
                    autoPlay
                    loop
                  />
                ) : (
                  <img
                    src={selectedStory.media_url}
                    alt={selectedStory.caption || "Story"}
                    className="max-h-full max-w-full object-contain"
                  />
                )}
              </div>

              {/* Bottom info */}
              <div className="w-full bg-gradient-to-t from-black/80 to-transparent p-6 space-y-4">
                {selectedStory.caption && (
                  <p className="text-white text-center text-lg">
                    {selectedStory.caption}
                  </p>
                )}
                
                <div className="flex items-center justify-center gap-4">
                  <div className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm text-white">
                    {getVisibilityIcon(selectedStory.visibility)}
                    <span>{getVisibilityLabel(selectedStory.visibility)}</span>
                  </div>
                  
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleShare(selectedStory.id)}
                    className="gap-2"
                  >
                    <Share2 className="h-4 w-4" />
                    Partager
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
