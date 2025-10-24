import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

console.log('=== PURCHASE-LABEL v10.0 CONSOLIDATED ===')

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
}

// ========== VALIDATION SCHEMAS ==========

const PurchaseLabelSchema = z.object({
  shipmentId: z.string().min(1, 'Shipment ID required').max(100),
  rateId: z.string().min(1, 'Rate ID required').max(100),
  companyId: z.string().uuid('Invalid company ID format').optional(),
  orderId: z.number().int().positive().optional(),
  packageIndex: z.number().int().min(0).optional(),
  selectedItems: z.array(
    z.object({
      sku: z.string().max(100),
      name: z.string().max(255),
      quantity: z.number().int().positive().max(10000),
      weight: z.number().positive().optional(),
      dimensions: z.object({
        length: z.number().positive(),
        width: z.number().positive(),
        height: z.number().positive()
      }).optional()
    })
  ).optional()
});

function sanitizeString(str: string | null | undefined, maxLength: number = 255): string | null {
  if (!str) return null;
  return str.trim().slice(0, maxLength);
}

function sanitizePhoneNumber(phone: string | undefined): string {
  if (!phone) return '5555555555';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length < 10) {
    return cleaned.padEnd(10, '5');
  }
  return cleaned;
}

// ========== HELPER FUNCTIONS ==========

function createErrorResponse(error: string, internalDetails?: any, status: number = 500): Response {
  console.error('[Purchase Label Error]', error, internalDetails)
  const clientError = status === 500 
    ? 'An internal error occurred. Please contact support.'
    : error;
  return new Response(JSON.stringify({ error: clientError }), {
    headers: corsHeaders,
    status,
  })
}

function createSuccessResponse(data: any): Response {
  console.log('🟢 Creating success response')
  return new Response(JSON.stringify(data), {
    headers: corsHeaders,
    status: 200,
  })
}

// ========== WALLET SERVICE ==========

async function processWalletPayment(companyId: string, labelCost: number, userId: string, purchaseResponseId: string) {
  if (labelCost <= 0) {
    console.log('No payment processing needed - cost is zero');
    return;
  }

  const supabaseService = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );

  const { data, error } = await supabaseService.rpc('deduct_from_wallet', {
    p_wallet_id: null,
    p_company_id: companyId,
    p_amount: labelCost,
    p_user_id: userId,
    p_reference_id: purchaseResponseId,
    p_description: 'Shipping label purchase'
  });

  if (error) {
    console.error('Wallet deduction error:', error);
    throw new Error(`Failed to process wallet payment: ${error.message}`);
  }

  if (!data || data.length === 0) {
    throw new Error('Wallet deduction failed - no response');
  }

  const result = data[0];
  
  if (!result.success) {
    console.error('Wallet deduction failed:', result.message);
    throw new Error(result.message);
  }

  console.log(`✅ Deducted $${labelCost.toFixed(2)} from wallet. New balance: $${result.new_balance.toFixed(2)}`);
}

// ========== EASYPOST SERVICE ==========

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

async function ensureValidPhoneNumbers(shipmentId: string, apiKey: string): Promise<void> {
  console.log('📞 Ensuring shipment has valid phone numbers...');
  
  const shipmentResponse = await fetch(`https://api.easypost.com/v2/shipments/${shipmentId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
  });
  
  if (!shipmentResponse.ok) {
    console.error('❌ Failed to fetch shipment details');
    return;
  }
  
  const shipment = await shipmentResponse.json();
  const needsUpdate: any = {};
  
  const fromPhone = shipment.from_address?.phone;
  const sanitizedFromPhone = sanitizePhoneNumber(fromPhone);
  if (fromPhone !== sanitizedFromPhone) {
    needsUpdate.from_address = {
      ...shipment.from_address,
      phone: sanitizedFromPhone
    };
    console.log(`📞 Fixing from_address phone: ${fromPhone} -> ${sanitizedFromPhone}`);
  }
  
  const toPhone = shipment.to_address?.phone;
  const sanitizedToPhone = sanitizePhoneNumber(toPhone);
  if (toPhone !== sanitizedToPhone) {
    needsUpdate.to_address = {
      ...shipment.to_address,
      phone: sanitizedToPhone
    };
    console.log(`📞 Fixing to_address phone: ${toPhone} -> ${sanitizedToPhone}`);
  }
  
  if (Object.keys(needsUpdate).length > 0) {
    console.log('📝 Updating shipment with valid phone numbers...');
    const updateResponse = await fetch(`https://api.easypost.com/v2/shipments/${shipmentId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(needsUpdate),
    });
    
    if (updateResponse.ok) {
      console.log('✅ Phone numbers updated successfully');
    } else {
      const errorText = await updateResponse.text();
      console.error('❌ Failed to update phone numbers:', errorText);
    }
  } else {
    console.log('✅ Phone numbers are already valid');
  }
}

