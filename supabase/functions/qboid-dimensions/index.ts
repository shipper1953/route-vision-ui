
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-qboid-token',
}

interface QboidData {
  timestamp: string;
  l: number;
  w: number;
  h: number;
  weight?: number;
  barcode?: string;
  device: string;
  note?: string;
}

console.log('Qboid dimensions API endpoint loaded');

serve(async (req) => {
  console.log(`Received ${req.method} request to qboid-dimensions endpoint`);
  
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 })
  }
  
  try {
    // Handle token validation request from frontend
    const url = new URL(req.url);
    const contentType = req.headers.get('content-type');
    
    if (req.method === 'POST' && contentType && contentType.includes('application/json')) {
      const body = await req.json();
      
      if (body.action === 'validate-token') {
        console.log('Validating token request');
        // Just return success - the actual token validation happens when data is received from the device
        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Use this endpoint in your Qboid WiFi API configuration'
        }), {
          headers: corsHeaders,
          status: 200
        });
      }
      
      // This is actual data from Qboid device
      console.log('Received data from Qboid device:', body);
      
      // SECURITY: Token validation is MANDATORY
      const qboidToken = req.headers.get('x-qboid-token');
      const validToken = Deno.env.get('QBOID_API_TOKEN');

      if (!validToken) {
        console.error('QBOID_API_TOKEN environment variable not configured');
        return new Response(JSON.stringify({ error: 'Service configuration error' }), {
          status: 500,
          headers: corsHeaders,
        });
      }

      if (!qboidToken || qboidToken !== validToken) {
        console.error('Invalid or missing Qboid API token');
        return new Response(JSON.stringify({ error: 'Unauthorized - Invalid API token' }), {
          status: 401,
          headers: corsHeaders,
        });
      }
      
      // Parse the request data as QboidData
      const qboidData = body as QboidData;
      
      // Validate required fields according to Qboid WiFi API documentation
      if (!qboidData || 
          typeof qboidData.l !== 'number' || 
          typeof qboidData.w !== 'number' || 
          typeof qboidData.h !== 'number') {
        console.error('Invalid Qboid data format');
        return new Response(JSON.stringify({ 
          error: 'Invalid data format. Required fields: l, w, h' 
        }), {
          headers: corsHeaders,
          status: 400,
        });
      }
      
      // Set up Supabase client
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      // Convert mm to inches
      const dimensions = {
        length: parseFloat((qboidData.l / 25.4).toFixed(2)),
        width: parseFloat((qboidData.w / 25.4).toFixed(2)),
        height: parseFloat((qboidData.h / 25.4).toFixed(2)),
        weight: qboidData.weight ? parseFloat((qboidData.weight / 453.592).toFixed(2)) : 0
      };
      
      // If barcode provided, try to update item
      if (qboidData.barcode) {
        const { data: item, error: lookupError } = await supabaseClient
          .from('items')
          .select('*')
          .eq('sku', qboidData.barcode)
          .single();
        
        if (lookupError || !item) {
          console.error('Item not found for SKU:', qboidData.barcode);
          
          // Store pending dimensions in qboid_events
          await supabaseClient
            .from('qboid_events')
            .insert({
              event_type: 'item_sku_not_found',
              data: {
                dimensions: dimensions,
                sku: qboidData.barcode,
                timestamp: qboidData.timestamp || new Date().toISOString()
              }
            });
          
          return new Response(JSON.stringify({
            success: false,
            error: 'SKU not found in catalog',
            sku: qboidData.barcode,
            data: { dimensions }
          }), {
            headers: corsHeaders,
            status: 404,
          });
        }
        
        // Update item dimensions
        const { error: updateError } = await supabaseClient
          .from('items')
          .update({
            length: dimensions.length,
            width: dimensions.width,
            height: dimensions.height,
            weight: dimensions.weight,
            dimensions_updated_at: new Date().toISOString()
          })
          .eq('id', item.id);
        
        if (updateError) {
          console.error('Error updating item:', updateError);
          return new Response(JSON.stringify({ 
            error: 'Failed to update item dimensions' 
          }), {
            headers: corsHeaders,
            status: 500,
          });
        }
        
        // Publish realtime event
        await supabaseClient
          .from('qboid_events')
          .insert({
            event_type: 'item_dimensions_updated',
            data: {
              item_id: item.id,
              sku: qboidData.barcode,
              name: item.name,
              dimensions: dimensions,
              timestamp: qboidData.timestamp || new Date().toISOString()
            }
          });
        
        console.log(`Item ${item.sku} dimensions updated successfully`);
        
        return new Response(JSON.stringify({
          success: true,
          message: 'Item dimensions updated successfully',
          data: {
            item_id: item.id,
            sku: item.sku,
            name: item.name,
            dimensions: dimensions,
            timestamp: qboidData.timestamp || new Date().toISOString()
          }
        }), {
          headers: corsHeaders,
          status: 200,
        });
      } else {
        // No barcode, store pending dimensions
        await supabaseClient
          .from('qboid_events')
          .insert({
            event_type: 'dimensions_pending',
            data: {
              dimensions: dimensions,
              timestamp: qboidData.timestamp || new Date().toISOString()
            }
          });
        
        return new Response(JSON.stringify({
          success: true,
          message: 'Dimensions captured. Please scan barcode to link to item.',
          data: { dimensions }
        }), {
          headers: corsHeaders,
          status: 200,
        });
      }
    }
    
    // If we get here, the request was invalid
    console.error('Invalid request method or content-type:', req.method, req.headers.get('content-type'));
    return new Response(JSON.stringify({ 
      error: 'Invalid request. Only POST requests with application/json content-type are supported.' 
    }), {
      headers: corsHeaders,
      status: 405,
    });
    
  } catch (err) {
    console.error('Error processing Qboid data:', err);
    return new Response(JSON.stringify({ 
      error: 'Internal server error', 
      details: err.message 
    }), {
      headers: corsHeaders,
      status: 500,
    });
  }
})
