import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Zap, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface CreateFlashSaleDialogProps {
  shopId: string;
}

export const CreateFlashSaleDialog = ({ shopId }: CreateFlashSaleDialogProps) => {
  const [open, setOpen] = useState(false);
  const [itemType, setItemType] = useState<"product" | "service">("product");
  const [selectedItemId, setSelectedItemId] = useState("");
  const [flashPrice, setFlashPrice] = useState("");
  const [days, setDays] = useState("0");
  const [hours, setHours] = useState("1");
  const [minutes, setMinutes] = useState("0");
  const [isCreating, setIsCreating] = useState(false);

  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: products = [] } = useQuery({
    queryKey: ["shop-products-for-flash", shopId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price")
        .eq("shop_id", shopId)
        .eq("is_active", true);
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const { data: services = [] } = useQuery({
    queryKey: ["shop-services-for-flash", shopId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("id, name, price")
        .eq("shop_id", shopId)
        .eq("is_active", true);
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const items = itemType === "product" ? products : services;
  const selectedItem = items.find(i => i.id === selectedItemId);

  const handleCreate = async () => {
    if (!selectedItemId || !flashPrice) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    const totalMinutes = parseInt(days) * 24 * 60 + parseInt(hours) * 60 + parseInt(minutes);
    if (totalMinutes < 1) {
      toast.error("La durée doit être d'au moins 1 minute");
      return;
    }

    setIsCreating(true);
    try {
      const endsAt = new Date();
      endsAt.setMinutes(endsAt.getMinutes() + totalMinutes);

      const { error } = await supabase.from("flash_sales").insert({
        product_id: itemType === "product" ? selectedItemId : null,
        service_id: itemType === "service" ? selectedItemId : null,
        flash_price: parseFloat(flashPrice),
        ends_at: endsAt.toISOString(),
        created_by: user?.id,
      });

      if (error) throw error;

      toast.success("Vente flash créée avec succès");
      queryClient.invalidateQueries({ queryKey: ["flash-sales"] });
      queryClient.invalidateQueries({ queryKey: ["public-products"] });
      queryClient.invalidateQueries({ queryKey: ["public-services"] });
      setOpen(false);
      resetForm();
    } catch (error: any) {
      console.error("Error creating flash sale:", error);
      toast.error(error.message || "Erreur lors de la création");
    } finally {
      setIsCreating(false);
    }
  };

  const resetForm = () => {
    setSelectedItemId("");
    setFlashPrice("");
    setDays("0");
    setHours("1");
    setMinutes("0");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Zap className="h-4 w-4 mr-2 text-orange-500" />
          Vente Flash
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-orange-500" />
            Créer une vente flash
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={itemType} onValueChange={(v) => { setItemType(v as "product" | "service"); setSelectedItemId(""); }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="product">Produit</SelectItem>
                <SelectItem value="service">Prestation</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{itemType === "product" ? "Produit" : "Prestation"}</Label>
            <Select value={selectedItemId} onValueChange={setSelectedItemId}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner..." />
              </SelectTrigger>
              <SelectContent>
                {items.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name} - {item.price.toLocaleString()} FCFA
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedItem && (
            <div className="bg-muted p-3 rounded-lg text-sm">
              <p>Prix actuel : <strong>{selectedItem.price.toLocaleString()} FCFA</strong></p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="flash-price">Prix flash (FCFA)</Label>
            <Input
              id="flash-price"
              type="number"
              value={flashPrice}
              onChange={(e) => setFlashPrice(e.target.value)}
              placeholder="Prix promotionnel"
            />
            {flashPrice && selectedItem && parseFloat(flashPrice) < selectedItem.price && (
              <p className="text-sm text-green-600">
                Réduction de {Math.round((1 - parseFloat(flashPrice) / selectedItem.price) * 100)}%
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Durée de la vente flash</Label>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">Jours</Label>
                <Input
                  type="number"
                  min="0"
                  max="30"
                  value={days}
                  onChange={(e) => setDays(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Heures</Label>
                <Input
                  type="number"
                  min="0"
                  max="23"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Minutes</Label>
                <Input
                  type="number"
                  min="0"
                  max="59"
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreate} disabled={isCreating}>
              {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Créer la vente flash
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
