import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface TeamTag {
  id: string;
  name: string;
  label: string;
  color: string;
  description: string | null;
  is_active: boolean;
  display_order: number;
}

export function TeamTagsSettings() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState<TeamTag | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    label: "",
    color: "#6b7280",
    description: "",
    is_active: true,
  });

  const { data: tags, refetch } = useQuery({
    queryKey: ["team-assignment-tags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_assignment_tags")
        .select("*")
        .order("display_order");

      if (error) throw error;
      return data as TeamTag[];
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      label: "",
      color: "#6b7280",
      description: "",
      is_active: true,
    });
  };

  const handleAdd = async () => {
    try {
      const maxOrder = tags?.reduce((max, tag) => Math.max(max, tag.display_order), 0) || 0;
      
      const { error } = await supabase
        .from("team_assignment_tags")
        .insert({
          ...formData,
          display_order: maxOrder + 1,
        });

      if (error) throw error;

      toast.success("Tag ajouté avec succès");
      setIsAddDialogOpen(false);
      resetForm();
      refetch();
    } catch (error: any) {
      console.error("Error adding tag:", error);
      toast.error(error.message || "Erreur lors de l'ajout du tag");
    }
  };

  const handleEdit = async () => {
    if (!selectedTag) return;

    try {
      const { error } = await supabase
        .from("team_assignment_tags")
        .update(formData)
        .eq("id", selectedTag.id);

      if (error) throw error;

      toast.success("Tag modifié avec succès");
      setIsEditDialogOpen(false);
      setSelectedTag(null);
      resetForm();
      refetch();
    } catch (error: any) {
      console.error("Error updating tag:", error);
      toast.error(error.message || "Erreur lors de la modification du tag");
    }
  };

  const handleDelete = async () => {
    if (!selectedTag) return;

    try {
      const { error } = await supabase
        .from("team_assignment_tags")
        .delete()
        .eq("id", selectedTag.id);

      if (error) throw error;

      toast.success("Tag supprimé avec succès");
      setIsDeleteDialogOpen(false);
      setSelectedTag(null);
      refetch();
    } catch (error: any) {
      console.error("Error deleting tag:", error);
      toast.error(error.message || "Erreur lors de la suppression du tag");
    }
  };

  const openEditDialog = (tag: TeamTag) => {
    setSelectedTag(tag);
    setFormData({
      name: tag.name,
      label: tag.label,
      color: tag.color,
      description: tag.description || "",
      is_active: tag.is_active,
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (tag: TeamTag) => {
    setSelectedTag(tag);
    setIsDeleteDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Tags des Membres d'Équipe</CardTitle>
            <CardDescription>
              Gérez les types d'assignation pour les membres d'équipe des boutiques
            </CardDescription>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un tag
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ajouter un nouveau tag</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="add-name">Nom (identifiant)</Label>
                  <Input
                    id="add-name"
                    placeholder="ex: support-technique"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="add-label">Libellé</Label>
                  <Input
                    id="add-label"
                    placeholder="ex: Support Technique"
                    value={formData.label}
                    onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="add-color">Couleur</Label>
                  <div className="flex gap-2">
                    <Input
                      id="add-color"
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-20 h-10"
                    />
                    <Input
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      placeholder="#6b7280"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="add-description">Description (optionnel)</Label>
                  <Textarea
                    id="add-description"
                    placeholder="Description du rôle..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="add-active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="add-active">Tag actif</Label>
                </div>
                <Button onClick={handleAdd} className="w-full">
                  Ajouter
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {tags?.map((tag) => (
            <div
              key={tag.id}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div className="flex items-center gap-3">
                <Badge style={{ backgroundColor: tag.color, color: "#fff" }}>
                  {tag.label}
                </Badge>
                <div>
                  <p className="text-sm font-medium">{tag.label}</p>
                  <p className="text-xs text-muted-foreground">{tag.name}</p>
                  {tag.description && (
                    <p className="text-xs text-muted-foreground mt-1">{tag.description}</p>
                  )}
                </div>
                {!tag.is_active && (
                  <Badge variant="outline">Inactif</Badge>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => openEditDialog(tag)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => openDeleteDialog(tag)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le tag</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Nom (identifiant)</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-label">Libellé</Label>
              <Input
                id="edit-label"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-color">Couleur</Label>
              <div className="flex gap-2">
                <Input
                  id="edit-color"
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-20 h-10"
                />
                <Input
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit-description">Description (optionnel)</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="edit-active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="edit-active">Tag actif</Label>
            </div>
            <Button onClick={handleEdit} className="w-full">
              Enregistrer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer le tag "{selectedTag?.label}" ? 
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
