import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BadgeCheck } from "lucide-react";
import { useState } from "react";
import { StoryViewerModal } from "./StoryViewerModal";

interface ShopWithStories {
  id: string;
  name: string;
  logo_url: string | null;
  is_official: boolean;
  stories: {
    id: string;
    media_url: string;
    media_type: string;
    caption: string | null;
    created_at: string;
    expires_at: string;
  }[];
}

export const StoriesSection = () => {
  const [selectedShopIndex, setSelectedShopIndex] = useState<number | null>(null);

  const { data: shopsWithStories = [] } = useQuery({
    queryKey: ["public-stories"],
    queryFn: async () => {
      // Get active public stories with shop info
      const { data: stories, error } = await supabase
        .from("shop_stories")
        .select(`
          id,
          media_url,
          media_type,
          caption,
          created_at,
          expires_at,
          shop_id,
          shops!inner (
            id,
            name,
            logo_url,
            is_official,
            is_active
          )
        `)
        .eq("is_active", true)
        .eq("visibility", "public")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Group stories by shop
      const shopMap = new Map<string, ShopWithStories>();
      
      stories?.forEach((story: any) => {
        const shop = story.shops;
        if (!shop || !shop.is_active) return;
        
        if (!shopMap.has(shop.id)) {
          shopMap.set(shop.id, {
            id: shop.id,
            name: shop.name,
            logo_url: shop.logo_url,
            is_official: shop.is_official,
            stories: [],
          });
        }
        
        shopMap.get(shop.id)!.stories.push({
          id: story.id,
          media_url: story.media_url,
          media_type: story.media_type,
          caption: story.caption,
          created_at: story.created_at,
          expires_at: story.expires_at,
        });
      });

      return Array.from(shopMap.values());
    },
  });

  if (shopsWithStories.length === 0) {
    return null;
  }

  return (
    <section id="stories" className="py-6 px-4">
      <div className="container mx-auto">
        <h2 className="text-xl md:text-2xl font-bold mb-4">
          Stories de nos partenaires
        </h2>

        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
          {shopsWithStories.map((shop, index) => (
            <button
              key={shop.id}
              onClick={() => setSelectedShopIndex(index)}
              className="flex flex-col items-center gap-2 flex-shrink-0"
            >
              <div className="relative">
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-full p-[3px] bg-gradient-to-tr from-primary via-yellow-500 to-primary">
                  <div className="w-full h-full rounded-full overflow-hidden bg-background p-[2px]">
                    {shop.logo_url ? (
                      <img
                        src={shop.logo_url}
                        alt={shop.name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full rounded-full bg-muted flex items-center justify-center">
                        <span className="text-lg font-bold text-muted-foreground">
                          {shop.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                {shop.is_official && (
                  <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5">
                    <BadgeCheck className="h-5 w-5 text-primary fill-primary/20" />
                  </div>
                )}
              </div>
              <span className="text-xs text-center max-w-[80px] truncate">
                {shop.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {selectedShopIndex !== null && (
        <StoryViewerModal
          shops={shopsWithStories}
          initialShopIndex={selectedShopIndex}
          onClose={() => setSelectedShopIndex(null)}
        />
      )}
    </section>
  );
};
