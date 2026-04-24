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

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error && typeof (error as { message?: unknown }).message === 'string') {
    return (error as { message: string }).message;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return 'Unknown error';
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createErrorResponse(error: string, internalDetails?: unknown, status: number = 500, clientMessage?: string): Response {
  console.error('[Purchase Label Error]', error, internalDetails)
  const clientError = clientMessage ?? (status === 500
    ? 'An internal error occurred. Please contact support.'
    : error);
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

async function processWalletPayment(companyId: string, labelCost: number, userId: string, purchaseResponseId: string, orderId?: number | string | null) {
  if (labelCost <= 0) {
    console.log('No payment processing needed - cost is zero');
    return;
  }

  const supabaseService = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );

  const description = orderId 
    ? `Shipping label purchase - Order #${orderId}` 
    : 'Shipping label purchase';

  const { data, error } = await supabaseService.rpc('deduct_from_wallet', {
    p_wallet_id: null,
    p_company_id: companyId,
    p_amount: labelCost,
    p_user_id: userId,
    p_reference_id: purchaseResponseId,
    p_description: description
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

function parsePositiveAmount(value: unknown): number | null {
  const parsed = typeof value === 'string' || typeof value === 'number'
    ? parseFloat(String(value))
    : NaN;

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
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

  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const response = await fetch(`https://api.easypost.com/v2/shipments/${shipmentId}/buy`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        rate: { id: rateId },
        label_format: 'ZPL',
        file_format: 'ZPL',
        label_size: '4x6'
      }),
    })

    console.log(`📋 Buy request sent with ZPL format request (attempt ${attempt}/${maxAttempts})`)

    const responseText = await response.text()
    let responseData

    try {
      responseData = JSON.parse(responseText)
    } catch {
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

      const providerMessage = responseData.error?.message || 'Failed to purchase label';
      const isCarrierTimeout = responseData.error?.code === 'SHIPMENT.POSTAGE.TIMED_OUT' || /timed out/i.test(providerMessage);

      if (isCarrierTimeout && attempt < maxAttempts) {
        const delayMs = attempt * 1500;
        console.warn(`⏳ Carrier timeout from EasyPost, retrying in ${delayMs}ms...`);
        await sleep(delayMs);
        continue;
      }

      if (isCarrierTimeout) {
        throw new Error('Carrier timed out while purchasing this label. Please retry or choose another rate.');
      }

      throw new Error(providerMessage)
    }

    let zplContent = responseData.label_zpl || null;

    if (!zplContent && responseData.postage_label?.label_zpl_url) {
      console.log('🔄 Fetching ZPL from postage_label.label_zpl_url...');
      zplContent = await fetchZplContent(responseData.postage_label.label_zpl_url, apiKey);
    }

    if (!zplContent) {
      console.log('🔄 Attempting to retrieve ZPL via GET /label endpoint...');
      zplContent = await tryGetZplLabel(responseData.id, apiKey);
    }

    if (zplContent) {
      responseData.label_zpl = ensureZpl4x6Dimensions(zplContent);
      console.log('✅ ZPL content successfully retrieved and attached with 4x6 dimensions enforced');
    } else {
      console.warn('⚠️ Could not retrieve ZPL content. This may be due to test mode limitations or carrier restrictions.');
    }

    console.log('✅ Label purchased successfully')
    return responseData
  }

  throw new Error('Carrier timed out while purchasing this label. Please retry or choose another rate.');
}

