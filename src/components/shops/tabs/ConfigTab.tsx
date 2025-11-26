import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { UserPlus, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useUserRoles } from "@/hooks/useUserRoles";

interface ConfigTabProps {
  shopId: string;
}

interface TeamMember {
  id: string;
  member_id: string;
  assignment_type: string;
  profiles: {
    nom_complet: string;
    email: string | null;
    photo_profil: string | null;
  };
}

interface AvailableMember {
  id: string;
  nom_complet: string;
  email: string | null;
  photo_profil: string | null;
}

interface TeamTag {
  id: string;
  name: string;
  label: string;
  color: string;
}

export const ConfigTab = ({ shopId }: ConfigTabProps) => {
  const [open, setOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string>("");
  const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null);
  const [memberToEdit, setMemberToEdit] = useState<TeamMember | null>(null);
  const [editTagDialogOpen, setEditTagDialogOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const { user } = useAuth();
  const { isSuperAdmin, isAdmin } = useUserRoles();

  // Fetch available tags
  const { data: tags } = useQuery({
    queryKey: ["team-assignment-tags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_assignment_tags")
        .select("*")
        .eq("is_active", true)
        .order("display_order");

      if (error) throw error;
      return data as TeamTag[];
    },
  });

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
    if (!selectedMember || !selectedTag) {
      toast.error("Veuillez sélectionner un membre et un tag");
      return;
    }

    setIsAdding(true);
    try {
      const { error } = await supabase
        .from("shop_team_members")
        .insert({
          shop_id: shopId,
          member_id: selectedMember,
          assignment_type: selectedTag,
          assigned_by: user?.id,
        });

      if (error) throw error;

      toast.success("Membre ajouté avec succès");
      setOpen(false);
      setSelectedMember(null);
      setSelectedTag("");
      await refetchTeam();
    } catch (error: any) {
      console.error("Error adding member:", error);
      toast.error(error.message || "Erreur lors de l'ajout du membre");
    } finally {
      setIsAdding(false);
    }
  };

  const handleEditTag = async () => {
    if (!memberToEdit || !selectedTag) return;

    try {
      const { error } = await supabase
        .from("shop_team_members")
        .update({ assignment_type: selectedTag })
        .eq("id", memberToEdit.id);

      if (error) throw error;

      toast.success("Tag modifié avec succès");
      setEditTagDialogOpen(false);
      setMemberToEdit(null);
      setSelectedTag("");
      await refetchTeam();
    } catch (error: any) {
      console.error("Error updating tag:", error);
      toast.error(error.message || "Erreur lors de la modification du tag");
    }
  };

  const openEditTagDialog = (member: TeamMember) => {
    setMemberToEdit(member);
    setSelectedTag(member.assignment_type);
    setEditTagDialogOpen(true);
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;

    setIsRemoving(true);
    try {
      const { error } = await supabase
        .from("shop_team_members")
        .delete()
        .eq("id", memberToRemove.id);

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
                <UserPlus className="h-4 w-4 mr-2" />
                Ajouter
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ajouter un membre d'équipe</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {availableMembers && availableMembers.length > 0 ? (
                  <>
                    {availableMembers.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-accent"
                        onClick={() => setSelectedMember(member.id)}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={member.photo_profil || undefined} />
                            <AvatarFallback>
                              {member.nom_complet.split(" ").map(n => n[0]).join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{member.nom_complet}</p>
                            <p className="text-sm text-muted-foreground">{member.email}</p>
                          </div>
                        </div>
                        <input
                          type="radio"
                          checked={selectedMember === member.id}
                          onChange={() => setSelectedMember(member.id)}
                          className="cursor-pointer"
                        />
                      </div>
                    ))}
                    
                    {selectedMember && (
                      <div className="space-y-2">
                        <Label>Type d'assignation</Label>
                        <Select value={selectedTag} onValueChange={setSelectedTag}>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner un tag" />
                          </SelectTrigger>
                          <SelectContent>
                            {tags?.map((tag) => (
                              <SelectItem key={tag.id} value={tag.name}>
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="w-3 h-3 rounded-full" 
                                    style={{ backgroundColor: tag.color }}
                                  />
                                  {tag.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <Button 
                      onClick={handleAddMember} 
                      className="w-full" 
                      disabled={isAdding || !selectedMember || !selectedTag}
                    >
                      {isAdding ? "Ajout en cours..." : "Ajouter"}
                    </Button>
                  </>
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    Aucun membre d'équipe disponible
                  </p>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {!teamMembers || teamMembers.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-4">
            Aucun membre d'équipe assigné
          </p>
        ) : (
          <div className="space-y-2">
            {teamMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={member.profiles.photo_profil || undefined} />
                    <AvatarFallback>
                      {member.profiles.nom_complet.split(" ").map(n => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">{member.profiles.nom_complet}</p>
                    <p className="text-sm text-muted-foreground">{member.profiles.email}</p>
                    <div className="mt-2">
                      {tags?.find(t => t.name === member.assignment_type) && (
                        <Badge 
                          style={{ 
                            backgroundColor: tags.find(t => t.name === member.assignment_type)?.color,
                            color: "#fff"
                          }}
                        >
                          {tags.find(t => t.name === member.assignment_type)?.label}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => openEditTagDialog(member)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setMemberToRemove(member)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Remove Member Dialog */}
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
              {isRemoving ? "Suppression..." : "Retirer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Tag Dialog */}
      <Dialog open={editTagDialogOpen} onOpenChange={setEditTagDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le tag</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">
                Membre: {memberToEdit?.profiles.nom_complet}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Nouveau tag</Label>
              <Select value={selectedTag} onValueChange={setSelectedTag}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un tag" />
                </SelectTrigger>
                <SelectContent>
                  {tags?.map((tag) => (
                    <SelectItem key={tag.id} value={tag.name}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: tag.color }}
                        />
                        {tag.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleEditTag} className="w-full">
              Enregistrer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