async function purchaseShippingLabel(shipmentId: string, rateId: string, apiKey: string) {
  console.log('🚚 Purchasing label for shipment:', shipmentId, 'with rate:', rateId)
  
  await ensureValidPhoneNumbers(shipmentId, apiKey);
  
  const response = await fetch(`https://api.easypost.com/v2/shipments/${shipmentId}/buy`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ 
      rate: { id: rateId },
      label_format: 'ZPL'
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
    console.error('❌ EasyPost API error:', responseData)
    
    if (responseData.error?.code === 'SHIPMENT.POSTAGE.EXISTS') {
      console.log('⚠️ Postage already exists, retrieving existing shipment data')
      try {
        const existingResponse = await fetch(`https://api.easypost.com/v2/shipments/${shipmentId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        })
        
        if (existingResponse.ok) {
          const existingData = await existingResponse.json()
          console.log('✅ Retrieved existing shipment data successfully')
          return existingData
        }
      } catch (retrieveError) {
        console.error('❌ Failed to retrieve existing shipment:', retrieveError)
      }
    }
    
    throw new Error(responseData.error?.message || 'Failed to purchase label')
  }
  
  // Try to get ZPL content
  if (!responseData.label_zpl && responseData.postage_label?.label_zpl_url) {
    console.log('🔄 Fetching ZPL from postage_label.label_zpl_url...');
    const zplContent = await fetchZplContent(responseData.postage_label.label_zpl_url, apiKey);
    if (zplContent) {
      responseData.label_zpl = zplContent;
    }
  }
  
  console.log('✅ Label purchased successfully')
  return responseData
}

async function tryGetZplLabel(shipmentId: string, apiKey: string): Promise<string | null> {
  try {
    console.log('🏷️  Attempting to retrieve ZPL format for shipment:', shipmentId);
    
    const response = await fetch(`https://api.easypost.com/v2/shipments/${shipmentId}/label`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/zpl',
      },
    });
    
    if (!response.ok) {
      console.warn('⚠️  ZPL format not available for this carrier:', response.status);
      return null;
    }
    
    const zplContent = await response.text();
    
    if (zplContent.trim().startsWith('^XA')) {
      console.log('✅ Successfully retrieved ZPL format (length:', zplContent.length, ')');
      return zplContent;
    } else {
      console.warn('⚠️  Response is not valid ZPL format');
      return null;
    }
  } catch (error) {
    console.error('❌ Error retrieving ZPL format:', error);
    return null;
  }
}

// ========== SHIPPO SERVICE ==========

