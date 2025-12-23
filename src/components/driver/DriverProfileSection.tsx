import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Loader2, MapPin, Truck, Bike, Car } from "lucide-react";

interface DriverProfileSectionProps {
  userId: string;
  profile: any;
  onUpdateProfile: (updates: Record<string, unknown>) => void;
}

const vehicleTypes = [
  { value: "velo", label: "Vélo", icon: Bike },
  { value: "moto", label: "Moto", icon: Bike },
  { value: "vehicule", label: "Véhicule", icon: Car },
  { value: "minivan", label: "Minivan", icon: Truck },
  { value: "camion", label: "Camion", icon: Truck },
];

export function DriverProfileSection({ userId, profile, onUpdateProfile }: DriverProfileSectionProps) {
  const queryClient = useQueryClient();

  // Fetch all active delivery zones
  const { data: allZones = [], isLoading: zonesLoading } = useQuery({
    queryKey: ["all-delivery-zones"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("delivery_zones")
        .select("id, name, city, commune, radius_km")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch driver's active zones
  const { data: driverZones = [], isLoading: driverZonesLoading } = useQuery({
    queryKey: ["driver-zones", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("driver_zones")
        .select("id, zone_id, is_active")
        .eq("driver_id", userId);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  // Toggle zone mutation
  const toggleZone = useMutation({
    mutationFn: async ({ zoneId, isActive }: { zoneId: string; isActive: boolean }) => {
      const existingZone = driverZones.find(dz => dz.zone_id === zoneId);
      
      if (existingZone) {
        // Update existing
        const { error } = await supabase
          .from("driver_zones")
          .update({ is_active: isActive })
          .eq("id", existingZone.id);
        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from("driver_zones")
          .insert({ driver_id: userId, zone_id: zoneId, is_active: isActive });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["driver-zones", userId] });
      toast.success("Zone mise à jour");
    },
    onError: (error) => {
      console.error("Error toggling zone:", error);
      toast.error("Erreur lors de la mise à jour de la zone");
    },
  });

  const isZoneActive = (zoneId: string): boolean => {
    const driverZone = driverZones.find(dz => dz.zone_id === zoneId);
    return driverZone?.is_active ?? false;
  };

  const activeZonesCount = driverZones.filter(dz => dz.is_active).length;

  if (zonesLoading || driverZonesLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Vehicle Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Mon véhicule
          </CardTitle>
          <CardDescription>
            Informations sur votre véhicule de livraison
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="vehicle_type">Type d'engin</Label>
              <Select
                value={profile?.vehicle_type || ""}
                onValueChange={(value) => onUpdateProfile({ vehicle_type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  {vehicleTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <type.icon className="h-4 w-4" />
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vehicle_color">Couleur</Label>
              <Input
                id="vehicle_color"
                placeholder="Ex: Noir, Rouge..."
                defaultValue={profile?.vehicle_color || ""}
                onBlur={(e) => {
                  if (e.target.value !== profile?.vehicle_color) {
                    onUpdateProfile({ vehicle_color: e.target.value });
                  }
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vehicle_plate">Numéro de plaque</Label>
              <Input
                id="vehicle_plate"
                placeholder="Ex: AB-1234-CD"
                defaultValue={profile?.vehicle_plate || ""}
                onBlur={(e) => {
                  if (e.target.value !== profile?.vehicle_plate) {
                    onUpdateProfile({ vehicle_plate: e.target.value });
                  }
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delivery Zones */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Mes zones de livraison
          </CardTitle>
          <CardDescription>
            Activez les zones où vous souhaitez recevoir des demandes de livraison.
            <span className="block mt-1 font-medium text-foreground">
              {activeZonesCount} zone(s) active(s)
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {allZones.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              Aucune zone de livraison disponible
            </p>
          ) : (
            <div className="space-y-3">
              {allZones.map((zone) => (
                <div
                  key={zone.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{zone.name}</span>
                      {isZoneActive(zone.id) && (
                        <Badge variant="default" className="text-xs">Active</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {[zone.commune, zone.city].filter(Boolean).join(", ")}
                      {zone.radius_km && ` • ${zone.radius_km} km`}
                    </p>
                  </div>
                  <Switch
                    checked={isZoneActive(zone.id)}
                    onCheckedChange={(checked) => 
                      toggleZone.mutate({ zoneId: zone.id, isActive: checked })
                    }
                    disabled={toggleZone.isPending}
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
