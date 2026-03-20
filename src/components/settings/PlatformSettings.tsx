import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash2 } from "lucide-react";

export const PlatformSettings = () => {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState<string | null>(null);

  // Récupérer les paramètres actuels
  const { data: settings, isLoading } = useQuery({
    queryKey: ["platform-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("*")
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  // Mutation pour mettre à jour les paramètres
  const updateSettings = useMutation({
    mutationFn: async (updates: any) => {
      const { error } = await supabase
        .from("platform_settings")
        .update(updates)
        .eq("id", settings?.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      // Invalider tous les caches liés aux settings
      queryClient.invalidateQueries({ queryKey: ["platform-settings"] });
      queryClient.invalidateQueries({ queryKey: ["platform-settings-public"] });
      queryClient.invalidateQueries({ queryKey: ["platform-settings-footer"] });
      queryClient.invalidateQueries({ queryKey: ["platform-settings-homepage"] });
      queryClient.invalidateQueries({ queryKey: ["platform-settings-hero"] });
      toast.success("Paramètres mis à jour");
    },
    onError: () => {
      toast.error("Erreur lors de la mise à jour");
    },
  });

  // Upload d'un fichier vers le bucket
  const uploadFile = async (file: File, field: string) => {
    try {
      setUploading(field);
      const fileExt = file.name.split(".").pop();
      const fileName = `${field}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("fere-dashboard-infos")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("fere-dashboard-infos")
        .getPublicUrl(filePath);

      await updateSettings.mutateAsync({ [field]: publicUrl });
      toast.success("Image uploadée avec succès");
    } catch (error) {
      toast.error("Erreur lors de l'upload");
      console.error(error);
    } finally {
      setUploading(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadFile(file, field);
    }
  };

  const handleTextUpdate = async (field: string, value: string) => {
    await updateSettings.mutateAsync({ [field]: value });
  };

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Informations générales */}
      <Card>
        <CardHeader>
          <CardTitle>Informations générales</CardTitle>
          <CardDescription>
            Nom et description de votre application
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="app_name">Nom de l'application</Label>
            <Input
              id="app_name"
              defaultValue={settings?.app_name || ""}
              onBlur={(e) => handleTextUpdate("app_name", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="app_description">Description</Label>
            <Textarea
              id="app_description"
              defaultValue={settings?.app_description || ""}
              onBlur={(e) => handleTextUpdate("app_description", e.target.value)}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Logos */}
      <Card>
        <CardHeader>
          <CardTitle>Logos</CardTitle>
          <CardDescription>
            Gérez les différents logos de votre application
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="logo_principal">Logo principal</Label>
            <div className="flex items-center gap-4">
              {settings?.logo_principal && (
                <img src={settings.logo_principal} alt="Logo principal" className="h-16 w-16 object-contain border rounded p-2" />
              )}
              <div>
                <Input
                  id="logo_principal"
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, "logo_principal")}
                  disabled={uploading === "logo_principal"}
                />
                <p className="text-xs text-muted-foreground mt-1">Affiché dans la sidebar ouverte</p>
              </div>
              {uploading === "logo_principal" && <Loader2 className="h-4 w-4 animate-spin" />}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="logo_sidebar_collapsed">Logo sidebar réduite</Label>
            <div className="flex items-center gap-4">
              {settings?.logo_sidebar_collapsed && (
                <img src={settings.logo_sidebar_collapsed} alt="Logo sidebar" className="h-16 w-16 object-contain border rounded p-2" />
              )}
              <div>
                <Input
                  id="logo_sidebar_collapsed"
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, "logo_sidebar_collapsed")}
                  disabled={uploading === "logo_sidebar_collapsed"}
                />
                <p className="text-xs text-muted-foreground mt-1">Affiché quand la sidebar est réduite</p>
              </div>
              {uploading === "logo_sidebar_collapsed" && <Loader2 className="h-4 w-4 animate-spin" />}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="logo_auth_page">Logo page d'authentification</Label>
            <div className="flex items-center gap-4">
              {settings?.logo_auth_page && (
                <img src={settings.logo_auth_page} alt="Logo auth" className="h-16 w-16 object-contain border rounded p-2" />
              )}
              <div>
                <Input
                  id="logo_auth_page"
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, "logo_auth_page")}
                  disabled={uploading === "logo_auth_page"}
                />
                <p className="text-xs text-muted-foreground mt-1">Affiché sur la page de connexion/inscription</p>
              </div>
              {uploading === "logo_auth_page" && <Loader2 className="h-4 w-4 animate-spin" />}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="favicon">Favicon</Label>
            <div className="flex items-center gap-4">
              {settings?.favicon && (
                <img src={settings.favicon} alt="Favicon" className="h-8 w-8 object-contain border rounded p-1" />
              )}
              <div>
                <Input
                  id="favicon"
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, "favicon")}
                  disabled={uploading === "favicon"}
                />
                <p className="text-xs text-muted-foreground mt-1">Icône affichée dans l'onglet du navigateur</p>
              </div>
              {uploading === "favicon" && <Loader2 className="h-4 w-4 animate-spin" />}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="logo_footer">Logo footer</Label>
            <div className="flex items-center gap-4">
              {settings?.logo_footer && (
                <div className="bg-primary p-2 rounded">
                  <img src={settings.logo_footer} alt="Logo footer" className="h-12 w-auto" />
                </div>
              )}
              <div>
                <Input
                  id="logo_footer"
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, "logo_footer")}
                  disabled={uploading === "logo_footer"}
                />
                <p className="text-xs text-muted-foreground mt-1">Version claire du logo pour le footer (fond vert)</p>
              </div>
              {uploading === "logo_footer" && <Loader2 className="h-4 w-4 animate-spin" />}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Images d'authentification */}
      <Card>
        <CardHeader>
          <CardTitle>Images d'authentification</CardTitle>
          <CardDescription>
            Images affichées sur les pages de connexion et d'inscription
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="image_auth_login">Image page de connexion</Label>
            <div className="flex items-center gap-4">
              {settings?.image_auth_login && (
                <img src={settings.image_auth_login} alt="Connexion" className="h-24 w-24 object-cover border rounded" />
              )}
              <div className="flex-1">
                <Input
                  id="image_auth_login"
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, "image_auth_login")}
                  disabled={uploading === "image_auth_login"}
                />
                <p className="text-xs text-muted-foreground mt-1">Affichée en arrière-plan sur l'onglet connexion</p>
              </div>
              {uploading === "image_auth_login" && <Loader2 className="h-4 w-4 animate-spin" />}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="image_auth_signup">Image page d'inscription</Label>
            <div className="flex items-center gap-4">
              {settings?.image_auth_signup && (
                <img src={settings.image_auth_signup} alt="Inscription" className="h-24 w-24 object-cover border rounded" />
              )}
              <div className="flex-1">
                <Input
                  id="image_auth_signup"
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, "image_auth_signup")}
                  disabled={uploading === "image_auth_signup"}
                />
                <p className="text-xs text-muted-foreground mt-1">Affichée en arrière-plan sur l'onglet inscription</p>
              </div>
              {uploading === "image_auth_signup" && <Loader2 className="h-4 w-4 animate-spin" />}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contacts entreprise */}
      <Card>
        <CardHeader>
          <CardTitle>Contacts entreprise</CardTitle>
          <CardDescription>
            Informations de contact affichées sur le site
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="company_email">Email entreprise</Label>
            <Input
              id="company_email"
              type="email"
              defaultValue={settings?.company_email || ""}
              onBlur={(e) => handleTextUpdate("company_email", e.target.value)}
              placeholder="contact@fere.app"
            />
          </div>
          <div>
            <Label htmlFor="support_email">Email support</Label>
            <Input
              id="support_email"
              type="email"
              defaultValue={settings?.support_email || ""}
              onBlur={(e) => handleTextUpdate("support_email", e.target.value)}
              placeholder="support@fere.app"
            />
          </div>
          <div>
            <Label htmlFor="support_phone">Téléphone support</Label>
            <Input
              id="support_phone"
              type="tel"
              defaultValue={settings?.support_phone || ""}
              onBlur={(e) => handleTextUpdate("support_phone", e.target.value)}
              placeholder="+223 70 00 00 00"
            />
          </div>
        </CardContent>
      </Card>

      {/* Documents légaux */}
      <Card>
        <CardHeader>
          <CardTitle>Documents légaux</CardTitle>
          <CardDescription>
            Conditions générales, politique de confidentialité et cookies
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="cgu">Conditions générales d'utilisation (CGU)</Label>
            <Textarea
              id="cgu"
              defaultValue={settings?.cgu || ""}
              onBlur={(e) => handleTextUpdate("cgu", e.target.value)}
              rows={6}
              placeholder="Vos conditions générales d'utilisation..."
            />
          </div>
          <div>
            <Label htmlFor="privacy_policy">Politique de confidentialité</Label>
            <Textarea
              id="privacy_policy"
              defaultValue={(settings as any)?.privacy_policy || ""}
              onBlur={(e) => handleTextUpdate("privacy_policy", e.target.value)}
              rows={6}
              placeholder="Votre politique de confidentialité..."
            />
          </div>
          <div>
            <Label htmlFor="cookies">Politique de cookies</Label>
            <Textarea
              id="cookies"
              defaultValue={settings?.cookies || ""}
              onBlur={(e) => handleTextUpdate("cookies", e.target.value)}
              rows={6}
              placeholder="Votre politique de cookies..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Paramètres de livraison */}
      <Card>
        <CardHeader>
          <CardTitle>Paramètres de livraison</CardTitle>
          <CardDescription>
            Configurez les frais de livraison, réductions et commissions livreurs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Frais de base et par distance */}
          <div>
            <h4 className="text-sm font-medium mb-3">Tarification</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="delivery_base_fee">Frais minimum (FCFA)</Label>
                <Input
                  id="delivery_base_fee"
                  type="number"
                  min="0"
                  defaultValue={settings?.delivery_base_fee || 500}
                  onBlur={(e) => handleTextUpdate("delivery_base_fee", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Montant minimum facturé par livraison</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="delivery_fee_per_km">Prix par km (FCFA)</Label>
                <Input
                  id="delivery_fee_per_km"
                  type="number"
                  min="0"
                  defaultValue={(settings as any)?.delivery_fee_per_km || 200}
                  onBlur={(e) => handleTextUpdate("delivery_fee_per_km", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Montant ajouté pour chaque kilomètre de distance</p>
              </div>
            </div>
          </div>

          {/* Réduction progressive */}
          <div>
            <h4 className="text-sm font-medium mb-3">Réduction pour longues distances</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="delivery_discount_per_km">Réduction par km (%)</Label>
                <Input
                  id="delivery_discount_per_km"
                  type="number"
                  min="0"
                  max="20"
                  defaultValue={(settings as any)?.delivery_discount_per_km || 5}
                  onBlur={(e) => handleTextUpdate("delivery_discount_per_km", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Réduction appliquée pour chaque km complet (max 50%)</p>
              </div>
              <div className="space-y-2 flex items-end">
                <div className="bg-muted p-3 rounded-lg text-sm">
                  <p className="text-muted-foreground">Exemple : 2km à 100 FCFA/100m</p>
                  <p className="font-medium">= 2000 FCFA - 10% = 1800 FCFA</p>
                </div>
              </div>
            </div>
          </div>

          {/* Commissions */}
          <div>
            <h4 className="text-sm font-medium mb-3">Répartition des frais</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="delivery_commission_fere">Commission Fere (%)</Label>
                <Input
                  id="delivery_commission_fere"
                  type="number"
                  min="0"
                  max="100"
                  defaultValue={settings?.delivery_commission_fere || 20}
                  onBlur={(e) => handleTextUpdate("delivery_commission_fere", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Part de Fere sur les frais de livraison</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="delivery_commission_driver">Commission Livreur (%)</Label>
                <Input
                  id="delivery_commission_driver"
                  type="number"
                  min="0"
                  max="100"
                  defaultValue={settings?.delivery_commission_driver || 80}
                  onBlur={(e) => handleTextUpdate("delivery_commission_driver", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Part du livreur sur les frais de livraison</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* TVA et Commissions */}
      <TaxAndCommissionsSection settings={settings} onUpdate={handleTextUpdate} />
    </div>
  );
};

// Composant séparé pour TVA et commissions
function TaxAndCommissionsSection({ settings, onUpdate }: { settings: any; onUpdate: (field: string, value: string) => void }) {
  const queryClient = useQueryClient();

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ["product-categories-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_categories")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch service types
  const { data: serviceTypes = [] } = useQuery({
    queryKey: ["service-provider-types-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_provider_types")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch commissions
  const { data: commissions = [], refetch: refetchCommissions } = useQuery({
    queryKey: ["category-commissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("category_commissions")
        .select("*, product_categories(name), service_provider_types(name)");
      if (error) throw error;
      return data;
    },
  });

  // Separate commissions: global (null id) vs specific
  const globalProductCommission = commissions.find((c: any) => c.category_id === null && c.service_type_id === null && !c.service_type_id);
  const globalServiceCommission = commissions.find((c: any) => c.service_type_id === null && c.category_id === null && !c.category_id);
  
  // Filter for commissions that have either category_id OR are global product commissions
  const productCommissions = commissions.filter((c: any) => c.category_id !== null || (c.category_id === null && c.service_type_id === null));
  const serviceCommissions = commissions.filter((c: any) => c.service_type_id !== null);
  
  // Check if global commissions exist
  const hasGlobalProductCommission = commissions.some((c: any) => c.category_id === null && c.service_type_id === null);
  const hasGlobalServiceCommission = commissions.some((c: any) => c.service_type_id === null && c.category_id === null && commissions.filter((cc: any) => cc.service_type_id === null && cc.category_id === null).length > 1) || 
    commissions.some((c: any) => c.service_type_id === null && c.category_id !== null);

  // Add commission
  const addCommission = useMutation({
    mutationFn: async ({ category_id, service_type_id, rate, isGlobal }: { category_id?: string | null; service_type_id?: string | null; rate: number; isGlobal?: boolean }) => {
      const { error } = await supabase.from("category_commissions").insert({
        category_id: isGlobal && !service_type_id ? null : (category_id || null),
        service_type_id: isGlobal && !category_id ? null : (service_type_id || null),
        commission_rate: rate,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      refetchCommissions();
      toast.success("Commission ajoutée");
    },
    onError: () => toast.error("Erreur lors de l'ajout"),
  });

  // Update commission
  const updateCommission = useMutation({
    mutationFn: async ({ id, rate }: { id: string; rate: number }) => {
      const { error } = await supabase
        .from("category_commissions")
        .update({ commission_rate: rate })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      refetchCommissions();
      toast.success("Commission mise à jour");
    },
    onError: () => toast.error("Erreur lors de la mise à jour"),
  });

  // Delete commission
  const deleteCommission = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("category_commissions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      refetchCommissions();
      toast.success("Commission supprimée");
    },
    onError: () => toast.error("Erreur lors de la suppression"),
  });

  const [newProductCategoryId, setNewProductCategoryId] = useState("");
  const [newProductRate, setNewProductRate] = useState("10");
  const [newServiceTypeId, setNewServiceTypeId] = useState("");
  const [newServiceRate, setNewServiceRate] = useState("10");

  const usedCategoryIds = commissions.filter((c: any) => c.category_id).map((c: any) => c.category_id);
  const usedServiceTypeIds = commissions.filter((c: any) => c.service_type_id).map((c: any) => c.service_type_id);
  
  // Available categories: exclude used ones, and check if "all" is already used
  const allCategoriesUsed = commissions.some((c: any) => c.category_id === null && c.service_type_id === null);
  const availableCategories = categories.filter((c: any) => !usedCategoryIds.includes(c.id));
  
  // Available service types: exclude used ones, check if "all" is already used  
  const allServiceTypesUsed = commissions.some((c: any) => c.service_type_id === null && c.category_id === null);
  const availableServiceTypes = serviceTypes.filter((s: any) => !usedServiceTypeIds.includes(s.id));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Taxes et Commissions</CardTitle>
        <CardDescription>
          Configurez la TVA et les commissions par catégorie
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* Commissions produits */}
        <div className="space-y-3">
          <Label>Commissions produits par catégorie</Label>
          <div className="space-y-2">
            {commissions.filter((c: any) => c.category_id !== null || (c.category_id === null && c.service_type_id === null)).map((c: any) => (
              <div key={c.id} className={`flex items-center gap-2 p-2 border rounded-lg ${c.category_id === null ? 'bg-primary/10 border-primary/30' : ''}`}>
                <span className="flex-1 text-sm font-medium">
                  {c.category_id === null ? "✨ Toutes les catégories" : (c.product_categories?.name || "Catégorie")}
                </span>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  className="w-20"
                  defaultValue={c.commission_rate}
                  onBlur={(e) => updateCommission.mutate({ id: c.id, rate: parseFloat(e.target.value) })}
                />
                <span className="text-muted-foreground text-sm">%</span>
                <Button variant="ghost" size="icon" onClick={() => deleteCommission.mutate(c.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
          {(availableCategories.length > 0 || !allCategoriesUsed) && (
            <div className="flex items-center gap-2 p-2 border rounded-lg border-dashed">
              <Select value={newProductCategoryId} onValueChange={setNewProductCategoryId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Sélectionner une catégorie" />
                </SelectTrigger>
                <SelectContent>
                  {!allCategoriesUsed && (
                    <SelectItem value="all" className="font-medium text-primary">
                      ✨ Toutes les catégories
                    </SelectItem>
                  )}
                  {availableCategories.map((cat: any) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                min="0"
                max="100"
                className="w-20"
                value={newProductRate}
                onChange={(e) => setNewProductRate(e.target.value)}
              />
              <span className="text-muted-foreground text-sm">%</span>
              <Button
                variant="outline"
                size="icon"
                disabled={!newProductCategoryId}
                onClick={() => {
                  if (newProductCategoryId === "all") {
                    addCommission.mutate({ category_id: null, service_type_id: null, rate: parseFloat(newProductRate), isGlobal: true });
                  } else {
                    addCommission.mutate({ category_id: newProductCategoryId, rate: parseFloat(newProductRate) });
                  }
                  setNewProductCategoryId("");
                }}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Commissions services */}
        <div className="space-y-3">
          <Label>Commissions services par type</Label>
          <div className="space-y-2">
            {commissions.filter((c: any) => c.service_type_id !== null).map((c: any) => (
              <div key={c.id} className={`flex items-center gap-2 p-2 border rounded-lg ${c.service_type_id === null ? 'bg-primary/10 border-primary/30' : ''}`}>
                <span className="flex-1 text-sm font-medium">
                  {c.service_type_id === null ? "✨ Toutes les prestations" : (c.service_provider_types?.name || "Type")}
                </span>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  className="w-20"
                  defaultValue={c.commission_rate}
                  onBlur={(e) => updateCommission.mutate({ id: c.id, rate: parseFloat(e.target.value) })}
                />
                <span className="text-muted-foreground text-sm">%</span>
                <Button variant="ghost" size="icon" onClick={() => deleteCommission.mutate(c.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
          {(availableServiceTypes.length > 0 || !allServiceTypesUsed) && (
            <div className="flex items-center gap-2 p-2 border rounded-lg border-dashed">
              <Select value={newServiceTypeId} onValueChange={setNewServiceTypeId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Sélectionner un type" />
                </SelectTrigger>
                <SelectContent>
                  {!allServiceTypesUsed && (
                    <SelectItem value="all" className="font-medium text-primary">
                      ✨ Toutes les prestations
                    </SelectItem>
                  )}
                  {availableServiceTypes.map((st: any) => (
                    <SelectItem key={st.id} value={st.id}>{st.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                min="0"
                max="100"
                className="w-20"
                value={newServiceRate}
                onChange={(e) => setNewServiceRate(e.target.value)}
              />
              <span className="text-muted-foreground text-sm">%</span>
              <Button
                variant="outline"
                size="icon"
                disabled={!newServiceTypeId}
                onClick={() => {
                  if (newServiceTypeId === "all") {
                    addCommission.mutate({ category_id: null, service_type_id: null, rate: parseFloat(newServiceRate), isGlobal: true });
                  } else {
                    addCommission.mutate({ service_type_id: newServiceTypeId, rate: parseFloat(newServiceRate) });
                  }
                  setNewServiceTypeId("");
                }}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}