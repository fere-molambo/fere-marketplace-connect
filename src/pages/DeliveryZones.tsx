import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, MapPin, Edit2, Trash2, Loader2, Search, Users, Link as LinkIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const zoneSchema = z.object({
  name: z.string().min(2, "Nom requis"),
  country: z.enum(["Mali", "Côte d'Ivoire"]),
  city: z.string().optional(),
  commune: z.string().optional(),
  google_maps_link: z.string().optional(),
  radius_km: z.coerce.number().min(1).max(100),
  tags: z.string().optional(),
  is_active: z.boolean().default(true),
});

type ZoneFormData = z.infer<typeof zoneSchema>;

// Extract coordinates from Google Maps link
const extractCoordsFromGoogleMapsLink = (link: string): { lat: number; lng: number } | null => {
  if (!link) return null;
  
  // Try different patterns for Google Maps URLs
  const patterns = [
    /@(-?\d+\.\d+),(-?\d+\.\d+)/, // @lat,lng format
    /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/, // !3d!4d format
    /q=(-?\d+\.\d+),(-?\d+\.\d+)/, // q=lat,lng format
    /place\/.*\/@(-?\d+\.\d+),(-?\d+\.\d+)/, // place format
    /\/(-?\d+\.\d+),(-?\d+\.\d+)/, // simple /lat,lng
  ];

  for (const pattern of patterns) {
    const match = link.match(pattern);
    if (match) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return { lat, lng };
      }
    }
  }

  return null;
};

