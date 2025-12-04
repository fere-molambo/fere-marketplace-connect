import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Trash2, Upload } from "lucide-react";

interface HeroCard {
  image_url: string;
  title: string;
  text: string;
  button_text: string;
  button_link: string;
}

interface PartnerLogo {
  logo_url: string;
  name: string;
  link?: string;
}

export const HomepageSettings = () => {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState<string | null>(null);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["platform-settings-homepage"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("*")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const updateSettings = useMutation({
    mutationFn: async (updates: any) => {
      const { error } = await supabase
        .from("platform_settings")
        .update(updates)
        .eq("id", settings?.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-settings-homepage"] });
      queryClient.invalidateQueries({ queryKey: ["platform-settings-hero"] });
      toast.success("Paramètres mis à jour");
    },
    onError: () => {
      toast.error("Erreur lors de la mise à jour");
    },
  });

  const uploadFile = async (file: File, fieldName: string, index?: number) => {
    setUploading(fieldName + (index !== undefined ? `-${index}` : ""));
    
    const fileExt = file.name.split(".").pop();
    const fileName = `${fieldName}-${Date.now()}.${fileExt}`;
    const filePath = `homepage/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("fere-dashboard-infos")
      .upload(filePath, file);

    if (uploadError) {
      toast.error("Erreur lors de l'upload");
      setUploading(null);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("fere-dashboard-infos")
      .getPublicUrl(filePath);

    setUploading(null);
    return publicUrl;
  };

  const handleHeroCardChange = async (index: number, field: string, value: string) => {
    const heroCards: HeroCard[] = [...((settings?.hero_cards as unknown as HeroCard[] | null) || [])];
    heroCards[index] = { ...heroCards[index], [field]: value };
    await updateSettings.mutateAsync({ hero_cards: heroCards });
  };

  const handleHeroImageUpload = async (index: number, file: File) => {
    const url = await uploadFile(file, "hero", index);
    if (url) {
      handleHeroCardChange(index, "image_url", url);
    }
  };

  const handlePartnerAdd = async () => {
    const partnerLogos: PartnerLogo[] = [...((settings?.partner_logos as unknown as PartnerLogo[] | null) || [])];
    partnerLogos.push({ logo_url: "", name: "", link: "" });
    await updateSettings.mutateAsync({ partner_logos: partnerLogos });
  };

  const handlePartnerChange = async (index: number, field: string, value: string) => {
    const partnerLogos: PartnerLogo[] = [...((settings?.partner_logos as unknown as PartnerLogo[] | null) || [])];
    partnerLogos[index] = { ...partnerLogos[index], [field]: value };
    await updateSettings.mutateAsync({ partner_logos: partnerLogos });
  };

  const handlePartnerLogoUpload = async (index: number, file: File) => {
    const url = await uploadFile(file, "partner", index);
    if (url) {
      handlePartnerChange(index, "logo_url", url);
    }
  };

  const handlePartnerRemove = async (index: number) => {
    const partnerLogos: PartnerLogo[] = [...((settings?.partner_logos as unknown as PartnerLogo[] | null) || [])];
    partnerLogos.splice(index, 1);
    await updateSettings.mutateAsync({ partner_logos: partnerLogos });
  };

  const handleCTAImageUpload = async (index: number, file: File) => {
    const url = await uploadFile(file, "cta", index);
    if (url) {
      const ctaImages: string[] = [...((settings?.cta_images as string[] | null) || [])];
      ctaImages[index] = url;
      await updateSettings.mutateAsync({ cta_images: ctaImages });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const heroCards: HeroCard[] = (settings?.hero_cards as unknown as HeroCard[] | null) || [];
  const partnerLogos: PartnerLogo[] = (settings?.partner_logos as unknown as PartnerLogo[] | null) || [];
  const ctaImages: string[] = (settings?.cta_images as string[] | null) || [];

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Section Hero</h3>
        <div className="space-y-6">
          {heroCards.map((card, index) => (
            <div key={index} className="p-4 border rounded-lg space-y-4">
              <h4 className="font-medium">Carte {index + 1}</h4>
              
              <div className="space-y-2">
                <Label>Image de fond</Label>
                <div className="flex items-center gap-4">
                  {card.image_url && (
                    <img src={card.image_url} alt="" className="w-20 h-12 object-cover rounded" />
                  )}
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && handleHeroImageUpload(index, e.target.files[0])}
                    />
                    <Button variant="outline" size="sm" asChild>
                      <span>
                        {uploading === `hero-${index}` ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4 mr-2" />
                        )}
                        Upload
                      </span>
                    </Button>
                  </label>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Titre</Label>
                  <Input
                    value={card.title}
                    onChange={(e) => handleHeroCardChange(index, "title", e.target.value)}
                    onBlur={(e) => handleHeroCardChange(index, "title", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Texte du bouton</Label>
                  <Input
                    value={card.button_text}
                    onChange={(e) => handleHeroCardChange(index, "button_text", e.target.value)}
                    onBlur={(e) => handleHeroCardChange(index, "button_text", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={card.text}
                  onChange={(e) => handleHeroCardChange(index, "text", e.target.value)}
                  onBlur={(e) => handleHeroCardChange(index, "text", e.target.value)}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Lien du bouton</Label>
                <Input
                  value={card.button_link}
                  onChange={(e) => handleHeroCardChange(index, "button_link", e.target.value)}
                  onBlur={(e) => handleHeroCardChange(index, "button_link", e.target.value)}
                  placeholder="/#products ou /auth"
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Partners Section */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Section Partenaires</h3>
          <Button onClick={handlePartnerAdd} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Ajouter
          </Button>
        </div>

        <div className="space-y-4">
          {partnerLogos.map((partner, index) => (
            <div key={index} className="flex items-center gap-4 p-4 border rounded-lg">
              <div className="w-16 h-16 bg-muted rounded flex items-center justify-center overflow-hidden">
                {partner.logo_url ? (
                  <img src={partner.logo_url} alt={partner.name} className="max-w-full max-h-full object-contain" />
                ) : (
                  <span className="text-xs text-muted-foreground">Logo</span>
                )}
              </div>
              
              <div className="flex-1 grid gap-2 sm:grid-cols-3">
                <div>
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && handlePartnerLogoUpload(index, e.target.files[0])}
                    />
                    <Button variant="outline" size="sm" asChild className="w-full">
                      <span>
                        {uploading === `partner-${index}` ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Upload logo"
                        )}
                      </span>
                    </Button>
                  </label>
                </div>
                <Input
                  placeholder="Nom"
                  value={partner.name}
                  onChange={(e) => handlePartnerChange(index, "name", e.target.value)}
                />
                <Input
                  placeholder="Lien (optionnel)"
                  value={partner.link || ""}
                  onChange={(e) => handlePartnerChange(index, "link", e.target.value)}
                />
              </div>

              <Button variant="ghost" size="icon" onClick={() => handlePartnerRemove(index)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}

          {partnerLogos.length === 0 && (
            <p className="text-center text-muted-foreground py-4">
              Aucun partenaire ajouté
            </p>
          )}
        </div>
      </Card>

      {/* CTA Section */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Section "Commencez maintenant"</h3>
        
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Pré-titre</Label>
              <Input
                value={settings?.cta_pre_title || ""}
                onBlur={(e) => updateSettings.mutate({ cta_pre_title: e.target.value })}
                defaultValue={settings?.cta_pre_title || ""}
              />
            </div>
            <div className="space-y-2">
              <Label>Texte du bouton</Label>
              <Input
                value={settings?.cta_button_text || ""}
                onBlur={(e) => updateSettings.mutate({ cta_button_text: e.target.value })}
                defaultValue={settings?.cta_button_text || ""}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Titre (apparaît en jaune)</Label>
            <Input
              defaultValue={settings?.cta_title || ""}
              onBlur={(e) => updateSettings.mutate({ cta_title: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              defaultValue={settings?.cta_text || ""}
              onBlur={(e) => updateSettings.mutate({ cta_text: e.target.value })}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Lien du bouton</Label>
            <Input
              defaultValue={settings?.cta_button_link || ""}
              onBlur={(e) => updateSettings.mutate({ cta_button_link: e.target.value })}
              placeholder="/auth"
            />
          </div>

          <div className="space-y-2">
            <Label>Images (3 images pour la grille)</Label>
            <div className="grid grid-cols-3 gap-4">
              {[0, 1, 2].map((index) => (
                <div key={index} className="space-y-2">
                  <div className="aspect-video bg-muted rounded-lg overflow-hidden flex items-center justify-center">
                    {ctaImages[index] ? (
                      <img src={ctaImages[index]} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs text-muted-foreground">Image {index + 1}</span>
                    )}
                  </div>
                  <label className="cursor-pointer block">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && handleCTAImageUpload(index, e.target.files[0])}
                    />
                    <Button variant="outline" size="sm" asChild className="w-full">
                      <span>
                        {uploading === `cta-${index}` ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Upload"
                        )}
                      </span>
                    </Button>
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
