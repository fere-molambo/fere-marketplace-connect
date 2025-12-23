import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  calculateDistances, 
  calculateDeliveryFee, 
  optimizePickupRoute,
  Coordinates 
} from "@/lib/distance";

interface CartItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  product: {
    id: string;
    name: string;
    shops: {
      id: string;
      name: string;
      delivery_zone_id?: string | null;
      geolocation_lat?: number | null;
      geolocation_lng?: number | null;
      address?: string | null;
    };
  };
  [key: string]: any;
}

interface DeliverySettings {
  delivery_base_fee: number;
  delivery_fee_per_100m: number;
  delivery_discount_per_km: number;
  delivery_commission_driver: number;
  delivery_commission_fere: number;
}

interface ZoneDeliveryInfo {
  zone_id: string | null;
  zone_name: string | null;
  vendors: Array<{
    shop_id: string;
    shop_name: string;
    lat: number;
    lng: number;
    address: string;
    pickup_order: number;
    distance_to_next: number;
  }>;
  total_distance_meters: number;
  delivery_fee: number;
  driver_earnings: number;
}

interface DeliveryCalculationResult {
  zones: ZoneDeliveryInfo[];
  totalDeliveryFee: number;
  totalDistance: number;
  isLoading: boolean;
  error: string | null;
}

export function useDeliveryCalculation(
  items: CartItem[],
  clientAddress: { lat: number; lng: number } | null,
  deliveryType: "pickup" | "delivery",
  settings: DeliverySettings | null
): DeliveryCalculationResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zones, setZones] = useState<ZoneDeliveryInfo[]>([]);

  // Group items by delivery zone
  const vendorsByZone = useMemo(() => {
    const grouped: Record<string, Array<{
      shop_id: string;
      shop_name: string;
      lat: number;
      lng: number;
      address: string;
    }>> = {};

    // Get unique vendors
    const seenShops = new Set<string>();
    
    items.forEach(item => {
      const shop = item.product.shops;
      if (seenShops.has(shop.id)) return;
      seenShops.add(shop.id);

      const zoneKey = shop.delivery_zone_id || 'no-zone';
      if (!grouped[zoneKey]) {
        grouped[zoneKey] = [];
      }
      
      // Only add if we have coordinates
      if (shop.geolocation_lat && shop.geolocation_lng) {
        grouped[zoneKey].push({
          shop_id: shop.id,
          shop_name: shop.name,
          lat: shop.geolocation_lat,
          lng: shop.geolocation_lng,
          address: shop.address || ''
        });
      }
    });

    return grouped;
  }, [items]);

  // Calculate delivery fees when conditions change
  useEffect(() => {
    if (deliveryType === "pickup" || !clientAddress || !settings) {
      setZones([]);
      return;
    }

    const calculateFees = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const zoneResults: ZoneDeliveryInfo[] = [];

        for (const [zoneId, vendors] of Object.entries(vendorsByZone)) {
          if (vendors.length === 0) continue;

          // Optimize pickup route
          const optimizedRoute = optimizePickupRoute(
            vendors.map(v => ({ ...v, id: v.shop_id })),
            clientAddress
          );

          // Calculate total distance
          let totalDistance = 0;
          const pickupPoints = optimizedRoute.map((point, index) => {
            totalDistance += point.distanceToNext;
            return {
              shop_id: point.vendor.shop_id,
              shop_name: point.vendor.shop_name,
              lat: point.vendor.lat,
              lng: point.vendor.lng,
              address: point.vendor.address,
              pickup_order: index + 1,
              distance_to_next: Math.round(point.distanceToNext)
            };
          });

          // Calculate delivery fee
          const deliveryFee = calculateDeliveryFee(totalDistance, {
            delivery_base_fee: settings.delivery_base_fee,
            delivery_fee_per_100m: settings.delivery_fee_per_100m,
            delivery_discount_per_km: settings.delivery_discount_per_km
          });

          // Calculate driver earnings (100% - platform commission)
          const driverEarnings = Math.round(
            deliveryFee * (1 - (settings.delivery_commission_fere || 20) / 100)
          );

          // Get zone name
          let zoneName = null;
          if (zoneId !== 'no-zone') {
            const { data: zone } = await supabase
              .from('delivery_zones')
              .select('name')
              .eq('id', zoneId)
              .single();
            zoneName = zone?.name || null;
          }

          zoneResults.push({
            zone_id: zoneId === 'no-zone' ? null : zoneId,
            zone_name: zoneName,
            vendors: pickupPoints,
            total_distance_meters: Math.round(totalDistance),
            delivery_fee: deliveryFee,
            driver_earnings: driverEarnings
          });
        }

        setZones(zoneResults);
      } catch (err: any) {
        console.error('Delivery calculation error:', err);
        setError(err.message || 'Erreur lors du calcul des frais de livraison');
      } finally {
        setIsLoading(false);
      }
    };

    calculateFees();
  }, [vendorsByZone, clientAddress, deliveryType, settings]);

  const totalDeliveryFee = zones.reduce((sum, z) => sum + z.delivery_fee, 0);
  const totalDistance = zones.reduce((sum, z) => sum + z.total_distance_meters, 0);

  return {
    zones,
    totalDeliveryFee,
    totalDistance,
    isLoading,
    error
  };
}
