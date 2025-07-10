import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

serve(async (req) => {
  console.log('=== TEST FUNCTION WORKING ===');
  
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  return new Response(JSON.stringify({ 
    message: 'Test function is working',
    timestamp: new Date().toISOString()
  }), {
    headers: corsHeaders,
    status: 200,
  });
})