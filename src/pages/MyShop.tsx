import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ShopImageUpload } from "@/components/shops/ShopImageUpload";
import { Skeleton } from "@/components/ui/skeleton";
import { Store } from "lucide-react";
import { CreateShopDialog } from "@/components/shops/CreateShopDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShopInfoSection } from "@/components/shops/ShopInfoSection";
import { ShopStoriesSection } from "@/components/shops/ShopStoriesSection";
import { ProductsServicesTab } from "@/components/shops/tabs/ProductsServicesTab";
import { OrdersTab } from "@/components/shops/tabs/OrdersTab";
import { MarketingTab } from "@/components/shops/tabs/MarketingTab";
import { ReviewsTab } from "@/components/shops/tabs/ReviewsTab";
import { StatsTab } from "@/components/shops/tabs/StatsTab";
import { ConfigTab } from "@/components/shops/tabs/ConfigTab";
import { useState } from "react";

export default function MyShop() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("infos");

  const { data: shop, isLoading, refetch } = useQuery({
    queryKey: ["my-shop", user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from("shops")
        .select(`
          *,
          owner:profiles!owner_id (nom_complet, contact, email)
        `)
        .eq("owner_id", user.id)
        .single();

      if (error) {
        if (error.code === "PGRST116") return null;
        throw error;
      }
      return data;
    },
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="flex min-h-[600px] items-center justify-center px-4">
        <div className="text-center space-y-6 max-w-md">
          <div className="flex justify-center">
            <div className="rounded-full bg-primary/10 p-6">
              <Store className="h-12 w-12 text-primary" />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Créez votre boutique</h2>
            <p className="text-muted-foreground">
              Vous n'avez pas encore de boutique. Créez-en une maintenant pour commencer à vendre vos produits ou services.
            </p>
          </div>
          <CreateShopDialog onShopCreated={refetch} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 overflow-x-hidden max-w-full">
      {/* Banner and Logo */}
      <div className="relative">
        <ShopImageUpload
          shopId={shop.id}
          currentImageUrl={shop.banner_url}
          imageType="banner"
          onUploadComplete={refetch}
        />
        <div className="absolute bottom-0 left-4 translate-y-1/2">
          <ShopImageUpload
            shopId={shop.id}
            currentImageUrl={shop.logo_url}
            imageType="logo"
            onUploadComplete={refetch}
          />
        </div>
      </div>

      {/* Shop Info */}
      <div className="pt-14 space-y-2">
        <h1 className="text-xl sm:text-2xl font-bold truncate">{shop.name}</h1>
        <p className="text-muted-foreground text-sm sm:text-base truncate">@{shop.owner?.nom_complet}</p>
      </div>

      {/* Stories Section */}
      <ShopStoriesSection shopId={shop.id} />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="overflow-x-auto -mx-4 px-4">
          <TabsList className="inline-flex w-max h-auto">
            <TabsTrigger value="infos" className="text-xs sm:text-sm">Infos</TabsTrigger>
            <TabsTrigger value="products" className="text-xs sm:text-sm">Produits</TabsTrigger>
            <TabsTrigger value="orders" className="text-xs sm:text-sm">Commandes</TabsTrigger>
            <TabsTrigger value="marketing" className="text-xs sm:text-sm">Marketing</TabsTrigger>
            <TabsTrigger value="reviews" className="text-xs sm:text-sm">Avis</TabsTrigger>
            <TabsTrigger value="stats" className="text-xs sm:text-sm">Stats</TabsTrigger>
            <TabsTrigger value="config" className="text-xs sm:text-sm">Config</TabsTrigger>
          </TabsList>
        </div>

        <div>
          <TabsContent value="infos" className="space-y-4 mt-4">
            <ShopInfoSection shop={shop} onUpdate={refetch} />
          </TabsContent>

          <TabsContent value="products" className="space-y-4 mt-4">
            <ProductsServicesTab shopId={shop.id} />
          </TabsContent>

          <TabsContent value="orders" className="space-y-4 mt-4">
            <OrdersTab />
          </TabsContent>

          <TabsContent value="marketing" className="space-y-4 mt-4">
            <MarketingTab />
          </TabsContent>

          <TabsContent value="reviews" className="space-y-4 mt-4">
            <ReviewsTab shopId={shop.id} />
          </TabsContent>

          <TabsContent value="stats" className="space-y-4 mt-4">
            <StatsTab />
          </TabsContent>

          <TabsContent value="config" className="space-y-4 mt-4">
            <ConfigTab shopId={shop.id} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}