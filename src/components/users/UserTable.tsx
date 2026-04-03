import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Pencil, Phone, Mail, Trash2 } from "lucide-react";
import { UserPreviewDialog } from "./UserPreviewDialog";
import { UserEditSheet } from "./UserEditSheet";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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

interface UserTableProps {
  users: any[];
  onUserUpdated?: () => void;
}

export const UserTable = ({ users, onUserUpdated }: UserTableProps) => {
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const { isSuperAdmin, isAdmin } = useUserRoles();
  const { user: currentUser } = useAuth();

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const roleLabels: Record<string, string> = {
    super_admin: "Super Admin",
    admin: "Admin",
    vendeur: "Vendeur",
    livreur: "Livreur",
    membre: "Membre",
    equipe: "Équipe",
  };

  const handlePreview = (user: any) => {
    setSelectedUser(user);
    setPreviewOpen(true);
  };

  const handleEdit = (user: any) => {
    setSelectedUser(user);
    setEditOpen(true);
  };

  const handleEditFromPreview = () => {
    setPreviewOpen(false);
    setEditOpen(true);
  };

  const handleDeleteClick = (user: any) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const canDeleteUser = (user: any) => {
    // Cannot delete yourself
    if (currentUser?.id === user.id) return false;
    
    const userRolesList = user.roles?.map((r: any) => r.role) || [];
    const targetIsSuperAdmin = userRolesList.includes('super_admin');
    const targetIsAdmin = userRolesList.includes('admin');

    // Super admin can delete anyone except themselves
    if (isSuperAdmin) return true;

    // Admin can delete non-admin and non-super_admin users
    if (isAdmin) {
      return !targetIsSuperAdmin && !targetIsAdmin;
    }

    return false;
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;

    try {
      setIsDeleting(true);

      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { userId: userToDelete.id }
      });

      if (error) throw error;

      toast.success(`${userToDelete.nom_complet} a été supprimé avec succès`);
      setDeleteDialogOpen(false);
      setUserToDelete(null);
      onUserUpdated?.();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error(error.message || "Erreur lors de la suppression de l'utilisateur");
    } finally {
      setIsDeleting(false);
    }
  };

  const showDeleteButton = isSuperAdmin || isAdmin;

  return (
    <>
      {/* Mobile Card View */}
      <div className="block md:hidden space-y-3">
        {users.map((user) => (
          <div
            key={user.id}
            className="rounded-lg border bg-card p-4 space-y-3"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={user.photo_profil} />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {getInitials(user.nom_complet)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{user.nom_complet}</p>
                    {user.is_blocked && (
                      <Badge variant="destructive" className="text-xs">Bloqué</Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {user.roles?.map((roleItem: any) => (
                      <Badge key={roleItem.role} variant="secondary" className="text-xs">
                        {roleLabels[roleItem.role] || roleItem.role}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handlePreview(user)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleEdit(user)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                {showDeleteButton && canDeleteUser(user) && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleDeleteClick(user)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-1 text-sm text-muted-foreground">
              {user.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-3 w-3" />
                  <span className="truncate">{user.email}</span>
                </div>
              )}
              {user.contact && (
                <div className="flex items-center gap-2">
                  <Phone className="h-3 w-3" />
                  <span>{user.contact}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Utilisateur</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Rôle</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={user.photo_profil} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {getInitials(user.nom_complet)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{user.nom_complet}</span>
                      {user.is_blocked && (
                        <Badge variant="destructive" className="text-xs">Bloqué</Badge>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.contact}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {user.roles?.map((roleItem: any) => (
                      <Badge key={roleItem.role} variant="secondary">
                        {roleLabels[roleItem.role] || roleItem.role}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handlePreview(user)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(user)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {showDeleteButton && canDeleteUser(user) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDeleteClick(user)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <UserPreviewDialog
        user={selectedUser}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        onEdit={handleEditFromPreview}
      />

      <UserEditSheet
        user={selectedUser}
        open={editOpen}
        onOpenChange={setEditOpen}
        onUserUpdated={onUserUpdated}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer l'utilisateur</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer{" "}
              <span className="font-semibold">{userToDelete?.nom_complet}</span> ?
              <br />
              <br />
              Cette action est irréversible. Toutes les données associées à cet utilisateur seront supprimées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Suppression..." : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
