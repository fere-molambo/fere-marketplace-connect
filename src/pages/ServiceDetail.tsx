import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FlashSaleCountdown } from "@/components/ui/FlashSaleCountdown";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { 
  Heart, Share2, Calendar, ArrowLeft, Star, Clock, 
  MessageCircle, Store, BadgeCheck, Phone,
  ChevronLeft, ChevronRight, CheckCircle, AlertCircle
} from "lucide-react";
import { toast } from "sonner";

const ServiceDetail = () => {
  const { serviceId } = useParams();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);

  const { data: service, isLoading } = useQuery({
    queryKey: ["service-detail", serviceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select(`
          *,
          shops (
            id, name, logo_url, is_official, contact_email, support_phone
          )
        `)
        .eq("id", serviceId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!serviceId,
  });

  const { data: flashSale } = useQuery({
    queryKey: ["flash-sale-service", serviceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("flash_sales")
        .select("*")
        .eq("service_id", serviceId)
        .eq("is_active", true)
        .gt("ends_at", new Date().toISOString())
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!serviceId,
  });

  const { data: similarServices = [] } = useQuery({
    queryKey: ["similar-services", service?.shop_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("*, shops(name, logo_url)")
        .eq("shop_id", service?.shop_id)
        .eq("is_active", true)
        .neq("id", serviceId)
        .limit(6);
      if (error) throw error;
      return data;
    },
    enabled: !!service?.shop_id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <h1 className="text-xl font-bold mb-4">Prestation non trouvée</h1>
        <Link to="/">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour à l'accueil
          </Button>
        </Link>
      </div>
    );
  }

  const mediaUrls = Array.isArray(service.media_urls) ? service.media_urls as string[] : [];
  const allMedia: string[] = [
    service.main_media_url,
    service.hover_media_url,
    service.video_url,
    ...mediaUrls,
  ].filter((m): m is string => typeof m === 'string' && m.length > 0);

  const basePrice = flashSale ? flashSale.flash_price : service.price;
  const discountedPrice = service.discount_percent 
    ? basePrice * (1 - service.discount_percent / 100) 
    : basePrice;

  const formatPrice = (price: number) => `${price.toLocaleString()} FCFA`;
  
  const formatDuration = (minutes: number | null) => {
    if (!minutes) return null;
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Lien copié");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Header contextuel */}
      <div className="sticky top-16 z-40 bg-background border-b p-4 flex items-center gap-4">
        <Link to="/">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="font-semibold truncate flex-1">{service.name}</h1>
        <Button variant="ghost" size="icon" onClick={() => setIsFavorite(!isFavorite)}>
          <Heart className={`h-5 w-5 ${isFavorite ? "fill-red-500 text-red-500" : ""}`} />
        </Button>
        <Button variant="ghost" size="icon" onClick={handleShare}>
          <Share2 className="h-5 w-5" />
        </Button>
      </div>

      <div className="max-w-6xl mx-auto">
        <div className="lg:grid lg:grid-cols-2 lg:gap-8 lg:p-6">
          {/* Image Gallery */}
          <div className="relative">
            <div className="aspect-square relative overflow-hidden bg-muted">
              {allMedia[currentImageIndex]?.includes(".mp4") || allMedia[currentImageIndex]?.includes(".webm") ? (
                <video src={allMedia[currentImageIndex]} className="w-full h-full object-cover" controls />
              ) : (
                <img src={allMedia[currentImageIndex]} alt={service.name} className="w-full h-full object-cover" />
              )}
              
              {flashSale && (
                <div className="absolute top-4 left-4 right-4">
                  <FlashSaleCountdown 
                    endsAt={flashSale.ends_at} 
                    flashPrice={flashSale.flash_price}
                    originalPrice={service.price}
                  />
                </div>
              )}

              {allMedia.length > 1 && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80"
                    onClick={() => setCurrentImageIndex(i => i === 0 ? allMedia.length - 1 : i - 1)}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80"
                    onClick={() => setCurrentImageIndex(i => i === allMedia.length - 1 ? 0 : i + 1)}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </>
              )}
            </div>

            {/* Thumbnails */}
            {allMedia.length > 1 && (
              <div className="flex gap-2 p-4 overflow-x-auto">
                {allMedia.map((media, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 ${
                      currentImageIndex === index ? "border-primary" : "border-transparent"
                    }`}
                  >
                    <img src={media} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Service Info */}
          <div className="p-4 lg:p-0 space-y-4">
            <div>
              <h1 className="text-xl lg:text-2xl font-bold">{service.name}</h1>
              <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span>4.7</span>
                <span>•</span>
                <span>89 avis</span>
                <span>•</span>
                <span>215 réalisations</span>
              </div>
            </div>

            {/* Duration */}
            {service.duration && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <span className="font-medium">Durée : {formatDuration(service.duration)}</span>
              </div>
            )}

            {/* Price */}
            <div className="space-y-1">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-primary">{formatPrice(discountedPrice)}</span>
                {(service.discount_percent > 0 || flashSale) && (
                  <span className="text-lg text-muted-foreground line-through">
                    {formatPrice(service.price)}
                  </span>
                )}
              </div>
              <Badge variant="outline">{service.price_type === "fixe" ? "Prix fixe" : "Prix négociable"}</Badge>
            </div>

            {/* Booking info */}
            {service.requires_booking && (
              <div className="bg-primary/10 p-3 rounded-lg flex items-start gap-2">
                <Calendar className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Réservation requise</p>
                  {service.booking_advance_percent > 0 && (
                    <p className="text-sm text-muted-foreground">
                      Acompte de {service.booking_advance_percent}% à la réservation
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* What's included */}
            {service.includes && (
              <div className="space-y-2">
                <p className="font-medium flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Ce qui est inclus
                </p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap pl-6">
                  {service.includes}
                </p>
              </div>
            )}

            {/* Client preparation */}
            {service.client_preparation && (
              <div className="space-y-2">
                <p className="font-medium flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                  À préparer par le client
                </p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap pl-6">
                  {service.client_preparation}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <Button className="flex-1">
                <Calendar className="h-4 w-4 mr-2" />
                Réserver
              </Button>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1">
                <MessageCircle className="h-4 w-4 mr-2" />
                Message
              </Button>
              {service.shops?.support_phone && (
                <Button variant="outline" className="flex-1" asChild>
                  <a href={`tel:${service.shops.support_phone}`}>
                    <Phone className="h-4 w-4 mr-2" />
                    Appeler
                  </a>
                </Button>
              )}
            </div>

            <Separator />

            {/* Vendor Info */}
            <div className="bg-muted/50 p-4 rounded-lg space-y-3">
              <div className="flex items-center gap-3">
                <div className="relative">
                  {service.shops?.logo_url ? (
                    <img src={service.shops.logo_url} alt={service.shops.name} className="w-12 h-12 rounded-full object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Store className="h-6 w-6 text-primary" />
                    </div>
                  )}
                  {service.shops?.is_official && (
                    <BadgeCheck className="absolute -bottom-1 -right-1 h-5 w-5 text-primary fill-primary/20" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{service.shops?.name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    <span>4.9</span>
                    <span>•</span>
                    <span>42 prestations</span>
                    <span>•</span>
                    <span>890 réalisations</span>
                  </div>
                </div>
              </div>
              <Button variant="outline" size="sm" className="w-full">
                <Store className="h-4 w-4 mr-2" />
                Voir la boutique
              </Button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="p-4 lg:p-6">
          <Tabs defaultValue="description">
            <TabsList className="w-full">
              <TabsTrigger value="description" className="flex-1">Description</TabsTrigger>
              <TabsTrigger value="reviews" className="flex-1">Avis</TabsTrigger>
            </TabsList>
            <TabsContent value="description" className="pt-4">
              <p className="text-muted-foreground whitespace-pre-wrap">
                {service.description || "Aucune description disponible."}
              </p>
              {service.portfolio_link && (
                <div className="mt-4">
                  <a 
                    href={service.portfolio_link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Voir le portfolio →
                  </a>
                </div>
              )}
            </TabsContent>
            <TabsContent value="reviews" className="pt-4">
              <p className="text-muted-foreground text-center py-8">Aucun avis pour le moment</p>
            </TabsContent>
          </Tabs>
        </div>

        {/* Similar Services */}
        {similarServices.length > 0 && (
          <div className="p-4 lg:p-6">
            <h2 className="text-lg font-bold mb-4">Prestations similaires</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {similarServices.map((s: any) => (
                <Link key={s.id} to={`/service/${s.id}`} className="block">
                  <div className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                    <div className="aspect-square bg-muted">
                      <img src={s.main_media_url} alt={s.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="p-3">
                      <p className="font-medium text-sm truncate">{s.name}</p>
                      <p className="text-primary font-bold">{formatPrice(s.price)}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ServiceDetail;
