import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Loader2 } from "lucide-react";

const editShopSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères").max(100, "Le nom ne peut pas dépasser 100 caractères"),
  description: z.string().optional(),
  shop_type: z.enum(["fournisseur", "prestataire", "les_deux"]),
  statut_legal: z.string().optional(),
  address: z.string().optional(),
  contact_phone: z.string().optional(),
  contact_email: z.string().email("Email invalide").optional().or(z.literal("")),
  support_phone: z.string().optional(),
  whatsapp_catalog_link: z.string().url("URL invalide").optional().or(z.literal("")),
  opening_time: z.string().optional(),
  closing_time: z.string().optional(),
});

type EditShopFormData = z.infer<typeof editShopSchema>;

interface ShopInfoSectionProps {
  shop: any;
  onUpdate?: () => void;
}

export const ShopInfoSection = ({ shop, onUpdate }: ShopInfoSectionProps) => {
  const form = useForm<EditShopFormData>({
    resolver: zodResolver(editShopSchema),
    defaultValues: {
      name: shop.name || "",
      description: shop.description || "",
      shop_type: shop.shop_type || "fournisseur",
      statut_legal: shop.statut_legal || "",
      address: shop.address || "",
      contact_phone: shop.contact_phone || "",
      contact_email: shop.contact_email || "",
      support_phone: shop.support_phone || "",
      whatsapp_catalog_link: shop.whatsapp_catalog_link || "",
      opening_time: shop.opening_time || "",
      closing_time: shop.closing_time || "",
    },
  });

  const onSubmit = async (data: EditShopFormData) => {
    try {
      const { error } = await supabase
        .from("shops")
        .update({
          name: data.name,
          description: data.description,
          shop_type: data.shop_type,
          statut_legal: data.statut_legal || null,
          address: data.address || null,
          contact_phone: data.contact_phone || null,
          contact_email: data.contact_email || null,
          support_phone: data.support_phone || null,
          whatsapp_catalog_link: data.whatsapp_catalog_link || null,
          opening_time: data.opening_time || null,
          closing_time: data.closing_time || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", shop.id);

      if (error) throw error;

      toast.success("Informations mises à jour avec succès");
      onUpdate?.();
    } catch (error: any) {
      console.error("Update error:", error);
      toast.error(error.message || "Erreur lors de la mise à jour");
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card p-6">
        <h2 className="mb-6 text-lg font-semibold">Informations de la boutique</h2>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom de la boutique</FormLabel>
                  <FormControl>
                    <Input placeholder="Nom de votre boutique" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Décrivez votre boutique..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="shop_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type de boutique</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un type" />
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
                name="statut_legal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Statut légal</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un statut" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="particulier">Particulier</SelectItem>
                        <SelectItem value="entreprise">Entreprise</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Adresse</FormLabel>
                  <FormControl>
                    <Input placeholder="Adresse complète" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="contact_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Téléphone de contact</FormLabel>
                    <FormControl>
                      <Input placeholder="+223 XX XX XX XX" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contact_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email de contact</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="contact@boutique.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="support_phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Téléphone support</FormLabel>
                  <FormControl>
                    <Input placeholder="+223 XX XX XX XX" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="whatsapp_catalog_link"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lien catalogue WhatsApp</FormLabel>
                  <FormControl>
                    <Input placeholder="https://wa.me/c/..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="opening_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Heure d'ouverture</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="closing_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Heure de fermeture</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Enregistrer les modifications
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
};
