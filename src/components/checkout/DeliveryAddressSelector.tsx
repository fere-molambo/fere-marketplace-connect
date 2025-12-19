import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Plus, MapPin, Navigation, Loader2, ExternalLink } from "lucide-react";

interface DeliveryAddressSelectorProps {
  userId: string;
  selectedAddressId: string | null;
  onSelect: (addressId: string) => void;
}

export function DeliveryAddressSelector({
  userId,
  selectedAddressId,
  onSelect,
}: DeliveryAddressSelectorProps) {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [formData, setFormData] = useState({
    label: "",
    address: "",
    city: "",
    country: "Mali",
    geolocation_lat: null as number | null,
    geolocation_lng: null as number | null,
    recipient_name: "",
    recipient_phone: "",
    google_maps_link: "",
  });

  // Fetch addresses
  const { data: addresses = [], isLoading } = useQuery({
    queryKey: ["delivery-addresses", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("delivery_addresses")
        .select("*")
        .eq("user_id", userId)
        .order("is_default", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Auto-select default address
  useState(() => {
    if (addresses.length > 0 && !selectedAddressId) {
      const defaultAddress = addresses.find(a => a.is_default) || addresses[0];
      if (defaultAddress) onSelect(defaultAddress.id);
    }
  });

  // Create address mutation
  const createAddress = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: newAddress, error } = await supabase
        .from("delivery_addresses")
        .insert({
          user_id: userId,
          ...data,
          is_default: addresses.length === 0,
        })
        .select()
        .single();
      if (error) throw error;
      return newAddress;
    },
    onSuccess: (newAddress) => {
      queryClient.invalidateQueries({ queryKey: ["delivery-addresses"] });
      toast.success("Adresse ajoutée");
      onSelect(newAddress.id);
      setIsDialogOpen(false);
      setFormData({
        label: "",
        address: "",
        city: "",
        country: "Mali",
        geolocation_lat: null,
        geolocation_lng: null,
        recipient_name: "",
        recipient_phone: "",
        google_maps_link: "",
      });
    },
    onError: () => toast.error("Erreur lors de l'ajout"),
  });

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.error("La géolocalisation n'est pas supportée");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData((prev) => ({
          ...prev,
          geolocation_lat: position.coords.latitude,
          geolocation_lng: position.coords.longitude,
        }));
        toast.success("Position récupérée");
        setIsLocating(false);
      },
      () => {
        toast.error("Impossible d'obtenir la position");
        setIsLocating(false);
      }
    );
  };

  const handleSubmit = () => {
    if (!formData.label.trim() || !formData.address.trim()) {
      toast.error("Veuillez remplir les champs obligatoires");
      return;
    }
    createAddress.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="mt-4 flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Adresse de livraison</Label>
        {addresses.length < 3 && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Ajouter
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nouvelle adresse</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Libellé *</Label>
                  <Input
                    value={formData.label}
                    onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                    placeholder="Ex: Maison, Bureau..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nom du destinataire</Label>
                    <Input
                      value={formData.recipient_name}
                      onChange={(e) => setFormData({ ...formData, recipient_name: e.target.value })}
                      placeholder="Jean Dupont"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Téléphone</Label>
                    <Input
                      value={formData.recipient_phone}
                      onChange={(e) => setFormData({ ...formData, recipient_phone: e.target.value })}
                      placeholder="+223 70 00 00 00"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Adresse complète *</Label>
                  <Input
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Rue, quartier, repères..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Ville</Label>
                    <Input
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="Bamako"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Pays</Label>
                    <Input
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Géolocalisation</Label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 text-sm text-muted-foreground">
                      {formData.geolocation_lat && formData.geolocation_lng
                        ? `${formData.geolocation_lat.toFixed(4)}, ${formData.geolocation_lng.toFixed(4)}`
                        : "Non définie"}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleGetLocation}
                      disabled={isLocating}
                    >
                      {isLocating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Lien Google Maps (optionnel)</Label>
                  <Input
                    value={formData.google_maps_link}
                    onChange={(e) => setFormData({ ...formData, google_maps_link: e.target.value })}
                    placeholder="https://maps.google.com/..."
                  />
                  <p className="text-xs text-muted-foreground">
                    Partagez un lien Google Maps pour faciliter la localisation
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button onClick={handleSubmit} disabled={createAddress.isPending}>
                    {createAddress.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Ajouter
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {addresses.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground border rounded-lg">
          <MapPin className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Aucune adresse enregistrée</p>
          <p className="text-xs">Cliquez sur "Ajouter" pour créer une adresse</p>
        </div>
      ) : (
        <RadioGroup value={selectedAddressId || ""} onValueChange={onSelect}>
          <div className="space-y-2">
            {addresses.map((address) => (
              <label
                key={address.id}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedAddressId === address.id ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                }`}
              >
                <RadioGroupItem value={address.id} className="mt-1" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{address.label}</span>
                    {address.is_default && (
                      <span className="text-xs bg-muted px-1.5 py-0.5 rounded">Par défaut</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{address.address}</p>
                  {address.city && (
                    <p className="text-xs text-muted-foreground">{address.city}, {address.country}</p>
                  )}
                  {address.recipient_name && (
                    <p className="text-xs text-muted-foreground mt-1">
                      📍 {address.recipient_name} {address.recipient_phone && `• 📞 ${address.recipient_phone}`}
                    </p>
                  )}
                  {(address as any).google_maps_link && (
                    <a 
                      href={(address as any).google_maps_link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline flex items-center gap-1 mt-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="h-3 w-3" />
                      Voir sur Google Maps
                    </a>
                  )}
                </div>
              </label>
            ))}
          </div>
        </RadioGroup>
      )}
    </div>
  );
}