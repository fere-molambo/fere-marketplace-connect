import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, KeyRound } from "lucide-react";
import { useUserRoles } from "@/hooks/useUserRoles";

interface UserEditSheetProps {
  user: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserUpdated?: () => void;
}

export const UserEditSheet = ({ user, open, onOpenChange, onUserUpdated }: UserEditSheetProps) => {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(user?.photo_profil);
  const [isResetting, setIsResetting] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [departments, setDepartments] = useState<any[]>([]);
  const [selectedDepartmentIds, setSelectedDepartmentIds] = useState<string[]>([]);
  const { isSuperAdmin, isAdmin } = useUserRoles();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      nom_complet: user?.nom_complet || "",
      contact: user?.contact || "",
    },
  });

  useEffect(() => {
    if (user) {
      reset({
        nom_complet: user.nom_complet,
        contact: user.contact,
      });
      setAvatarUrl(user.photo_profil);
    }
  }, [user, reset]);

  // Charger les départements disponibles et ceux de l'utilisateur
  useEffect(() => {
    const loadDepartments = async () => {
      if (!user) return;

      // Charger tous les départements actifs
      const { data: allDepts, error: deptError } = await supabase
        .from("departments")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (deptError) {
        console.error("Error loading departments:", deptError);
        return;
      }

      setDepartments(allDepts || []);

      // Charger les départements assignés à l'utilisateur
      const { data: userDepts, error: userDeptError } = await supabase
        .from("user_departments")
        .select("department_id")
        .eq("user_id", user.id);

      if (userDeptError) {
        console.error("Error loading user departments:", userDeptError);
        return;
      }

      setSelectedDepartmentIds(userDepts?.map(d => d.department_id) || []);
    };

    loadDepartments();
  }, [user]);

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      const file = event.target.files?.[0];
      if (!file) return;

      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ photo_profil: publicUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      
      queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      
      onUserUpdated?.();

      toast.success("Photo de profil mise à jour !");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (data: any) => {
    try {
      setIsLoading(true);

      // 1. Mettre à jour le profil
      const { error } = await supabase
        .from("profiles")
        .update({
          nom_complet: data.nom_complet,
          contact: data.contact,
          photo_profil: avatarUrl,
        })
        .eq("id", user.id);

      if (error) throw error;

      // 2. Gérer les départements si l'utilisateur est admin
      if (isSuperAdmin || isAdmin) {
        // Récupérer les départements actuels
        const { data: currentDepts } = await supabase
          .from("user_departments")
          .select("department_id")
          .eq("user_id", user.id);

        const currentIds = currentDepts?.map(d => d.department_id) || [];

        // Départements à ajouter
        const toAdd = selectedDepartmentIds.filter(id => !currentIds.includes(id));

        // Départements à supprimer
        const toRemove = currentIds.filter(id => !selectedDepartmentIds.includes(id));

        // Supprimer les départements décochés
        if (toRemove.length > 0) {
          const { error: deleteError } = await supabase
            .from("user_departments")
            .delete()
            .eq("user_id", user.id)
            .in("department_id", toRemove);

          if (deleteError) throw deleteError;
        }

        // Ajouter les nouveaux départements
        if (toAdd.length > 0) {
          const { error: insertError } = await supabase
            .from("user_departments")
            .insert(toAdd.map(deptId => ({
              user_id: user.id,
              department_id: deptId,
            })));

          if (insertError) throw insertError;
        }
      }

      toast.success("Utilisateur mis à jour avec succès !");
      queryClient.invalidateQueries({ queryKey: ["users"] });
      onUserUpdated?.();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la mise à jour");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    try {
      setIsResetting(true);

      const { data, error } = await supabase.functions.invoke('reset-user-password', {
        body: { userId: user.id }
      });

      if (error) throw error;

      toast.success("Mot de passe réinitialisé avec succès ! Nouveau mot de passe : 12345678");
      setShowResetDialog(false);
    } catch (error: any) {
      console.error('Error resetting password:', error);
      toast.error(error.message || "Erreur lors de la réinitialisation du mot de passe");
    } finally {
      setIsResetting(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Modifier l'utilisateur</SheetTitle>
          <SheetDescription>
            Modifiez les informations de l'utilisateur
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-6">
          <div className="flex flex-col items-center gap-4">
            <Avatar className="h-24 w-24">
              <AvatarImage src={avatarUrl} />
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                {getInitials(user?.nom_complet || "U")}
              </AvatarFallback>
            </Avatar>
            <div>
              <Input
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                disabled={uploading}
                className="hidden"
                id="avatar-upload"
              />
              <Label htmlFor="avatar-upload">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploading}
                  asChild
                >
                  <span className="cursor-pointer">
                    <Upload className="h-4 w-4 mr-2" />
                    {uploading ? "Upload..." : "Changer la photo"}
                  </span>
                </Button>
              </Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nom_complet">Nom complet</Label>
            <Input
              id="nom_complet"
              {...register("nom_complet", { required: "Le nom est requis" })}
            />
            {errors.nom_complet && (
              <p className="text-sm text-destructive">{String(errors.nom_complet.message)}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact">Contact</Label>
            <Input
              id="contact"
              {...register("contact", { required: "Le contact est requis" })}
            />
            {errors.contact && (
              <p className="text-sm text-destructive">{String(errors.contact.message)}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={user?.email || ""} disabled />
            <p className="text-xs text-muted-foreground">
              L'email ne peut pas être modifié
            </p>
          </div>

          {(isSuperAdmin || isAdmin) && departments.length > 0 && (
            <div className="space-y-3">
              <Label>Départements</Label>
              <div className="border rounded-md p-4 space-y-3 max-h-64 overflow-y-auto bg-muted/30">
                {departments.map((dept) => (
                  <div key={dept.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`dept-${dept.id}`}
                      checked={selectedDepartmentIds.includes(dept.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedDepartmentIds([...selectedDepartmentIds, dept.id]);
                        } else {
                          setSelectedDepartmentIds(
                            selectedDepartmentIds.filter((id) => id !== dept.id)
                          );
                        }
                      }}
                    />
                    <label
                      htmlFor={`dept-${dept.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {dept.name}
                    </label>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Sélectionnez un ou plusieurs départements pour cet utilisateur
              </p>
            </div>
          )}

          {(isSuperAdmin || isAdmin) && (
            <div className="border-t pt-4">
              <Button
                type="button"
                variant="destructive"
                onClick={() => setShowResetDialog(true)}
                disabled={isResetting || isLoading}
                className="w-full"
              >
                <KeyRound className="h-4 w-4 mr-2" />
                {isResetting ? "Réinitialisation..." : "Réinitialiser le mot de passe"}
              </Button>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Le mot de passe sera réinitialisé à : 12345678
              </p>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </form>
      </SheetContent>

      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Réinitialiser le mot de passe</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir réinitialiser le mot de passe de{" "}
              <span className="font-semibold">{user?.nom_complet}</span> ?
              <br />
              <br />
              Le nouveau mot de passe sera : <span className="font-mono font-semibold">12345678</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isResetting}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handlePasswordReset} disabled={isResetting}>
              {isResetting ? "Réinitialisation..." : "Confirmer la réinitialisation"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  );
};
