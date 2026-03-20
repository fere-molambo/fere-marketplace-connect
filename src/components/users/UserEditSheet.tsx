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
import { Upload, KeyRound, MapPin, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUserRoles } from "@/hooks/useUserRoles";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  const [isResettingPin, setIsResettingPin] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showResetPinDialog, setShowResetPinDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [departments, setDepartments] = useState<any[]>([]);
  const [selectedDepartmentIds, setSelectedDepartmentIds] = useState<string[]>([]);

  // Récupérer les rôles de l'utilisateur édité
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>("");

  // États vendeur
  const [statutLegal, setStatutLegal] = useState<string>("");
  const [typeOffre, setTypeOffre] = useState<string>("");
  const [pieceIdentiteUrl, setPieceIdentiteUrl] = useState<string>("");
  const [pieceIdentiteType, setPieceIdentiteType] = useState<string>("");
  const [adresse, setAdresse] = useState<string>("");
  const [geolocation, setGeolocation] = useState<{ lat: number | null; lng: number | null }>({
    lat: null,
    lng: null,
  });

  // États admin
  const [typeContrat, setTypeContrat] = useState<string>("");
  const [dureeContrat, setDureeContrat] = useState<string>("");
  const [presence, setPresence] = useState<string>("");
  const [contratUrl, setContratUrl] = useState<string>("");

  // États pour uploads
  const [uploadingIdentity, setUploadingIdentity] = useState(false);
  const [uploadingContract, setUploadingContract] = useState(false);

  // États pour les admins assignés aux vendeurs
  const [assignableAdmins, setAssignableAdmins] = useState<any[]>([]);
  const [selectedAdminIds, setSelectedAdminIds] = useState<string[]>([]);
  const { isSuperAdmin, isAdmin } = useUserRoles();
  const { user: currentUser } = useAuth();

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
  // Charger les rôles de l'utilisateur édité
  useEffect(() => {
    const loadUserRoles = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      
      if (!error && data) {
        const roles = data.map(r => r.role);
        setUserRoles(roles);
        setSelectedRole(roles[0] || "");
      }
    };
    
    loadUserRoles();
  }, [user]);

  // Charger les données spécifiques au rôle
  useEffect(() => {
    if (!user || userRoles.length === 0) return;

    // Charger les données vendeur
    if (userRoles.includes('vendeur')) {
      setStatutLegal(user.statut_legal || "");
      setTypeOffre(user.type_offre || "");
      setPieceIdentiteUrl(user.piece_identite_url || "");
      setPieceIdentiteType(user.piece_identite_type || "");
      setAdresse(user.adresse || "");
      setGeolocation({
        lat: user.geolocalisation_lat,
        lng: user.geolocalisation_lng,
      });

      // Charger les admins disponibles
      const loadAdmins = async () => {
        const { data: admins } = await supabase
          .from("profiles")
          .select("id, nom_complet, user_roles!inner(role)")
          .in("user_roles.role", ["admin", "super_admin"]);
        
        setAssignableAdmins(admins || []);

        // Charger les admins déjà assignés
        const { data: assigned } = await supabase
          .from("vendor_admins")
          .select("admin_id")
          .eq("vendor_id", user.id);
        
        setSelectedAdminIds(assigned?.map(a => a.admin_id) || []);
      };
      
      loadAdmins();
    }

    // Charger les données admin
    if (userRoles.includes('admin')) {
      setTypeContrat(user.type_contrat || "");
      setDureeContrat(user.duree_contrat || "");
      setPresence(user.presence || "");
      setContratUrl(user.contrat_url || "");
    }
  }, [user, userRoles]);

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
      const updateData: any = {
        nom_complet: data.nom_complet,
        contact: data.contact,
        photo_profil: avatarUrl,
      };

      // Ajouter champs vendeur
      if (userRoles.includes('vendeur')) {
        updateData.statut_legal = statutLegal || null;
        updateData.type_offre = typeOffre || null;
        updateData.piece_identite_url = pieceIdentiteUrl || null;
        updateData.piece_identite_type = pieceIdentiteType || null;
        updateData.adresse = adresse || null;
        updateData.geolocalisation_lat = geolocation.lat;
        updateData.geolocalisation_lng = geolocation.lng;
      }

      // Ajouter champs admin
      if (userRoles.includes('admin')) {
        updateData.type_contrat = typeContrat || null;
        updateData.duree_contrat = dureeContrat || null;
        updateData.presence = presence || null;
        updateData.contrat_url = contratUrl || null;
      }

      const { error } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", user.id);

      if (error) throw error;

      // 2. Gérer les départements UNIQUEMENT pour les admins
      if (userRoles.includes('admin') && (isSuperAdmin || isAdmin)) {
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

    // Gérer les admins assignés UNIQUEMENT pour les vendeurs
    if (userRoles.includes('vendeur') && (isSuperAdmin || isAdmin)) {
      const { data: currentAdmins } = await supabase
        .from("vendor_admins")
        .select("admin_id")
        .eq("vendor_id", user.id);

      const currentIds = currentAdmins?.map(a => a.admin_id) || [];
      const toAdd = selectedAdminIds.filter(id => !currentIds.includes(id));
      const toRemove = currentIds.filter(id => !selectedAdminIds.includes(id));

      if (toRemove.length > 0) {
        await supabase
          .from("vendor_admins")
          .delete()
          .eq("vendor_id", user.id)
          .in("admin_id", toRemove);
      }

      if (toAdd.length > 0) {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        await supabase
          .from("vendor_admins")
          .insert(toAdd.map(adminId => ({
            vendor_id: user.id,
            admin_id: adminId,
            assigned_by: currentUser?.id,
          })));
      }
    }

    // Gérer le changement de rôle (super_admin uniquement)
    if (isSuperAdmin && currentUser?.id !== user.id && selectedRole && selectedRole !== userRoles[0]) {
      // Supprimer tous les rôles existants
      const { error: deleteRoleError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", user.id);

      if (deleteRoleError) throw deleteRoleError;

      // Insérer le nouveau rôle
      const { error: insertRoleError } = await supabase
        .from("user_roles")
        .insert({ user_id: user.id, role: selectedRole as any });

      if (insertRoleError) throw insertRoleError;

      setUserRoles([selectedRole]);
      queryClient.invalidateQueries({ queryKey: ["user-roles"] });
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

  const handleGetGeolocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGeolocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          toast.success("Localisation capturée !");
        },
        (error) => {
          toast.error("Impossible de récupérer la position");
          console.error(error);
        }
      );
    } else {
      toast.error("Géolocalisation non supportée");
    }
  };

  const handleIdentityUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploadingIdentity(true);
      const file = event.target.files?.[0];
      if (!file) return;

      const validTypes = ['image/jpeg', 'image/png', 'application/pdf'];
      if (!validTypes.includes(file.type)) {
        toast.error("Format non supporté (.jpeg, .png ou .pdf)");
        return;
      }

      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}-identity.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("identity-documents")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("identity-documents")
        .getPublicUrl(filePath);

      setPieceIdentiteUrl(publicUrl);
      toast.success("Pièce d'identité téléchargée !");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUploadingIdentity(false);
    }
  };

  const handleContractUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploadingContract(true);
      const file = event.target.files?.[0];
      if (!file) return;

      const validTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
      if (!validTypes.includes(file.type)) {
        toast.error("Format non supporté (.pdf ou .docx)");
        return;
      }

      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}-contract.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("contracts")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("contracts")
        .getPublicUrl(filePath);

      setContratUrl(publicUrl);
      toast.success("Contrat téléchargé !");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUploadingContract(false);
    }
  };

  const handlePasswordReset = async () => {
    try {
      setIsResetting(true);

      const { data, error } = await supabase.functions.invoke('reset-user-password', {
        body: { userId: user.id }
      });

      if (error) throw error;

      toast.success("Mot de passe réinitialisé avec succès ! Nouveau mot de passe : fere1234");
      setShowResetDialog(false);
    } catch (error: any) {
      console.error('Error resetting password:', error);
      toast.error(error.message || "Erreur lors de la réinitialisation du mot de passe");
    } finally {
      setIsResetting(false);
    }
  };

  const handlePinReset = async () => {
    try {
      setIsResettingPin(true);
      const { data, error } = await supabase.functions.invoke('phone-auth', {
        body: { action: 'admin-fix-user', phone: user.contact, new_pin: '123456' }
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erreur inconnue");
      toast.success("PIN réinitialisé à 123456 avec succès !");
      setShowResetPinDialog(false);
    } catch (error: any) {
      console.error('Error resetting PIN:', error);
      toast.error(error.message || "Erreur lors de la réinitialisation du PIN");
    } finally {
      setIsResettingPin(false);
    }
  };

  const isPhoneBasedUser = userRoles.some(r => ['membre', 'vendeur', 'livreur', 'equipe'].includes(r));

  const canDeleteUser = () => {
    if (!user) return false;
    // Cannot delete yourself
    if (currentUser?.id === user.id) return false;
    
    const targetIsSuperAdmin = userRoles.includes('super_admin');
    const targetIsAdmin = userRoles.includes('admin');

    // Super admin can delete anyone except themselves
    if (isSuperAdmin) return true;

    // Admin can delete non-admin and non-super_admin users
    if (isAdmin) {
      return !targetIsSuperAdmin && !targetIsAdmin;
    }

    return false;
  };

  const handleDeleteUser = async () => {
    if (!user) return;

    try {
      setIsDeleting(true);

      const { error } = await supabase.functions.invoke('delete-user', {
        body: { userId: user.id }
      });

      if (error) throw error;

      toast.success(`${user.nom_complet} a été supprimé avec succès`);
      setShowDeleteDialog(false);
      onOpenChange(false);
      onUserUpdated?.();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error(error.message || "Erreur lors de la suppression de l'utilisateur");
    } finally {
      setIsDeleting(false);
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

          {/* Sélecteur de rôle - UNIQUEMENT pour le super_admin */}
          {isSuperAdmin && currentUser?.id !== user?.id && (
            <div className="space-y-2">
              <Label>Rôle</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un rôle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="vendeur">Vendeur</SelectItem>
                  <SelectItem value="livreur">Livreur</SelectItem>
                  <SelectItem value="membre">Membre</SelectItem>
                  <SelectItem value="equipe">Équipe</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Changer le rôle de cet utilisateur
              </p>
            </div>
          )}

          {/* Départements - UNIQUEMENT pour les admins */}
          {userRoles.includes('admin') && (isSuperAdmin || isAdmin) && departments.length > 0 && (
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

          {/* Section pour les vendeurs : Admins assignés */}
          {userRoles.includes('vendeur') && (isSuperAdmin || isAdmin) && assignableAdmins.length > 0 && (
            <div className="space-y-3">
              <Label>Admins Assignés</Label>
              <div className="border rounded-md p-4 space-y-3 max-h-64 overflow-y-auto bg-muted/30">
                {assignableAdmins.map((admin) => (
                  <div key={admin.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`admin-${admin.id}`}
                      checked={selectedAdminIds.includes(admin.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedAdminIds([...selectedAdminIds, admin.id]);
                        } else {
                          setSelectedAdminIds(selectedAdminIds.filter(id => id !== admin.id));
                        }
                      }}
                    />
                    <label htmlFor={`admin-${admin.id}`} className="text-sm cursor-pointer">
                      {admin.nom_complet}
                    </label>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Sélectionnez les admins qui géreront ce vendeur
              </p>
            </div>
          )}

          {/* Section Vendeur */}
          {userRoles.includes('vendeur') && (
            <div className="border-t pt-4 space-y-4">
              <h3 className="text-lg font-semibold">Informations Vendeur</h3>
              
              <div className="space-y-2">
                <Label>Statut Légal</Label>
                <Select value={statutLegal} onValueChange={setStatutLegal}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="particulier">Particulier</SelectItem>
                    <SelectItem value="entreprise">Entreprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Type d'Offre</Label>
                <Select value={typeOffre} onValueChange={setTypeOffre}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="produits">Produits</SelectItem>
                    <SelectItem value="services">Services</SelectItem>
                    <SelectItem value="les_deux">Les deux</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Type de Pièce d'Identité</Label>
                <Select value={pieceIdentiteType} onValueChange={setPieceIdentiteType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cni">CNI</SelectItem>
                    <SelectItem value="passeport">Passeport</SelectItem>
                    <SelectItem value="permis">Permis de conduire</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Pièce d'Identité</Label>
                <Input
                  type="file"
                  accept=".jpeg,.jpg,.png,.pdf"
                  onChange={handleIdentityUpload}
                  disabled={uploadingIdentity}
                  className="hidden"
                  id="identity-upload"
                />
                <Label htmlFor="identity-upload">
                  <Button type="button" variant="outline" disabled={uploadingIdentity} asChild>
                    <span className="cursor-pointer">
                      <Upload className="h-4 w-4 mr-2" />
                      {uploadingIdentity ? "Upload..." : pieceIdentiteUrl ? "Changer" : "Télécharger"}
                    </span>
                  </Button>
                </Label>
                {pieceIdentiteUrl && <p className="text-xs text-muted-foreground">Document téléchargé ✓</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="adresse">Adresse</Label>
                <Input
                  id="adresse"
                  value={adresse}
                  onChange={(e) => setAdresse(e.target.value)}
                  placeholder="123 Rue Example, Bamako"
                />
              </div>

              <div className="space-y-2">
                <Label>Géolocalisation</Label>
                <div className="flex gap-2">
                  <Input
                    value={
                      geolocation.lat && geolocation.lng
                        ? `${geolocation.lat.toFixed(6)}, ${geolocation.lng.toFixed(6)}`
                        : "Non définie"
                    }
                    disabled
                  />
                  <Button type="button" onClick={handleGetGeolocation} variant="outline">
                    <MapPin className="h-4 w-4 mr-2" />
                    Capturer
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Section Admin */}
          {userRoles.includes('admin') && (
            <div className="border-t pt-4 space-y-4">
              <h3 className="text-lg font-semibold">Informations Contrat</h3>
              
              <div className="space-y-2">
                <Label>Type de Contrat</Label>
                <Select value={typeContrat} onValueChange={setTypeContrat}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cdd">CDD</SelectItem>
                    <SelectItem value="cdi">CDI</SelectItem>
                    <SelectItem value="prestataire">Prestataire</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {typeContrat === 'cdd' && (
                <div className="space-y-2">
                  <Label htmlFor="duree_contrat">Durée de Contrat</Label>
                  <Input
                    id="duree_contrat"
                    value={dureeContrat}
                    onChange={(e) => setDureeContrat(e.target.value)}
                    placeholder="Ex: 12 mois"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Présence</Label>
                <Select value={presence} onValueChange={setPresence}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="presentiel">Présentiel</SelectItem>
                    <SelectItem value="distance">À distance</SelectItem>
                    <SelectItem value="hybride">Hybride</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Contrat</Label>
                <Input
                  type="file"
                  accept=".pdf,.docx"
                  onChange={handleContractUpload}
                  disabled={uploadingContract}
                  className="hidden"
                  id="contract-upload"
                />
                <Label htmlFor="contract-upload">
                  <Button type="button" variant="outline" disabled={uploadingContract} asChild>
                    <span className="cursor-pointer">
                      <Upload className="h-4 w-4 mr-2" />
                      {uploadingContract ? "Upload..." : contratUrl ? "Changer" : "Télécharger"}
                    </span>
                  </Button>
                </Label>
                {contratUrl && <p className="text-xs text-muted-foreground">Contrat téléchargé ✓</p>}
              </div>
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
                Réservé aux comptes admin/super_admin (connexion email). Les utilisateurs mobile utilisent la réinitialisation de PIN.
              </p>
            </div>
          )}

          {(isSuperAdmin || isAdmin) && canDeleteUser() && (
            <div className="border-t pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDeleteDialog(true)}
                disabled={isDeleting || isLoading}
                className="w-full border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {isDeleting ? "Suppression..." : "Supprimer l'utilisateur"}
              </Button>
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
              Le mot de passe sera réinitialisé à la valeur par défaut. Cette action ne concerne que les comptes admin/super_admin (connexion email).
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

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer l'utilisateur</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer{" "}
              <span className="font-semibold">{user?.nom_complet}</span> ?
              <br />
              <br />
              Cette action est irréversible. Toutes les données associées à cet utilisateur seront supprimées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Suppression..." : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  );
};