export default function DeliveryZones() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<any>(null);
  const [search, setSearch] = useState("");

  const form = useForm<ZoneFormData>({
    resolver: zodResolver(zoneSchema),
    defaultValues: {
      name: "",
      country: "Mali",
      city: "",
      commune: "",
      google_maps_link: "",
      radius_km: 5,
      tags: "",
      is_active: true,
    },
  });

  const { data: zones = [], isLoading } = useQuery({
    queryKey: ["delivery-zones"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("delivery_zones")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: driverCounts = {} } = useQuery({
    queryKey: ["driver-zone-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("driver_zones")
        .select("zone_id")
        .eq("is_active", true);
      if (error) throw error;
      const counts: Record<string, number> = {};
      data.forEach((d) => {
        counts[d.zone_id] = (counts[d.zone_id] || 0) + 1;
      });
      return counts;
    },
  });

  const { data: shopCounts = {} } = useQuery({
    queryKey: ["shop-zone-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shops")
        .select("delivery_zone_id")
        .not("delivery_zone_id", "is", null);
      if (error) throw error;
      const counts: Record<string, number> = {};
      data.forEach((s) => {
        if (s.delivery_zone_id) {
          counts[s.delivery_zone_id] = (counts[s.delivery_zone_id] || 0) + 1;
        }
      });
      return counts;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: ZoneFormData) => {
      const tags = data.tags ? data.tags.split(",").map((t) => t.trim()) : null;
      
      // Extract coordinates from Google Maps link
      const coords = extractCoordsFromGoogleMapsLink(data.google_maps_link || "");
      
      const { error } = await supabase.from("delivery_zones").insert({
        name: data.name,
        country: data.country,
        city: data.city || null,
        commune: data.commune || null,
        google_maps_link: data.google_maps_link || null,
        center_lat: coords?.lat || null,
        center_lng: coords?.lng || null,
        radius_km: data.radius_km,
        tags,
        is_active: data.is_active,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery-zones"] });
      toast.success("Zone créée");
      setOpen(false);
      form.reset();
    },
    onError: () => toast.error("Erreur lors de la création"),
  });

  const updateMutation = useMutation({
    mutationFn: async (data: ZoneFormData & { id: string }) => {
      const tags = data.tags ? data.tags.split(",").map((t) => t.trim()) : null;
      
      // Extract coordinates from Google Maps link
      const coords = extractCoordsFromGoogleMapsLink(data.google_maps_link || "");
      
      const { error } = await supabase
        .from("delivery_zones")
        .update({
          name: data.name,
          country: data.country,
          city: data.city || null,
          commune: data.commune || null,
          google_maps_link: data.google_maps_link || null,
          center_lat: coords?.lat || null,
          center_lng: coords?.lng || null,
          radius_km: data.radius_km,
          tags,
          is_active: data.is_active,
        })
        .eq("id", data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery-zones"] });
      toast.success("Zone mise à jour");
      setOpen(false);
      setEditingZone(null);
      form.reset();
    },
    onError: () => toast.error("Erreur lors de la mise à jour"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("delivery_zones").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery-zones"] });
      toast.success("Zone supprimée");
    },
    onError: () => toast.error("Impossible de supprimer (des boutiques y sont liées ?)"),
  });

  const handleEdit = (zone: any) => {
    setEditingZone(zone);
    form.reset({
      name: zone.name,
      country: zone.country || "Mali",
      city: zone.city || "",
      commune: zone.commune || "",
      google_maps_link: zone.google_maps_link || "",
      radius_km: zone.radius_km,
      tags: zone.tags?.join(", ") || "",
      is_active: zone.is_active,
    });
    setOpen(true);
  };

  const onSubmit = (data: ZoneFormData) => {
    if (editingZone) {
      updateMutation.mutate({ ...data, id: editingZone.id });
    } else {
      createMutation.mutate(data);
    }
  };

  const filteredZones = zones.filter((z) =>
    z.name.toLowerCase().includes(search.toLowerCase()) ||
    z.city?.toLowerCase().includes(search.toLowerCase()) ||
    z.commune?.toLowerCase().includes(search.toLowerCase())
  );

  const googleMapsLinkValue = form.watch("google_maps_link");
  const extractedCoords = extractCoordsFromGoogleMapsLink(googleMapsLinkValue || "");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Zones de livraison</h1>
          <p className="text-muted-foreground">Gérez les zones géographiques pour les livraisons</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditingZone(null); form.reset(); } }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Nouvelle zone</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingZone ? "Modifier la zone" : "Créer une zone"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom de la zone *</FormLabel>
                      <FormControl><Input {...field} placeholder="Ex: Bamako Centre" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pays *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner un pays" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Mali">Mali</SelectItem>
                          <SelectItem value="Côte d'Ivoire">Côte d'Ivoire</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ville</FormLabel>
                        <FormControl><Input {...field} placeholder="Ex: Bamako" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="commune"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Commune</FormLabel>
                        <FormControl><Input {...field} placeholder="Ex: Commune III" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="google_maps_link"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <LinkIcon className="h-4 w-4" />
                        Lien Google Maps (centre de la zone)
                      </FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="https://maps.app.goo.gl/..." />
                      </FormControl>
                      <FormDescription>
                        Collez le lien de partage Google Maps pour définir le centre de la zone
                      </FormDescription>
                      {extractedCoords && (
                        <p className="text-xs text-primary flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          Coordonnées détectées : {extractedCoords.lat.toFixed(4)}, {extractedCoords.lng.toFixed(4)}
                        </p>
                      )}
                      {googleMapsLinkValue && !extractedCoords && (
                        <p className="text-xs text-destructive">
                          Impossible d'extraire les coordonnées de ce lien
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="radius_km"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rayon de couverture (km) *</FormLabel>
                      <FormControl><Input type="number" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="tags"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tags (séparés par virgule)</FormLabel>
                      <FormControl><Input {...field} placeholder="urbain, express" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <FormLabel>Zone active</FormLabel>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <div className="flex gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
                    Annuler
                  </Button>
                  <Button type="submit" className="flex-1" disabled={createMutation.isPending || updateMutation.isPending}>
                    {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {editingZone ? "Mettre à jour" : "Créer"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Rechercher une zone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : filteredZones.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MapPin className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 font-semibold">Aucune zone</h3>
            <p className="text-sm text-muted-foreground">Créez votre première zone de livraison</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredZones.map((zone) => (
            <Card key={zone.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {zone.name}
                    </CardTitle>
                    <CardDescription>
                      {zone.city && zone.commune 
                        ? `${zone.commune}, ${zone.city}` 
                        : zone.city || zone.commune || zone.country}
                    </CardDescription>
                  </div>
                  <Badge variant={zone.is_active ? "default" : "secondary"}>
                    {zone.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Pays:</span> {zone.country}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Rayon:</span> {zone.radius_km} km
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3 text-muted-foreground" />
                    <span>{driverCounts[zone.id] || 0} livreurs</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Boutiques:</span> {shopCounts[zone.id] || 0}
                  </div>
                </div>
                
                {zone.google_maps_link && (
                  <a 
                    href={zone.google_maps_link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    <LinkIcon className="h-3 w-3" />
                    Voir sur Google Maps
                  </a>
                )}
                
                {zone.tags && zone.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {zone.tags.map((tag: string) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEdit(zone)}>
                    <Edit2 className="mr-1 h-3 w-3" />Modifier
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteMutation.mutate(zone.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
