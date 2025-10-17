
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

// Helper function to fetch ZPL content from EasyPost URL
async function fetchZplContent(zplUrl: string, apiKey: string): Promise<string | null> {
  try {
    console.log('Fetching ZPL content from:', zplUrl);
    const response = await fetch(zplUrl, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });
    
    if (response.ok) {
      const zplContent = await response.text();
      console.log('✅ Successfully fetched ZPL content');
      return zplContent;
    } else {
      console.warn('⚠️ Failed to fetch ZPL content:', response.status);
      return null;
    }
  } catch (error) {
    console.error('Error fetching ZPL content:', error);
    return null;
  }
}

export async function saveShipmentToDatabase(
  purchaseResponse: any,
  orderId: string | null,
  userId: string,
  provider: string = 'easypost',
  selectedBox?: any,
  originalCost?: number | null,
  markedUpCost?: number | null,
  apiKey?: string
) {
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
  
  // Determine the costs to store
  // Priority: 1) Passed in explicitly, 2) From API response
  let finalOriginalCost = originalCost;
  let finalMarkedUpCost = markedUpCost;
  
  if (provider === 'shippo') {
    const apiCost = parseFloat(purchaseResponse.rate?.amount || purchaseResponse.amount || '0');
    if (finalOriginalCost === null || finalOriginalCost === undefined) {
      finalOriginalCost = apiCost;
    }
    if (finalMarkedUpCost === null || finalMarkedUpCost === undefined) {
      finalMarkedUpCost = apiCost;
    }
    // Shippo response structure - the rate info comes from a nested rate object
    shipmentData = {
      easypost_id: purchaseResponse.object_id, // Store Shippo transaction ID in easypost_id field
      tracking_number: purchaseResponse.tracking_number,
      carrier: purchaseResponse.rate?.provider || purchaseResponse.carrier_account || 'Unknown',
      service: purchaseResponse.rate?.servicelevel?.name || purchaseResponse.servicelevel?.name || 'Unknown',
      status: 'purchased',
      label_url: purchaseResponse.label_url,
      tracking_url: purchaseResponse.tracking_url_provider,
      original_cost: finalOriginalCost,
      cost: finalMarkedUpCost,
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
      // Capture estimated delivery date from Shippo rate
      estimated_delivery_date: purchaseResponse.rate?.estimated_days ? 
        new Date(Date.now() + purchaseResponse.rate.estimated_days * 24 * 60 * 60 * 1000).toISOString() : 
        null,
      created_at: purchaseResponse.object_created,
      user_id: userId,
      company_id: companyId,
      warehouse_id: warehouseId,
      // Add selected box information
      actual_package_sku: selectedBox?.selectedBoxSku || selectedBox?.selectedBoxName || null,
      // Set actual_package_master_id to trigger inventory decrement
      actual_package_master_id: selectedBox?.selectedBoxId || selectedBox?.boxId || null
    };
  } else {
    const apiCost = parseFloat(purchaseResponse.selected_rate?.rate || '0');
    if (finalOriginalCost === null || finalOriginalCost === undefined) {
      finalOriginalCost = apiCost;
    }
    if (finalMarkedUpCost === null || finalMarkedUpCost === undefined) {
      finalMarkedUpCost = apiCost;
    }
    
    // EasyPost response structure (default)
    shipmentData = {
      easypost_id: purchaseResponse.id,
      tracking_number: purchaseResponse.tracking_code,
      carrier: purchaseResponse.selected_rate?.carrier,
      service: purchaseResponse.selected_rate?.service,
      status: 'purchased',
      label_url: purchaseResponse.postage_label?.label_url,
      label_zpl: purchaseResponse.postage_label?.label_zpl_url ? await fetchZplContent(purchaseResponse.postage_label.label_zpl_url, apiKey) : null,
      tracking_url: purchaseResponse.tracker?.public_url,
      original_cost: finalOriginalCost,
      cost: finalMarkedUpCost,
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
      // Capture estimated delivery date from EasyPost tracker
      estimated_delivery_date: purchaseResponse.tracker?.est_delivery_date || null,
      created_at: purchaseResponse.created_at,
      user_id: userId,
      company_id: companyId,
      warehouse_id: warehouseId,
      // Add selected box information
      actual_package_sku: selectedBox?.selectedBoxSku || selectedBox?.selectedBoxName || null,
      // Set actual_package_master_id to trigger inventory decrement
      actual_package_master_id: selectedBox?.selectedBoxId || selectedBox?.boxId || null
    };
  }

  console.log("Shipment data:", shipmentData);

  const { data: newShipment, error: insertError } = await supabaseService
    .from('shipments')
    .upsert(shipmentData, { 
      onConflict: 'easypost_id',
      ignoreDuplicates: false 
    })
    .select()
    .single();

  if (insertError) {
    console.error("Error upserting shipment:", insertError);
    throw new Error(`Failed to save shipment: ${insertError.message}`);
  }

  console.log("New shipment inserted successfully with user_id:", userId, "company_id:", companyId, "warehouse_id:", warehouseId, newShipment);

  return {
    finalShipmentId: newShipment.id
  };
}