async function tryGetZplLabel(shipmentId: string, apiKey: string): Promise<string | null> {
  try {
    console.log('🏷️  Attempting to retrieve ZPL format for shipment:', shipmentId);
    
    // Try to get ZPL from label endpoint with ZPL file format
    const zplResponse = await fetch(`https://api.easypost.com/v2/shipments/${shipmentId}/label?file_format=ZPL`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'text/plain, application/zpl',
      },
    });
    
    if (zplResponse.ok) {
      const zplContent = await zplResponse.text();
      
      if (zplContent && zplContent.trim().startsWith('^XA')) {
        console.log('✅ Successfully retrieved ZPL format via file_format param (length:', zplContent.length, ')');
        return zplContent;
      }
    }
    
    // Fallback: Try Accept header method
    const acceptResponse = await fetch(`https://api.easypost.com/v2/shipments/${shipmentId}/label`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/zpl',
      },
    });
    
    if (acceptResponse.ok) {
      const zplContent = await acceptResponse.text();
      
      if (zplContent && zplContent.trim().startsWith('^XA')) {
        console.log('✅ Successfully retrieved ZPL format via Accept header (length:', zplContent.length, ')');
        return zplContent;
      }
    }
    
    console.warn('⚠️  ZPL format not available - this is normal in test mode. Production mode with real carriers will provide ZPL.');
    return null;
  } catch (error) {
    console.error('❌ Error retrieving ZPL format:', error);
    return null;
  }
}

// ========== SHIPPO SERVICE ==========

function ensureZpl4x6Dimensions(zplCode: string): string {
  console.log('🔧 Ensuring ZPL code has 4x6 dimensions (812x1218 dots at 203 DPI)');
  
  // Step 1: Add newlines before EVERY ^command throughout the entire ZPL
  // This ensures all commands are properly separated
  let modifiedZpl = zplCode
    .replace(/(\^[A-Z]{2,3})/g, '\n$1')  // Split all commands
    .trim();
  
  // Step 2: Remove existing dimension/config commands
  modifiedZpl = modifiedZpl
    .split('\n')
    .filter(line => {
      const trimmed = line.trim();
      return !trimmed.match(/^\^PW\d+/) &&
             !trimmed.match(/^\^LL\d+/) &&
             !trimmed.match(/^\^LT\d+/) &&
             !trimmed.match(/^\^MT[DT]/) &&
             !trimmed.match(/^\^MN[NMYW]/) &&
             !trimmed.match(/^\^LS-?\d+/);
    })
    .join('\n');
  
  // Step 3: Insert our dimension commands right after ^XA
  const dimensionCommands = [
    '^MTD',    // Direct thermal media type
    '^MNY',    // Web/gap sensing media tracking
    '^LT0',    // Label Top 0
    '^PW812',  // Print Width 4"
    '^LL1218', // Label Length 6"
    '^LS0'     // Label Shift 0
  ].join('\n');
  
  modifiedZpl = modifiedZpl.replace(/\^XA/, `^XA\n${dimensionCommands}`);
  
  console.log('✅ ZPL configured for 4x6 with all commands properly separated');
  
  return modifiedZpl;
}

