import { useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRoles } from "@/hooks/useUserRoles";
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
import { ArrowLeft, User, MapPin, CreditCard, Loader2, Navigation, Camera, Upload, FileText, Eye, ShoppingBag, Truck, Coins, RefreshCcw } from "lucide-react";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { PaymentStatusBadge } from "@/components/orders/PaymentStatusBadge";
import { ClientOrderDetailSheet } from "@/components/orders/ClientOrderDetailSheet";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { DeliveryAddressManager } from "@/components/client/DeliveryAddressManager";
import { DriverProfileSection } from "@/components/driver/DriverProfileSection";
import { DriverDeliveriesSection } from "@/components/driver/DriverDeliveriesSection";
import { DriverTokensSection } from "@/components/driver/DriverTokensSection";
import { RefundsSection } from "@/components/client/RefundsSection";

export default function ClientProfile() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { isLivreur } = useUserRoles();
  const queryClient = useQueryClient();
  const [isLocating, setIsLocating] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);

  // Realtime subscription for order updates
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('client-orders-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["client-orders", user.id] });
          queryClient.invalidateQueries({ queryKey: ["client-bookings", user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, user?.id]);

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

  // Fetch user orders with more details
  const { data: orders = [] } = useQuery({
    queryKey: ["client-orders", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          delivery_addresses (*),
          order_items (
            id,
            quantity,
            total_price,
            shop_id,
            product:products!product_id (name, main_media_url)
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch user service bookings
  const { data: bookings = [] } = useQuery({
    queryKey: ["client-bookings", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("service_bookings")
        .select(`
          *,
          service:services!service_id (name, shop:shops!shop_id (name))
        `)
        .eq("customer_id", user.id)
        .order("created_at", { ascending: false });
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

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.id) return;

    // Validate file
    if (!file.type.startsWith("image/")) {
      toast.error("Veuillez sélectionner une image");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("L'image ne doit pas dépasser 5 Mo");
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/avatar-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      await updateProfile.mutateAsync({ photo_profil: urlData.publicUrl });
      toast.success("Photo de profil mise à jour");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Erreur lors du téléversement");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleDocumentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.id) return;

    // Validate file
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Format accepté : JPEG, PNG, WEBP ou PDF");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Le document ne doit pas dépasser 10 Mo");
      return;
    }

    setIsUploadingDocument(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/identity-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("identity-documents")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get signed URL since bucket is private
      const { data: signedData, error: signError } = await supabase.storage
        .from("identity-documents")
        .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 year

      if (signError) throw signError;

      await updateProfile.mutateAsync({ piece_identite_client_url: signedData.signedUrl });
      toast.success("Pièce d'identité téléversée");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Erreur lors du téléversement");
    } finally {
      setIsUploadingDocument(false);
    }
  };

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

        {/* Profile Avatar with Upload */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative group">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profile?.photo_profil || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-xl">
                {getInitials(profile?.nom_complet)}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={() => avatarInputRef.current?.click()}
              disabled={isUploadingAvatar}
              className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            >
              {isUploadingAvatar ? (
                <Loader2 className="h-6 w-6 text-white animate-spin" />
              ) : (
                <Camera className="h-6 w-6 text-white" />
              )}
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
          </div>
          <div>
            <h2 className="text-xl font-semibold">{profile?.nom_complet}</h2>
            <p className="text-muted-foreground">{user.email}</p>
            <button
              onClick={() => avatarInputRef.current?.click()}
              className="text-sm text-primary hover:underline mt-1"
            >
              Modifier la photo
            </button>
          </div>
        </div>

        <Tabs defaultValue={searchParams.get("tab") || "personal"} className="space-y-6">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="personal" className="gap-2">
              <User className="h-4 w-4" />
              Informations
            </TabsTrigger>
            {!isLivreur && (
              <TabsTrigger value="addresses" className="gap-2">
                <MapPin className="h-4 w-4" />
                Adresses
              </TabsTrigger>
            )}
            <TabsTrigger value="identity" className="gap-2">
              <CreditCard className="h-4 w-4" />
              Identité
            </TabsTrigger>
            {!isLivreur && (
              <TabsTrigger value="orders" className="gap-2">
                <ShoppingBag className="h-4 w-4" />
                Commandes
              </TabsTrigger>
            )}
            {!isLivreur && (
              <TabsTrigger value="refunds" className="gap-2">
                <RefreshCcw className="h-4 w-4" />
                Remboursements
              </TabsTrigger>
            )}
            {isLivreur && (
              <>
                <TabsTrigger value="driver" className="gap-2">
                  <Truck className="h-4 w-4" />
                  Livreur
                </TabsTrigger>
                <TabsTrigger value="deliveries" className="gap-2">
                  <MapPin className="h-4 w-4" />
                  Livraisons
                </TabsTrigger>
                <TabsTrigger value="tokens" className="gap-2">
                  <Coins className="h-4 w-4" />
                  Tokens
                </TabsTrigger>
              </>
            )}
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
                      <SelectValue placeholder="Sélectionner le type de document" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="carte_etudiant">Carte d'étudiant</SelectItem>
                      <SelectItem value="cni">Carte Nationale d'Identité (CNI)</SelectItem>
                      <SelectItem value="passeport">Passeport</SelectItem>
                      <SelectItem value="permis_conduire">Permis de conduire</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Document Upload Zone */}
                <div className="space-y-2">
                  <Label>Document</Label>
                  {profile?.piece_identite_client_url ? (
                    <div className="p-4 bg-muted rounded-lg flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileText className="h-8 w-8 text-primary" />
                        <div>
                          <p className="text-sm font-medium">Document téléversé</p>
                          <p className="text-xs text-muted-foreground">
                            Cliquez pour voir ou télécharger
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(profile.piece_identite_client_url!, "_blank")}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Voir
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => documentInputRef.current?.click()}
                          disabled={isUploadingDocument}
                        >
                          {isUploadingDocument ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Upload className="h-4 w-4 mr-1" />
                              Remplacer
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => documentInputRef.current?.click()}
                      className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
                    >
                      {isUploadingDocument ? (
                        <div className="flex flex-col items-center gap-2">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                          <p className="text-sm text-muted-foreground">Téléversement en cours...</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <Upload className="h-8 w-8 text-muted-foreground" />
                          <p className="text-sm font-medium">Cliquez pour téléverser</p>
                          <p className="text-xs text-muted-foreground">
                            JPEG, PNG, WEBP ou PDF (max 10 Mo)
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                  <input
                    ref={documentInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    onChange={handleDocumentUpload}
                    className="hidden"
                  />
                </div>

                <p className="text-sm text-muted-foreground">
                  Votre pièce d'identité est stockée de manière sécurisée et confidentielle.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders">
            <div className="space-y-6">
              {/* Product Orders */}
              <Card>
                <CardHeader>
                  <CardTitle>Mes commandes produits</CardTitle>
                  <CardDescription>Historique de vos achats</CardDescription>
                </CardHeader>
                <CardContent>
                  {orders.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Aucune commande pour le moment
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {orders.map((order: any) => (
                        <div
                          key={order.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex-1">
                            <p className="font-medium">Commande #{order.order_number}</p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(order.created_at), "dd MMM yyyy", { locale: fr })}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {order.order_items?.length || 0} article(s) • {order.delivery_type === "delivery" ? "Livraison" : "Retrait"}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">
                              {new Intl.NumberFormat("fr-FR").format(order.total_amount)} FCFA
                            </span>
                            <OrderStatusBadge status={order.status} />
                            <PaymentStatusBadge status={order.payment_status} />
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setSelectedOrder(order)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Détails
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Service Bookings */}
              <Card>
                <CardHeader>
                  <CardTitle>Mes réservations</CardTitle>
                  <CardDescription>Vos rendez-vous de services</CardDescription>
                </CardHeader>
                <CardContent>
                  {bookings.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Aucune réservation pour le moment
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {bookings.map((booking: any) => (
                        <div
                          key={booking.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border rounded-lg"
                        >
                          <div>
                            <p className="font-medium">{booking.service?.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(booking.booking_date), "dd MMM yyyy", { locale: fr })} à {booking.booking_time}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {booking.service?.shop?.name}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">
                              {new Intl.NumberFormat("fr-FR").format(booking.total_price)} FCFA
                            </span>
                            <OrderStatusBadge status={booking.status} />
                            <PaymentStatusBadge status={booking.payment_status} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Driver Profile Tab */}
          {isLivreur && (
            <TabsContent value="driver">
              <DriverProfileSection 
                userId={user.id} 
                profile={profile}
                onUpdateProfile={(updates) => updateProfile.mutate(updates)}
              />
            </TabsContent>
          )}

          {/* Driver Deliveries Tab */}
          {isLivreur && (
            <TabsContent value="deliveries">
              <DriverDeliveriesSection userId={user.id} />
            </TabsContent>
          )}

          {/* Refunds Tab */}
          {!isLivreur && (
            <TabsContent value="refunds">
              {user && <RefundsSection userId={user.id} />}
            </TabsContent>
          )}

          {/* Driver Tokens Tab */}
          {isLivreur && (
            <TabsContent value="tokens">
              <DriverTokensSection />
            </TabsContent>
          )}
        </Tabs>
      </main>

      <Footer />

      {/* Order Detail Sheet */}
      <ClientOrderDetailSheet 
        order={selectedOrder} 
        open={!!selectedOrder} 
        onOpenChange={(open) => !open && setSelectedOrder(null)} 
      />
    </div>
  );
}
