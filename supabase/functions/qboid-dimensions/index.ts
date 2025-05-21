
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*', // In production, set this to your specific domain
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-qboid-token',
}

interface QboidData {
  orderId?: string;
  barcode?: string;
  length: number;
  width: number;
  height: number;
  weight: number;
}

console.log('Qboid dimensions API endpoint loaded');

serve(async (req) => {
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 })
  }
  
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Only POST requests are supported' }), {
        headers: corsHeaders,
        status: 405,
      })
    }
    
    // Verify the Qboid API token
    const qboidToken = req.headers.get('x-qboid-token');
    const validToken = Deno.env.get('QBOID_API_TOKEN');
    
    if (!qboidToken || qboidToken !== validToken) {
      console.error('Invalid or missing Qboid API token');
      return new Response(JSON.stringify({ 
        error: 'Unauthorized - Invalid or missing API token' 
      }), {
        headers: corsHeaders,
        status: 401,
      })
    }
    
    // Parse the request body
    const qboidData: QboidData = await req.json();
    console.log('Received Qboid data:', qboidData);
    
    // Validate required fields
    if (!qboidData || 
        typeof qboidData.length !== 'number' || 
        typeof qboidData.width !== 'number' || 
        typeof qboidData.height !== 'number' || 
        typeof qboidData.weight !== 'number') {
      console.error('Invalid Qboid data format');
      return new Response(JSON.stringify({ 
        error: 'Invalid data format. Required fields: length, width, height, weight as numbers' 
      }), {
        headers: corsHeaders,
        status: 400,
      })
    }
    
    // If orderId or barcode is provided, we can associate the dimensions with a specific order
    if (qboidData.orderId || qboidData.barcode) {
      // Set up Supabase client
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? ''
      )
      
      // In a real implementation, we could store these dimensions in a temporary table
      // associated with the order ID so they can be retrieved when the order is looked up
      console.log('Order/barcode identified:', qboidData.orderId || qboidData.barcode);
      
      // For now, we'll just acknowledge the data was received
    }
    
    // Return success response with the processed data
    return new Response(JSON.stringify({
      success: true,
      message: 'Package dimensions received successfully',
      data: {
        length: qboidData.length,
        width: qboidData.width,
        height: qboidData.height,
        weight: qboidData.weight,
        orderId: qboidData.orderId || null,
        barcode: qboidData.barcode || null,
      }
    }), {
      headers: corsHeaders,
      status: 200,
    })
    
  } catch (err) {
    console.error('Error processing Qboid data:', err);
    return new Response(JSON.stringify({ 
      error: 'Internal server error', 
      details: err.message 
    }), {
      headers: corsHeaders,
      status: 500,
    })
  }
})
