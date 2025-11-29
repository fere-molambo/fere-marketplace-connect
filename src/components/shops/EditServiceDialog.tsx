import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProductMediaUpload } from "./ProductMediaUpload";
import { WeeklyAvailabilityManager, WeeklyAvailability } from "./WeeklyAvailabilityManager";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface EditServiceDialogProps {
  shopId: string;
  service: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EditServiceDialog = ({ shopId, service, open, onOpenChange }: EditServiceDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [mainMediaUrl, setMainMediaUrl] = useState("");
  const [hoverMediaUrl, setHoverMediaUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [price, setPrice] = useState("");
  const [priceType, setPriceType] = useState("fixe");
  const [minAutoPrice, setMinAutoPrice] = useState("");
  const [autoValidation, setAutoValidation] = useState(true);
  const [includes, setIncludes] = useState("");
  const [clientPreparation, setClientPreparation] = useState("");
  const [portfolioLink, setPortfolioLink] = useState("");
  const [requiresBooking, setRequiresBooking] = useState(false);
  const [bookingAdvancePercent, setBookingAdvancePercent] = useState("");
  const [discountPercent, setDiscountPercent] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [weeklyAvailability, setWeeklyAvailability] = useState<WeeklyAvailability>({
    lundi: [],
    mardi: [],
    mercredi: [],
    jeudi: [],
    vendredi: [],
    samedi: [],
    dimanche: [],
  });

  useEffect(() => {
    if (service) {
      setName(service.name || "");
      setDescription(service.description || "");
      setMainMediaUrl(service.main_media_url || "");
      setHoverMediaUrl(service.hover_media_url || "");
      setVideoUrl(service.video_url || "");
      setMediaUrls(Array.isArray(service.media_urls) ? service.media_urls : []);
      setPrice(service.price?.toString() || "");
      setPriceType(service.price_type || "fixe");
      setMinAutoPrice(service.min_auto_price?.toString() || "");
      setAutoValidation(service.auto_validation ?? true);
      setIncludes(service.includes || "");
      setClientPreparation(service.client_preparation || "");
      setPortfolioLink(service.portfolio_link || "");
      setRequiresBooking(service.requires_booking || false);
      setBookingAdvancePercent(service.booking_advance_percent?.toString() || "");
      setDiscountPercent(service.discount_percent?.toString() || "");
      setIsActive(service.is_active ?? true);
      
    const defaultAvailability: WeeklyAvailability = {
      lundi: [],
      mardi: [],
      mercredi: [],
      jeudi: [],
      vendredi: [],
      samedi: [],
      dimanche: [],
    };

    if (service.weekly_availability && typeof service.weekly_availability === 'object') {
      setWeeklyAvailability({
        ...defaultAvailability,
        ...service.weekly_availability
      });
    } else {
      setWeeklyAvailability(defaultAvailability);
    }
    }
  }, [service]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!mainMediaUrl) {
      toast({
        title: "Erreur",
        description: "Veuillez ajouter au moins une image principale",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("services")
        .update({
          name,
          description,
          main_media_url: mainMediaUrl,
          hover_media_url: hoverMediaUrl || null,
          video_url: videoUrl || null,
          media_urls: mediaUrls,
          price: parseFloat(price),
          price_type: priceType,
          min_auto_price: minAutoPrice ? parseFloat(minAutoPrice) : null,
          auto_validation: autoValidation,
          includes,
          client_preparation: clientPreparation,
          portfolio_link: portfolioLink || null,
          requires_booking: requiresBooking,
          booking_advance_percent: bookingAdvancePercent ? parseFloat(bookingAdvancePercent) : null,
          discount_percent: discountPercent ? parseFloat(discountPercent) : null,
          is_active: isActive,
          weekly_availability: weeklyAvailability as any,
        })
        .eq("id", service.id);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "La prestation a été modifiée avec succès",
      });

      queryClient.invalidateQueries({ queryKey: ["shop-services", shopId] });
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error updating service:", error);
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue lors de la modification",
        variant: "destructive",
      });
    }
  };

  const discountedPrice = discountPercent && price 
    ? parseFloat(price) * (1 - parseFloat(discountPercent) / 100) 
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier la prestation</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <ProductMediaUpload
            shopId={shopId}
            onMainMediaChange={setMainMediaUrl}
            onHoverMediaChange={setHoverMediaUrl}
            onVideoChange={setVideoUrl}
            onOtherMediaChange={setMediaUrls}
            bucketName="service-media"
            initialMainMedia={service?.main_media_url}
            initialHoverMedia={service?.hover_media_url}
            initialVideo={service?.video_url}
            initialOtherMedia={service?.media_urls}
          />

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="name">Nom de la prestation *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Ex: Coiffure femme complète"
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Décrivez votre prestation..."
                rows={3}
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="includes">Ce qui est inclus</Label>
              <Textarea
                id="includes"
                value={includes}
                onChange={(e) => setIncludes(e.target.value)}
                placeholder="Ex: Shampoing, coupe, brushing..."
                rows={2}
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="clientPreparation">Préparation du client</Label>
              <Textarea
                id="clientPreparation"
                value={clientPreparation}
                onChange={(e) => setClientPreparation(e.target.value)}
                placeholder="Ex: Venir avec les cheveux propres..."
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="priceType">Type de tarif *</Label>
              <Select value={priceType} onValueChange={setPriceType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixe">Fixe</SelectItem>
                  <SelectItem value="negoce">Négoce</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="price">Prix (FCFA) *</Label>
              <Input
                id="price"
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
                placeholder="5000"
              />
            </div>

            {priceType === "negoce" && (
              <>
                <div>
                  <Label htmlFor="minAutoPrice">Montant minimum auto (FCFA)</Label>
                  <Input
                    id="minAutoPrice"
                    type="number"
                    value={minAutoPrice}
                    onChange={(e) => setMinAutoPrice(e.target.value)}
                    placeholder="4000"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="autoValidation"
                    checked={autoValidation}
                    onCheckedChange={setAutoValidation}
                  />
                  <Label htmlFor="autoValidation">Validation automatique</Label>
                </div>
              </>
            )}

          <div className="col-span-2">
            <Label htmlFor="discountPercent">Réduction (%)</Label>
            <Input
              id="discountPercent"
              type="number"
              value={discountPercent}
              onChange={(e) => setDiscountPercent(e.target.value)}
              placeholder="0"
              min="0"
              max="100"
            />
            {discountPercent && parseFloat(discountPercent) > 0 && price && (
              <p className="text-sm text-muted-foreground mt-1">
                Prix après réduction : {(parseFloat(price) * (1 - parseFloat(discountPercent) / 100)).toLocaleString()} FCFA{" "}
                <span className="line-through">(au lieu de {parseFloat(price).toLocaleString()} FCFA)</span>
              </p>
            )}
          </div>

            <div>
              <Label htmlFor="portfolioLink">Lien portfolio</Label>
              <Input
                id="portfolioLink"
                type="url"
                value={portfolioLink}
                onChange={(e) => setPortfolioLink(e.target.value)}
                placeholder="https://..."
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="requiresBooking"
                checked={requiresBooking}
                onCheckedChange={setRequiresBooking}
              />
              <Label htmlFor="requiresBooking">Réservation obligatoire</Label>
            </div>

            {requiresBooking && (
              <div>
                <Label htmlFor="bookingAdvancePercent">Acompte (%)</Label>
                <Input
                  id="bookingAdvancePercent"
                  type="number"
                  value={bookingAdvancePercent}
                  onChange={(e) => setBookingAdvancePercent(e.target.value)}
                  placeholder="30"
                  min="0"
                  max="100"
                />
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
              <Label htmlFor="isActive">Prestation active</Label>
            </div>
          </div>

          <WeeklyAvailabilityManager
            value={weeklyAvailability}
            onChange={setWeeklyAvailability}
          />

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit">Modifier la prestation</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
