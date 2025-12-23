import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  calculateDistances, 
  calculateDeliveryFee, 
  optimizePickupRoute,
  calculateHaversineDistance,
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
    is_approximated?: boolean;
  }>;
  total_distance_meters: number;
  delivery_fee: number;
  driver_earnings: number;
  has_approximated_coordinates?: boolean;
}

interface DeliveryCalculationResult {
  zones: ZoneDeliveryInfo[];
  totalDeliveryFee: number;
  totalDistance: number;
  isLoading: boolean;
  error: string | null;
  hasApproximatedCoordinates: boolean;
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

  // Group items by delivery zone and fetch zone center as fallback
  const vendorsByZone = useMemo(() => {
    const grouped: Record<string, Array<{
      shop_id: string;
      shop_name: string;
      lat: number;
      lng: number;
      address: string;
      zone_id: string | null;
      is_approximated: boolean;
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
      
      // Add vendor with coordinates (will be enriched with zone center if needed)
      grouped[zoneKey].push({
        shop_id: shop.id,
        shop_name: shop.name,
        lat: shop.geolocation_lat || 0,
        lng: shop.geolocation_lng || 0,
        address: shop.address || '',
        zone_id: shop.delivery_zone_id || null,
        is_approximated: !shop.geolocation_lat || !shop.geolocation_lng
      });
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
        
        // Fetch all zone centers for fallback coordinates
        const zoneIds = Object.keys(vendorsByZone).filter(z => z !== 'no-zone');
        let zoneCenters: Record<string, { lat: number; lng: number; name: string }> = {};
        
        if (zoneIds.length > 0) {
          const { data: zonesData } = await supabase
            .from('delivery_zones')
            .select('id, name, center_lat, center_lng')
            .in('id', zoneIds);
          
          if (zonesData) {
            zonesData.forEach(zone => {
              if (zone.center_lat && zone.center_lng) {
                zoneCenters[zone.id] = {
                  lat: zone.center_lat,
                  lng: zone.center_lng,
                  name: zone.name
                };
              }
            });
          }
        }

        for (const [zoneId, vendors] of Object.entries(vendorsByZone)) {
          // Enrich vendors with zone center coordinates if missing
          const enrichedVendors = vendors.map(vendor => {
            if (vendor.lat === 0 || vendor.lng === 0) {
              // Use zone center as fallback
              const zoneCenter = vendor.zone_id ? zoneCenters[vendor.zone_id] : null;
              if (zoneCenter) {
                return {
                  ...vendor,
                  lat: zoneCenter.lat,
                  lng: zoneCenter.lng,
                  is_approximated: true
                };
              }
              // Skip vendors with no coordinates and no zone center
              return null;
            }
            return vendor;
          }).filter((v): v is NonNullable<typeof v> => v !== null);

          if (enrichedVendors.length === 0) continue;

          // Optimize pickup route
          const optimizedRoute = optimizePickupRoute(
            enrichedVendors.map(v => ({ ...v, id: v.shop_id })),
            clientAddress
          );

          // Try to get real distances via API
          let totalDistance = 0;
          let useRealDistances = false;
          
          try {
            // Build list of all points for distance calculation
            const allPoints = [
              ...enrichedVendors.map(v => ({ lat: v.lat, lng: v.lng })),
              clientAddress
            ];
            
            // Calculate distances between consecutive points
            const origins = allPoints.slice(0, -1);
            const destinations = allPoints.slice(1);
            
            if (origins.length > 0 && destinations.length > 0) {
              const distanceResults = await calculateDistances(origins, destinations);
              
              // Sum up the distances
              distanceResults.forEach(result => {
                totalDistance += result.distance_meters;
              });
              useRealDistances = true;
            }
          } catch (distError) {
            console.warn('API distance calculation failed, using Haversine fallback:', distError);
          }

          // Fallback to Haversine if API failed
          if (!useRealDistances) {
            optimizedRoute.forEach(point => {
              totalDistance += point.distanceToNext;
            });
          }

          const pickupPoints = optimizedRoute.map((point, index) => ({
            shop_id: point.vendor.shop_id,
            shop_name: point.vendor.shop_name,
            lat: point.vendor.lat,
            lng: point.vendor.lng,
            address: point.vendor.address,
            pickup_order: index + 1,
            distance_to_next: Math.round(point.distanceToNext),
            is_approximated: point.vendor.is_approximated
          }));

          // Calculate delivery fee
          const deliveryFee = calculateDeliveryFee(totalDistance, {
            delivery_base_fee: settings.delivery_base_fee,
            delivery_fee_per_100m: settings.delivery_fee_per_100m,
            delivery_discount_per_km: settings.delivery_discount_per_km
          });

          // Calculate driver earnings
          const driverEarnings = Math.round(
            deliveryFee * (1 - (settings.delivery_commission_fere || 20) / 100)
          );

          // Get zone name
          let zoneName = zoneId !== 'no-zone' ? zoneCenters[zoneId]?.name || null : null;

          zoneResults.push({
            zone_id: zoneId === 'no-zone' ? null : zoneId,
            zone_name: zoneName,
            vendors: pickupPoints,
            total_distance_meters: Math.round(totalDistance),
            delivery_fee: deliveryFee,
            driver_earnings: driverEarnings,
            has_approximated_coordinates: pickupPoints.some(p => p.is_approximated)
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
  const hasApproximatedCoordinates = zones.some(z => z.has_approximated_coordinates);

  return {
    zones,
    totalDeliveryFee,
    totalDistance,
    isLoading,
    error,
    hasApproximatedCoordinates
  };
}
