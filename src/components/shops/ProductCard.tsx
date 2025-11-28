import { useState } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/components/ui/carousel";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { EditProductDialog } from "./EditProductDialog";

interface ProductCardProps {
  product: any;
  viewMode?: "cards" | "list";
}

export const ProductCard = ({ product, viewMode = "cards" }: ProductCardProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);

  const handleToggleActive = async () => {
    try {
      const { error } = await supabase
        .from("products")
        .update({ is_active: !product.is_active })
        .eq("id", product.id);

      if (error) throw error;

      toast({
        title: "Succès",
        description: `Produit ${!product.is_active ? "activé" : "désactivé"}`,
      });
      
      queryClient.invalidateQueries({ queryKey: ["shop-products"] });
    } catch (error) {
      console.error("Error toggling product:", error);
      toast({
        title: "Erreur",
        description: "Impossible de modifier le statut",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!confirm("Voulez-vous vraiment supprimer ce produit ?")) return;

    try {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", product.id);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Produit supprimé",
      });
      
      queryClient.invalidateQueries({ queryKey: ["shop-products"] });
    } catch (error) {
      console.error("Error deleting product:", error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le produit",
        variant: "destructive",
      });
    }
  };

  const allMedia = [
    product.main_media_url,
    product.hover_media_url,
    product.video_url,
    ...(Array.isArray(product.media_urls) ? product.media_urls : [])
  ].filter(Boolean);

  if (viewMode === "list") {
    return (
      <>
        <Card className="overflow-hidden">
          <div className="flex gap-4 p-4">
            <div className="w-32 h-32 flex-shrink-0">
              {allMedia.length > 0 && (
                <img
                  src={allMedia[0]}
                  alt={product.name}
                  className="w-full h-full object-cover rounded"
                />
              )}
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{product.name}</h3>
                  {product.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={product.is_active}
                    onCheckedChange={handleToggleActive}
                  />
                  <Button variant="ghost" size="icon" onClick={() => setEditOpen(true)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={handleDelete}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="font-semibold text-lg">{product.price.toLocaleString()} FCFA</span>
                {product.discount_percent > 0 && (
                  <Badge variant="destructive">-{product.discount_percent}%</Badge>
                )}
                {product.condition && (
                  <Badge variant="outline">{product.condition}</Badge>
                )}
                {product.quantity_available !== null && (
                  <span className="text-muted-foreground">Stock: {product.quantity_available}</span>
                )}
              </div>
            </div>
          </div>
        </Card>
        <EditProductDialog
          shopId={product.shop_id}
          product={product}
          open={editOpen}
          onOpenChange={setEditOpen}
        />
      </>
    );
  }

  return (
    <>
      <Card className="overflow-hidden">
        {allMedia.length > 0 && (
          <Carousel className="w-full">
            <CarouselContent>
              {allMedia.map((url, index) => (
                <CarouselItem key={index}>
                  <div className="aspect-square relative">
                    {url.includes('video') || url.endsWith('.mp4') ? (
                      <video src={url} className="w-full h-full object-cover" controls />
                    ) : (
                      <img src={url} alt={`${product.name} ${index + 1}`} className="w-full h-full object-cover" />
                    )}
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            {allMedia.length > 1 && (
              <>
                <CarouselPrevious className="left-2" />
                <CarouselNext className="right-2" />
              </>
            )}
          </Carousel>
        )}
        {product.discount_percent > 0 && (
          <Badge className="absolute top-2 right-2 z-10" variant="destructive">
            -{product.discount_percent}%
          </Badge>
        )}
        <CardContent className="p-4">
          <h3 className="font-semibold truncate">{product.name}</h3>
          <p className="text-sm text-muted-foreground truncate">{product.description}</p>
          <div className="flex items-center justify-between mt-2">
            <span className="font-bold text-lg">{product.price.toLocaleString()} FCFA</span>
            <Badge variant={product.condition === "neuf" ? "default" : "secondary"}>
              {product.condition === "neuf" ? "Neuf" : "2ème main"}
            </Badge>
          </div>
          {product.quantity_available !== null && (
            <p className="text-sm text-muted-foreground mt-1">
              Stock: {product.quantity_available}
            </p>
          )}
        </CardContent>
        <CardFooter className="p-4 pt-0 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Switch
              checked={product.is_active}
              onCheckedChange={handleToggleActive}
            />
            <span className="text-sm">{product.is_active ? "Actif" : "Inactif"}</span>
          </div>
          <div className="flex gap-2">
            <Button size="icon" variant="ghost" onClick={() => setEditOpen(true)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={handleDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardFooter>
        
        <EditProductDialog
          shopId={product.shop_id}
          product={product}
          open={editOpen}
          onOpenChange={setEditOpen}
        />
      </Card>
    </>
  );
};
