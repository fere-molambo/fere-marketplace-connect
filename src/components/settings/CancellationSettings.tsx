import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Loader2, GripVertical, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface CancellationReason {
  id: string;
  label: string;
  applies_to: string[];
  is_active: boolean;
  display_order: number;
}

export function CancellationSettings() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReason, setEditingReason] = useState<CancellationReason | null>(null);
  const [label, setLabel] = useState("");
  const [appliesToProduct, setAppliesToProduct] = useState(true);
  const [appliesToService, setAppliesToService] = useState(true);
  const [saving, setSaving] = useState(false);

  const { data: reasons = [], isLoading } = useQuery({
    queryKey: ["cancellation-reasons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cancellation_reasons")
        .select("*")
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data as CancellationReason[];
    },
  });

  const openAddDialog = () => {
    setEditingReason(null);
    setLabel("");
    setAppliesToProduct(true);
    setAppliesToService(true);
    setDialogOpen(true);
  };

  const openEditDialog = (reason: CancellationReason) => {
    setEditingReason(reason);
    setLabel(reason.label);
    setAppliesToProduct(reason.applies_to?.includes("product") ?? true);
    setAppliesToService(reason.applies_to?.includes("service") ?? true);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!label.trim()) {
      toast.error("Le libellé est requis");
      return;
    }

    const appliesTo: string[] = [];
    if (appliesToProduct) appliesTo.push("product");
    if (appliesToService) appliesTo.push("service");

    if (appliesTo.length === 0) {
      toast.error("Sélectionnez au moins un type");
      return;
    }

    setSaving(true);
    try {
      if (editingReason) {
        const { error } = await supabase
          .from("cancellation_reasons")
          .update({ label, applies_to: appliesTo })
          .eq("id", editingReason.id);
        if (error) throw error;
        toast.success("Motif modifié");
      } else {
        const maxOrder = Math.max(...reasons.map(r => r.display_order), 0);
        const { error } = await supabase
          .from("cancellation_reasons")
          .insert({ label, applies_to: appliesTo, display_order: maxOrder + 1 });
        if (error) throw error;
        toast.success("Motif ajouté");
      }
      queryClient.invalidateQueries({ queryKey: ["cancellation-reasons"] });
      setDialogOpen(false);
    } catch (error: any) {
      toast.error("Erreur: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (reason: CancellationReason) => {
    try {
      const { error } = await supabase
        .from("cancellation_reasons")
        .update({ is_active: !reason.is_active })
        .eq("id", reason.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["cancellation-reasons"] });
      toast.success(reason.is_active ? "Motif désactivé" : "Motif activé");
    } catch (error: any) {
      toast.error("Erreur: " + error.message);
    }
  };

  const handleDelete = async (reason: CancellationReason) => {
    if (!confirm("Supprimer ce motif d'annulation ?")) return;
    try {
      const { error } = await supabase
        .from("cancellation_reasons")
        .delete()
        .eq("id", reason.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["cancellation-reasons"] });
      toast.success("Motif supprimé");
    } catch (error: any) {
      toast.error("Erreur: " + error.message);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Motifs d'annulation</CardTitle>
            <CardDescription>
              Gérez les raisons que les utilisateurs peuvent sélectionner lors d'une annulation
            </CardDescription>
          </div>
          <Button onClick={openAddDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Ajouter
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : reasons.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Aucun motif d'annulation configuré
            </p>
          ) : (
            <div className="space-y-2">
              {reasons.map((reason) => (
                <div
                  key={reason.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                    <div>
                      <p className={`font-medium ${!reason.is_active ? "text-muted-foreground line-through" : ""}`}>
                        {reason.label}
                      </p>
                      <div className="flex gap-1 mt-1">
                        {reason.applies_to?.includes("product") && (
                          <Badge variant="outline" className="text-xs">Produits</Badge>
                        )}
                        {reason.applies_to?.includes("service") && (
                          <Badge variant="outline" className="text-xs">Services</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={reason.is_active}
                      onCheckedChange={() => handleToggleActive(reason)}
                    />
                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(reason)}>
                      ✏️
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(reason)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingReason ? "Modifier le motif" : "Ajouter un motif d'annulation"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="label">Libellé</Label>
              <Input
                id="label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Ex: Produit endommagé"
              />
            </div>
            <div className="space-y-2">
              <Label>S'applique à</Label>
              <div className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="product"
                    checked={appliesToProduct}
                    onCheckedChange={(checked) => setAppliesToProduct(!!checked)}
                  />
                  <Label htmlFor="product" className="font-normal">Produits</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="service"
                    checked={appliesToService}
                    onCheckedChange={(checked) => setAppliesToService(!!checked)}
                  />
                  <Label htmlFor="service" className="font-normal">Services</Label>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingReason ? "Enregistrer" : "Ajouter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
