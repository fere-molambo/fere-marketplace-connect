import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Plus } from "lucide-react";
import { toast } from "sonner";

const createShopSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  shop_type: z.enum(["fournisseur", "prestataire", "les_deux"]),
  owner_id: z.string().uuid("Sélectionnez un propriétaire"),
  delivery_zone_id: z.string().uuid().optional(),
  is_official: z.boolean().default(false),
  responsible_admin_id: z.string().uuid().optional(),
  verification_status: z.enum(["pending", "verified", "rejected"]).default("verified"),
  creation_reason: z.string().optional(),
});

type CreateShopFormData = z.infer<typeof createShopSchema>;

interface CreateShopDialogProps {
  onShopCreated?: () => void;
}

export const CreateShopDialog = ({ onShopCreated }: CreateShopDialogProps) => {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { isSuperAdmin, isAdmin } = useUserRoles();
  const { user } = useAuth();

  const form = useForm<CreateShopFormData>({
    resolver: zodResolver(createShopSchema),
    defaultValues: {
      shop_type: "fournisseur",
      is_official: false,
      verification_status: "verified",
    },
  });

  const { data: vendors } = useQuery({
    queryKey: ["vendors-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, nom_complet, email")
        .in("id", 
          (await supabase.from("user_roles").select("user_id").eq("role", "vendeur")).data?.map(r => r.user_id) || []
        );
      if (error) throw error;
      return data;
    },
  });

  const { data: zones = [] } = useQuery({
    queryKey: ["delivery-zones"],
    queryFn: async () => {
      const { data, error } = await supabase.from("delivery_zones").select("id, name").eq("is_active", true).order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: admins } = useQuery({
    queryKey: ["admins-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, nom_complet, email")
        .in("id",
          (await supabase.from("user_roles").select("user_id").in("role", ["admin", "super_admin"])).data?.map(r => r.user_id) || []
        );
      if (error) throw error;
      return data;
    },
    enabled: isSuperAdmin || isAdmin,
  });

  const onSubmit = async (data: CreateShopFormData) => {
    setIsLoading(true);
    try {
      const slug = data.name.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "");
      
      const { error } = await supabase.from("shops").insert([{
        name: data.name,
        shop_type: data.shop_type,
        owner_id: data.owner_id,
        delivery_zone_id: data.delivery_zone_id || null,
        is_official: data.is_official,
        responsible_admin_id: data.responsible_admin_id,
        verification_status: data.verification_status,
        creation_reason: data.creation_reason,
        slug,
        created_by: user?.id,
      }]);

      if (error) throw error;

      toast.success("Boutique créée avec succès");
      setOpen(false);
      form.reset();
      onShopCreated?.();
    } catch (error: any) {
      console.error("Error creating shop:", error);
      toast.error(error.message || "Erreur lors de la création");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Créer une boutique
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Créer une boutique</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom de la boutique *</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="shop_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="fournisseur">Fournisseur</SelectItem>
                      <SelectItem value="prestataire">Prestataire</SelectItem>
                      <SelectItem value="les_deux">Les deux</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="owner_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Propriétaire (Vendeur) *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {vendors?.map((vendor) => (
                        <SelectItem key={vendor.id} value={vendor.id}>
                          {vendor.nom_complet} ({vendor.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="delivery_zone_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Zone de livraison</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner une zone" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {zones.map((zone) => (
                        <SelectItem key={zone.id} value={zone.id}>
                          {zone.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {(isSuperAdmin || isAdmin) && (
              <>
                <div className="border-t pt-4">
                  <h3 className="mb-4 text-sm font-medium">Paramètres Admin</h3>

                  <FormField
                    control={form.control}
                    name="is_official"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-3">
                        <FormLabel className="text-sm">Boutique Officielle</FormLabel>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="responsible_admin_id"
                    render={({ field }) => (
                      <FormItem className="mt-4">
                        <FormLabel>Admin Responsable</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {admins?.map((admin) => (
                              <SelectItem key={admin.id} value={admin.id}>
                                {admin.nom_complet} ({admin.email})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="verification_status"
                    render={({ field }) => (
                      <FormItem className="mt-4">
                        <FormLabel>Statut de Vérification</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="pending">En attente</SelectItem>
                            <SelectItem value="verified">Vérifié</SelectItem>
                            <SelectItem value="rejected">Rejeté</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="creation_reason"
                    render={({ field }) => (
                      <FormItem className="mt-4">
                        <FormLabel>Raison de la Création</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={3} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="mt-4 rounded-lg bg-muted p-3">
                    <p className="text-xs text-muted-foreground">
                      📅 Date de création: {new Date().toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                </div>
              </>
            )}

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                className="flex-1"
              >
                Annuler
              </Button>
              <Button type="submit" disabled={isLoading} className="flex-1">
                {isLoading ? "Création..." : "Créer"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
