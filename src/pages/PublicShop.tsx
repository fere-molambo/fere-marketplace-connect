import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  Phone,
  Clock,
  Star,
  Package,
  Wrench,
  MessageSquare,
  ArrowLeft,
  ShieldCheck,
} from "lucide-react";
import { PublicProductCard } from "@/components/landing/PublicProductCard";
import { PublicServiceCard } from "@/components/landing/PublicServiceCard";
import { ReviewCard } from "@/components/reviews/ReviewCard";


interface Shop {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  shop_type: string;
  is_official: boolean;
  address: string | null;
  support_phone: string | null;
  opening_time: string | null;
  closing_time: string | null;
}

interface Story {
  id: string;
  media_url: string;
  media_type: string;
  caption: string | null;
  expires_at: string | null;
  linked_product_id: string | null;
  linked_service_id: string | null;
}

export default function PublicShop() {
  const { shopId } = useParams<{ shopId: string }>();
  const navigate = useNavigate();
  const [selectedStoryIndex, setSelectedStoryIndex] = useState<number | null>(null);

  // Fetch shop details
  const { data: shop, isLoading: shopLoading } = useQuery({
    queryKey: ["public-shop", shopId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shops")
        .select("id, name, slug, description, logo_url, banner_url, shop_type, is_official, address, support_phone, opening_time, closing_time")
        .eq("id", shopId)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return data as Shop | null;
    },
    enabled: !!shopId,
  });

  // Fetch shop stories
  const { data: stories = [] } = useQuery({
    queryKey: ["public-shop-stories", shopId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shop_stories")
        .select("id, media_url, media_type, caption, expires_at, linked_product_id, linked_service_id")
        .eq("shop_id", shopId)
        .eq("is_active", true)
        .eq("visibility", "public")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Story[];
    },
    enabled: !!shopId,
  });

  // Fetch products
  const { data: products = [] } = useQuery({
    queryKey: ["public-shop-products", shopId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price, price_type, main_media_url, discount_percent, description, condition, quantity_available, category_id, subcategory_id, colors, sizes")
        .eq("shop_id", shopId)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!shopId,
  });

  // Fetch services
  const { data: services = [] } = useQuery({
    queryKey: ["public-shop-services", shopId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("id, name, price, price_type, main_image_url, discount_percent, description, duration_minutes, category_id")
        .eq("shop_id", shopId)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!shopId,
  });

  // Fetch reviews
  const { data: reviews = [] } = useQuery({
    queryKey: ["public-shop-reviews", shopId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shop_reviews")
        .select(`
          *,
          profiles:user_id (nom_complet, photo_profil),
          review_replies (
            id,
            reply,
            created_at,
            profiles:user_id (nom_complet, photo_profil)
          )
        `)
        .eq("shop_id", shopId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!shopId,
  });

  // Calculate stats
  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  if (shopLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1">
          <div className="h-48 md:h-64 bg-muted animate-pulse" />
          <div className="container mx-auto px-4 py-8">
            <div className="h-8 w-48 bg-muted animate-pulse rounded mb-4" />
            <div className="h-4 w-96 bg-muted animate-pulse rounded" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold mb-4">Boutique non trouvée</h1>
            <p className="text-muted-foreground mb-6">
              Cette boutique n'existe pas ou n'est plus disponible.
            </p>
            <Link to="/vendeurs">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour aux vendeurs
              </Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1">
        {/* Back button */}
        <div className="container mx-auto px-4 py-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Button>
        </div>

        {/* Banner */}
        <div className="relative h-48 md:h-64 bg-muted overflow-hidden">
          {shop.banner_url ? (
            <img
              src={shop.banner_url}
              alt={`${shop.name} banner`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-primary/20 to-primary/10" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
        </div>

        {/* Shop Info */}
        <div className="container mx-auto px-4">
          <div className="relative -mt-16 md:-mt-20 mb-6">
            <div className="flex flex-col md:flex-row md:items-end gap-4">
              {/* Logo */}
              <div className="h-24 w-24 md:h-32 md:w-32 rounded-xl border-4 border-background bg-background overflow-hidden shadow-lg">
                {shop.logo_url ? (
                  <img
                    src={shop.logo_url}
                    alt={shop.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                    <span className="text-3xl font-bold text-primary">
                      {shop.name.charAt(0)}
                    </span>
                  </div>
                )}
              </div>

              {/* Name and badges */}
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl md:text-3xl font-bold">{shop.name}</h1>
                  {shop.is_official && (
                    <Badge className="bg-primary">
                      <ShieldCheck className="h-3 w-3 mr-1" />
                      Officiel
                    </Badge>
                  )}
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    {averageRating.toFixed(1)} ({reviews.length} avis)
                  </span>
                  <span className="flex items-center gap-1">
                    <Package className="h-4 w-4" />
                    {products.length} produits
                  </span>
                  <span className="flex items-center gap-1">
                    <Wrench className="h-4 w-4" />
                    {services.length} services
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Description and Info */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="md:col-span-2">
              {shop.description && (
                <p className="text-muted-foreground">{shop.description}</p>
              )}
            </div>
            <div className="space-y-3">
              {shop.address && (
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <span>{shop.address}</span>
                </div>
              )}
              {shop.support_phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${shop.support_phone}`} className="hover:underline">
                    {shop.support_phone}
                  </a>
                </div>
              )}
              {(shop.opening_time || shop.closing_time) && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {shop.opening_time?.slice(0, 5)} - {shop.closing_time?.slice(0, 5)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Stories */}
          {stories.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-4">Stories</h2>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {stories.map((story, index) => (
                  <button
                    key={story.id}
                    onClick={() => setSelectedStoryIndex(index)}
                    className="flex-shrink-0 h-20 w-20 rounded-full border-2 border-primary p-0.5 overflow-hidden hover:scale-105 transition-transform"
                  >
                    {story.media_type === "video" ? (
                      <video
                        src={story.media_url}
                        className="w-full h-full object-cover rounded-full"
                        muted
                      />
                    ) : (
                      <img
                        src={story.media_url}
                        alt=""
                        className="w-full h-full object-cover rounded-full"
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tabs */}
          <Tabs defaultValue="products" className="mb-8">
            <TabsList className="mb-6">
              <TabsTrigger value="products" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Produits ({products.length})
              </TabsTrigger>
              <TabsTrigger value="services" className="flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                Services ({services.length})
              </TabsTrigger>
              <TabsTrigger value="reviews" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Avis ({reviews.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="products">
              {products.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  Aucun produit disponible
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {products.map((product) => (
                    <PublicProductCard 
                      key={product.id} 
                      product={{
                        ...product,
                        shops: { id: shop.id, name: shop.name, logo_url: shop.logo_url, is_official: shop.is_official || false }
                      }} 
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="services">
              {services.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  Aucun service disponible
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {services.map((service) => (
                    <PublicServiceCard 
                      key={service.id} 
                      service={{
                        ...service,
                        shops: { id: shop.id, name: shop.name, logo_url: shop.logo_url, is_official: shop.is_official || false }
                      }} 
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="reviews">
              {reviews.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  Aucun avis pour le moment
                </div>
              ) : (
                <div className="space-y-4 max-w-2xl">
                  {reviews.map((review: any) => (
                    <ReviewCard
                      key={review.id}
                      review={review}
                      canManage={false}
                      canReply={false}
                      currentUserId={undefined}
                      onDelete={() => {}}
                      onDeleteReply={() => {}}
                      onReplyAdded={() => {}}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  );
}
