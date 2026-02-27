import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProductMediaUpload } from "./ProductMediaUpload";
import { VendorNetAmountDisplay } from "./VendorNetAmountDisplay";
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
  const [duration, setDuration] = useState("");
  const [customDuration, setCustomDuration] = useState("");
  const [customDurationUnit, setCustomDurationUnit] = useState<"min" | "h" | "j">("h");
  const [price, setPrice] = useState("");
  const [priceType, setPriceType] = useState("fixe");
  const [minAutoPrice, setMinAutoPrice] = useState("");
  const [autoValidation, setAutoValidation] = useState(true);
  const [includes, setIncludes] = useState("");
  const [clientPreparation, setClientPreparation] = useState("");
  const [portfolioLink, setPortfolioLink] = useState("");
  const [travelFeeType, setTravelFeeType] = useState<"free" | "paid">("free");
  const [travelFeeAmount, setTravelFeeAmount] = useState("");
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

  const durationOptions = [
    { value: "60", label: "1h ou plus" },
    { value: "180", label: "3h ou plus" },
    { value: "1440", label: "24h ou plus" },
    { value: "2880", label: "2 jours ou plus" },
    { value: "custom", label: "Autre" },
  ];

  // Convert duration number to select value
  const getDurationValue = (mins: number | null): string => {
    if (!mins) return "";
    if (mins === 60) return "60";
    if (mins === 180) return "180";
    if (mins === 1440) return "1440";
    if (mins === 2880) return "2880";
    // Custom value
    return "custom";
  };

  const getCustomDurationFromMinutes = (mins: number | null) => {
    if (!mins) return { value: "", unit: "h" as const };
    if (mins >= 1440 && mins % 1440 === 0) return { value: String(mins / 1440), unit: "j" as const };
    if (mins >= 60 && mins % 60 === 0) return { value: String(mins / 60), unit: "h" as const };
    return { value: String(mins), unit: "min" as const };
  };

  useEffect(() => {
    if (service) {
      setName(service.name || "");
      setDescription(service.description || "");
      setMainMediaUrl(service.main_media_url || "");
      setHoverMediaUrl(service.hover_media_url || "");
      setVideoUrl(service.video_url || "");
      setMediaUrls(Array.isArray(service.media_urls) ? service.media_urls : []);
      
      const dv = getDurationValue(service.duration);
      setDuration(dv);
      if (dv === "custom" && service.duration) {
        const custom = getCustomDurationFromMinutes(service.duration);
        setCustomDuration(custom.value);
        setCustomDurationUnit(custom.unit);
      }
      
      setPrice(service.price?.toString() || "");
      setPriceType(service.price_type || "fixe");
      setMinAutoPrice(service.min_auto_price?.toString() || "");
      setAutoValidation(service.auto_validation ?? true);
      setIncludes(service.includes || "");
      setClientPreparation(service.client_preparation || "");
      setPortfolioLink(service.portfolio_link || "");
      setTravelFeeType(service.travel_fee_type || "free");
      setTravelFeeAmount(service.travel_fee_amount?.toString() || "");
      setDiscountPercent(service.discount_percent?.toString() || "");
      setIsActive(service.is_active ?? true);
      
      const defaultAvailability: WeeklyAvailability = {
        lundi: [], mardi: [], mercredi: [], jeudi: [], vendredi: [], samedi: [], dimanche: [],
      };

      if (service.weekly_availability && typeof service.weekly_availability === 'object') {
        setWeeklyAvailability({ ...defaultAvailability, ...service.weekly_availability });
      } else {
        setWeeklyAvailability(defaultAvailability);
      }
    }
  }, [service]);

  const parseDuration = (): number | null => {
    if (!duration) return null;
    if (duration === "custom") {
      const val = parseFloat(customDuration);
      if (isNaN(val) || val <= 0) return null;
      switch (customDurationUnit) {
        case "min": return Math.round(val);
        case "h": return Math.round(val * 60);
        case "j": return Math.round(val * 1440);
        default: return null;
      }
    }
    return parseInt(duration);
  };

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
      const durationValue = parseDuration();

      const { error } = await supabase
        .from("services")
        .update({
          name,
          description,
          main_media_url: mainMediaUrl,
          hover_media_url: hoverMediaUrl || null,
          video_url: videoUrl || null,
          media_urls: mediaUrls,
          duration: durationValue,
          price: parseFloat(price),
          price_type: priceType,
          min_auto_price: minAutoPrice ? parseFloat(minAutoPrice) : null,
          auto_validation: autoValidation,
          includes,
          client_preparation: clientPreparation,
          portfolio_link: portfolioLink || null,
          requires_booking: true,
          travel_fee_type: travelFeeType,
          travel_fee_amount: travelFeeType === "paid" ? parseFloat(travelFeeAmount) || 0 : 0,
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="col-span-1 sm:col-span-2">
              <Label htmlFor="name">Nom de la prestation *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Ex: Coiffure femme complète"
              />
            </div>

            <div className="col-span-1 sm:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Décrivez votre prestation..."
                rows={3}
              />
            </div>

            <div className="col-span-1 sm:col-span-2">
              <Label htmlFor="includes">Ce qui est inclus</Label>
              <Textarea
                id="includes"
                value={includes}
                onChange={(e) => setIncludes(e.target.value)}
                placeholder="Ex: Shampoing, coupe, brushing..."
                rows={2}
              />
            </div>

            <div className="col-span-1 sm:col-span-2">
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
              <Label htmlFor="duration">Durée de la prestation</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une durée" />
                </SelectTrigger>
                <SelectContent>
                  {durationOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {duration === "custom" && (
              <div>
                <Label>Durée personnalisée</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min="1"
                    value={customDuration}
                    onChange={(e) => setCustomDuration(e.target.value)}
                    placeholder="Durée"
                    className="flex-1"
                  />
                  <Select value={customDurationUnit} onValueChange={(v) => setCustomDurationUnit(v as "min" | "h" | "j")}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="min">Min</SelectItem>
                      <SelectItem value="h">Heures</SelectItem>
                      <SelectItem value="j">Jours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

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

            {price && parseFloat(price) > 0 && (
              <div className="col-span-1 sm:col-span-2">
                <VendorNetAmountDisplay
                  price={price}
                  priceType={priceType}
                  minAutoPrice={minAutoPrice}
                  isService={true}
                />
              </div>
            )}

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

            <div className="col-span-1 sm:col-span-2">
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

            {/* Travel fee section - always visible */}
            <div className="col-span-1 sm:col-span-2 space-y-4 p-4 border rounded-lg">
              <div className="space-y-2">
                <Label>Frais de déplacement</Label>
                <div className="flex gap-4">
                  <label className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer flex-1 ${travelFeeType === "free" ? "border-primary bg-primary/5" : ""}`}>
                    <input
                      type="radio"
                      name="travelFeeEdit"
                      checked={travelFeeType === "free"}
                      onChange={() => setTravelFeeType("free")}
                      className="sr-only"
                    />
                    <span className="text-sm font-medium">Gratuit</span>
                  </label>
                  <label className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer flex-1 ${travelFeeType === "paid" ? "border-primary bg-primary/5" : ""}`}>
                    <input
                      type="radio"
                      name="travelFeeEdit"
                      checked={travelFeeType === "paid"}
                      onChange={() => setTravelFeeType("paid")}
                      className="sr-only"
                    />
                    <span className="text-sm font-medium">Payant</span>
                  </label>
                </div>
              </div>

              {travelFeeType === "paid" && (
                <div className="space-y-2">
                  <Label htmlFor="travelFeeAmount">Montant des frais de déplacement (FCFA)</Label>
                  <Input
                    id="travelFeeAmount"
                    type="number"
                    min="0"
                    value={travelFeeAmount}
                    onChange={(e) => setTravelFeeAmount(e.target.value)}
                    placeholder="Ex: 2500"
                  />
                  <p className="text-xs text-muted-foreground">
                    Ce montant sera payé par le client à la réservation via Orange Money.
                  </p>
                </div>
              )}
            </div>

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