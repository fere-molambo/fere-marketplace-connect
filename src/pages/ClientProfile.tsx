import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { ArrowLeft, User, MapPin, CreditCard, Trash2, Plus, Loader2, Navigation } from "lucide-react";
import { DeliveryAddressManager } from "@/components/client/DeliveryAddressManager";

export default function ClientProfile() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isLocating, setIsLocating] = useState(false);

  // Fetch user profile
  const { data: profile, isLoading } = useQuery({
    queryKey: ["client-profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Update profile mutation
  const updateProfile = useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      if (!user?.id) throw new Error("Non authentifié");
      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-profile"] });
      toast.success("Profil mis à jour");
    },
    onError: (error) => {
      toast.error("Erreur lors de la mise à jour");
      console.error(error);
    },
  });

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.error("La géolocalisation n'est pas supportée par votre navigateur");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        updateProfile.mutate({
          geolocalisation_lat: position.coords.latitude,
          geolocalisation_lng: position.coords.longitude,
        });
        setIsLocating(false);
      },
      (error) => {
        toast.error("Impossible d'obtenir votre position");
        console.error(error);
        setIsLocating(false);
      }
    );
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Connexion requise</CardTitle>
              <CardDescription>
                Vous devez être connecté pour accéder à votre profil.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate("/auth")} className="w-full">
                Se connecter
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Mon Profil</h1>
            <p className="text-muted-foreground">Gérez vos informations personnelles</p>
          </div>
        </div>

        {/* Profile Avatar */}
        <div className="flex items-center gap-4 mb-6">
          <Avatar className="h-20 w-20">
            <AvatarImage src={profile?.photo_profil || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary text-xl">
              {getInitials(profile?.nom_complet)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-xl font-semibold">{profile?.nom_complet}</h2>
            <p className="text-muted-foreground">{user.email}</p>
          </div>
        </div>

        <Tabs defaultValue="personal" className="space-y-6">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="personal" className="gap-2">
              <User className="h-4 w-4" />
              Informations
            </TabsTrigger>
            <TabsTrigger value="addresses" className="gap-2">
              <MapPin className="h-4 w-4" />
              Adresses
            </TabsTrigger>
            <TabsTrigger value="identity" className="gap-2">
              <CreditCard className="h-4 w-4" />
              Identité
            </TabsTrigger>
          </TabsList>

          {/* Personal Information Tab */}
          <TabsContent value="personal">
            <Card>
              <CardHeader>
                <CardTitle>Informations personnelles</CardTitle>
                <CardDescription>
                  Ces informations nous aident à personnaliser votre expérience
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="nom_complet">Nom complet</Label>
                    <Input
                      id="nom_complet"
                      defaultValue={profile?.nom_complet || ""}
                      onBlur={(e) => {
                        if (e.target.value !== profile?.nom_complet) {
                          updateProfile.mutate({ nom_complet: e.target.value });
                        }
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contact">Téléphone</Label>
                    <Input
                      id="contact"
                      defaultValue={profile?.contact || ""}
                      onBlur={(e) => {
                        if (e.target.value !== profile?.contact) {
                          updateProfile.mutate({ contact: e.target.value });
                        }
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sexe">Sexe</Label>
                    <Select
                      value={profile?.sexe || ""}
                      onValueChange={(value) => updateProfile.mutate({ sexe: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="homme">Homme</SelectItem>
                        <SelectItem value="femme">Femme</SelectItem>
                        <SelectItem value="autre">Autre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tranche_age">Tranche d'âge</Label>
                    <Select
                      value={profile?.tranche_age || ""}
                      onValueChange={(value) => updateProfile.mutate({ tranche_age: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="18-25">18-25 ans</SelectItem>
                        <SelectItem value="26-35">26-35 ans</SelectItem>
                        <SelectItem value="36-45">36-45 ans</SelectItem>
                        <SelectItem value="46-55">46-55 ans</SelectItem>
                        <SelectItem value="55+">55+ ans</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="statut_matrimonial">Statut matrimonial</Label>
                    <Select
                      value={profile?.statut_matrimonial || ""}
                      onValueChange={(value) => updateProfile.mutate({ statut_matrimonial: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="celibataire">Célibataire</SelectItem>
                        <SelectItem value="marie">Marié(e)</SelectItem>
                        <SelectItem value="divorce">Divorcé(e)</SelectItem>
                        <SelectItem value="veuf">Veuf/Veuve</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="statut_professionnel">Statut professionnel</Label>
                    <Select
                      value={profile?.statut_professionnel || ""}
                      onValueChange={(value) => updateProfile.mutate({ statut_professionnel: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="etudiant">Étudiant</SelectItem>
                        <SelectItem value="salarie">Salarié</SelectItem>
                        <SelectItem value="entrepreneur">Entrepreneur</SelectItem>
                        <SelectItem value="sans_emploi">Sans emploi</SelectItem>
                        <SelectItem value="retraite">Retraité</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Geolocation */}
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Position actuelle</Label>
                      <p className="text-sm text-muted-foreground">
                        {profile?.geolocalisation_lat && profile?.geolocalisation_lng
                          ? `${profile.geolocalisation_lat.toFixed(4)}, ${profile.geolocalisation_lng.toFixed(4)}`
                          : "Non définie"}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleGetLocation}
                      disabled={isLocating}
                    >
                      {isLocating ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Navigation className="h-4 w-4 mr-2" />
                      )}
                      Pointer ma position
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Addresses Tab */}
          <TabsContent value="addresses">
            <DeliveryAddressManager userId={user.id} />
          </TabsContent>

          {/* Identity Tab */}
          <TabsContent value="identity">
            <Card>
              <CardHeader>
                <CardTitle>Pièce d'identité</CardTitle>
                <CardDescription>
                  Vérifiez votre identité pour accéder à certaines fonctionnalités
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="piece_identite_type">Type de pièce</Label>
                  <Select
                    value={profile?.piece_identite_client_type || ""}
                    onValueChange={(value) => updateProfile.mutate({ piece_identite_client_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="carte_etudiant">Carte d'étudiant</SelectItem>
                      <SelectItem value="cni">Carte Nationale d'Identité (CNI)</SelectItem>
                      <SelectItem value="passeport">Passeport</SelectItem>
                      <SelectItem value="permis_conduire">Permis de conduire</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {profile?.piece_identite_client_url && (
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Document téléversé</p>
                    <a
                      href={profile.piece_identite_client_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline text-sm"
                    >
                      Voir le document
                    </a>
                  </div>
                )}

                <p className="text-sm text-muted-foreground">
                  La fonctionnalité de téléversement de pièces d'identité sera disponible prochainement.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
}