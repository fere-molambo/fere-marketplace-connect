import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ShopInfoSection } from "@/components/shops/ShopInfoSection";
import { ShopStoriesSection } from "@/components/shops/ShopStoriesSection";
import { ClientsTab } from "@/components/shops/tabs/ClientsTab";
import { ProductsServicesTab } from "@/components/shops/tabs/ProductsServicesTab";
import { OrdersTab } from "@/components/shops/tabs/OrdersTab";
import { CalendarTab } from "@/components/shops/tabs/CalendarTab";
import { MessagesTab } from "@/components/shops/tabs/MessagesTab";
import { MarketingTab } from "@/components/shops/tabs/MarketingTab";
import { ReviewsTab } from "@/components/shops/tabs/ReviewsTab";
import { StatsTab } from "@/components/shops/tabs/StatsTab";
import { ConfigTab } from "@/components/shops/tabs/ConfigTab";

export default function ShopDetail() {
  const { shopId } = useParams();
  const [activeTab, setActiveTab] = useState("infos");

  const { data: shop, isLoading } = useQuery({
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
    <div className="space-y-6">
      {/* Banner and Logo */}
      <div className="relative">
        {shop.banner_url ? (
          <img
            src={shop.banner_url}
            alt="Banner"
            className="h-32 w-full rounded-lg object-cover sm:h-48"
          />
        ) : (
          <div className="h-32 w-full rounded-lg bg-muted sm:h-48" />
        )}
        <div className="absolute bottom-0 left-4 translate-y-1/2">
          {shop.logo_url ? (
            <img
              src={shop.logo_url}
              alt={shop.name}
              className="h-16 w-16 rounded-lg border-4 border-background object-cover sm:h-20 sm:w-20"
            />
          ) : (
            <div className="h-16 w-16 rounded-lg border-4 border-background bg-muted sm:h-20 sm:w-20" />
          )}
        </div>
      </div>

      <div className="pt-8 sm:pt-10">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{shop.name}</h1>
            <p className="text-sm text-muted-foreground">@{shop.owner?.nom_complet}</p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="overflow-x-auto">
          <TabsList className="inline-flex w-full min-w-max">
            <TabsTrigger value="infos">Infos</TabsTrigger>
            <TabsTrigger value="stories">Stories</TabsTrigger>
            <TabsTrigger value="clients">Clients</TabsTrigger>
            <TabsTrigger value="products">Produits</TabsTrigger>
            <TabsTrigger value="orders">Commandes</TabsTrigger>
            <TabsTrigger value="calendar">Calendrier</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
            <TabsTrigger value="marketing">Marketing</TabsTrigger>
            <TabsTrigger value="reviews">Avis</TabsTrigger>
            <TabsTrigger value="stats">Stats</TabsTrigger>
            <TabsTrigger value="config">Config</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="infos" className="mt-6">
          <ShopInfoSection shop={shop} />
        </TabsContent>

        <TabsContent value="stories" className="mt-6">
          <ShopStoriesSection shopId={shop.id} />
        </TabsContent>

        <TabsContent value="clients" className="mt-6">
          <ClientsTab />
        </TabsContent>

        <TabsContent value="products" className="mt-6">
          <ProductsServicesTab />
        </TabsContent>

        <TabsContent value="orders" className="mt-6">
          <OrdersTab />
        </TabsContent>

        <TabsContent value="calendar" className="mt-6">
          <CalendarTab />
        </TabsContent>

        <TabsContent value="messages" className="mt-6">
          <MessagesTab />
        </TabsContent>

        <TabsContent value="marketing" className="mt-6">
          <MarketingTab />
        </TabsContent>

        <TabsContent value="reviews" className="mt-6">
          <ReviewsTab />
        </TabsContent>

        <TabsContent value="stats" className="mt-6">
          <StatsTab />
        </TabsContent>

        <TabsContent value="config" className="mt-6">
          <ConfigTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
