import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Warehouse, MapPin, User, Phone, Loader2, Navigation, Edit, Trash2 } from "lucide-react";

export default function Warehouses() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<any>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    address: "",
    geolocation_lat: null as number | null,
    geolocation_lng: null as number | null,
    assigned_admin_id: "",
    owner_type: "fere",
    owner_name: "",
    owner_contact: "",
    contract_url: "",
    is_active: true,
  });

  // Fetch warehouses
  const { data: warehouses = [], isLoading } = useQuery({
    queryKey: ["warehouses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("warehouses")
        .select("*, assigned_admin:profiles!warehouses_assigned_admin_id_fkey(nom_complet)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch admins for assignment (2-step to avoid join issues)
  const { data: admins = [] } = useQuery({
    queryKey: ["admins-for-warehouses"],
    queryFn: async () => {
      // Step 1: Get user IDs with admin/super_admin role
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("user_id")
        .in("role", ["admin", "super_admin"]);
      if (roleError) throw roleError;
      if (!roleData || roleData.length === 0) return [];

      const adminIds = roleData.map((r) => r.user_id);

      // Step 2: Get their profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, nom_complet")
        .in("id", adminIds);
      if (profilesError) throw profilesError;
      return profiles || [];
    },
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData & { id?: string }) => {
      const { id, ...rest } = data;
      const payload = {
        ...rest,
        assigned_admin_id: rest.assigned_admin_id || null,
        created_by: user?.id,
      };

      if (id) {
        const { error } = await supabase.from("warehouses").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("warehouses").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouses"] });
      toast.success(editingWarehouse ? "Entrepôt modifié" : "Entrepôt créé");
      resetForm();
      setIsDialogOpen(false);
    },
    onError: () => toast.error("Erreur lors de l'enregistrement"),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("warehouses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouses"] });
      toast.success("Entrepôt supprimé");
    },
    onError: () => toast.error("Erreur lors de la suppression"),
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      address: "",
      geolocation_lat: null,
      geolocation_lng: null,
      assigned_admin_id: "",
      owner_type: "fere",
      owner_name: "",
      owner_contact: "",
      contract_url: "",
      is_active: true,
    });
    setEditingWarehouse(null);
  };

  const handleEdit = (warehouse: any) => {
    setEditingWarehouse(warehouse);
    setFormData({
      name: warehouse.name,
      description: warehouse.description || "",
      address: warehouse.address || "",
      geolocation_lat: warehouse.geolocation_lat,
      geolocation_lng: warehouse.geolocation_lng,
      assigned_admin_id: warehouse.assigned_admin_id || "",
      owner_type: warehouse.owner_type || "fere",
      owner_name: warehouse.owner_name || "",
      owner_contact: warehouse.owner_contact || "",
      contract_url: warehouse.contract_url || "",
      is_active: warehouse.is_active,
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
    if (!formData.name.trim()) {
      toast.error("Veuillez entrer un nom");
      return;
    }
    saveMutation.mutate(editingWarehouse ? { ...formData, id: editingWarehouse.id } : formData);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Entrepôts</h1>
          <p className="text-muted-foreground">Gérez les entrepôts de stockage</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nouvel entrepôt
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingWarehouse ? "Modifier l'entrepôt" : "Nouvel entrepôt"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nom *</Label>
                  <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Nom de l'entrepôt" />
                </div>
                <div className="space-y-2">
                  <Label>Admin assigné</Label>
                  <Select value={formData.assigned_admin_id} onValueChange={(v) => setFormData({ ...formData, assigned_admin_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un admin" />
                    </SelectTrigger>
                    <SelectContent>
                      {admins.map((admin: any) => (
                        <SelectItem key={admin.id} value={admin.id}>
                          {admin.nom_complet}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} />
              </div>

              <div className="space-y-2">
                <Label>Adresse</Label>
                <Input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder="Adresse complète" />
              </div>

              <div className="space-y-2">
                <Label>Géolocalisation</Label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 text-sm text-muted-foreground">
                    {formData.geolocation_lat && formData.geolocation_lng
                      ? `${formData.geolocation_lat.toFixed(4)}, ${formData.geolocation_lng.toFixed(4)}`
                      : "Non définie"}
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={handleGetLocation} disabled={isLocating}>
                    {isLocating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Propriétaire</Label>
                <Select value={formData.owner_type} onValueChange={(v) => setFormData({ ...formData, owner_type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fere">Fere</SelectItem>
                    <SelectItem value="other">Autre (externe)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.owner_type === "other" && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nom du propriétaire</Label>
                    <Input value={formData.owner_name} onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Contact</Label>
                    <Input value={formData.owner_contact} onChange={(e) => setFormData({ ...formData, owner_contact: e.target.value })} />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <Label>Actif</Label>
                <Switch checked={formData.is_active} onCheckedChange={(v) => setFormData({ ...formData, is_active: v })} />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>Annuler</Button>
                <Button onClick={handleSubmit} disabled={saveMutation.isPending}>
                  {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  {editingWarehouse ? "Modifier" : "Créer"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : warehouses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Warehouse className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Aucun entrepôt créé</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {warehouses.map((warehouse: any) => (
            <Card key={warehouse.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Warehouse className="h-5 w-5" />
                      {warehouse.name}
                    </CardTitle>
                    <CardDescription>{warehouse.description || "Pas de description"}</CardDescription>
                  </div>
                  <Badge variant={warehouse.is_active ? "default" : "secondary"}>
                    {warehouse.is_active ? "Actif" : "Inactif"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {warehouse.address && (
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <span>{warehouse.address}</span>
                  </div>
                )}
                {warehouse.assigned_admin && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{warehouse.assigned_admin.nom_complet}</span>
                  </div>
                )}
                {warehouse.owner_type === "other" && warehouse.owner_name && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{warehouse.owner_name} {warehouse.owner_contact && `• ${warehouse.owner_contact}`}</span>
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEdit(warehouse)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Modifier
                  </Button>
                  <Button variant="outline" size="icon" className="text-destructive" onClick={() => deleteMutation.mutate(warehouse.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}