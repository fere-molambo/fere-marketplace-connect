import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { X, Plus } from "lucide-react";
import { ProductMediaUpload } from "./ProductMediaUpload";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface CreateProductDialogProps {
  shopId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateProductDialog = ({ shopId, open, onOpenChange }: CreateProductDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [includes, setIncludes] = useState("");
  const [priceType, setPriceType] = useState<"unitaire" | "gros">("unitaire");
  const [price, setPrice] = useState("");
  const [productType, setProductType] = useState("");
  const [condition, setCondition] = useState<"neuf" | "2eme_main">("neuf");
  const [discount, setDiscount] = useState("0");
  const [stock, setStock] = useState("0");
  const [minQuantity, setMinQuantity] = useState("1");
  const [isActive, setIsActive] = useState(true);
  
  const [mainMedia, setMainMedia] = useState("");
  const [hoverMedia, setHoverMedia] = useState("");
  const [video, setVideo] = useState("");
  const [otherMedia, setOtherMedia] = useState<string[]>([]);
  
  const [colors, setColors] = useState<string[]>([]);
  const [colorInput, setColorInput] = useState("");
  const [sizes, setSizes] = useState<string[]>([]);
  const [sizeInput, setSizeInput] = useState("");
  
  const [quantityIntervals, setQuantityIntervals] = useState<Array<{min: string, max: string, price: string}>>([]);
  const [saving, setSaving] = useState(false);

  const addInterval = () => {
    setQuantityIntervals([...quantityIntervals, { min: "", max: "", price: "" }]);
  };

  const removeInterval = (index: number) => {
    setQuantityIntervals(quantityIntervals.filter((_, i) => i !== index));
  };

  const updateInterval = (index: number, field: 'min' | 'max' | 'price', value: string) => {
    const updated = [...quantityIntervals];
    updated[index][field] = value;
    setQuantityIntervals(updated);
  };

  const addColor = () => {
    if (colorInput.trim() && !colors.includes(colorInput.trim())) {
      setColors([...colors, colorInput.trim()]);
      setColorInput("");
    }
  };

  const addSize = () => {
    if (sizeInput.trim() && !sizes.includes(sizeInput.trim())) {
      setSizes([...sizes, sizeInput.trim()]);
      setSizeInput("");
    }
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
      const { error } = await supabase.from("products").insert({
        shop_id: shopId,
        name,
        description,
        includes,
        price: parseFloat(price),
        price_type: priceType,
        product_type: productType || null,
        condition,
        discount_percent: parseFloat(discount),
        quantity_available: parseInt(stock),
        min_quantity: parseInt(minQuantity),
        is_active: isActive,
        main_media_url: mainMedia,
        hover_media_url: hoverMedia || null,
        video_url: video || null,
        media_urls: otherMedia,
        colors,
        sizes,
        quantity_intervals: priceType === "gros" && quantityIntervals.length > 0 
          ? quantityIntervals.map(interval => ({
              min: parseInt(interval.min),
              max: parseInt(interval.max),
              price: parseFloat(interval.price)
            }))
          : null,
      });

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Produit créé avec succès",
      });
      
      queryClient.invalidateQueries({ queryKey: ["shop-products", shopId] });
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error("Error creating product:", error);
      toast({
        title: "Erreur",
        description: "Impossible de créer le produit",
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
    setPrice("");
    setDiscount("0");
    setStock("0");
    setMainMedia("");
    setHoverMedia("");
    setVideo("");
    setOtherMedia([]);
    setColors([]);
    setSizes([]);
    setQuantityIntervals([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Créer un produit</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <ProductMediaUpload
            shopId={shopId}
            onMainMediaChange={setMainMedia}
            onHoverMediaChange={setHoverMedia}
            onVideoChange={setVideo}
            onOtherMediaChange={setOtherMedia}
            bucketName="product-media"
          />

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="name">Nom du produit *</Label>
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

            <div className="space-y-2">
              <Label htmlFor="price-type">Type de tarif</Label>
              <Select value={priceType} onValueChange={(v) => setPriceType(v as "unitaire" | "gros")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unitaire">Unitaire</SelectItem>
                  <SelectItem value="gros">En gros</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Prix {priceType === "unitaire" ? "(FCFA)" : "de base (FCFA)"} *</Label>
              <Input
                id="price"
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </div>

            {priceType === "gros" && (
              <div className="col-span-2 space-y-4 p-4 border border-border rounded-lg bg-muted/50">
                <div className="flex items-center justify-between">
                  <Label>Intervalles de prix selon la quantité</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addInterval}>
                    <Plus className="w-4 h-4 mr-1" />
                    Ajouter un intervalle
                  </Button>
                </div>
                
                {quantityIntervals.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Aucun intervalle défini. Ajoutez des intervalles pour définir des prix selon la quantité.
                  </p>
                )}

                <div className="space-y-2">
                  {quantityIntervals.map((interval, index) => (
                    <div key={index} className="flex gap-2 items-center flex-wrap">
                      <span className="text-sm">De</span>
                      <Input
                        type="number"
                        min="1"
                        placeholder="Min"
                        className="w-20"
                        value={interval.min}
                        onChange={(e) => updateInterval(index, 'min', e.target.value)}
                      />
                      <span className="text-sm">à</span>
                      <Input
                        type="number"
                        min="1"
                        placeholder="Max"
                        className="w-20"
                        value={interval.max}
                        onChange={(e) => updateInterval(index, 'max', e.target.value)}
                      />
                      <span className="text-sm">unités :</span>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Prix"
                        className="w-28"
                        value={interval.price}
                        onChange={(e) => updateInterval(index, 'price', e.target.value)}
                      />
                      <span className="text-sm">FCFA</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeInterval(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="product-type">Type de produit</Label>
              <Select value={productType} onValueChange={setProductType}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fragile">Fragile</SelectItem>
                  <SelectItem value="lourd">Lourd</SelectItem>
                  <SelectItem value="inflammable">Inflammable</SelectItem>
                  <SelectItem value="autre">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="condition">État du produit</Label>
              <Select value={condition} onValueChange={(v) => setCondition(v as "neuf" | "2eme_main")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="neuf">Neuf</SelectItem>
                  <SelectItem value="2eme_main">2ème main</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="min-quantity">Quantité minimum de commande</Label>
              <Input
                id="min-quantity"
                type="number"
                min="1"
                value={minQuantity}
                onChange={(e) => setMinQuantity(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stock">Quantité en stock</Label>
              <Input
                id="stock"
                type="number"
                min="0"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
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

            <div className="col-span-2 space-y-2">
              <Label>Couleurs disponibles</Label>
              <div className="flex gap-2">
                <Input
                  value={colorInput}
                  onChange={(e) => setColorInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addColor())}
                  placeholder="Ajouter une couleur"
                />
                <Button type="button" onClick={addColor} size="icon">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {colors.map((color) => (
                  <Badge key={color} variant="secondary">
                    {color}
                    <X
                      className="ml-1 h-3 w-3 cursor-pointer"
                      onClick={() => setColors(colors.filter((c) => c !== color))}
                    />
                  </Badge>
                ))}
              </div>
            </div>

            <div className="col-span-2 space-y-2">
              <Label>Tailles disponibles</Label>
              <div className="flex gap-2">
                <Input
                  value={sizeInput}
                  onChange={(e) => setSizeInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addSize())}
                  placeholder="Ajouter une taille"
                />
                <Button type="button" onClick={addSize} size="icon">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {sizes.map((size) => (
                  <Badge key={size} variant="secondary">
                    {size}
                    <X
                      className="ml-1 h-3 w-3 cursor-pointer"
                      onClick={() => setSizes(sizes.filter((s) => s !== size))}
                    />
                  </Badge>
                ))}
              </div>
            </div>

            <div className="col-span-2 flex items-center justify-between">
              <Label htmlFor="active">Produit actif</Label>
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
              {saving ? "Création..." : "Créer le produit"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
