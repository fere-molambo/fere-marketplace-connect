import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ShopImageUpload } from "@/components/shops/ShopImageUpload";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CheckCircle, XCircle, Clock } from "lucide-react";
import { ShopInfoSection } from "@/components/shops/ShopInfoSection";
import { useUserRoles } from "@/hooks/useUserRoles";
import { toast } from "sonner";
import { ShopStoriesSection } from "@/components/shops/ShopStoriesSection";
import { ProductsServicesTab } from "@/components/shops/tabs/ProductsServicesTab";
import { OrdersTab } from "@/components/shops/tabs/OrdersTab";
import { MarketingTab } from "@/components/shops/tabs/MarketingTab";
import { ReviewsTab } from "@/components/shops/tabs/ReviewsTab";
import { StatsTab } from "@/components/shops/tabs/StatsTab";
import { ConfigTab } from "@/components/shops/tabs/ConfigTab";

export default function ShopDetail() {
  const { shopId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("infos");

  const { data: shop, isLoading, refetch } = useQuery({
    queryKey: ["shop", shopId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shops")
        .select(`
          *,
          owner:profiles!owner_id (nom_complet, contact, email)
        `)
        .eq("id", shopId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!shopId,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-muted-foreground">Boutique non trouvée</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 overflow-x-hidden max-w-full">
      <Button 
        variant="ghost" 
        onClick={() => navigate("/dashboard/shops")}
        className="mb-2"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Boutiques
      </Button>
      
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

      <div className="pt-8 sm:pt-10">
        <h1 className="text-xl sm:text-2xl font-semibold text-foreground truncate">{shop.name}</h1>
        <p className="text-sm text-muted-foreground truncate">@{shop.owner?.nom_complet}</p>
      </div>

      {/* Stories Section */}
      <ShopStoriesSection shopId={shop.id} />

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
          <TabsContent value="infos" className="mt-6">
            <ShopInfoSection shop={shop} onUpdate={refetch} />
          </TabsContent>

          <TabsContent value="products" className="mt-6">
            <ProductsServicesTab shopId={shop.id} />
          </TabsContent>

          <TabsContent value="orders" className="mt-6">
            <OrdersTab shopId={shop.id} />
          </TabsContent>

          <TabsContent value="marketing" className="mt-6">
            <MarketingTab shopId={shop.id} />
          </TabsContent>

          <TabsContent value="reviews" className="mt-6">
            <ReviewsTab shopId={shop.id} />
          </TabsContent>

          <TabsContent value="stats" className="mt-6">
            <StatsTab shopId={shop.id} />
          </TabsContent>

          <TabsContent value="config" className="mt-6">
            <ConfigTab shopId={shopId} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}