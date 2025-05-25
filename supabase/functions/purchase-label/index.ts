
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

// Get EasyPost API key from environment variables
const easyPostApiKey = Deno.env.get('EASYPOST_API_KEY') || 
                      Deno.env.get('VITE_EASYPOST_API_KEY')

console.log('EasyPost API key available in purchase-label function:', easyPostApiKey ? 'YES' : 'NO');

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 })
  }

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
    
    // Update shipment in database - use service role key to bypass RLS
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
      
      if (!supabaseServiceKey) {
        console.log("No service role key available, skipping database save");
      } else {
        const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
      
        // Prepare shipment data with correct column names
        const shipmentData = {
          easypost_id: responseData.id,
          tracking_number: responseData.tracking_code,
          carrier: responseData.selected_rate?.carrier,
          service: responseData.selected_rate?.service,
          status: 'purchased',
          label_url: responseData.postage_label?.label_url,
          tracking_url: responseData.tracker?.public_url,
          cost: parseFloat(responseData.selected_rate?.rate) || 0,
          package_dimensions: JSON.stringify({
            length: responseData.parcel?.length || 0,
            width: responseData.parcel?.width || 0,
            height: responseData.parcel?.height || 0
          }),
          package_weights: JSON.stringify({
            weight: responseData.parcel?.weight || 0,
            weight_unit: responseData.parcel?.weight_unit || 'oz'
          })
        };

        console.log("Saving shipment to database:", shipmentData);
        
        // First, check if the shipment exists using easypost_id
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
