import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { 
      sessionId, 
      poLineId, 
      itemId, 
      quantityReceived, 
      stagingLocationId,
      lotNumber,
      serialNumbers,
      condition = 'good',
      qcRequired = false 
    } = await req.json();

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user) {
      throw new Error('Unauthorized');
    }

    // Get user's company
    const { data: userProfile } = await supabase
      .from('users')
      .select('company_id, warehouse_ids')
      .eq('id', user.id)
      .single();

    if (!userProfile) {
      throw new Error('User profile not found');
    }

    // Validate session belongs to user's company
    const { data: session } = await supabase
      .from('receiving_sessions')
      .select('company_id, warehouse_id')
      .eq('id', sessionId)
      .single();

    if (!session || session.company_id !== userProfile.company_id) {
      throw new Error('Unauthorized: Session does not belong to your company');
    }

    // Validate PO line belongs to user's company
    const { data: poLine } = await supabase
      .from('po_line_items')
      .select('purchase_orders!inner(company_id)')
      .eq('id', poLineId)
      .single();

    if (!poLine || poLine.purchase_orders.company_id !== userProfile.company_id) {
      throw new Error('Unauthorized: PO line does not belong to your company');
    }

    // Validate item belongs to user's company
    const { data: item } = await supabase
      .from('items')
      .select('company_id')
      .eq('id', itemId)
      .single();

    if (!item || item.company_id !== userProfile.company_id) {
      throw new Error('Unauthorized: Item does not belong to your company');
    }

    // Insert receiving line item
    const { data: receivingLineItem, error: insertError } = await supabase
      .from('receiving_line_items')
      .insert({
        session_id: sessionId,
        po_line_id: poLineId,
        item_id: itemId,
        quantity_received: quantityReceived,
        staging_location_id: stagingLocationId,
        lot_number: lotNumber,
        serial_numbers: serialNumbers,
        condition,
        qc_required: qcRequired,
        qc_status: qcRequired ? 'pending' : null
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Update PO line received quantity
    const { error: updateError } = await supabase.rpc('update_po_line_received_qty', {
      p_po_line_id: poLineId,
      p_quantity: quantityReceived
    });

    // Create inventory transaction
    const { data: transaction, error: transactionError } = await supabase
      .from('inventory_transactions')
      .insert({
        company_id: userProfile.company_id,
        warehouse_id: session.warehouse_id,
        transaction_type: 'receive',
        item_id: itemId,
        to_location_id: stagingLocationId,
        quantity: quantityReceived,
        lot_number: lotNumber,
        serial_number: serialNumbers?.[0],
        reference_type: 'receiving_session',
        reference_id: sessionId,
        performed_by: user.id,
        notes: `Received ${quantityReceived} units in ${condition} condition`
      })
      .select()
      .single();

    if (transactionError) {
      console.error('Transaction log error:', transactionError);
    }

    // If no QC required and condition is good, upsert inventory level
    if (!qcRequired && condition === 'good') {
      // Upsert inventory level using proper conflict resolution
      const { error: inventoryError } = await supabase
        .from('inventory_levels')
        .select('id, quantity_on_hand, quantity_available')
        .eq('warehouse_id', session.warehouse_id)
        .eq('item_id', itemId)
        .eq('location_id', stagingLocationId)
        .is('lot_number', lotNumber || null)
        .is('serial_number', serialNumbers?.[0] || null)
        .maybeSingle()
        .then(async ({ data: existingLevel, error: selectError }) => {
          if (selectError) throw selectError;

          if (existingLevel) {
            // Update existing inventory level
            return await supabase
              .from('inventory_levels')
              .update({
                quantity_on_hand: existingLevel.quantity_on_hand + quantityReceived,
                quantity_available: existingLevel.quantity_available + quantityReceived,
                condition,
                updated_at: new Date().toISOString()
              })
              .eq('id', existingLevel.id);
          } else {
            // Create new inventory level
            return await supabase
              .from('inventory_levels')
              .insert({
                company_id: userProfile.company_id,
                warehouse_id: session.warehouse_id,
                location_id: stagingLocationId,
                item_id: itemId,
                quantity_on_hand: quantityReceived,
                quantity_available: quantityReceived,
                quantity_allocated: 0,
                lot_number: lotNumber,
                serial_number: serialNumbers?.[0],
                condition,
                received_date: new Date().toISOString()
              });
          }
        });

      if (inventoryError) {
        console.error('Inventory level upsert error:', inventoryError);
      }

      // Sync to Shopify if transaction was created successfully
      if (transaction) {
        try {
          await supabase.functions.invoke('shopify-sync-receipt-to-shopify', {
            body: {
              transactionId: transaction.id,
              itemId,
              quantityReceived,
              warehouseId: session.warehouse_id,
              locationId: stagingLocationId
            }
          });
          console.log('Initiated Shopify sync for transaction:', transaction.id);
        } catch (syncError) {
          console.error('Error initiating Shopify sync:', syncError);
          // Don't fail the receipt if Shopify sync fails
        }
      }
    }

    // Check if PO is fully received and auto-close
    const { data: poLineCheck } = await supabase
      .from('po_line_items')
      .select('quantity_ordered, quantity_received, po_id')
      .eq('id', poLineId)
      .single();

    if (poLineCheck && poLineCheck.quantity_received >= poLineCheck.quantity_ordered) {
      // Check if all lines on this PO are fully received
      const { data: allPoLines } = await supabase
        .from('po_line_items')
        .select('quantity_ordered, quantity_received')
        .eq('po_id', poLineCheck.po_id);

      const allReceived = allPoLines?.every(line => 
        line.quantity_received >= line.quantity_ordered
      );

      if (allReceived) {
        // Update PO status to received
        await supabase
          .from('purchase_orders')
          .update({ status: 'received' })
          .eq('id', poLineCheck.po_id);

        console.log('PO fully received, status updated to received:', poLineCheck.po_id);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      receivingLineItem 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error receiving inbound:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
