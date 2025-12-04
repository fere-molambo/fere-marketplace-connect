import { useState, useEffect } from "react";
import { X, ChevronLeft, ChevronRight, Eye, Store, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Story {
  id: string;
  media_url: string;
  media_type: string;
  caption: string | null;
  created_at: string;
  expires_at: string;
}

interface ShopWithStories {
  id: string;
  name: string;
  logo_url: string | null;
  is_official: boolean;
  stories: Story[];
}

interface StoryViewerModalProps {
  shops: ShopWithStories[];
  initialShopIndex: number;
  onClose: () => void;
}

export const StoryViewerModal = ({
  shops,
  initialShopIndex,
  onClose,
}: StoryViewerModalProps) => {
  const [shopIndex, setShopIndex] = useState(initialShopIndex);
  const [storyIndex, setStoryIndex] = useState(0);
  const queryClient = useQueryClient();

  const currentShop = shops[shopIndex];
  const currentStory = currentShop?.stories[storyIndex];

  // Record view
  const recordViewMutation = useMutation({
    mutationFn: async (storyId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Try to insert view (will fail silently if duplicate)
      await supabase.from("story_views").insert({
        story_id: storyId,
        viewer_id: user?.id || null,
      }).select();
    },
  });

  // Record view when story changes
  useEffect(() => {
    if (currentStory) {
      recordViewMutation.mutate(currentStory.id);
    }
  }, [currentStory?.id]);

  // Get view count for current story
  const { data: viewCount = 0 } = useQuery({
    queryKey: ["story-views", currentStory?.id],
    queryFn: async () => {
      if (!currentStory) return 0;
      const { count } = await supabase
        .from("story_views")
        .select("*", { count: "exact", head: true })
        .eq("story_id", currentStory.id);
      return count || 0;
    },
    enabled: !!currentStory,
  });

  // Get viewers list (for shop owners)
  const { data: viewers = [] } = useQuery({
    queryKey: ["story-viewers", currentStory?.id],
    queryFn: async () => {
      if (!currentStory) return [];
      const { data } = await supabase
        .from("story_views")
        .select(`
          viewer_id,
          viewed_at,
          profiles!story_views_viewer_id_fkey (
            nom_complet,
            photo_profil
          )
        `)
        .eq("story_id", currentStory.id)
        .not("viewer_id", "is", null)
        .order("viewed_at", { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!currentStory,
  });

  const goToPrevStory = () => {
    if (storyIndex > 0) {
      setStoryIndex(storyIndex - 1);
    } else if (shopIndex > 0) {
      setShopIndex(shopIndex - 1);
      setStoryIndex(shops[shopIndex - 1].stories.length - 1);
    }
  };

  const goToNextStory = () => {
    if (storyIndex < currentShop.stories.length - 1) {
      setStoryIndex(storyIndex + 1);
    } else if (shopIndex < shops.length - 1) {
      setShopIndex(shopIndex + 1);
      setStoryIndex(0);
    } else {
      onClose();
    }
  };

  const goToPrevShop = () => {
    if (shopIndex > 0) {
      setShopIndex(shopIndex - 1);
      setStoryIndex(0);
    }
  };

  const goToNextShop = () => {
    if (shopIndex < shops.length - 1) {
      setShopIndex(shopIndex + 1);
      setStoryIndex(0);
    } else {
      onClose();
    }
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") goToPrevStory();
      if (e.key === "ArrowRight") goToNextStory();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [storyIndex, shopIndex]);

  if (!currentShop || !currentStory) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors z-10"
      >
        <X className="h-6 w-6" />
      </button>

      {/* Previous shop button */}
      {shopIndex > 0 && (
        <button
          onClick={goToPrevShop}
          className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors hidden md:block"
        >
          <ChevronLeft className="h-8 w-8" />
        </button>
      )}

      {/* Story container */}
      <div className="relative w-full max-w-md h-[80vh] mx-4">
        {/* Progress bars */}
        <div className="absolute top-2 left-2 right-2 flex gap-1 z-10">
          {currentShop.stories.map((_, idx) => (
            <div
              key={idx}
              className={`h-1 flex-1 rounded-full ${
                idx < storyIndex
                  ? "bg-white"
                  : idx === storyIndex
                  ? "bg-white/80"
                  : "bg-white/30"
              }`}
            />
          ))}
        </div>

        {/* Shop info header */}
        <div className="absolute top-6 left-2 right-2 flex items-center gap-3 z-10">
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/50">
            {currentShop.logo_url ? (
              <img
                src={currentShop.logo_url}
                alt={currentShop.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <span className="text-sm font-bold">
                  {currentShop.name.charAt(0)}
                </span>
              </div>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-1">
              <span className="text-white font-medium text-sm">
                {currentShop.name}
              </span>
              {currentShop.is_official && (
                <BadgeCheck className="h-4 w-4 text-primary fill-primary/20" />
              )}
            </div>
          </div>
          <Link to={`/shop/${currentShop.id}`}>
            <Button
              size="sm"
              variant="secondary"
              className="bg-white/20 hover:bg-white/30 text-white text-xs"
            >
              <Store className="h-3 w-3 mr-1" />
              Voir boutique
            </Button>
          </Link>
        </div>

        {/* Media */}
        <div
          className="w-full h-full rounded-2xl overflow-hidden bg-black cursor-pointer"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            if (x < rect.width / 2) {
              goToPrevStory();
            } else {
              goToNextStory();
            }
          }}
        >
          {currentStory.media_type === "video" ? (
            <video
              src={currentStory.media_url}
              className="w-full h-full object-contain"
              autoPlay
              loop
              muted
              playsInline
            />
          ) : (
            <img
              src={currentStory.media_url}
              alt=""
              className="w-full h-full object-contain"
            />
          )}
        </div>

        {/* Caption and views */}
        <div className="absolute bottom-4 left-4 right-4 z-10">
          {currentStory.caption && (
            <p className="text-white text-sm mb-3 bg-black/30 px-3 py-2 rounded-lg backdrop-blur-sm">
              {currentStory.caption}
            </p>
          )}
          <div className="flex items-center gap-2 text-white/70 text-xs">
            <Eye className="h-4 w-4" />
            <span>{viewCount} vue{viewCount !== 1 ? "s" : ""}</span>
          </div>
        </div>

        {/* Navigation arrows on mobile */}
        <div className="absolute inset-y-0 left-0 w-1/4 md:hidden" />
        <div className="absolute inset-y-0 right-0 w-1/4 md:hidden" />
      </div>

      {/* Next shop button */}
      {shopIndex < shops.length - 1 && (
        <button
          onClick={goToNextShop}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors hidden md:block"
        >
          <ChevronRight className="h-8 w-8" />
        </button>
      )}
    </div>
  );
};
