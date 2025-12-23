import { supabase } from "@/integrations/supabase/client";

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface DistanceResult {
  origin_index: number;
  destination_index: number;
  distance_meters: number;
  duration_seconds: number;
}

/**
 * Calculate distances between multiple origins and destinations using Google Maps API
 */
export async function calculateDistances(
  origins: Coordinates[],
  destinations: Coordinates[]
): Promise<DistanceResult[]> {
  const { data, error } = await supabase.functions.invoke('calculate-distance', {
    body: { origins, destinations }
  });

  if (error || !data?.success) {
    console.error('Distance calculation error:', error || data?.error);
    throw new Error(data?.error || 'Failed to calculate distances');
  }

  return data.results;
}

/**
 * Calculate delivery fee based on distance with progressive discount
 * 
 * Formula:
 * - Base calculation: ceil(distance / 100) * feePerInterval
 * - Apply discount for each complete km: (1 - (km * discountPercent / 100))
 * - Minimum fee is always applied
 */
export function calculateDeliveryFee(
  distanceMeters: number,
  settings: {
    delivery_base_fee: number;
    delivery_fee_per_100m: number;
    delivery_discount_per_km: number;
  }
): number {
  const { delivery_base_fee, delivery_fee_per_100m, delivery_discount_per_km } = settings;
  
  // Calculate base fee from intervals
  const intervals = Math.ceil(distanceMeters / 100);
  let calculatedFee = intervals * delivery_fee_per_100m;
  
  // Apply progressive discount per km
  const completeKm = Math.floor(distanceMeters / 1000);
  if (completeKm > 0 && delivery_discount_per_km > 0) {
    const totalDiscount = Math.min(completeKm * delivery_discount_per_km, 50); // Cap at 50%
    calculatedFee = calculatedFee * (1 - totalDiscount / 100);
  }
  
  // Return max of calculated fee and base fee
  return Math.max(Math.round(calculatedFee), delivery_base_fee);
}

/**
 * Haversine formula for straight-line distance (fallback)
 */
export function calculateHaversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Sort vendors by optimal pickup order (nearest neighbor algorithm)
 * Returns vendors sorted with distances to next point
 */
export function optimizePickupRoute(
  vendors: Array<{ id: string; lat: number; lng: number; [key: string]: any }>,
  destination: Coordinates
): Array<{ vendor: typeof vendors[0]; distanceToNext: number }> {
  if (vendors.length === 0) return [];
  if (vendors.length === 1) {
    return [{
      vendor: vendors[0],
      distanceToNext: calculateHaversineDistance(
        vendors[0].lat, vendors[0].lng,
        destination.lat, destination.lng
      ) * 1.3 // Road distance approximation
    }];
  }

  const result: Array<{ vendor: typeof vendors[0]; distanceToNext: number }> = [];
  const remaining = [...vendors];
  
  // Start from the vendor furthest from destination
  let distances = remaining.map(v => ({
    vendor: v,
    distToDestination: calculateHaversineDistance(v.lat, v.lng, destination.lat, destination.lng)
  }));
  distances.sort((a, b) => b.distToDestination - a.distToDestination);
  
  let current = distances[0].vendor;
  remaining.splice(remaining.findIndex(v => v.id === current.id), 1);
  
  while (remaining.length > 0) {
    // Find nearest remaining vendor
    let nearestIdx = 0;
    let nearestDist = Infinity;
    
    for (let i = 0; i < remaining.length; i++) {
      const dist = calculateHaversineDistance(
        current.lat, current.lng,
        remaining[i].lat, remaining[i].lng
      );
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIdx = i;
      }
    }
    
    result.push({
      vendor: current,
      distanceToNext: nearestDist * 1.3 // Road distance approximation
    });
    
    current = remaining[nearestIdx];
    remaining.splice(nearestIdx, 1);
  }
  
  // Add last vendor with distance to destination
  result.push({
    vendor: current,
    distanceToNext: calculateHaversineDistance(
      current.lat, current.lng,
      destination.lat, destination.lng
    ) * 1.3
  });
  
  return result;
}
