
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { saveShipmentToDatabase } from './shipmentService.ts'
import { linkShipmentToOrder } from './orderService.ts'
import { purchaseShippingLabel } from './easypostService.ts'
import { corsHeaders, handleCorsPreflightRequest, createErrorResponse, createSuccessResponse } from './corsUtils.ts'
import { authenticateUser, getUserCompany } from './authService.ts'
import { processWalletPayment } from './walletService.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const easyPostApiKey = Deno.env.get('EASYPOST_API_KEY')

console.log('EasyPost API key available in purchase-label function:', easyPostApiKey ? 'YES' : 'NO')

serve(async (req) => {
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest();
  }

  try {
    console.log('Processing purchase-label request...')
    
    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    console.log('Auth header present:', authHeader ? 'YES' : 'NO');
    
    const user = await authenticateUser(authHeader);
    const companyId = await getUserCompany(user.id);
    console.log('User company_id:', companyId);

    // Parse request body
    const { shipmentId, rateId, orderId } = await req.json();
    
    if (!shipmentId || !rateId) {
      return createErrorResponse('Missing required parameters: shipmentId and rateId are required', null, 400);
    }
    
    console.log(`Purchasing label for shipment ${shipmentId} with rate ${rateId}${orderId ? ` for order ${orderId}` : ''} for user ${user.id}`);
    
    if (!easyPostApiKey) {
      return createErrorResponse('EasyPost API key not configured', 'Please ensure EASYPOST_API_KEY is set in environment variables', 500);
    }

    // Purchase label from EasyPost
    console.log('Calling EasyPost API...');
    const purchaseResponse = await purchaseShippingLabel(shipmentId, rateId, easyPostApiKey);
    console.log('Label purchased successfully from EasyPost:', purchaseResponse.id);
    
    const labelCost = parseFloat(purchaseResponse.selected_rate?.rate || '0');
    console.log('Label cost:', labelCost);

    // Process wallet payment
    await processWalletPayment(companyId, labelCost, user.id, purchaseResponse.id);
    
    // Save shipment to database with user_id
    let finalShipmentId = null;
    try {
      const saveResult = await saveShipmentToDatabase(purchaseResponse, orderId, user.id);
      finalShipmentId = saveResult.finalShipmentId;
      console.log('Shipment saved with ID:', finalShipmentId);
    } catch (dbError) {
      console.error('Database save error:', dbError);
      // Don't fail the label purchase if database save fails
    }
    
    // If we have an orderId, link the shipment to the order
    if (orderId && finalShipmentId) {
      try {
        console.log(`Attempting to link order ${orderId} to shipment ${finalShipmentId}`);
        const supabaseService = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
          { auth: { persistSession: false } }
        );
        
        const linkSuccess = await linkShipmentToOrder(supabaseService, orderId, finalShipmentId);
        if (linkSuccess) {
          console.log(`✅ Successfully linked shipment ${purchaseResponse.id} to order ${orderId}`);
        } else {
          console.error(`❌ Failed to link shipment ${purchaseResponse.id} to order ${orderId}`);
        }
      } catch (linkError) {
        console.error('Error linking shipment to order:', linkError);
        // Don't fail the whole operation if linking fails
      }
    } else {
      console.log('Skipping order linking - missing data:', { orderId, finalShipmentId });
    }
    
    // Update shipment status in database using authenticated client
    try {
      const authenticatedClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        {
          global: {
            headers: { Authorization: authHeader },
          },
        }
      );
      
      const { error: updateError } = await authenticatedClient
        .from('shipments')
        .update({
          status: 'purchased',
          label_url: purchaseResponse.postage_label?.label_url,
          tracking_number: purchaseResponse.tracking_code,
        })
        .eq('easypost_id', shipmentId)
        .eq('user_id', user.id);
      
      if (updateError) {
        console.error('Error updating shipment in database:', updateError);
      } else {
        console.log('Successfully updated shipment status in database');
      }
    } catch (updateErr) {
      console.error('Failed to update shipment status:', updateErr);
    }
    
    console.log('Returning successful response');
    return createSuccessResponse(purchaseResponse);
    
  } catch (err) {
    console.error('Error processing request:', err);
    return createErrorResponse('Internal server error', err.message, 500);
  }
})
