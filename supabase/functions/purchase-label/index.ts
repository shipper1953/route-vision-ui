
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
    const { shipmentId, rateId, orderId } = await req.json()
    
    if (!shipmentId || !rateId) {
      return new Response(JSON.stringify({
        error: 'Missing required parameters',
      }), {
        headers: corsHeaders,
        status: 400,
      })
    }
    
    console.log(`Purchasing label for shipment ${shipmentId} with rate ${rateId}`, orderId ? `for order ${orderId}` : '')
    
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
          weight: String(parseFloat(responseData.parcel?.weight) || 0),
          package_dimensions: JSON.stringify({
            length: responseData.parcel?.length || 0,
            width: responseData.parcel?.width || 0,
            height: responseData.parcel?.height || 0
          }),
          package_weights: JSON.stringify({
            weight: responseData.parcel?.weight || 0,
            weight_unit: responseData.parcel?.weight_unit || 'oz'
          }),
          created_at: new Date().toISOString(),
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
        
        let finalShipmentId = null;
        
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
            finalShipmentId = existingShipment.id;
          }
        } else {
          // Insert new shipment
          const { data: newShipment, error: insertError } = await supabaseClient
            .from('shipments')
            .insert(shipmentData)
            .select('id')
            .single();
            
          if (insertError) {
            console.error('Error inserting new shipment:', insertError);
          } else {
            console.log('New shipment inserted successfully');
            finalShipmentId = newShipment?.id;
          }
        }

        // If we have an order_id and successfully saved the shipment, link them
        if (orderId && finalShipmentId) {
          console.log(`Linking order ${orderId} to shipment ${finalShipmentId}`);
          
          // Try multiple strategies to find and update the order
          let orderUpdateSuccess = false;
          
          // Strategy 1: Try with the orderId as-is if it's a string ID
          if (isNaN(Number(orderId))) {
            const { error: orderUpdateError1 } = await supabaseClient
              .from('orders')
              .update({ 
                shipment_id: finalShipmentId,
                status: 'shipped'
              })
              .eq('order_id', orderId);
            
            if (!orderUpdateError1) {
              console.log(`Successfully linked order ${orderId} to shipment via string order_id`);
              orderUpdateSuccess = true;
            } else {
              console.log('Failed to update via string order_id:', orderUpdateError1);
            }
          }
          
          // Strategy 2: Try with numeric order_id if not successful yet
          if (!orderUpdateSuccess && !isNaN(Number(orderId))) {
            const { error: orderUpdateError2 } = await supabaseClient
              .from('orders')
              .update({ 
                shipment_id: finalShipmentId,
                status: 'shipped'
              })
              .eq('order_id', parseInt(orderId));
            
            if (!orderUpdateError2) {
              console.log(`Successfully linked order ${orderId} to shipment via numeric order_id`);
              orderUpdateSuccess = true;
            } else {
              console.log('Failed to update via numeric order_id:', orderUpdateError2);
            }
          }
          
          // Strategy 3: Try with id field if numeric
          if (!orderUpdateSuccess && !isNaN(Number(orderId))) {
            const { error: orderUpdateError3 } = await supabaseClient
              .from('orders')
              .update({ 
                shipment_id: finalShipmentId,
                status: 'shipped'
              })
              .eq('id', parseInt(orderId));
            
            if (!orderUpdateError3) {
              console.log(`Successfully linked order ${orderId} to shipment via id field`);
              orderUpdateSuccess = true;
            } else {
              console.log('Failed to update via id field:', orderUpdateError3);
            }
          }
          
          if (!orderUpdateSuccess) {
            console.error(`Failed to link order ${orderId} to shipment using all strategies`);
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