async function purchaseShippoLabel(shipmentId: string, rateId: string, apiKey: string) {
  console.log('🚚 === PURCHASING SHIPPO LABEL ===')
  console.log('🚚 Shipment ID:', shipmentId)
  console.log('🚚 Rate ID:', rateId)
  
  const requestBody = {
    rate: rateId,
    label_file_type: 'ZPLII',
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
    responseData = { raw_response: responseText, parse_error: getErrorMessage(err) }
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
  
  // Try to get ZPL content from Shippo response
  let zplContent = responseData.label_zpl || null;
  
  // If no direct ZPL content, try fetching from label_url if it's a ZPL file
  if (!zplContent && responseData.label_url && responseData.label_url.includes('.zpl')) {
    console.log('🔄 Fetching ZPL content from Shippo label URL...');
    try {
      const zplResponse = await fetch(responseData.label_url);
      if (zplResponse.ok) {
        const content = await zplResponse.text();
        if (content && content.trim().startsWith('^XA')) {
          zplContent = content;
          console.log('✅ ZPL content retrieved from Shippo label URL (length:', zplContent.length, ')');
        }
      }
    } catch (err) {
      console.warn('⚠️ Failed to fetch ZPL from Shippo label URL:', err);
    }
  }
  
  // Attach ZPL content to response and ensure 4x6 dimensions
  if (zplContent) {
    responseData.label_zpl = ensureZpl4x6Dimensions(zplContent);
    console.log('✅ Shippo ZPL content attached to response with 4x6 dimensions enforced');
  } else {
    console.warn('⚠️ No ZPL content available from Shippo - this may be due to test mode or carrier limitations');
  }
  
  console.log('✅ Shippo label purchased successfully')
  return responseData
}

async function purchaseEasyshipLabel(easyshipShipmentId: string | null, courierId: string, apiKey: string, shipmentPayload?: any) {
  console.log('🌐 === PURCHASING EASYSHIP LABEL ===')
  console.log('🌐 Easyship Shipment ID:', easyshipShipmentId)
  console.log('🌐 Courier ID (rate):', courierId)

  const configuredBaseUrl = Deno.env.get('EASYSHIP_API_BASE_URL')
  const easyshipBaseUrl = configuredBaseUrl
    ? configuredBaseUrl
    : apiKey.startsWith('sand_')
      ? 'https://public-api-sandbox.easyship.com'
      : 'https://public-api.easyship.com'
  console.log('🌐 Easyship base URL:', easyshipBaseUrl)

  // Easyship flow: if we don't already have a stored shipment, create one with selected courier, then buy label.
  // The simplest reliable path with the v2024-09 API is to POST /shipments with selected_courier_id, then POST /shipments/{id}/label

  let shipmentId = easyshipShipmentId;

  if (!shipmentId && shipmentPayload) {
    console.log('📦 Creating Easyship shipment before label purchase...');

    // Easyship v2024-09 shipment creation accepts courier selection via
    // courier_settings.courier_service_id. The rate-shopping payload includes
    // extra fields for the Rates API (and extra courier_settings keys like
    // show_courier_logo_url) that ShipmentCreate rejects, so rebuild a clean body.
    const {
      calculate_tax_and_duties: _ctd,
      courier_settings: _ignoredCourierSettings,
      courier_service_id: _csid,
      ...shipmentCreateBody
    } = shipmentPayload as Record<string, any>;

    const createBody = {
      ...shipmentCreateBody,
      courier_settings: {
        courier_service_id: courierId,
        allow_fallback: false,
        apply_shipping_rules: true,
      },
    };

    console.log('📦 Easyship create body keys:', Object.keys(createBody).join(','));

    const createRes = await fetch(`${easyshipBaseUrl}/2024-09/shipments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(createBody),
    });
    const createText = await createRes.text();
    let createData: any;
    try { createData = JSON.parse(createText); } catch { createData = { raw: createText }; }
    if (!createRes.ok) {
      console.error('❌ Easyship shipment create failed:', createData);
      throw new Error(createData.error?.message || createData.message || `Easyship create failed: ${createRes.status}`);
    }
    shipmentId = createData.shipment?.easyship_shipment_id || createData.easyship_shipment_id;
    console.log('✅ Created Easyship shipment:', shipmentId);
  }

  if (!shipmentId) {
    throw new Error('No Easyship shipment ID available for label purchase');
  }

  // Buy label — Easyship v2024-09 endpoint is singular: /shipments/{id}/label
  // Docs: https://developers.easyship.com/reference/shipment_labels_create
  const labelRes = await fetch(`${easyshipBaseUrl}/2024-09/shipments/${shipmentId}/label`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      // Courier is already locked on the shipment via courier_selection at create time.
      // ShipmentLabelCreate only accepts printing_options here.
      printing_options: {
        format: 'pdf',
        label: '4x6',
      },
    }),
  });
  const labelText = await labelRes.text();
  let labelData: any;
  try { labelData = JSON.parse(labelText); } catch { labelData = { raw: labelText }; }

  if (!labelRes.ok) {
    console.error('❌ Easyship label purchase failed:', labelData);
    throw new Error(labelData.error?.message || labelData.message || `Easyship label failed: ${labelRes.status}`);
  }

  let shipment = labelData.shipment || labelData;
  let label = shipment.label || labelData.label || {};

  // Easyship label generation is asynchronous. The POST /shipments/{id}/label
  // returns 202/shipment object with label fields still null. Poll until ready
  // or until the budget elapses (kept under edge-function timeout).
  let labelUrl: string | undefined = label.label_url || label.url;
  let trackingNumber: string | undefined = label.tracking_number || shipment.tracking_number;

  if (!labelUrl || !trackingNumber) {
    console.log('⏳ Easyship label not ready inline, polling shipment status...');
    const maxAttempts = 8;
    const intervalMs = 2000;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      await sleep(intervalMs);

      const pollRes = await fetch(`${easyshipBaseUrl}/2024-09/shipments/${shipmentId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json',
        },
      });
      const pollText = await pollRes.text();
      let pollData: any;
      try { pollData = JSON.parse(pollText); } catch { pollData = { raw: pollText }; }

      if (!pollRes.ok) {
        console.warn(`⚠️ Poll attempt ${attempt} failed (${pollRes.status})`);
        continue;
      }

      const polledShipment = pollData.shipment || pollData;
      const polledLabel = polledShipment.label || {};
      labelUrl = polledLabel.label_url || polledLabel.url;
      trackingNumber = polledLabel.tracking_number || polledShipment.tracking_number;

      console.log(`🔁 Poll ${attempt}/${maxAttempts} — label_url: ${labelUrl ? 'ready' : 'pending'}, tracking: ${trackingNumber ? 'ready' : 'pending'}, label_state: ${polledShipment.label_state || polledLabel.state || 'n/a'}`);

      if (labelUrl && trackingNumber) {
        shipment = polledShipment;
        label = polledLabel;
        break;
      }

      const labelState = polledShipment.label_state || polledLabel.state;
      if (labelState === 'failed') {
        const failMsg = polledLabel.error_message || polledShipment.label_error || 'Easyship label generation failed';
        throw new Error(failMsg);
      }
    }
  }

  const normalized = {
    easyship_shipment_id: shipment.easyship_shipment_id || shipmentId,
    tracking_number: trackingNumber,
    tracking_url: label.tracking_page_url || shipment.tracking_page_url,
    label_url: labelUrl,
    courier_name: shipment.courier_name || label.courier_name,
    service_name: shipment.service_name || label.service_name,
    total_charge: shipment.total_actual_charge || shipment.total_charge,
    currency: shipment.currency || 'USD',
    label_pending: !labelUrl,
    raw: labelData,
  };

  console.log('✅ Easyship label purchase complete. Label ready:', !!labelUrl, '| Tracking:', trackingNumber || 'pending');
  return normalized;
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
  
  if (provider === 'easyship') {
    const apiCost = parseFloat(String(purchaseResponse.total_charge || '0'));
    if (finalOriginalCost === null || finalOriginalCost === undefined) finalOriginalCost = apiCost;
    if (finalMarkedUpCost === null || finalMarkedUpCost === undefined) finalMarkedUpCost = apiCost;
    shipmentData = {
      easypost_id: purchaseResponse.easyship_shipment_id,
      tracking_number: purchaseResponse.tracking_number,
      carrier: purchaseResponse.courier_name || 'Easyship',
      service: purchaseResponse.service_name || purchaseResponse.courier_name || 'Standard',
      status: 'shipped',
      label_url: purchaseResponse.label_url,
      label_zpl: null,
      tracking_url: purchaseResponse.tracking_url,
      original_cost: finalOriginalCost,
      cost: finalMarkedUpCost,
      user_id: userId,
      company_id: companyId,
      warehouse_id: warehouseId,
      actual_package_sku: selectedBox?.selectedBoxSku || selectedBox?.selectedBoxName || null,
      actual_package_master_id: selectedBox?.selectedBoxId || selectedBox?.boxId || null,
    };
  } else if (provider === 'shippo') {
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
      status: 'shipped',
      label_url: purchaseResponse.label_url,
      label_zpl: purchaseResponse.label_zpl || null,
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
    
    // Try fetching from label_zpl_url if available
    if (!zplContent && purchaseResponse.postage_label?.label_zpl_url && apiKey) {
      console.log('🔄 Fetching ZPL from postage_label.label_zpl_url...');
      zplContent = await fetchZplContent(purchaseResponse.postage_label.label_zpl_url, apiKey);
    }
    
    // Try using the GET /label endpoint for ZPL
    if (!zplContent && apiKey) {
      console.log('🔄 Attempting to retrieve ZPL via GET /label endpoint...');
      zplContent = await tryGetZplLabel(purchaseResponse.id, apiKey);
    }
    
    shipmentData = {
      easypost_id: purchaseResponse.id,
      tracking_number: purchaseResponse.tracking_code,
      carrier: purchaseResponse.selected_rate?.carrier,
      service: purchaseResponse.selected_rate?.service,
      status: 'shipped',
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
    
    // Enrich items with Shopify variant IDs from items table
    let enrichedItems = packageMetadata?.items || [];
    if (enrichedItems.length > 0) {
      try {
        console.log('🔍 Fetching Shopify variant IDs for items...');
        const itemIds = enrichedItems
          .map((item: any) => item.itemId)
          .filter((id: any) => id);
        
        if (itemIds.length > 0) {
          const { data: itemsData } = await supabaseClient
            .from('items')
            .select('id, shopify_variant_id, shopify_variant_gid')
            .in('id', itemIds);
          
          if (itemsData) {
            enrichedItems = enrichedItems.map((item: any) => {
              const itemData = itemsData.find((i: any) => i.id === item.itemId);
              return {
                ...item,
                shopifyVariantId: itemData?.shopify_variant_gid || itemData?.shopify_variant_id || item.shopifyVariantId
              };
            });
            console.log('✅ Enriched items with Shopify variant IDs');
          }
        }
      } catch (enrichError) {
        console.warn('⚠️ Failed to enrich items with Shopify data:', enrichError);
        // Continue without enrichment
      }
    }
    
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
            items: enrichedItems,
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

async function reduceInventoryOnShipment(
  supabaseClient: any,
  params: {
    orderId: number;
    shippedItems?: Array<any>;
  },
) {
  const { orderId, shippedItems = [] } = params;
  const { data: orderData, error: orderError } = await supabaseClient
    .from('orders')
    .select('company_id, warehouse_id, items')
    .eq('id', orderId)
    .maybeSingle();

  if (orderError || !orderData) {
    console.warn(`⚠️ Unable to load order ${orderId} for shipment inventory deduction`, orderError);
    return;
  }

  const sourceItems = shippedItems.length > 0 ? shippedItems : (Array.isArray(orderData.items) ? orderData.items : []);
  const qtyByItemId = new Map<string, number>();
  const qtyBySku = new Map<string, number>();

  for (const item of sourceItems) {
    const qty = Number(item?.quantity || item?.qty || 0);
    if (qty <= 0) continue;

    const itemId = item?.itemId || item?.id || null;
    const sku = typeof item?.sku === 'string' ? item.sku : null;

    if (itemId) {
      qtyByItemId.set(itemId, (qtyByItemId.get(itemId) || 0) + qty);
    } else if (sku) {
      qtyBySku.set(sku, (qtyBySku.get(sku) || 0) + qty);
    }
  }

  if (qtyBySku.size > 0) {
    const skus = Array.from(qtyBySku.keys());
    const { data: skuItems } = await supabaseClient
      .from('items')
      .select('id, sku')
      .eq('company_id', orderData.company_id)
      .in('sku', skus);

    for (const mappedItem of skuItems || []) {
      const skuQty = qtyBySku.get(mappedItem.sku) || 0;
      if (skuQty > 0) {
        qtyByItemId.set(mappedItem.id, (qtyByItemId.get(mappedItem.id) || 0) + skuQty);
      }
    }
  }

  for (const [itemId, shipQty] of qtyByItemId.entries()) {
    let remainingToShip = shipQty;

    const { data: levels, error: levelsError } = await supabaseClient
      .from('inventory_levels')
      .select('id, quantity_on_hand, quantity_available, quantity_allocated, received_date')
      .eq('company_id', orderData.company_id)
      .eq('warehouse_id', orderData.warehouse_id)
      .eq('item_id', itemId)
      .gt('quantity_on_hand', 0)
      .order('received_date', { ascending: true });

    if (levelsError) {
      console.error(`❌ Failed loading inventory for shipped item ${itemId}:`, levelsError);
      continue;
    }

    for (const level of levels || []) {
      if (remainingToShip <= 0) break;

      const shipFromLevel = Math.min(level.quantity_on_hand || 0, remainingToShip);
      if (shipFromLevel <= 0) continue;

      const newOnHand = Math.max(0, (level.quantity_on_hand || 0) - shipFromLevel);
      const deallocateQty = Math.min(level.quantity_allocated || 0, shipFromLevel);
      const newAllocated = Math.max(0, (level.quantity_allocated || 0) - deallocateQty);
      const newAvailable = Math.max(0, newOnHand - newAllocated);

      const { error: updateError } = await supabaseClient
        .from('inventory_levels')
        .update({
          quantity_on_hand: newOnHand,
          quantity_allocated: newAllocated,
          quantity_available: newAvailable,
        })
        .eq('id', level.id);

      if (updateError) {
        console.error(`❌ Failed deducting shipped inventory on level ${level.id}:`, updateError);
        continue;
      }

      remainingToShip -= shipFromLevel;
    }

    if (remainingToShip > 0) {
      console.warn(`⚠️ Shipment deduction short for item ${itemId}. Requested ${shipQty}, deducted ${shipQty - remainingToShip}.`);
    } else {
      console.log(`✅ Deducted ${shipQty} shipped units for item ${itemId}`);
    }
  }
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
    const easyshipApiKey = Deno.env.get('EASYSHIP_API_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    
    if (!apiKey || !supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      return createErrorResponse('Configuration error', 'Required environment variables not configured', 500)
    }
    
    let requestBody
    try {
      const rawBody = await req.text()
      requestBody = JSON.parse(rawBody)
    } catch (parseError) {
      return createErrorResponse('Invalid JSON in request body', parseError instanceof Error ? parseError.message : String(parseError), 400)
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
      selectedItems = null,
      easyshipShipmentPayload = null
    } = requestBody
    
    if (!shipmentId || !rateId) {
      return createErrorResponse('Missing required parameters: shipmentId and rateId are required', null, 400)
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return createErrorResponse('Unauthorized', 'Missing bearer token', 401)
    }

    const token = authHeader.replace('Bearer ', '')

    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false }
    })

    const { data: authData, error: authError } = await userSupabase.auth.getUser(token)
    const authenticatedUserId = authData?.user?.id ?? null

    if (authError || !authenticatedUserId) {
      return createErrorResponse('Unauthorized', authError?.message || 'Unable to resolve authenticated user', 401)
    }
    
    console.log(`📦 Purchasing label for shipment ${shipmentId} using ${provider || 'easypost'}`)
    console.log('👤 Authenticated user resolved for purchase-label:', authenticatedUserId)

    let purchaseResponse
    try {
      if (provider === 'shippo') {
        if (!shippoApiKey) {
          return createErrorResponse('Shippo API key not configured', null, 500)
        }
        purchaseResponse = await purchaseShippoLabel(shipmentId, rateId, shippoApiKey)
      } else if (provider === 'easyship') {
        if (!easyshipApiKey) {
          return createErrorResponse('Easyship API key not configured', null, 500)
        }
        // Synthetic IDs from rate-shopping (e.g. "easyship_<ts>", "combined_<ts>")
        // are NOT real Easyship shipments. Treat them as null so we create one
        // from the forwarded payload before purchasing the label.
        const isSyntheticEasyshipId =
          !shipmentId ||
          shipmentId.startsWith('easyship_') ||
          shipmentId.startsWith('combined_') ||
          shipmentId.startsWith('local_');
        const easyshipShipmentId = isSyntheticEasyshipId ? null : shipmentId;
        if (isSyntheticEasyshipId && !easyshipShipmentPayload) {
          return createErrorResponse(
            'Easyship shipment payload missing',
            'A real Easyship shipment ID was not provided and no shipment payload was supplied to create one. Please retry from the rate selection step.',
            400
          )
        }
        purchaseResponse = await purchaseEasyshipLabel(easyshipShipmentId, rateId, easyshipApiKey, easyshipShipmentPayload)
      } else {
        purchaseResponse = await purchaseShippingLabel(shipmentId, rateId, apiKey)
        const zplContent = await tryGetZplLabel(shipmentId, apiKey)
        if (zplContent) {
          purchaseResponse.label_zpl = zplContent
        }
      }
    } catch (labelError) {
      const labelErrorMessage = getErrorMessage(labelError);
      console.error('❌ Label purchase failed:', labelError)
      const isCarrierTimeout = /timed out/i.test(labelErrorMessage);
      return createErrorResponse(
        'Failed to purchase label',
        labelErrorMessage,
        isCarrierTimeout ? 503 : 500,
        isCarrierTimeout ? labelErrorMessage : undefined,
      )
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
    
    let companyIdForWallet: string | null = null;

    try {
      const { data: authUserProfile, error: authUserError } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', authenticatedUserId)
        .maybeSingle();

      if (authUserError || !authUserProfile?.company_id) {
        return createErrorResponse('User profile not found or not assigned to a company', authUserError?.message, 400);
      }

      if (orderId) {
        const numericOrderId = typeof orderId === 'string' ? parseInt(orderId, 10) : orderId;
        const { data: orderRow } = await supabase
          .from('orders')
          .select('company_id')
          .eq('id', numericOrderId)
          .maybeSingle();
        if (orderRow?.company_id) {
          companyIdForWallet = orderRow.company_id;
          if (companyIdForWallet !== authUserProfile.company_id) {
            return createErrorResponse('Unauthorized', 'Order company does not match authenticated user company', 403);
          }
        }
      }

      if (!companyIdForWallet) {
        companyIdForWallet = authUserProfile.company_id;
      }

      const carrierCost = provider === 'shippo'
        ? parsePositiveAmount(purchaseResponse.rate?.amount || purchaseResponse.amount)
        : provider === 'easyship'
          ? parsePositiveAmount(purchaseResponse.total_charge)
          : parsePositiveAmount(purchaseResponse.selected_rate?.rate);
      let markedUpLabelCost = parsePositiveAmount(markedUpCost);
      
      if (markedUpLabelCost === null && carrierCost !== null && companyIdForWallet) {
        try {
          const { data: companyData } = await supabase
            .from('companies')
            .select('markup_type, markup_value')
            .eq('id', companyIdForWallet)
            .maybeSingle();
          
          if (companyData?.markup_value && companyData.markup_value > 0) {
            if (companyData.markup_type === 'percentage') {
              markedUpLabelCost = carrierCost + (carrierCost * companyData.markup_value / 100);
            } else if (companyData.markup_type === 'fixed') {
              markedUpLabelCost = carrierCost + companyData.markup_value;
            }
            console.log('📊 Server-side markup applied:', { carrierCost, markup: companyData.markup_value, type: companyData.markup_type, markedUpLabelCost });
          }
        } catch (markupErr) {
          console.error('Failed to fetch company markup, using carrier cost:', markupErr);
        }
      }
      
      const labelCost = markedUpLabelCost ?? carrierCost ?? 0;

      console.log('💳 Wallet charge amount resolved', {
        provider: provider || 'easypost',
        markedUpLabelCost,
        carrierCost,
        chargedAmount: labelCost,
        companyIdForWallet,
        authenticatedUserId,
      });
      
      const purchaseResponseId = provider === 'shippo' 
        ? purchaseResponse.object_id 
        : provider === 'easyship'
          ? purchaseResponse.easyship_shipment_id
          : purchaseResponse.id;

      if (!companyIdForWallet) {
        return createErrorResponse('Wallet processing failed', 'Company not resolved for wallet charge', 500)
      }

      await processWalletPayment(companyIdForWallet, labelCost, authenticatedUserId, purchaseResponseId, orderId);
      
    } catch (walletError) {
      console.error('❌ Wallet processing failed:', walletError)
      return createErrorResponse('Wallet processing failed', getErrorMessage(walletError), 500)
    }
    
    let finalShipmentId;
    try {
      const result = await saveShipmentToDatabase(
        purchaseResponse, 
        orderId, 
        authenticatedUserId, 
        provider || 'easypost', 
        selectedBox,
        originalCost,
        markedUpCost,
        provider === 'shippo' ? shippoApiKey : provider === 'easyship' ? easyshipApiKey : apiKey
      )
      finalShipmentId = result.finalShipmentId;
    } catch (saveError) {
      return createErrorResponse('Failed to save shipment to database', getErrorMessage(saveError), 500)
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
        
        // Update order status to shipped
        const numericId = typeof orderId === 'string' ? parseInt(orderId, 10) : orderId;
        if (!isNaN(numericId)) {
          await reduceInventoryOnShipment(supabase, {
            orderId: numericId,
            shippedItems: enhancedMetadata?.items || [],
          });

          const { error: statusError } = await supabase
            .from('orders')
            .update({ status: 'shipped' })
            .eq('id', numericId);
          if (statusError) {
            console.warn('⚠️ Failed to update order status to shipped:', statusError);
          } else {
            console.log(`✅ Updated order ${numericId} status to shipped`);
          }
        }
        
        const numericOrderId = typeof orderId === 'string' ? parseInt(orderId, 10) : orderId;
        const { data: orderData } = await supabase
          .from('orders')
          .select('company_id, shopify_store_id')
          .eq('id', numericOrderId)
          .single();
        
        if (orderData?.company_id) {
          // Check shopify_stores table for an active, fulfillment-enabled store
          // Prefer the store linked to the order; fall back to any active store for the company
          let shopifyStore: any = null;
          if (orderData.shopify_store_id) {
            const { data } = await supabase
              .from('shopify_stores')
              .select('id, is_active, fulfillment_sync_enabled')
              .eq('id', orderData.shopify_store_id)
              .maybeSingle();
            shopifyStore = data;
          }
          if (!shopifyStore) {
            const { data } = await supabase
              .from('shopify_stores')
              .select('id, is_active, fulfillment_sync_enabled')
              .eq('company_id', orderData.company_id)
              .eq('is_active', true)
              .limit(1)
              .maybeSingle();
            shopifyStore = data;
          }
          
          if (shopifyStore?.is_active && shopifyStore?.fulfillment_sync_enabled) {
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
      trackingNumber: provider === 'shippo'
        ? purchaseResponse.tracking_number
        : provider === 'easyship'
          ? purchaseResponse.tracking_number
          : purchaseResponse.tracking_code,
      labelUrl: provider === 'shippo'
        ? purchaseResponse.label_url
        : provider === 'easyship'
          ? purchaseResponse.label_url
          : purchaseResponse.postage_label?.label_url,
      trackingUrl: provider === 'shippo'
        ? purchaseResponse.tracking_url_provider
        : provider === 'easyship'
          ? purchaseResponse.tracking_url
          : purchaseResponse.tracker?.public_url,
      carrier: provider === 'shippo'
        ? purchaseResponse.rate?.provider
        : provider === 'easyship'
          ? purchaseResponse.courier_name
          : purchaseResponse.selected_rate?.carrier,
      service: provider === 'shippo'
        ? purchaseResponse.rate?.servicelevel?.name
        : provider === 'easyship'
          ? purchaseResponse.service_name
          : purchaseResponse.selected_rate?.service,
      provider: provider || 'easypost',
      labelPending: provider === 'easyship' ? !!purchaseResponse.label_pending : false
    })

  } catch (error) {
    console.error('Fatal error:', error)
    return createErrorResponse('An unexpected error occurred', getErrorMessage(error), 500)
  }
})
