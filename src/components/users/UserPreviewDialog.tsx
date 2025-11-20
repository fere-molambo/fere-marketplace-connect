import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface UserPreviewDialogProps {
  user: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: () => void;
}

export const UserPreviewDialog = ({ user, open, onOpenChange, onEdit }: UserPreviewDialogProps) => {
  if (!user) return null;

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Détails de l'utilisateur</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div className="flex flex-col items-center gap-4">
            <Avatar className="h-24 w-24">
              <AvatarImage src={user.photo_profil} />
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                {getInitials(user.nom_complet)}
              </AvatarFallback>
            </Avatar>
            <div className="text-center">
              <h3 className="text-xl font-semibold">{user.nom_complet}</h3>
              {user.roles && (
                <div className="flex gap-2 justify-center mt-2">
                  {user.roles.map((roleItem: any) => (
                    <Badge key={roleItem.role} variant="secondary">
                      {roleLabels[roleItem.role] || roleItem.role}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{user.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Contact</p>
              <p className="font-medium">{user.contact}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Date d'inscription</p>
              <p className="font-medium">
                {format(new Date(user.created_at), "PPP", { locale: fr })}
              </p>
            </div>
          </div>

          {onEdit && (
            <Button onClick={onEdit} className="w-full">
              Modifier l'utilisateur
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
