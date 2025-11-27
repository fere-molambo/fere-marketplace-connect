import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ProductMediaUpload } from "./ProductMediaUpload";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface CreateServiceDialogProps {
  shopId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateServiceDialog = ({ shopId, open, onOpenChange }: CreateServiceDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [includes, setIncludes] = useState("");
  const [clientPreparation, setClientPreparation] = useState("");
  const [price, setPrice] = useState("");
  const [requiresBooking, setRequiresBooking] = useState(false);
  const [bookingAdvance, setBookingAdvance] = useState("0");
  const [discount, setDiscount] = useState("0");
  const [isActive, setIsActive] = useState(true);
  
  const [mainMedia, setMainMedia] = useState("");
  const [hoverMedia, setHoverMedia] = useState("");
  const [video, setVideo] = useState("");
  const [otherMedia, setOtherMedia] = useState<string[]>([]);
  
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!mainMedia) {
      toast({
        title: "Erreur",
        description: "L'image principale est obligatoire",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from("services").insert({
        shop_id: shopId,
        name,
        description,
        includes,
        client_preparation: clientPreparation || null,
        price: parseFloat(price),
        price_type: "fixe",
        requires_booking: requiresBooking,
        booking_advance_percent: requiresBooking ? parseFloat(bookingAdvance) : null,
        discount_percent: parseFloat(discount),
        is_active: isActive,
        main_media_url: mainMedia,
        hover_media_url: hoverMedia || null,
        video_url: video || null,
        media_urls: otherMedia,
      });

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Prestation créée avec succès",
      });
      
      queryClient.invalidateQueries({ queryKey: ["shop-services", shopId] });
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error("Error creating service:", error);
      toast({
        title: "Erreur",
        description: "Impossible de créer la prestation",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setIncludes("");
    setClientPreparation("");
    setPrice("");
    setDiscount("0");
    setMainMedia("");
    setHoverMedia("");
    setVideo("");
    setOtherMedia([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Créer une prestation</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <ProductMediaUpload
            shopId={shopId}
            onMainMediaChange={setMainMedia}
            onHoverMediaChange={setHoverMedia}
            onVideoChange={setVideo}
            onOtherMediaChange={setOtherMedia}
            bucketName="service-media"
          />

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="name">Nom de la prestation *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="col-span-2 space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="col-span-2 space-y-2">
              <Label htmlFor="includes">Ce qui est inclus</Label>
              <Textarea
                id="includes"
                value={includes}
                onChange={(e) => setIncludes(e.target.value)}
                rows={2}
              />
            </div>

            <div className="col-span-2 space-y-2">
              <Label htmlFor="client-preparation">À préparer par le client</Label>
              <Textarea
                id="client-preparation"
                value={clientPreparation}
                onChange={(e) => setClientPreparation(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Prix (FCFA) *</Label>
              <Input
                id="price"
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="discount">Réduction (%)</Label>
              <Input
                id="discount"
                type="number"
                min="0"
                max="100"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
              />
            </div>

            <div className="col-span-2 space-y-4 p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <Label htmlFor="requires-booking">Réservation requise</Label>
                <Switch
                  id="requires-booking"
                  checked={requiresBooking}
                  onCheckedChange={setRequiresBooking}
                />
              </div>

              {requiresBooking && (
                <div className="space-y-2">
                  <Label htmlFor="booking-advance">Montant d'avance (%)</Label>
                  <Input
                    id="booking-advance"
                    type="number"
                    min="0"
                    max="100"
                    value={bookingAdvance}
                    onChange={(e) => setBookingAdvance(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="col-span-2 flex items-center justify-between">
              <Label htmlFor="active">Prestation active</Label>
              <Switch
                id="active"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Création..." : "Créer la prestation"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
