
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
  shape?: string;
  device: string;
  note?: string;
  attributes?: {
    [key: string]: string; 
  };
  image?: string;
  imagecolor?: string;
  imageseg?: string;
  orderId?: string;
}

console.log('Qboid WiFi API handler loaded');

serve(async (req) => {
  console.log(`Received ${req.method} request to qboid-wifi-api-handler endpoint`);
  
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request');
    return new Response(null, { headers: corsHeaders, status: 204 })
  }
  
  try {
    const url = new URL(req.url);
    const contentType = req.headers.get('content-type');
    
    if (req.method === 'POST' && contentType && contentType.includes('application/json')) {
      const body = await req.json();
      console.log('Received body:', JSON.stringify(body));
      
      if (body.action === 'validate-token') {
        console.log('Validating token request');
        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Use this endpoint in your Qboid WiFi API configuration'
        }), {
          headers: corsHeaders,
          status: 200
        });
      }
      
      console.log('Received data from Qboid device:', JSON.stringify(body));
      
      const qboidToken = req.headers.get('x-qboid-token');
      console.log('Received token:', qboidToken);
      
      const validToken = Deno.env.get('QBOID_API_TOKEN') || 'test_token';
      
      if (!qboidToken) {
        console.warn('Missing Qboid API token');
      } else if (qboidToken !== validToken) {
        console.error('Invalid Qboid API token');
        return new Response(JSON.stringify({ 
          error: 'Unauthorized - Invalid API token' 
        }), {
          headers: corsHeaders,
          status: 401,
        });
      }
      
      const qboidData = body as QboidData;
      console.log('Parsed qboid data:', JSON.stringify(qboidData));
      
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
      
      const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
      const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
      
      console.log('Creating Supabase client with URL:', supabaseUrl ? 'URL provided' : 'No URL');
      
      const supabaseClient = createClient(
        supabaseUrl,
        supabaseAnonKey
      );

      // Convert mm to inches for compatibility with our system
      const dimensions = {
        length: parseFloat((qboidData.l / 25.4).toFixed(2)),
        width: parseFloat((qboidData.w / 25.4).toFixed(2)),
        height: parseFloat((qboidData.h / 25.4).toFixed(2)),
        weight: qboidData.weight ? parseFloat((qboidData.weight / 28.35).toFixed(2)) : 0
      };
      
      if (!dimensions.weight) {
        dimensions.weight = parseFloat((dimensions.length * dimensions.width * dimensions.height * 0.02).toFixed(2));
        console.log(`Weight not provided, estimated as ${dimensions.weight}oz`);
      }

      // Extract order ID from barcode or orderId field
      let orderIdToUpdate = null;
      if (qboidData.barcode && qboidData.barcode.startsWith('ORD-')) {
        orderIdToUpdate = qboidData.barcode;
      } else if (qboidData.orderId) {
        orderIdToUpdate = qboidData.orderId.startsWith('ORD-') ? qboidData.orderId : `ORD-${qboidData.orderId}`;
      }

      // If we have an order ID, update the order with Qboid dimensions
      if (orderIdToUpdate) {
        console.log('Updating order with Qboid dimensions:', orderIdToUpdate);
        try {
          const { error: updateError } = await supabaseClient
            .from('orders')
            .update({
              qboid_dimensions: JSON.stringify(dimensions)
            })
            .eq('order_id', orderIdToUpdate);
          
          if (updateError) {
            console.error('Error updating order with Qboid dimensions:', updateError);
          } else {
            console.log('Order updated successfully with Qboid dimensions');
          }
        } catch (err) {
          console.error('Failed to update order with Qboid dimensions:', err);
        }
      }
        
      // Store in shipments table for future reference
      try {
        console.log('Saving dimensions to database:', JSON.stringify(dimensions));
        const { error: saveError } = await supabaseClient
          .from('shipments')
          .insert({
            package_dimensions: dimensions,
            package_weights: { weight: dimensions.weight, weight_unit: 'oz' },
            carrier: 'pending',
            service: 'pending',
            status: 'dimensions_captured',
            cost: 0,
            estimated_delivery_date: null,
            actual_delivery_date: null,
            user_id: null
          });
        
        if (saveError) {
          console.error('Error saving dimensions to database:', saveError);
        } else {
          console.log('Dimensions saved successfully to shipments table');
        }
      } catch (err) {
        console.error('Failed to save dimensions to shipments table:', err);
      }
      
      // Publish realtime event for immediate UI updates
      try {
        console.log('Publishing realtime event for dimensions:', JSON.stringify(dimensions));
        const { error: rtError } = await supabaseClient
          .from('qboid_events')
          .insert({
            event_type: 'dimensions_received',
            data: {
              dimensions: dimensions,
              timestamp: qboidData.timestamp || new Date().toISOString(),
              barcode: qboidData.barcode || null,
              orderId: orderIdToUpdate || null
            }
          });
          
        if (rtError) {
          console.error('Error publishing realtime event:', rtError);
        } else {
          console.log('Realtime event published successfully');
        }
      } catch (err) {
        console.error('Failed to publish realtime event:', err);
      }
      
      return new Response(JSON.stringify({
        success: true,
        message: 'Package dimensions received successfully',
        data: {
          dimensions: dimensions,
          timestamp: qboidData.timestamp || new Date().toISOString(),
          barcode: qboidData.barcode || null,
          orderId: orderIdToUpdate || null,
        }
      }), {
        headers: corsHeaders,
        status: 200,
      });
    }
    
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
