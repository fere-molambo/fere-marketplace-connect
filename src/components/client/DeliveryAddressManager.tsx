import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, MapPin, Navigation, Loader2, Star, Edit } from "lucide-react";

interface DeliveryAddress {
  id: string;
  user_id: string;
  label: string;
  address: string;
  city: string | null;
  country: string | null;
  geolocation_lat: number | null;
  geolocation_lng: number | null;
  is_default: boolean;
  created_at: string;
  recipient_name: string | null;
  recipient_phone: string | null;
}

interface DeliveryAddressManagerProps {
  userId: string;
}

export function DeliveryAddressManager({ userId }: DeliveryAddressManagerProps) {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<DeliveryAddress | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [formData, setFormData] = useState({
    label: "",
    address: "",
    city: "",
    country: "Mali",
    geolocation_lat: null as number | null,
    geolocation_lng: null as number | null,
    is_default: false,
    recipient_name: "",
    recipient_phone: "",
  });

  // Fetch addresses
  const { data: addresses = [], isLoading } = useQuery({
    queryKey: ["delivery-addresses", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("delivery_addresses")
        .select("*")
        .eq("user_id", userId)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as DeliveryAddress[];
    },
  });

  // Create address mutation
  const createAddress = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (addresses.length >= 3) {
        throw new Error("Maximum 3 adresses autorisées");
      }
      const { error } = await supabase.from("delivery_addresses").insert({
        user_id: userId,
        ...data,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery-addresses"] });
      toast.success("Adresse ajoutée");
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast.error(error.message || "Erreur lors de l'ajout");
    },
  });

  // Update address mutation
  const updateAddress = useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & typeof formData) => {
      const { error } = await supabase
        .from("delivery_addresses")
        .update(data)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery-addresses"] });
      toast.success("Adresse modifiée");
      resetForm();
      setIsDialogOpen(false);
      setEditingAddress(null);
    },
    onError: () => {
      toast.error("Erreur lors de la modification");
    },
  });

  // Delete address mutation
  const deleteAddress = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("delivery_addresses")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery-addresses"] });
      toast.success("Adresse supprimée");
    },
    onError: () => {
      toast.error("Erreur lors de la suppression");
    },
  });

  // Set default address mutation
  const setDefaultAddress = useMutation({
    mutationFn: async (id: string) => {
      // First, unset all defaults
      await supabase
        .from("delivery_addresses")
        .update({ is_default: false })
        .eq("user_id", userId);
      // Then set the new default
      const { error } = await supabase
        .from("delivery_addresses")
        .update({ is_default: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery-addresses"] });
      toast.success("Adresse par défaut mise à jour");
    },
    onError: () => {
      toast.error("Erreur lors de la mise à jour");
    },
  });

  const resetForm = () => {
    setFormData({
      label: "",
      address: "",
      city: "",
      country: "Mali",
      geolocation_lat: null,
      geolocation_lng: null,
      is_default: false,
      recipient_name: "",
      recipient_phone: "",
    });
    setEditingAddress(null);
  };

  const handleEdit = (address: DeliveryAddress) => {
    setEditingAddress(address);
    setFormData({
      label: address.label,
      address: address.address,
      city: address.city || "",
      country: address.country || "Mali",
      geolocation_lat: address.geolocation_lat,
      geolocation_lng: address.geolocation_lng,
      is_default: address.is_default,
      recipient_name: address.recipient_name || "",
      recipient_phone: address.recipient_phone || "",
    });
    setIsDialogOpen(true);
  };

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

    if (editingAddress) {
      updateAddress.mutate({ id: editingAddress.id, ...formData });
    } else {
      createAddress.mutate(formData);
    }
  };

  const canAddMore = addresses.length < 3;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Adresses de livraison</CardTitle>
          <CardDescription>
            Gérez vos adresses de livraison (maximum 3)
          </CardDescription>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button size="sm" disabled={!canAddMore}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingAddress ? "Modifier l'adresse" : "Nouvelle adresse"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="label">Libellé *</Label>
                <Input
                  id="label"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  placeholder="Ex: Maison, Bureau, Chez maman..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="recipient_name">Nom du destinataire</Label>
                  <Input
                    id="recipient_name"
                    value={formData.recipient_name}
                    onChange={(e) => setFormData({ ...formData, recipient_name: e.target.value })}
                    placeholder="Jean Dupont"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="recipient_phone">Contact</Label>
                  <Input
                    id="recipient_phone"
                    value={formData.recipient_phone}
                    onChange={(e) => setFormData({ ...formData, recipient_phone: e.target.value })}
                    placeholder="+223 70 00 00 00"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Adresse complète *</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Rue, quartier, repères..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">Ville</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Bamako"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Pays</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    placeholder="Mali"
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
                    {isLocating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Navigation className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annuler
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={createAddress.isPending || updateAddress.isPending}
                >
                  {createAddress.isPending || updateAddress.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  {editingAddress ? "Modifier" : "Ajouter"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : addresses.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MapPin className="h-12 w-12 mx-auto mb-2 opacity-20" />
            <p>Aucune adresse enregistrée</p>
            <p className="text-sm">Ajoutez une adresse pour faciliter vos livraisons</p>
          </div>
        ) : (
          <div className="space-y-3">
            {addresses.map((address) => (
              <div
                key={address.id}
                className="flex items-start gap-3 p-3 rounded-lg border bg-card"
              >
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{address.label}</span>
                    {address.is_default && (
                      <Badge variant="secondary" className="text-xs">
                        <Star className="h-3 w-3 mr-1" />
                        Par défaut
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {address.address}
                  </p>
                  {(address.city || address.country) && (
                    <p className="text-xs text-muted-foreground">
                      {[address.city, address.country].filter(Boolean).join(", ")}
                    </p>
                  )}
                  {(address.recipient_name || address.recipient_phone) && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {address.recipient_name && <span>📍 {address.recipient_name}</span>}
                      {address.recipient_name && address.recipient_phone && " • "}
                      {address.recipient_phone && <span>📞 {address.recipient_phone}</span>}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {!address.is_default && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setDefaultAddress.mutate(address.id)}
                      title="Définir par défaut"
                    >
                      <Star className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleEdit(address)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => deleteAddress.mutate(address.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {!canAddMore && addresses.length > 0 && (
          <p className="text-sm text-muted-foreground mt-4 text-center">
            Vous avez atteint le maximum de 3 adresses
          </p>
        )}
      </CardContent>
    </Card>
  );
}