
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

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
    
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Geoapify API error: ${response.status}`, errorText);
      return new Response(
        JSON.stringify({ error: `Geoapify API error: ${response.status}` }),
        { headers: corsHeaders, status: response.status }
      );
    }
    
    const data = await response.json();
    
    return new Response(
      JSON.stringify(data),
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
