import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Loader2 } from "lucide-react";

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
      queryClient.invalidateQueries({ queryKey: ["platform-settings"] });
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
            Conditions générales et politique de cookies
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
    </div>
  );
};