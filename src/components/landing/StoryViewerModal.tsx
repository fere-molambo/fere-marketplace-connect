import { useState, useEffect } from "react";
import { X, ChevronLeft, ChevronRight, Eye, Store, BadgeCheck, ShoppingBag, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation } from "@tanstack/react-query";

interface Story {
  id: string;
  media_url: string;
  media_type: string;
  caption: string | null;
  created_at: string;
  expires_at: string;
  linked_product_id: string | null;
  linked_service_id: string | null;
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

  const currentShop = shops[shopIndex];
  const currentStory = currentShop?.stories[storyIndex];

  // Record view
  const recordViewMutation = useMutation({
    mutationFn: async (storyId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("story_views").insert({
        story_id: storyId,
        viewer_id: user?.id || null,
      }).select();
    },
  });

  useEffect(() => {
    if (currentStory) {
      recordViewMutation.mutate(currentStory.id);
    }
  }, [currentStory?.id]);

  // Get view count
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

  // Fetch linked product
  const { data: linkedProduct } = useQuery({
    queryKey: ["linked-product", currentStory?.linked_product_id],
    queryFn: async () => {
      if (!currentStory?.linked_product_id) return null;
      const { data, error } = await supabase
        .from("products")
        .select("id, name, main_media_url, price")
        .eq("id", currentStory.linked_product_id)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!currentStory?.linked_product_id,
  });

  // Fetch linked service
  const { data: linkedService } = useQuery({
    queryKey: ["linked-service", currentStory?.linked_service_id],
    queryFn: async () => {
      if (!currentStory?.linked_service_id) return null;
      const { data, error } = await supabase
        .from("services")
        .select("id, name, main_media_url, price")
        .eq("id", currentStory.linked_service_id)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!currentStory?.linked_service_id,
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

  const linkedItem = linkedProduct || linkedService;
  const isProduct = !!linkedProduct;

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

        {/* Caption, linked item and views */}
        <div className="absolute bottom-4 left-4 right-4 z-10 space-y-3">
          {/* Linked product/service card */}
          {linkedItem && (
            <Link 
              to={isProduct ? `/product/${linkedItem.id}` : `/service/${linkedItem.id}`}
              className="block"
            >
              <div className="flex items-center gap-3 bg-white/95 backdrop-blur-sm rounded-lg p-2 hover:bg-white transition-colors">
                {linkedItem.main_media_url ? (
                  <img 
                    src={linkedItem.main_media_url} 
                    alt={linkedItem.name}
                    className="w-12 h-12 rounded object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                    {isProduct ? <ShoppingBag className="h-5 w-5" /> : <Briefcase className="h-5 w-5" />}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {linkedItem.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {linkedItem.price.toLocaleString()} FCFA
                  </p>
                </div>
                <div className="text-xs text-primary font-medium">
                  {isProduct ? "Voir produit" : "Voir prestation"}
                </div>
              </div>
            </Link>
          )}

          {currentStory.caption && (
            <p className="text-white text-sm bg-black/30 px-3 py-2 rounded-lg backdrop-blur-sm">
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
