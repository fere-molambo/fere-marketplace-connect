import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Calendar } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface ServiceCardProps {
  service: any;
}

export const ServiceCard = ({ service }: ServiceCardProps) => {
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

  return (
    <Card className="overflow-hidden">
      <div className="aspect-square relative">
        <img
          src={service.main_media_url || "/placeholder.svg"}
          alt={service.name}
          className="w-full h-full object-cover"
        />
        {service.discount_percent > 0 && (
          <Badge className="absolute top-2 right-2" variant="destructive">
            -{service.discount_percent}%
          </Badge>
        )}
        {service.requires_booking && (
          <Badge className="absolute top-2 left-2" variant="secondary">
            <Calendar className="h-3 w-3 mr-1" />
            Réservation
          </Badge>
        )}
      </div>
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
          <Button size="icon" variant="ghost">
            <Edit className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};
