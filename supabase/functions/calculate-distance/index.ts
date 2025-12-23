import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DistancePoint {
  lat: number;
  lng: number;
}

interface DistanceRequest {
  origins: DistancePoint[];
  destinations: DistancePoint[];
}

interface DistanceResult {
  origin_index: number;
  destination_index: number;
  distance_meters: number;
  duration_seconds: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!apiKey) {
      throw new Error('GOOGLE_MAPS_API_KEY not configured');
    }

    const { origins, destinations }: DistanceRequest = await req.json();

    if (!origins || !destinations || origins.length === 0 || destinations.length === 0) {
      throw new Error('Origins and destinations are required');
    }

    // Format coordinates for Google Maps API
    const originsStr = origins.map(p => `${p.lat},${p.lng}`).join('|');
    const destinationsStr = destinations.map(p => `${p.lat},${p.lng}`).join('|');

    console.log(`Calculating distances for ${origins.length} origins and ${destinations.length} destinations`);

    // Call Google Maps Distance Matrix API
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(originsStr)}&destinations=${encodeURIComponent(destinationsStr)}&mode=driving&key=${apiKey}`;
    
    const response = await fetch(url);
    const data = await response.json();

    console.log('Google Maps API response status:', data.status);

    if (data.status !== 'OK') {
      console.error('Google Maps API error:', data);
      throw new Error(`Google Maps API error: ${data.status} - ${data.error_message || 'Unknown error'}`);
    }

    // Parse results into a flat array
    const results: DistanceResult[] = [];
    
    for (let i = 0; i < data.rows.length; i++) {
      const row = data.rows[i];
      for (let j = 0; j < row.elements.length; j++) {
        const element = row.elements[j];
        
        if (element.status === 'OK') {
          results.push({
            origin_index: i,
            destination_index: j,
            distance_meters: element.distance.value,
            duration_seconds: element.duration.value,
          });
        } else {
          console.warn(`No route found for origin ${i} to destination ${j}: ${element.status}`);
          // Use straight-line distance as fallback with 1.3x factor
          const straightDistance = calculateHaversineDistance(
            origins[i].lat, origins[i].lng,
            destinations[j].lat, destinations[j].lng
          );
          results.push({
            origin_index: i,
            destination_index: j,
            distance_meters: Math.round(straightDistance * 1.3), // Approximate road distance
            duration_seconds: Math.round((straightDistance * 1.3) / 500 * 60), // Approximate 30 km/h
          });
        }
      }
    }

    console.log(`Returning ${results.length} distance results`);

    return new Response(JSON.stringify({ 
      success: true, 
      results,
      api_status: data.status 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in calculate-distance function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Haversine formula for fallback distance calculation
function calculateHaversineDistance(
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
