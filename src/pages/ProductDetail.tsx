import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FlashSaleCountdown } from "@/components/ui/FlashSaleCountdown";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { 
  Heart, Share2, ShoppingCart, ArrowLeft, Star, Package, 
  Truck, RotateCcw, MessageCircle, Store, BadgeCheck, FileText,
  Plus, Minus, ChevronLeft, ChevronRight
} from "lucide-react";
import { toast } from "sonner";

const ProductDetail = () => {
  const { productId } = useParams();
  const [quantity, setQuantity] = useState(1);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showGuide, setShowGuide] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  const { data: product, isLoading } = useQuery({
    queryKey: ["product-detail", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          shops (
            id, name, logo_url, is_official, contact_email, support_phone,
            delivery_details, return_policy, guide_url, guide_name
          ),
          product_categories!products_category_id_fkey (name),
          subcategory:product_categories!products_subcategory_id_fkey (name)
        `)
        .eq("id", productId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!productId,
  });

  const { data: flashSale } = useQuery({
    queryKey: ["flash-sale-product", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("flash_sales")
        .select("*")
        .eq("product_id", productId)
        .eq("is_active", true)
        .gt("ends_at", new Date().toISOString())
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!productId,
  });

  const { data: similarProducts = [] } = useQuery({
    queryKey: ["similar-products", product?.category_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, shops(name, logo_url)")
        .eq("category_id", product?.category_id)
        .eq("is_active", true)
        .neq("id", productId)
        .limit(6);
      if (error) throw error;
      return data;
    },
    enabled: !!product?.category_id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <h1 className="text-xl font-bold mb-4">Produit non trouvé</h1>
        <Link to="/">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour à l'accueil
          </Button>
        </Link>
      </div>
    );
  }

  const mediaUrls = Array.isArray(product.media_urls) ? product.media_urls as string[] : [];
  const allMedia: string[] = [
    product.main_media_url,
    product.hover_media_url,
    product.video_url,
    ...mediaUrls,
  ].filter((m): m is string => typeof m === 'string' && m.length > 0);

  const colors = Array.isArray(product.colors) ? product.colors as string[] : [];
  const sizes = Array.isArray(product.sizes) ? product.sizes as string[] : [];
  const quantityIntervals = Array.isArray(product.quantity_intervals) ? product.quantity_intervals : [];

  const basePrice = flashSale ? flashSale.flash_price : product.price;
  const discountedPrice = product.discount_percent 
    ? basePrice * (1 - product.discount_percent / 100) 
    : basePrice;

  const formatPrice = (price: number) => `${price.toLocaleString()} FCFA`;

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Lien copié");
  };

  const handleAddToCart = () => {
    toast.success(`${quantity} ${product.name} ajouté(s) au panier`);
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
        <h1 className="font-semibold truncate flex-1">{product.name}</h1>
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
                <img src={allMedia[currentImageIndex]} alt={product.name} className="w-full h-full object-cover" />
              )}
              
              {flashSale && (
                <div className="absolute top-4 left-4 right-4">
                  <FlashSaleCountdown 
                    endsAt={flashSale.ends_at} 
                    flashPrice={flashSale.flash_price}
                    originalPrice={product.price}
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

          {/* Product Info */}
          <div className="p-4 lg:p-0 space-y-4">
            <div>
              <h1 className="text-xl lg:text-2xl font-bold">{product.name}</h1>
              <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span>4.5</span>
                <span>•</span>
                <span>124 avis</span>
                <span>•</span>
                <span>350 vendus</span>
              </div>
            </div>

            {/* Category */}
            <div className="flex gap-2 text-sm">
              {product.product_categories?.name && (
                <Badge variant="secondary">{product.product_categories.name}</Badge>
              )}
              {product.subcategory?.name && (
                <Badge variant="outline">{product.subcategory.name}</Badge>
              )}
            </div>

            {/* Price */}
            <div className="space-y-1">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-primary">{formatPrice(discountedPrice)}</span>
                {(product.discount_percent > 0 || flashSale) && (
                  <span className="text-lg text-muted-foreground line-through">
                    {formatPrice(product.price)}
                  </span>
                )}
              </div>
              <Badge variant="outline">{product.price_type === "unitaire" ? "Prix unitaire" : product.price_type === "en_gros" ? "Prix en gros" : "Prix négociable"}</Badge>
            </div>

            {/* Bulk pricing intervals */}
            {product.price_type === "en_gros" && quantityIntervals.length > 0 && (
              <div className="bg-muted p-3 rounded-lg space-y-1 text-sm">
                <p className="font-medium">Tarifs en gros :</p>
                {quantityIntervals.map((interval: any, index: number) => (
                  <p key={index}>
                    {interval.min} - {interval.max} unités : {formatPrice(interval.price)}
                  </p>
                ))}
              </div>
            )}

            {/* Condition & Stock */}
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm capitalize">{product.condition || "Neuf"}</span>
              </div>
              <div className="text-sm">
                <span className={product.quantity_available > 0 ? "text-green-600" : "text-red-600"}>
                  {product.quantity_available > 0 ? `${product.quantity_available} disponible(s)` : "Rupture de stock"}
                </span>
              </div>
            </div>

            {/* Colors */}
            {colors.length > 0 && (
              <div className="space-y-2">
                <p className="font-medium text-sm">Couleur :</p>
                <div className="flex gap-2 flex-wrap">
                  {colors.map((color: string, index: number) => (
                    <button
                      key={index}
                      onClick={() => setSelectedColor(color)}
                      className={`w-8 h-8 rounded-full border-2 ${selectedColor === color ? "border-primary ring-2 ring-primary/50" : "border-muted"}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Sizes */}
            {sizes.length > 0 && (
              <div className="space-y-2">
                <p className="font-medium text-sm">Taille :</p>
                <div className="flex gap-2 flex-wrap">
                  {sizes.map((size: string, index: number) => (
                    <Button
                      key={index}
                      variant={selectedSize === size ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedSize(size)}
                    >
                      {size}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div className="space-y-2">
              <p className="font-medium text-sm">Quantité :</p>
              <div className="flex items-center gap-4">
                <div className="flex items-center border rounded-lg">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setQuantity(q => Math.max(product.min_quantity || 1, q - 1))}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-12 text-center font-medium">{quantity}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setQuantity(q => Math.min(product.quantity_available || 999, q + 1))}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {product.min_quantity > 1 && (
                  <span className="text-sm text-muted-foreground">Min: {product.min_quantity}</span>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <Button className="flex-1" onClick={handleAddToCart}>
                <ShoppingCart className="h-4 w-4 mr-2" />
                Ajouter au panier
              </Button>
              <Button variant="secondary" className="flex-1">
                Acheter
              </Button>
            </div>

            {/* Guide */}
            {product.shops?.guide_url && (
              <Button variant="outline" className="w-full" onClick={() => setShowGuide(true)}>
                <FileText className="h-4 w-4 mr-2" />
                Voir le guide : {product.shops.guide_name || "Manuel"}
              </Button>
            )}

            <Separator />

            {/* Vendor Info */}
            <div className="bg-muted/50 p-4 rounded-lg space-y-3">
              <div className="flex items-center gap-3">
                <div className="relative">
                  {product.shops?.logo_url ? (
                    <img src={product.shops.logo_url} alt={product.shops.name} className="w-12 h-12 rounded-full object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Store className="h-6 w-6 text-primary" />
                    </div>
                  )}
                  {product.shops?.is_official && (
                    <BadgeCheck className="absolute -bottom-1 -right-1 h-5 w-5 text-primary fill-primary/20" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-semibold flex items-center gap-1">
                    {product.shops?.name}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    <span>4.8</span>
                    <span>•</span>
                    <span>156 produits</span>
                    <span>•</span>
                    <span>1.2k vendus</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Message
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  <Store className="h-4 w-4 mr-2" />
                  Voir boutique
                </Button>
              </div>
            </div>

            {/* Delivery & Returns */}
            <div className="space-y-3">
              {product.shops?.delivery_details && (
                <div className="flex gap-3">
                  <Truck className="h-5 w-5 text-primary flex-shrink-0" />
                  <div>
                    <p className="font-medium text-sm">Livraison</p>
                    <p className="text-sm text-muted-foreground">{product.shops.delivery_details}</p>
                  </div>
                </div>
              )}
              {product.shops?.return_policy && (
                <div className="flex gap-3">
                  <RotateCcw className="h-5 w-5 text-primary flex-shrink-0" />
                  <div>
                    <p className="font-medium text-sm">Retours</p>
                    <p className="text-sm text-muted-foreground">{product.shops.return_policy}</p>
                  </div>
                </div>
              )}
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
                {product.description || "Aucune description disponible."}
              </p>
              {product.includes && (
                <div className="mt-4">
                  <p className="font-medium mb-2">Ce qui est inclus :</p>
                  <p className="text-muted-foreground whitespace-pre-wrap">{product.includes}</p>
                </div>
              )}
            </TabsContent>
            <TabsContent value="reviews" className="pt-4">
              <p className="text-muted-foreground text-center py-8">Aucun avis pour le moment</p>
            </TabsContent>
          </Tabs>
        </div>

        {/* Similar Products */}
        {similarProducts.length > 0 && (
          <div className="p-4 lg:p-6">
            <h2 className="text-lg font-bold mb-4">Produits similaires</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {similarProducts.map((p: any) => (
                <Link key={p.id} to={`/product/${p.id}`} className="block">
                  <div className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                    <div className="aspect-square bg-muted">
                      <img src={p.main_media_url} alt={p.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="p-3">
                      <p className="font-medium text-sm truncate">{p.name}</p>
                      <p className="text-primary font-bold">{formatPrice(p.price)}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Guide Dialog */}
      <Dialog open={showGuide} onOpenChange={setShowGuide}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{product.shops?.guide_name || "Guide"}</DialogTitle>
          </DialogHeader>
          {product.shops?.guide_url && (
            <iframe 
              src={product.shops.guide_url} 
              className="w-full h-[70vh] rounded-lg"
              title="Guide"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductDetail;
