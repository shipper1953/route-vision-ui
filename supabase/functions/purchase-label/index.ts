
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

// Get EasyPost API key from environment variables - check ALL naming conventions
const easyPostApiKey = Deno.env.get('EASYPOST_API_KEY') || 
                      Deno.env.get('VITE_EASYPOST_API_KEY')

console.log('EasyPost API key available in purchase-label function:', easyPostApiKey ? 'YES' : 'NO');

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*', // In production, set this to your specific domain
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 })
  }

  // CRITICAL FIX: Make authentication optional to avoid errors from unauthenticated requests
  try {
    const { shipmentId, rateId } = await req.json()
    
    if (!shipmentId || !rateId) {
      return new Response(JSON.stringify({
        error: 'Missing required parameters',
      }), {
        headers: corsHeaders,
        status: 400,
      })
    }
    
    console.log(`Purchasing label for shipment ${shipmentId} with rate ${rateId}`)
    
    if (!easyPostApiKey) {
      return new Response(JSON.stringify({
        error: 'EasyPost API key is not available. Please configure it in Supabase Secrets with name EASYPOST_API_KEY or VITE_EASYPOST_API_KEY.'
      }), {
        headers: corsHeaders,
        status: 500,
      })
    }
    
    // Call EasyPost API to purchase the label
    const response = await fetch(`https://api.easypost.com/v2/shipments/${shipmentId}/buy`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${easyPostApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        rate: { id: rateId }
      }),
    })
    
    const responseText = await response.text()
    let responseData
    
    try {
      responseData = JSON.parse(responseText)
    } catch (err) {
      responseData = { raw_response: responseText }
    }
    
    if (!response.ok) {
      console.error('EasyPost API error:', responseData)
      return new Response(JSON.stringify({
        error: 'EasyPost API error',
        details: responseData
      }), {
        headers: corsHeaders,
        status: response.status,
      })
    }
    
    // Update shipment in database if authenticated
    try {
      // Get auth token from request
      const authHeader = req.headers.get('Authorization')
      
      // Create Supabase client
      const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
      const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
      const supabaseClient = createClient(
        supabaseUrl,
        supabaseAnonKey,
        { global: { headers: { Authorization: authHeader || '' } } }
      )
      
      // Get authenticated user if available
      const { data: userData, error: authError } = await supabaseClient.auth.getUser()
      
      // Prepare shipment data
      const shipmentData = {
        easypost_id: responseData.id,
        tracking_number: responseData.tracking_code,
        carrier: responseData.selected_rate?.carrier,
        carrier_service: responseData.selected_rate?.service,
        status: 'purchased',
        label_url: responseData.postage_label?.label_url,
        // Add user ID if authenticated
        ...(userData?.user ? { user_id: userData.user.id } : {})
      };
      
      console.log("Saving shipment to database:", shipmentData);
      
      // First, check if the shipment exists
      const { data: existingShipment, error: fetchError } = await supabaseClient
        .from('shipments')
        .select('*')
        .eq('easypost_id', shipmentId)
        .maybeSingle();
        
      if (fetchError) {
        console.error("Error checking existing shipment:", fetchError);
      }
      
      if (existingShipment) {
        // Update existing shipment
        const { error: updateError } = await supabaseClient
          .from('shipments')
          .update(shipmentData)
          .eq('easypost_id', shipmentId);
          
        if (updateError) {
          console.error('Error updating existing shipment:', updateError);
        } else {
          console.log('Existing shipment updated successfully');
        }
      } else {
        // Insert new shipment
        const { error: insertError } = await supabaseClient
          .from('shipments')
          .insert(shipmentData);
          
        if (insertError) {
          console.error('Error inserting new shipment:', insertError);
        } else {
          console.log('New shipment inserted successfully');
        }
      }
    } catch (err) {
      console.error('Error updating shipment record:', err);
      // Continue even if database update fails
    }
    
    // Return the complete purchase response
    return new Response(JSON.stringify(responseData), { headers: corsHeaders });
    
  } catch (err) {
    console.error('Error processing request:', err);
    return new Response(JSON.stringify({ error: 'Internal server error', details: err.message }), {
      headers: corsHeaders,
      status: 500,
    });
  }
});
