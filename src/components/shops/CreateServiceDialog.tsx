import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ProductMediaUpload } from "./ProductMediaUpload";
import { VendorNetAmountDisplay } from "./VendorNetAmountDisplay";
import { WeeklyAvailabilityManager, WeeklyAvailability } from "./WeeklyAvailabilityManager";
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
  const [duration, setDuration] = useState("");
  const [customDuration, setCustomDuration] = useState("");
  const [customDurationUnit, setCustomDurationUnit] = useState<"min" | "h" | "j">("h");
  const [priceType, setPriceType] = useState<"fixe" | "negoce">("fixe");
  const [price, setPrice] = useState("");
  const [minAutoPrice, setMinAutoPrice] = useState("");
  const [autoValidation, setAutoValidation] = useState(true);
  const [travelFeeType, setTravelFeeType] = useState<"free" | "paid">("free");
  const [travelFeeAmount, setTravelFeeAmount] = useState("");
  const [discount, setDiscount] = useState("0");
  const [isActive, setIsActive] = useState(true);
  
  const [mainMedia, setMainMedia] = useState("");
  const [hoverMedia, setHoverMedia] = useState("");
  const [video, setVideo] = useState("");
  const [otherMedia, setOtherMedia] = useState<string[]>([]);
  
  const [weeklyAvailability, setWeeklyAvailability] = useState<WeeklyAvailability>({
    lundi: [],
    mardi: [],
    mercredi: [],
    jeudi: [],
    vendredi: [],
    samedi: [],
    dimanche: [],
  });
  
  const [saving, setSaving] = useState(false);

  const durationOptions = [
    { value: "60", label: "1h ou plus" },
    { value: "180", label: "3h ou plus" },
    { value: "1440", label: "24h ou plus" },
    { value: "2880", label: "2 jours ou plus" },
    { value: "custom", label: "Autre" },
  ];

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
      const durationValue = parseDuration();

      const { error } = await supabase.from("services").insert({
        shop_id: shopId,
        name,
        description,
        includes,
        client_preparation: clientPreparation || null,
        duration: durationValue,
        price: parseFloat(price),
        price_type: priceType,
        min_auto_price: minAutoPrice ? parseFloat(minAutoPrice) : null,
        auto_validation: autoValidation,
        requires_booking: true,
        travel_fee_type: travelFeeType,
        travel_fee_amount: travelFeeType === "paid" ? parseFloat(travelFeeAmount) || 0 : 0,
        discount_percent: parseFloat(discount),
        is_active: isActive,
        main_media_url: mainMedia,
        hover_media_url: hoverMedia || null,
        video_url: video || null,
        media_urls: otherMedia,
        weekly_availability: weeklyAvailability as any,
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
    setDuration("");
    setCustomDuration("");
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="col-span-1 sm:col-span-2 space-y-2">
              <Label htmlFor="name">Nom de la prestation *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="col-span-1 sm:col-span-2 space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="col-span-1 sm:col-span-2 space-y-2">
              <Label htmlFor="includes">Ce qui est inclus</Label>
              <Textarea
                id="includes"
                value={includes}
                onChange={(e) => setIncludes(e.target.value)}
                rows={2}
              />
            </div>

            <div className="col-span-1 sm:col-span-2 space-y-2">
              <Label htmlFor="client-preparation">À préparer par le client</Label>
              <Textarea
                id="client-preparation"
                value={clientPreparation}
                onChange={(e) => setClientPreparation(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-2">
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
              <div className="space-y-2">
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

            <div className="space-y-2">
              <Label htmlFor="price-type">Type de tarif *</Label>
              <Select value={priceType} onValueChange={(v) => setPriceType(v as "fixe" | "negoce")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixe">Fixe</SelectItem>
                  <SelectItem value="negoce">Négoce</SelectItem>
                </SelectContent>
              </Select>
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
                <div className="space-y-2">
                  <Label htmlFor="min-auto-price">Montant minimum auto (FCFA)</Label>
                  <Input
                    id="min-auto-price"
                    type="number"
                    value={minAutoPrice}
                    onChange={(e) => setMinAutoPrice(e.target.value)}
                    placeholder="Prix minimum accepté automatiquement"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="auto-validation">Validation automatique</Label>
                  <Switch
                    id="auto-validation"
                    checked={autoValidation}
                    onCheckedChange={setAutoValidation}
                  />
                </div>
              </>
            )}

            <div className="col-span-1 sm:col-span-2 space-y-2">
              <Label htmlFor="discount">Réduction (%)</Label>
              <Input
                id="discount"
                type="number"
                min="0"
                max="100"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
              />
              {discount && parseFloat(discount) > 0 && price && (
                <p className="text-sm text-muted-foreground">
                  Prix après réduction : {(parseFloat(price) * (1 - parseFloat(discount) / 100)).toLocaleString()} FCFA{" "}
                  <span className="line-through">(au lieu de {parseFloat(price).toLocaleString()} FCFA)</span>
                </p>
              )}
            </div>

            {/* Travel fee section - always visible */}
            <div className="col-span-1 sm:col-span-2 space-y-4 p-4 border rounded-lg">
              <div className="space-y-2">
                <Label>Frais de déplacement</Label>
                <div className="flex gap-4">
                  <label className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer flex-1 ${travelFeeType === "free" ? "border-primary bg-primary/5" : ""}`}>
                    <input
                      type="radio"
                      name="travelFee"
                      checked={travelFeeType === "free"}
                      onChange={() => setTravelFeeType("free")}
                      className="sr-only"
                    />
                    <span className="text-sm font-medium">Gratuit</span>
                  </label>
                  <label className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer flex-1 ${travelFeeType === "paid" ? "border-primary bg-primary/5" : ""}`}>
                    <input
                      type="radio"
                      name="travelFee"
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
                  <Label htmlFor="travel-fee-amount">Montant des frais de déplacement (FCFA)</Label>
                  <Input
                    id="travel-fee-amount"
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

            <div className="col-span-1 sm:col-span-2 flex items-center justify-between">
              <Label htmlFor="active">Prestation active</Label>
              <Switch
                id="active"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>
          </div>

          <WeeklyAvailabilityManager
            value={weeklyAvailability}
            onChange={setWeeklyAvailability}
          />

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