
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { ShipmentData } from './types.ts'

export async function saveShipmentToDatabase(responseData: any, orderId?: string | null) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  
  if (!supabaseServiceKey) {
    console.log("No service role key available, skipping database save");
    return null;
  }

  const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

  // Prepare shipment data with correct column names that match the database schema
  // Removed order_id field since it was removed from the shipments table
  const shipmentData: ShipmentData = {
    easypost_id: responseData.id,
    tracking_number: responseData.tracking_code,
    carrier: responseData.selected_rate?.carrier || 'Unknown',
    service: responseData.selected_rate?.service || 'Standard',
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
    .eq('easypost_id', responseData.id)
    .maybeSingle();
    
  if (fetchError) {
    console.error("Error checking existing shipment:", fetchError);
  }
  
  let finalShipmentId = null;
  
  if (existingShipment) {
    // Update existing shipment
    const { data: updatedShipment, error: updateError } = await supabaseClient
      .from('shipments')
      .update(shipmentData)
      .eq('easypost_id', responseData.id)
      .select('id')
      .single();
      
    if (updateError) {
      console.error('Error updating existing shipment:', updateError);
    } else {
      console.log('Existing shipment updated successfully');
      finalShipmentId = updatedShipment?.id;
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
      console.log('New shipment inserted successfully:', newShipment);
      finalShipmentId = newShipment?.id;
    }
  }

  return { finalShipmentId, supabaseClient };
}
