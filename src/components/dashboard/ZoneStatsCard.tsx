import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Package, Truck } from "lucide-react";

interface ZoneStat {
  name: string;
  ordersCount: number;
  deliveriesCount: number;
  revenue: number;
}

interface ZoneStatsCardProps {
  zones: ZoneStat[];
}

export const ZoneStatsCard = ({ zones }: ZoneStatsCardProps) => {
  if (zones.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base sm:text-lg">Statistiques par zone</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">Aucune zone configurée</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-base sm:text-lg font-semibold">Statistiques par zone de livraison</h3>
      <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {zones.map((zone) => (
          <Card key={zone.name}>
            <CardHeader className="pb-2 flex flex-row items-center gap-2 space-y-0">
              <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
              <CardTitle className="text-sm font-medium truncate">{zone.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Package className="h-3 w-3" /> Commandes
                </span>
                <span className="font-medium">{zone.ordersCount}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Truck className="h-3 w-3" /> Livraisons
                </span>
                <span className="font-medium">{zone.deliveriesCount}</span>
              </div>
              <div className="flex items-center justify-between text-sm pt-1 border-t">
                <span className="text-muted-foreground">CA</span>
                <span className="font-semibold">{zone.revenue.toLocaleString()} FCFA</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