async function purchaseShippoLabel(shipmentId: string, rateId: string, apiKey: string) {
  console.log('🚚 === PURCHASING SHIPPO LABEL ===')
  console.log('🚚 Shipment ID:', shipmentId)
  console.log('🚚 Rate ID:', rateId)
  
  const requestBody = {
    rate: rateId,
    async: false
  };
  
  console.log('📦 Shippo transaction request body:', JSON.stringify(requestBody, null, 2))
  
  const response = await fetch(`https://api.goshippo.com/transactions/`, {
    method: 'POST',
    headers: {
      'Authorization': `ShippoToken ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  })
  
  const responseText = await response.text()
  let responseData
  
  try {
    responseData = JSON.parse(responseText)
  } catch (err) {
    console.error('❌ Failed to parse Shippo response as JSON:', err)
    responseData = { raw_response: responseText, parse_error: err.message }
  }
  
  if (!response.ok) {
    console.error('❌ Shippo API HTTP error:', responseData)
    throw new Error(responseData.detail || responseData.message || `Shippo API error: ${response.status}`)
  }
  
  if (responseData.status === 'ERROR') {
    const errorMessages = responseData.messages?.map((msg: any) => msg.text).join('; ') || 'Unknown error';
    throw new Error(`Shippo label creation failed: ${errorMessages}`)
  }
  
  if (!responseData.label_url) {
    const warningMessages = responseData.messages?.map((msg: any) => msg.text).join('; ') || 'No additional details';
    throw new Error(`Shippo label was created but no label URL was provided. Messages: ${warningMessages}`)
  }
  
  console.log('✅ Shippo label purchased successfully')
  return responseData
}

// ========== SHIPMENT SERVICE ==========

async function saveShipmentToDatabase(
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

  let shipmentData;
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
    shipmentData = {
      easypost_id: purchaseResponse.object_id,
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
      estimated_delivery_date: purchaseResponse.rate?.estimated_days ? 
        new Date(Date.now() + purchaseResponse.rate.estimated_days * 24 * 60 * 60 * 1000).toISOString() : 
        null,
      created_at: purchaseResponse.object_created,
      user_id: userId,
      company_id: companyId,
      warehouse_id: warehouseId,
      actual_package_sku: selectedBox?.selectedBoxSku || selectedBox?.selectedBoxName || null,
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
    
    let zplContent = purchaseResponse.label_zpl || null;
    
    if (!zplContent && purchaseResponse.postage_label?.label_zpl_url && apiKey) {
      console.log('🔄 Fetching ZPL from postage_label.label_zpl_url...');
      zplContent = await fetchZplContent(purchaseResponse.postage_label.label_zpl_url, apiKey);
    }
    
    shipmentData = {
      easypost_id: purchaseResponse.id,
      tracking_number: purchaseResponse.tracking_code,
      carrier: purchaseResponse.selected_rate?.carrier,
      service: purchaseResponse.selected_rate?.service,
      status: 'purchased',
      label_url: purchaseResponse.postage_label?.label_url,
      label_zpl: zplContent,
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
      estimated_delivery_date: purchaseResponse.tracker?.est_delivery_date || null,
      created_at: purchaseResponse.created_at,
      user_id: userId,
      company_id: companyId,
      warehouse_id: warehouseId,
      actual_package_sku: selectedBox?.selectedBoxSku || selectedBox?.selectedBoxName || null,
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

  console.log("Shipment inserted successfully:", newShipment);

  return {
    finalShipmentId: newShipment.id
  };
}

// ========== ORDER SERVICE ==========

async function linkShipmentToOrder(
  supabaseClient: any, 
  orderId: string, 
  finalShipmentId: number,
  packageMetadata?: {
    packageIndex: number;
    items: Array<any>;
    boxData: { name: string; length: number; width: number; height: number };
    weight: number;
  }
) {
  console.log(`🔗 Linking order ${orderId} to shipment ${finalShipmentId}`);
  if (packageMetadata) {
    console.log(`📦 Package metadata:`, packageMetadata);
  }
  
  let orderUpdateSuccess = false;
  let foundOrder = null;
  
  if (!isNaN(Number(orderId))) {
    console.log(`📝 Strategy 1: Searching for order with numeric id: ${orderId}`);
    const { data: orderById, error: searchError1 } = await supabaseClient
      .from('orders')
      .select('id, order_id, customer_name, status, shipment_id')
      .eq('id', parseInt(orderId, 10))
      .maybeSingle();
    
    if (!searchError1 && orderById) {
      foundOrder = orderById;
      console.log(`✅ Found order by numeric id:`, foundOrder);
    }
  }
  
  if (!foundOrder) {
    console.log(`📝 Strategy 2: Searching for order with exact order_id: "${orderId}"`);
    const { data: orderByOrderId, error: searchError2 } = await supabaseClient
      .from('orders')
      .select('id, order_id, customer_name, status, shipment_id')
      .eq('order_id', orderId)
      .maybeSingle();
    
    if (!searchError2 && orderByOrderId) {
      foundOrder = orderByOrderId;
      console.log(`✅ Found order by exact order_id match:`, foundOrder);
    }
  }
  
  if (!foundOrder) {
    console.log(`📝 Strategy 3: Searching for order with case-insensitive order_id: "${orderId}"`);
    const { data: orderByCaseInsensitive, error: searchError3 } = await supabaseClient
      .from('orders')
      .select('id, order_id, customer_name, status, shipment_id')
      .ilike('order_id', orderId)
      .maybeSingle();
    
    if (!searchError3 && orderByCaseInsensitive) {
      foundOrder = orderByCaseInsensitive;
      console.log(`✅ Found order by case-insensitive search:`, foundOrder);
    }
  }
  
  if (foundOrder) {
    console.log(`🔄 Processing order ${foundOrder.id} (order_id: ${foundOrder.order_id})`);
    
    if (!foundOrder.shipment_id) {
      console.log(`📝 Setting initial shipment_id on order`);
      const { error: updateError } = await supabaseClient
        .from('orders')
        .update({ 
          shipment_id: finalShipmentId
        })
        .eq('id', foundOrder.id);
      
      if (updateError) {
        console.error(`❌ Failed to update order:`, updateError);
      } else {
        console.log(`✅ Set shipment_id ${finalShipmentId} on order`);
        orderUpdateSuccess = true;
      }
    } else {
      console.log(`ℹ️ Order already has shipment_id ${foundOrder.shipment_id}, keeping it`);
      orderUpdateSuccess = true;
    }
    
    console.log(`🔗 Creating order_shipments link record for package ${packageMetadata?.packageIndex || 0}...`);
    
    let insertAttempts = 0;
    const maxAttempts = 3;
    let linkError = null;

    while (insertAttempts < maxAttempts) {
      insertAttempts++;
      console.log(`📝 Insert attempt ${insertAttempts} of ${maxAttempts}`);
      
      const { error } = await supabaseClient
        .from('order_shipments')
        .insert({
          order_id: foundOrder.id,
          shipment_id: finalShipmentId,
          package_index: packageMetadata?.packageIndex || 0,
          package_info: packageMetadata ? {
            boxName: packageMetadata.boxData?.name,
            boxDimensions: packageMetadata.boxData ? {
              length: packageMetadata.boxData.length,
              width: packageMetadata.boxData.width,
              height: packageMetadata.boxData.height
            } : null,
            items: packageMetadata.items || [],
            weight: packageMetadata.weight
          } : null
        });
      
      if (!error) {
        console.log(`✅ Created order_shipments link record on attempt ${insertAttempts}`);
        break;
      }
      
      linkError = error;
      console.error(`❌ Attempt ${insertAttempts} failed:`, error);
      
      if (insertAttempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    if (linkError) {
      console.error(`❌ All ${maxAttempts} attempts failed to create order_shipments record`);
      orderUpdateSuccess = false;
      throw new Error(`Failed to create order_shipments record: ${linkError.message}`);
    }
  } else {
    console.error(`❌ Order ${orderId} not found in database using any strategy`);
  }
  
  return orderUpdateSuccess;
}

// ========== MAIN HANDLER ==========

serve(async (req) => {
  console.log('=== PURCHASE LABEL FUNCTION START ===')
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 })
  }

  try {
    const apiKey = Deno.env.get('EASYPOST_API_KEY')
    const shippoApiKey = Deno.env.get('SHIPPO_API_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!apiKey || !supabaseUrl || !supabaseServiceKey) {
      return createErrorResponse('Configuration error', 'Required environment variables not configured', 500)
    }
    
    let requestBody
    try {
      const rawBody = await req.text()
      requestBody = JSON.parse(rawBody)
    } catch (parseError) {
      return createErrorResponse('Invalid JSON in request body', parseError.message, 400)
    }
    
    const { 
      shipmentId, 
      rateId, 
      orderId, 
      provider, 
      selectedBox,
      originalCost = null,
      markedUpCost = null,
      packageMetadata = null,
      selectedItems = null
    } = requestBody
    
    if (!shipmentId || !rateId) {
      return createErrorResponse('Missing required parameters: shipmentId and rateId are required', null, 400)
    }
    
    console.log(`📦 Purchasing label for shipment ${shipmentId} using ${provider || 'easypost'}`)

    let purchaseResponse
    try {
      if (provider === 'shippo') {
        if (!shippoApiKey) {
          return createErrorResponse('Shippo API key not configured', null, 500)
        }
        purchaseResponse = await purchaseShippoLabel(shipmentId, rateId, shippoApiKey)
      } else {
        purchaseResponse = await purchaseShippingLabel(shipmentId, rateId, apiKey)
        const zplContent = await tryGetZplLabel(shipmentId, apiKey)
        if (zplContent) {
          purchaseResponse.label_zpl = zplContent
        }
      }
    } catch (labelError) {
      console.error('❌ Label purchase failed:', labelError)
      return createErrorResponse('Failed to purchase label', labelError.message, 500)
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
    
    let companyIdForWallet: string | null = null;
    const defaultUserId = "00be6af7-a275-49fe-842f-1bd402bf113b"

    try {
      if (orderId) {
        const numericOrderId = typeof orderId === 'string' ? parseInt(orderId, 10) : orderId;
        const { data: orderRow } = await supabase
          .from('orders')
          .select('company_id')
          .eq('id', numericOrderId)
          .maybeSingle();
        if (orderRow?.company_id) {
          companyIdForWallet = orderRow.company_id;
        }
      }

      if (!companyIdForWallet) {
        const { data: userProfile, error: userError } = await supabase
          .from('users')
          .select('company_id')
          .eq('id', defaultUserId)
          .maybeSingle();

        if (userError || !userProfile?.company_id) {
          return createErrorResponse('User profile not found or not assigned to a company', null, 400);
        }
        companyIdForWallet = userProfile.company_id;
      }

      const labelCost = provider === 'shippo' 
        ? parseFloat(purchaseResponse.rate?.amount || '0')
        : parseFloat(purchaseResponse.selected_rate?.rate || '0');
      
      const purchaseResponseId = provider === 'shippo' 
        ? purchaseResponse.object_id 
        : purchaseResponse.id;

      await processWalletPayment(companyIdForWallet, labelCost, defaultUserId, purchaseResponseId);
      
    } catch (walletError) {
      console.error('❌ Wallet processing failed:', walletError)
      return createErrorResponse('Wallet processing failed', walletError.message, 500)
    }
    
    let finalShipmentId;
    try {
      const result = await saveShipmentToDatabase(
        purchaseResponse, 
        orderId, 
        defaultUserId, 
        provider || 'easypost', 
        selectedBox,
        originalCost,
        markedUpCost,
        provider === 'shippo' ? shippoApiKey : apiKey
      )
      finalShipmentId = result.finalShipmentId;
    } catch (saveError) {
      return createErrorResponse('Failed to save shipment to database', saveError.message, 500)
    }
    
    if (orderId && finalShipmentId) {
      try {
        let enhancedMetadata = packageMetadata;
        
        if (!enhancedMetadata?.items?.length && selectedItems?.length > 0) {
          console.log('📦 Building metadata from selectedItems');
          enhancedMetadata = {
            packageIndex: packageMetadata?.packageIndex || 0,
            items: selectedItems,
            boxData: {
              name: selectedBox?.selectedBoxName || selectedBox?.boxName || 'Unknown',
              length: selectedBox?.length || 0,
              width: selectedBox?.width || 0,
              height: selectedBox?.height || 0
            },
            weight: packageMetadata?.weight || 0
          };
        }
        
        await linkShipmentToOrder(supabase, orderId.toString(), finalShipmentId, enhancedMetadata);
        
        const numericOrderId = typeof orderId === 'string' ? parseInt(orderId, 10) : orderId;
        const { data: orderData } = await supabase
          .from('orders')
          .select('company_id')
          .eq('id', numericOrderId)
          .single();
        
        if (orderData?.company_id) {
          const { data: companyData } = await supabase
            .from('companies')
            .select('settings')
            .eq('id', orderData.company_id)
            .single();
          
          const shopifySettings = companyData?.settings?.shopify;
          
          if (shopifySettings?.connected && shopifySettings?.fulfillment_sync_enabled) {
            console.log('📤 Triggering Shopify fulfillment update...');
            
            const trackingNumber = provider === 'shippo' 
              ? purchaseResponse.tracking_number 
              : purchaseResponse.tracking_code;
            const trackingUrl = provider === 'shippo'
              ? purchaseResponse.tracking_url_provider
              : purchaseResponse.tracker?.public_url;
            const carrier = provider === 'shippo'
              ? (purchaseResponse.rate?.provider || 'Unknown')
              : purchaseResponse.selected_rate?.carrier;
            const service = provider === 'shippo'
              ? (purchaseResponse.rate?.servicelevel?.name || 'Unknown')
              : purchaseResponse.selected_rate?.service;
            
            try {
              await supabase.functions.invoke('shopify-update-fulfillment', {
                body: {
                  shipmentId: finalShipmentId,
                  status: 'purchased',
                  trackingNumber: trackingNumber,
                  trackingUrl: trackingUrl,
                  carrier: carrier,
                  service: service
                }
              });
              console.log('✅ Shopify fulfillment update triggered successfully');
            } catch (shopifyError) {
              console.error('⚠️ Shopify fulfillment update failed (non-fatal):', shopifyError);
            }
          }
        }
      } catch (linkError) {
        console.error('⚠️ Order linking failed:', linkError)
      }
    }
    
    return createSuccessResponse({
      shipmentId: finalShipmentId,
      trackingNumber: provider === 'shippo' ? purchaseResponse.tracking_number : purchaseResponse.tracking_code,
      labelUrl: provider === 'shippo' ? purchaseResponse.label_url : purchaseResponse.postage_label?.label_url,
      trackingUrl: provider === 'shippo' ? purchaseResponse.tracking_url_provider : purchaseResponse.tracker?.public_url,
      carrier: provider === 'shippo' ? purchaseResponse.rate?.provider : purchaseResponse.selected_rate?.carrier,
      service: provider === 'shippo' ? purchaseResponse.rate?.servicelevel?.name : purchaseResponse.selected_rate?.service,
      provider: provider || 'easypost'
    })

  } catch (error) {
    console.error('Fatal error:', error)
    return createErrorResponse('An unexpected error occurred', error.message, 500)
  }
})