import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { PublicProductCard } from "@/components/landing/PublicProductCard";
import { PublicServiceCard } from "@/components/landing/PublicServiceCard";
import { 
  Store, 
  BadgeCheck, 
  MapPin, 
  Phone, 
  Mail, 
  Clock,
  Star,
  Package,
  Briefcase,
  ArrowLeft,
  MessageCircle
} from "lucide-react";

const ShopPublic = () => {
  const { shopId } = useParams<{ shopId: string }>();
  const [activeTab, setActiveTab] = useState("produits");

  // Fetch shop data
  const { data: shop, isLoading: shopLoading } = useQuery({
    queryKey: ["public-shop", shopId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shops")
        .select("*")
        .eq("id", shopId)
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!shopId,
  });

  // Fetch shop products
  const { data: products = [] } = useQuery({
    queryKey: ["public-shop-products", shopId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("shop_id", shopId)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!shopId,
  });

  // Fetch shop services
  const { data: services = [] } = useQuery({
    queryKey: ["public-shop-services", shopId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("shop_id", shopId)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!shopId,
  });

  // Fetch shop reviews
  const { data: reviews = [] } = useQuery({
    queryKey: ["public-shop-reviews", shopId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shop_reviews")
        .select(`
          *,
          profiles:user_id (nom_complet, photo_profil)
        `)
        .eq("shop_id", shopId)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      return data || [];
    },
    enabled: !!shopId,
  });

  const averageRating = reviews.length > 0 
    ? (reviews.reduce((acc: number, r: any) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : "0";

  const getShopTypeLabel = (type: string) => {
    switch (type) {
      case "produits": return "Produits";
      case "services": return "Services";
      case "les_deux": return "Produits & Services";
      default: return type;
    }
  };

  if (shopLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-6">
          <Skeleton className="h-48 w-full mb-6" />
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-4 w-full max-w-lg" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-12 text-center">
          <Store className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Boutique non trouvée</h1>
          <p className="text-muted-foreground mb-6">
            Cette boutique n'existe pas ou n'est plus disponible.
          </p>
          <Link to="/vendeurs">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour aux vendeurs
            </Button>
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Banner */}
        <div className="h-48 md:h-64 bg-gradient-to-r from-primary/20 to-primary/5 relative">
          {shop.banner_url && (
            <img 
              src={shop.banner_url} 
              alt="" 
              className="w-full h-full object-cover"
            />
          )}
        </div>

        <div className="container mx-auto px-4">
          {/* Shop Header */}
          <div className="relative -mt-16 mb-6">
            <div className="flex flex-col md:flex-row md:items-end gap-4">
              {/* Logo */}
              <div className="w-28 h-28 md:w-32 md:h-32 rounded-xl border-4 border-background bg-muted overflow-hidden shadow-lg">
                {shop.logo_url ? (
                  <img 
                    src={shop.logo_url} 
                    alt={shop.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Store className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 pb-2">
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-2xl md:text-3xl font-bold">{shop.name}</h1>
                  {shop.is_official && (
                    <BadgeCheck className="h-6 w-6 text-primary fill-primary/20" />
                  )}
                </div>
                
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <Badge variant="secondary">{getShopTypeLabel(shop.shop_type)}</Badge>
                  {shop.is_official && <Badge variant="outline">Officiel</Badge>}
                </div>

                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span>{averageRating} ({reviews.length} avis)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Package className="h-4 w-4" />
                    <span>{products.length} produits</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Briefcase className="h-4 w-4" />
                    <span>{services.length} services</span>
                  </div>
                </div>
              </div>

              {/* Contact Buttons */}
              <div className="flex gap-2">
                {shop.contact_phone && (
                  <a href={`tel:${shop.contact_phone}`}>
                    <Button variant="outline" size="sm">
                      <Phone className="h-4 w-4 mr-2" />
                      Appeler
                    </Button>
                  </a>
                )}
                {shop.support_phone && (
                  <a href={`https://wa.me/${shop.support_phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" className="bg-green-600 hover:bg-green-700">
                      <MessageCircle className="h-4 w-4 mr-2" />
                      WhatsApp
                    </Button>
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Description & Info */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2">
              {shop.description && (
                <p className="text-muted-foreground mb-4">{shop.description}</p>
              )}
            </div>
            
            <div className="space-y-3 text-sm">
              {shop.address && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <span>{shop.address}</span>
                </div>
              )}
              {(shop.opening_time || shop.closing_time) && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{shop.opening_time} - {shop.closing_time}</span>
                </div>
              )}
              {shop.contact_email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a href={`mailto:${shop.contact_email}`} className="text-primary hover:underline">
                    {shop.contact_email}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Products & Services Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
            <TabsList className="mb-6">
              <TabsTrigger value="produits" className="gap-2">
                <Package className="h-4 w-4" />
                Produits ({products.length})
              </TabsTrigger>
              <TabsTrigger value="services" className="gap-2">
                <Briefcase className="h-4 w-4" />
                Services ({services.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="produits">
              {products.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Aucun produit disponible</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {products.map((product: any) => (
                    <PublicProductCard 
                      key={product.id} 
                      product={product}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="services">
              {services.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Aucun service disponible</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {services.map((service: any) => (
                    <PublicServiceCard 
                      key={service.id} 
                      service={service}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Reviews Section */}
          {reviews.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                Avis clients
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {reviews.map((review: any) => (
                  <div key={review.id} className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-full bg-muted overflow-hidden">
                        {review.profiles?.photo_profil ? (
                          <img src={review.profiles.photo_profil} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs font-medium">
                            {review.profiles?.nom_complet?.charAt(0) || "?"}
                          </div>
                        )}
                      </div>
                      <span className="font-medium text-sm">{review.profiles?.nom_complet || "Anonyme"}</span>
                      <div className="flex items-center gap-0.5 ml-auto">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star 
                            key={i} 
                            className={`h-3 w-3 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted'}`} 
                          />
                        ))}
                      </div>
                    </div>
                    {review.comment && (
                      <p className="text-sm text-muted-foreground">{review.comment}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ShopPublic;
