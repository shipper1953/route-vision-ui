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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
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
    const { error: transactionError } = await supabase
      .from('inventory_transactions')
      .insert({
        transaction_type: 'receive',
        item_id: itemId,
        to_location_id: stagingLocationId,
        quantity: quantityReceived,
        lot_number: lotNumber,
        serial_number: serialNumbers?.[0],
        reference_type: 'receiving_session',
        reference_id: sessionId,
        performed_by: user.id,
        company_id: userProfile.company_id,
        warehouse_id: stagingLocationId ? undefined : userProfile.warehouse_ids?.[0],
        notes: `Received ${quantityReceived} units in ${condition} condition`
      });

    if (transactionError) console.error('Transaction log error:', transactionError);

    // If no QC required and condition is good, create inventory level
    if (!qcRequired && condition === 'good') {
      const { error: inventoryError } = await supabase
        .from('inventory_levels')
        .insert({
          item_id: itemId,
          company_id: userProfile.company_id,
          warehouse_id: userProfile.warehouse_ids?.[0],
          location_id: stagingLocationId,
          quantity_on_hand: quantityReceived,
          lot_number: lotNumber,
          serial_number: serialNumbers?.[0],
          received_date: new Date().toISOString()
        })
        .select()
        .single();

      if (inventoryError) {
        // Try updating existing inventory
        await supabase.rpc('increment_inventory_level', {
          p_item_id: itemId,
          p_location_id: stagingLocationId,
          p_quantity: quantityReceived,
          p_lot_number: lotNumber
        });
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
