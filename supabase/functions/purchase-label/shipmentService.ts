
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

export async function saveShipmentToDatabase(purchaseResponse: any, orderId: string | null, userId: string, provider: string = 'easypost') {
  console.log("Saving shipment to database with user_id:", userId);
  
  const supabaseService = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );

  // Get user's company_id for proper assignment
  const { data: userProfile, error: userError } = await supabaseService
    .from('users')
    .select('company_id')
    .eq('id', userId)
    .single();

  if (userError || !userProfile?.company_id) {
    console.error("Could not get user company_id:", userError);
    throw new Error("User profile not found or not assigned to a company");
  }

  const companyId = userProfile.company_id;
  console.log("Found company_id for user:", companyId);

  // Get warehouse_id from order if available
  let warehouseId = null;
  if (orderId) {
    const { data: orderData } = await supabaseService
      .from('orders')
      .select('warehouse_id')
      .eq('order_id', orderId)
      .single();
    
    if (orderData?.warehouse_id) {
      warehouseId = orderData.warehouse_id;
      console.log("Using warehouse from order:", warehouseId);
    }
  }

  // If no warehouse from order, get user's default warehouse
  if (!warehouseId) {
    const { data: userData } = await supabaseService
      .from('users')
      .select('warehouse_ids')
      .eq('id', userId)
      .single();
    
    if (userData?.warehouse_ids && Array.isArray(userData.warehouse_ids) && userData.warehouse_ids.length > 0) {
      warehouseId = userData.warehouse_ids[0];
      console.log("Using user's warehouse:", warehouseId);
    } else {
      // Fall back to company default warehouse
      const { data: defaultWarehouse } = await supabaseService
        .from('warehouses')
        .select('id')
        .eq('company_id', companyId)
        .eq('is_default', true)
        .single();
      
      if (defaultWarehouse) {
        warehouseId = defaultWarehouse.id;
        console.log("Using company default warehouse:", warehouseId);
      }
    }
  }

  // Map response data based on provider
  let shipmentData;
  
  if (provider === 'shippo') {
    // Shippo response structure
    shipmentData = {
      easypost_id: purchaseResponse.object_id, // Store Shippo transaction ID in easypost_id field
      tracking_number: purchaseResponse.tracking_number,
      carrier: purchaseResponse.rate?.provider || 'Unknown',
      service: purchaseResponse.rate?.servicelevel?.name || 'Unknown',
      status: 'purchased',
      label_url: purchaseResponse.label_url,
      tracking_url: purchaseResponse.tracking_url_provider,
      cost: parseFloat(purchaseResponse.rate?.amount || '0'),
      weight: purchaseResponse.parcel?.weight?.toString(),
      package_dimensions: JSON.stringify({
        length: purchaseResponse.parcel?.length,
        width: purchaseResponse.parcel?.width,
        height: purchaseResponse.parcel?.height,
      }),
      package_weights: JSON.stringify({
        weight: purchaseResponse.parcel?.weight,
        weight_unit: purchaseResponse.parcel?.mass_unit || 'lb'
      }),
      created_at: purchaseResponse.object_created,
      user_id: userId,
      company_id: companyId,
      warehouse_id: warehouseId
    };
  } else {
    // EasyPost response structure (default)
    shipmentData = {
      easypost_id: purchaseResponse.id,
      tracking_number: purchaseResponse.tracking_code,
      carrier: purchaseResponse.selected_rate?.carrier,
      service: purchaseResponse.selected_rate?.service,
      status: 'purchased',
      label_url: purchaseResponse.postage_label?.label_url,
      tracking_url: purchaseResponse.tracker?.public_url,
      cost: parseFloat(purchaseResponse.selected_rate?.rate || '0'),
      weight: purchaseResponse.parcel?.weight?.toString(),
      package_dimensions: JSON.stringify({
        length: purchaseResponse.parcel?.length,
        width: purchaseResponse.parcel?.width,
        height: purchaseResponse.parcel?.height,
      }),
      package_weights: JSON.stringify({
        weight: purchaseResponse.parcel?.weight,
        weight_unit: 'oz'
      }),
      created_at: purchaseResponse.created_at,
      user_id: userId,
      company_id: companyId,
      warehouse_id: warehouseId
    };
  }

  console.log("Shipment data:", shipmentData);

  const { data: newShipment, error: insertError } = await supabaseService
    .from('shipments')
    .insert(shipmentData)
    .select()
    .single();

  if (insertError) {
    console.error("Error inserting shipment:", insertError);
    throw new Error(`Failed to save shipment: ${insertError.message}`);
  }

  console.log("New shipment inserted successfully with user_id:", userId, "company_id:", companyId, "warehouse_id:", warehouseId, newShipment);

  return {
    finalShipmentId: newShipment.id
  };
}
