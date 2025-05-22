
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*', // In production, set this to your specific domain
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-qboid-token',
}

interface QboidData {
  timestamp: string;       // Format: "YYYY/MM/DD HH:MM:SS"
  l: number;               // Length in mm
  w: number;               // Width in mm
  h: number;               // Height in mm
  weight?: number;         // Weight in grams
  barcode?: string;        // Optional barcode
  shape?: string;          // Shape description
  device: string;          // Device ID
  note?: string;           // Optional note
  attributes?: {           // Optional attributes
    [key: string]: string; 
  };
  image?: string;          // Optional base64 encoded image
  imagecolor?: string;     // Optional base64 encoded color image
  imageseg?: string;       // Optional base64 encoded segmented image
  orderId?: string;        // Custom field: order ID reference
}

console.log('Qboid WiFi API handler loaded');

serve(async (req) => {
  console.log(`Received ${req.method} request to qboid-wifi-api-handler endpoint`);
  
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
      
      // Verify the Qboid API token
      const qboidToken = req.headers.get('x-qboid-token');
      const validToken = Deno.env.get('QBOID_API_TOKEN') || 'test_token'; // Fallback for testing
      
      if (!qboidToken) {
        console.warn('Missing Qboid API token');
        // For development, allow missing token with a warning
        // In production, you would return 401 here
      } else if (qboidToken !== validToken) {
        console.error('Invalid Qboid API token');
        return new Response(JSON.stringify({ 
          error: 'Unauthorized - Invalid API token' 
        }), {
          headers: corsHeaders,
          status: 401,
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
        Deno.env.get('SUPABASE_ANON_KEY') ?? ''
      );

      // Convert mm to inches for compatibility with our system
      const dimensions = {
        length: parseFloat((qboidData.l / 25.4).toFixed(2)),  // mm to inches
        width: parseFloat((qboidData.w / 25.4).toFixed(2)),   // mm to inches
        height: parseFloat((qboidData.h / 25.4).toFixed(2)),  // mm to inches
        weight: qboidData.weight ? parseFloat((qboidData.weight / 28.35).toFixed(2)) : 0  // g to oz, default to 0
      };
      
      // If weight is not provided, use a default
      if (!dimensions.weight) {
        dimensions.weight = parseFloat((dimensions.length * dimensions.width * dimensions.height * 0.02).toFixed(2));
        console.log(`Weight not provided, estimated as ${dimensions.weight}oz`);
      }
        
      // Store in database for future reference
      try {
        const { error: saveError } = await supabaseClient
          .from('shipments')
          .insert({
            dimensions: dimensions,
            weight: dimensions.weight,
            created_at: new Date().toISOString(),
            status: 'dimensions_captured',
            order_id: qboidData.orderId ? parseInt(qboidData.orderId.replace(/\D/g, '')) : null,
            barcode: qboidData.barcode || null,
            easypost_id: null
          });
        
        if (saveError) {
          console.error('Error saving dimensions to database:', saveError);
        } else {
          console.log('Dimensions saved successfully');
        }
      } catch (err) {
        console.error('Failed to save dimensions:', err);
        // Don't fail the request if we can't save to the database
      }
      
      // Try to push data to any connected clients via Supabase realtime
      try {
        await supabaseClient
          .from('qboid_events')
          .insert({
            event_type: 'dimensions_received',
            data: {
              dimensions: dimensions,
              timestamp: qboidData.timestamp || new Date().toISOString(),
              barcode: qboidData.barcode || null,
              orderId: qboidData.orderId || null
            }
          });
      } catch (err) {
        console.error('Failed to publish realtime event:', err);
        // Continue anyway
      }
      
      // Return success response with the processed data
      return new Response(JSON.stringify({
        success: true,
        message: 'Package dimensions received successfully',
        data: {
          dimensions: dimensions,
          timestamp: qboidData.timestamp || new Date().toISOString(),
          barcode: qboidData.barcode || null,
          orderId: qboidData.orderId || null,
        }
      }), {
        headers: corsHeaders,
        status: 200,
      });
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
