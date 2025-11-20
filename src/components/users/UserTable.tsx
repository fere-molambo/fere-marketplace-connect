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
import { Eye, Pencil } from "lucide-react";
import { UserPreviewDialog } from "./UserPreviewDialog";
import { UserEditSheet } from "./UserEditSheet";

interface UserTableProps {
  users: any[];
  onUserUpdated?: () => void;
}

export const UserTable = ({ users, onUserUpdated }: UserTableProps) => {
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

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

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Utilisateur</TableHead>
              <TableHead className="hidden md:table-cell">Email</TableHead>
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
                    <span className="font-medium">{user.nom_complet}</span>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">{user.email}</TableCell>
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
    </>
  );
};
