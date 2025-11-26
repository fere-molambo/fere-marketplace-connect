import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, UserMinus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface ConfigTabProps {
  shopId: string;
}

interface TeamMember {
  id: string;
  member_id: string;
  assignment_type: string;
  profiles: {
    nom_complet: string;
    email: string;
    photo_profil: string | null;
  };
}

interface AvailableMember {
  id: string;
  nom_complet: string;
  email: string;
  photo_profil: string | null;
}

export const ConfigTab = ({ shopId }: ConfigTabProps) => {
  const { user } = useAuth();
  const { isSuperAdmin, isAdmin } = useUserRoles();
  const [open, setOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  // Fetch current team members
  const { data: teamMembers, refetch: refetchTeam } = useQuery({
    queryKey: ["shop-team-members", shopId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shop_team_members")
        .select(`
          id,
          member_id,
          assignment_type,
          profiles!shop_team_members_member_id_fkey (
            nom_complet,
            email,
            photo_profil
          )
        `)
        .eq("shop_id", shopId);

      if (error) throw error;
      return data as TeamMember[];
    },
  });

  // Fetch available team members based on role
  const { data: availableMembers } = useQuery({
    queryKey: ["available-team-members", user?.id, isSuperAdmin, isAdmin, teamMembers?.map(tm => tm.member_id)],
    queryFn: async () => {
      if (!user) return [];

      // Step 1: Fetch all user_ids with 'equipe' role
      const { data: equipeRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "equipe");

      if (rolesError) throw rolesError;
      if (!equipeRoles || equipeRoles.length === 0) return [];

      const equipeUserIds = equipeRoles.map(r => r.user_id);

      // Step 2: Fetch corresponding profiles
      let query = supabase
        .from("profiles")
        .select("id, nom_complet, email, photo_profil")
        .in("id", equipeUserIds);

      // If vendeur, only show team members they created
      if (!isSuperAdmin && !isAdmin) {
        query = query.eq("created_by", user.id);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Filter out members already in the team
      const currentMemberIds = teamMembers?.map(tm => tm.member_id) || [];
      return (data as AvailableMember[]).filter(m => !currentMemberIds.includes(m.id));
    },
    enabled: !!user && teamMembers !== undefined,
  });

  const handleAddMember = async () => {
    if (!selectedMember) return;

    setIsAdding(true);
    try {
      const { error } = await supabase.from("shop_team_members").insert({
        shop_id: shopId,
        member_id: selectedMember,
        assignment_type: "equipe",
        assigned_by: user?.id,
      });

      if (error) throw error;

      toast.success("Membre ajouté avec succès");
      setOpen(false);
      setSelectedMember(null);
      await refetchTeam();
    } catch (error: any) {
      console.error("Error adding member:", error);
      toast.error(error.message || "Erreur lors de l'ajout du membre");
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;

    setIsRemoving(true);
    try {
      const { error } = await supabase
        .from("shop_team_members")
        .delete()
        .eq("id", memberToRemove);

      if (error) throw error;

      toast.success("Membre retiré avec succès");
      setMemberToRemove(null);
      refetchTeam();
    } catch (error: any) {
      console.error("Error removing member:", error);
      toast.error(error.message || "Erreur lors du retrait du membre");
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Membres de l'équipe</CardTitle>
              <CardDescription>
                Gérez les membres qui ont accès à cette boutique
              </CardDescription>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter un membre
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Ajouter un membre d'équipe</DialogTitle>
                  <DialogDescription>
                    Sélectionnez un membre à ajouter à cette boutique
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-2">
                  {!availableMembers || availableMembers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Aucun membre d'équipe disponible
                    </p>
                  ) : (
                    availableMembers.map((member) => (
                      <div
                        key={member.id}
                        className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent ${
                          selectedMember === member.id ? "border-primary bg-accent" : ""
                        }`}
                        onClick={() => setSelectedMember(member.id)}
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={member.photo_profil || ""} />
                          <AvatarFallback>
                            {member.nom_complet.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium">{member.nom_complet}</p>
                          <p className="text-sm text-muted-foreground">{member.email}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setOpen(false)}>
                    Annuler
                  </Button>
                  <Button onClick={handleAddMember} disabled={!selectedMember || isAdding}>
                    {isAdding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Ajouter
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {!teamMembers || teamMembers.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground">
              Aucun membre d'équipe assigné
            </p>
          ) : (
            <div className="space-y-2">
              {teamMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={member.profiles.photo_profil || ""} />
                      <AvatarFallback>
                        {member.profiles.nom_complet.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{member.profiles.nom_complet}</p>
                      <p className="text-sm text-muted-foreground">{member.profiles.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{member.assignment_type}</Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setMemberToRemove(member.id)}
                    >
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!memberToRemove} onOpenChange={() => setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retirer ce membre ?</AlertDialogTitle>
            <AlertDialogDescription>
              Ce membre n'aura plus accès à cette boutique. Cette action est réversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveMember} disabled={isRemoving}>
              {isRemoving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Retirer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
