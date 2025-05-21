
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const apiKey = Deno.env.get('VITE_GEOAPIFY_API_KEY');
  
  if (!apiKey) {
    console.error('Geoapify API key is missing');
    return new Response(
      JSON.stringify({ error: 'API key is not configured' }),
      { headers: corsHeaders, status: 500 }
    );
  }

  try {
    // Get query from request
    const { query } = await req.json();
    
    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query parameter is required' }),
        { headers: corsHeaders, status: 400 }
      );
    }

    console.log('Searching addresses with query:', query);
    
    const url = new URL('https://api.geoapify.com/v1/geocode/autocomplete');
    url.searchParams.append('text', query);
    url.searchParams.append('apiKey', apiKey);
    url.searchParams.append('format', 'json');
    url.searchParams.append('limit', '5');
    
    // Fix: Using the correct type values for Geoapify API
    url.searchParams.append('type', 'street,city,postcode,amenity');
    
    console.log('Calling Geoapify API with URL:', url.toString().replace(apiKey, '[REDACTED]'));
    
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Geoapify API error: ${response.status}`, errorText);
      return new Response(
        JSON.stringify({ error: `Geoapify API error: ${response.status}`, details: errorText }),
        { headers: corsHeaders, status: response.status }
      );
    }
    
    const geoapifyData = await response.json();
    console.log('Geoapify API response received with status:', response.status);
    
    // Transform the response to make it easier to use in the frontend
    const results = geoapifyData.results || [];
    console.log(`Found ${results.length} address results`);
    
    const transformedResults = results.map((feature: any) => {
      const props = feature.properties || {};
      return {
        place_id: props.place_id || '',
        address_line1: props.address_line1 || `${props.housenumber || ''} ${props.street || ''}`.trim(),
        address_line2: props.address_line2 || '',
        city: props.city || props.county || '',
        state: props.state || props.state_code || '',
        postcode: props.postcode || '',
        country_code: props.country_code || 'us',
        formatted: props.formatted || '',
        lat: props.lat,
        lon: props.lon
      };
    });
    
    return new Response(
      JSON.stringify({ results: transformedResults }),
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('Error in address-lookup function:', error.message);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { headers: corsHeaders, status: 500 }
    );
  }
});
