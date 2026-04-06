// Deno.serve used below (no serve import needed)

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
    const { origins, destinations }: DistanceRequest = await req.json();

    if (!origins || !destinations || origins.length === 0 || destinations.length === 0) {
      throw new Error('Origins and destinations are required');
    }

    console.log(`Calculating distances for ${origins.length} origins and ${destinations.length} destinations`);

    const results: DistanceResult[] = [];

    // Try OSRM first (free, no API key needed)
    for (let i = 0; i < origins.length; i++) {
      for (let j = 0; j < destinations.length; j++) {
        try {
          const osrmResult = await calculateOSRMDistance(origins[i], destinations[j]);
          results.push({
            origin_index: i,
            destination_index: j,
            distance_meters: osrmResult.distance,
            duration_seconds: osrmResult.duration,
          });
        } catch (osrmError) {
          console.warn(`OSRM failed for ${i}->${j}, trying Google Maps fallback:`, osrmError);
          
          // Fallback to Google Maps API if available
          const googleResult = await tryGoogleMapsDistance(origins[i], destinations[j]);
          if (googleResult) {
            results.push({
              origin_index: i,
              destination_index: j,
              distance_meters: googleResult.distance,
              duration_seconds: googleResult.duration,
            });
          } else {
            // Final fallback: Haversine with road factor
            const straightDistance = calculateHaversineDistance(
              origins[i].lat, origins[i].lng,
              destinations[j].lat, destinations[j].lng
            );
            results.push({
              origin_index: i,
              destination_index: j,
              distance_meters: Math.round(straightDistance * 1.4), // Road factor
              duration_seconds: Math.round((straightDistance * 1.4) / 500 * 60), // ~30 km/h average
            });
          }
        }
      }
    }

    console.log(`Returning ${results.length} distance results`);

    return new Response(JSON.stringify({ 
      success: true, 
      results,
      provider: 'osrm_with_fallback'
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

// OSRM distance calculation (free, public API)
async function calculateOSRMDistance(
  origin: DistancePoint, 
  destination: DistancePoint
): Promise<{ distance: number; duration: number }> {
  const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=false`;
  
  const response = await fetch(url);
  const data = await response.json();
  
  if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
    throw new Error(`OSRM error: ${data.code || 'No route found'}`);
  }
  
  const route = data.routes[0];
  return {
    distance: Math.round(route.distance), // meters
    duration: Math.round(route.duration), // seconds
  };
}

// Google Maps fallback (if API key is configured)
async function tryGoogleMapsDistance(
  origin: DistancePoint, 
  destination: DistancePoint
): Promise<{ distance: number; duration: number } | null> {
  const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
  if (!apiKey) return null;

  try {
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin.lat},${origin.lng}&destinations=${destination.lat},${destination.lng}&mode=driving&key=${apiKey}`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.rows[0]?.elements[0]?.status === 'OK') {
      const element = data.rows[0].elements[0];
      return {
        distance: element.distance.value,
        duration: element.duration.value,
      };
    }
    return null;
  } catch (error) {
    console.warn('Google Maps API failed:', error);
    return null;
  }
}

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
