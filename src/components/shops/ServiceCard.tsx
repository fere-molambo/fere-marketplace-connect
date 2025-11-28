import { useState } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Calendar } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/components/ui/carousel";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { EditServiceDialog } from "./EditServiceDialog";

interface ServiceCardProps {
  service: any;
  viewMode?: "cards" | "list";
}

export const ServiceCard = ({ service, viewMode = "cards" }: ServiceCardProps) => {
  const [editOpen, setEditOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleToggleActive = async () => {
    try {
      const { error } = await supabase
        .from("services")
        .update({ is_active: !service.is_active })
        .eq("id", service.id);

      if (error) throw error;

      toast({
        title: "Succès",
        description: `Prestation ${!service.is_active ? "activée" : "désactivée"}`,
      });
      
      queryClient.invalidateQueries({ queryKey: ["shop-services"] });
    } catch (error) {
      console.error("Error toggling service:", error);
      toast({
        title: "Erreur",
        description: "Impossible de modifier le statut",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!confirm("Voulez-vous vraiment supprimer cette prestation ?")) return;

    try {
      const { error } = await supabase
        .from("services")
        .delete()
        .eq("id", service.id);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Prestation supprimée",
      });
      
      queryClient.invalidateQueries({ queryKey: ["shop-services"] });
    } catch (error) {
      console.error("Error deleting service:", error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la prestation",
        variant: "destructive",
      });
    }
  };

  const allMedia = [
    service.main_media_url,
    service.hover_media_url,
    service.video_url,
    ...(Array.isArray(service.media_urls) ? service.media_urls : [])
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
                  alt={service.name}
                  className="w-full h-full object-cover rounded"
                />
              )}
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{service.name}</h3>
                  {service.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{service.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={service.is_active}
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
                <span className="font-semibold text-lg">{service.price.toLocaleString()} FCFA</span>
                {service.discount_percent > 0 && (
                  <Badge variant="destructive">-{service.discount_percent}%</Badge>
                )}
                {service.requires_booking && (
                  <Badge>Réservation obligatoire</Badge>
                )}
              </div>
            </div>
          </div>
        </Card>
        <EditServiceDialog
          shopId={service.shop_id}
          service={service}
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
                      <img src={url} alt={`${service.name} ${index + 1}`} className="w-full h-full object-cover" />
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
        {service.discount_percent > 0 && (
          <Badge className="absolute top-2 right-2 z-10" variant="destructive">
            -{service.discount_percent}%
          </Badge>
        )}
        {service.requires_booking && (
          <Badge className="absolute top-2 left-2 z-10" variant="secondary">
            <Calendar className="h-3 w-3 mr-1" />
            Réservation
          </Badge>
        )}
        <CardContent className="p-4">
          <h3 className="font-semibold truncate">{service.name}</h3>
          <p className="text-sm text-muted-foreground truncate">{service.description}</p>
          <div className="flex items-center justify-between mt-2">
            <span className="font-bold text-lg">{service.price.toLocaleString()} FCFA</span>
            {service.booking_advance_percent > 0 && (
              <Badge variant="outline">
                Avance: {service.booking_advance_percent}%
              </Badge>
            )}
          </div>
        </CardContent>
        <CardFooter className="p-4 pt-0 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Switch
              checked={service.is_active}
              onCheckedChange={handleToggleActive}
            />
            <span className="text-sm">{service.is_active ? "Active" : "Inactive"}</span>
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
        <EditServiceDialog
          shopId={service.shop_id}
          service={service}
          open={editOpen}
          onOpenChange={setEditOpen}
        />
      </Card>
    </>
  );
};
