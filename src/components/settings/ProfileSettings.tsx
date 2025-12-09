import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useAuth } from "@/hooks/useAuth";
import { useUserRoles } from "@/hooks/useUserRoles";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, MapPin, Eye, FileText, Loader2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export const ProfileSettings = () => {
  const { user } = useAuth();
  const { isVendeur } = useUserRoles();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingId, setUploadingId] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");
  
  // Vendor-specific fields
  const [statutLegal, setStatutLegal] = useState<string>("");
  const [typeOffre, setTypeOffre] = useState<string>("");
  const [pieceIdentiteType, setPieceIdentiteType] = useState<string>("");
  const [pieceIdentiteUrl, setPieceIdentiteUrl] = useState<string>("");
  const [adresse, setAdresse] = useState("");
  const [geoLat, setGeoLat] = useState<number | null>(null);
  const [geoLng, setGeoLng] = useState<number | null>(null);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user?.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Initialize form values when profile loads
  useEffect(() => {
    if (profile) {
      setAvatarUrl(profile.photo_profil || "");
      setStatutLegal(profile.statut_legal || "");
      setTypeOffre(profile.type_offre || "");
      setPieceIdentiteType(profile.piece_identite_type || "");
      setPieceIdentiteUrl(profile.piece_identite_url || "");
      setAdresse(profile.adresse || "");
      setGeoLat(profile.geolocalisation_lat);
      setGeoLng(profile.geolocalisation_lng);
    }
  }, [profile]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    values: {
      nom_complet: profile?.nom_complet || "",
      contact: profile?.contact || "",
    },
  });

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      const file = event.target.files?.[0];
      if (!file) return;

      const fileExt = file.name.split(".").pop();
      const fileName = `${user?.id}.${fileExt}`;
      const filePath = `${user?.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ photo_profil: publicUrl })
        .eq("id", user?.id);

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["users"] });

      toast.success("Photo de profil mise à jour !");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleIdUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploadingId(true);
      const file = event.target.files?.[0];
      if (!file) return;

      const fileExt = file.name.split(".").pop();
      const fileName = `${user?.id}-id.${fileExt}`;
      const filePath = `${user?.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("identity-documents")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("identity-documents")
        .getPublicUrl(filePath);

      setPieceIdentiteUrl(publicUrl);
      toast.success("Pièce d'identité chargée !");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUploadingId(false);
    }
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.error("La géolocalisation n'est pas supportée par votre navigateur");
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGeoLat(position.coords.latitude);
        setGeoLng(position.coords.longitude);
        setGettingLocation(false);
        toast.success("Position récupérée !");
      },
      (error) => {
        setGettingLocation(false);
        toast.error("Impossible de récupérer votre position");
        console.error(error);
      }
    );
  };

  const onSubmit = async (data: any) => {
    try {
      setIsLoading(true);

      const updateData: any = {
        nom_complet: data.nom_complet,
        contact: data.contact,
        photo_profil: avatarUrl,
      };

      // Add vendor-specific fields if user is a vendor
      if (isVendeur) {
        updateData.statut_legal = statutLegal || null;
        updateData.type_offre = typeOffre || null;
        updateData.piece_identite_type = pieceIdentiteType || null;
        updateData.piece_identite_url = pieceIdentiteUrl || null;
        updateData.adresse = adresse || null;
        updateData.geolocalisation_lat = geoLat;
        updateData.geolocalisation_lng = geoLng;
      }

      const { error } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", user?.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
      toast.success("Profil mis à jour avec succès !");
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la mise à jour");
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profil</CardTitle>
        <CardDescription>
          Gérez vos informations personnelles
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="flex flex-col items-center gap-4">
            <Avatar className="h-24 w-24">
              <AvatarImage src={avatarUrl} />
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                {getInitials(profile?.nom_complet || "U")}
              </AvatarFallback>
            </Avatar>
            <div>
              <Input
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                disabled={uploading}
                className="hidden"
                id="avatar-upload-settings"
              />
              <Label htmlFor="avatar-upload-settings">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploading}
                  asChild
                >
                  <span className="cursor-pointer">
                    <Upload className="h-4 w-4 mr-2" />
                    {uploading ? "Upload..." : "Changer la photo"}
                  </span>
                </Button>
              </Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nom_complet">Nom complet</Label>
            <Input
              id="nom_complet"
              {...register("nom_complet", { required: "Le nom est requis" })}
            />
            {errors.nom_complet && (
              <p className="text-sm text-destructive">{errors.nom_complet.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact">Contact</Label>
            <Input
              id="contact"
              {...register("contact", { required: "Le contact est requis" })}
            />
            {errors.contact && (
              <p className="text-sm text-destructive">{errors.contact.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={user?.email || ""} disabled />
            <p className="text-xs text-muted-foreground">
              L'email ne peut pas être modifié
            </p>
          </div>

          {/* Vendor-specific fields */}
          {isVendeur && (
            <div className="space-y-6 pt-6 border-t">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Informations professionnelles
                </h3>
                <p className="text-sm text-muted-foreground">
                  Complétez votre profil vendeur
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Statut légal</Label>
                  <Select value={statutLegal} onValueChange={setStatutLegal}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="particulier">Particulier</SelectItem>
                      <SelectItem value="entreprise">Entreprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Type d'offres</Label>
                  <Select value={typeOffre} onValueChange={setTypeOffre}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="produits">Produits uniquement</SelectItem>
                      <SelectItem value="services">Services uniquement</SelectItem>
                      <SelectItem value="les_deux">Produits et Services</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Type de pièce d'identité</Label>
                  <Select value={pieceIdentiteType} onValueChange={setPieceIdentiteType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cni">Carte Nationale d'Identité</SelectItem>
                      <SelectItem value="passeport">Passeport</SelectItem>
                      <SelectItem value="permis">Permis de conduire</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Pièce d'identité</Label>
                  <div className="flex gap-2">
                    <Input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleIdUpload}
                      disabled={uploadingId}
                      className="hidden"
                      id="id-upload"
                    />
                    <Label htmlFor="id-upload" className="flex-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={uploadingId}
                        className="w-full"
                        asChild
                      >
                        <span className="cursor-pointer">
                          <Upload className="h-4 w-4 mr-2" />
                          {uploadingId ? "Upload..." : "Charger"}
                        </span>
                      </Button>
                    </Label>
                    {pieceIdentiteUrl && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        asChild
                      >
                        <a href={pieceIdentiteUrl} target="_blank" rel="noopener noreferrer">
                          <Eye className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                  {pieceIdentiteUrl && (
                    <p className="text-xs text-green-600">Document chargé ✓</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="adresse">Adresse</Label>
                <Input
                  id="adresse"
                  value={adresse}
                  onChange={(e) => setAdresse(e.target.value)}
                  placeholder="Votre adresse complète"
                />
              </div>

              <div className="space-y-2">
                <Label>Géolocalisation</Label>
                <div className="flex items-center gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGetLocation}
                    disabled={gettingLocation}
                  >
                    {gettingLocation ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <MapPin className="h-4 w-4 mr-2" />
                    )}
                    {gettingLocation ? "Récupération..." : "Pointer ma position"}
                  </Button>
                  {geoLat && geoLng && (
                    <span className="text-sm text-muted-foreground">
                      {geoLat.toFixed(4)}, {geoLng.toFixed(4)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Enregistrement..." : "Enregistrer les modifications"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};