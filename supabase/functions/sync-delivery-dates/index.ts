import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EasyPostTracker {
  id: string;
  tracking_code: string;
  status: string;
  est_delivery_date: string | null;
  tracking_details: Array<{
    status: string;
    datetime: string;
    description: string;
  }>;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get all shipments that need delivery status updates
    const { data: shipments, error: shipmentsError } = await supabase
      .from('shipments')
      .select('id, easypost_id, tracking_number, estimated_delivery_date, actual_delivery_date, status')
      .not('easypost_id', 'is', null)
      .neq('status', 'delivered');

    if (shipmentsError) {
      console.error('Error fetching shipments:', shipmentsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch shipments' }),
        { status: 500, headers: corsHeaders }
      );
    }

    console.log(`Found ${shipments?.length || 0} shipments to check`);

    const updates = [];
    const easypostApiKey = Deno.env.get('EASYPOST_API_KEY');

    if (!easypostApiKey) {
      return new Response(
        JSON.stringify({ error: 'EasyPost API key not configured' }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Process shipments in parallel batches of 5 for speed
    const batchSize = 5;
    for (let i = 0; i < (shipments || []).length; i += batchSize) {
      const batch = (shipments || []).slice(i, i + batchSize);
      const batchResults = await Promise.allSettled(
        batch.map(shipment => processShipment(shipment, easypostApiKey, supabase, updates))
      );
      for (const result of batchResults) {
        if (result.status === 'rejected') {
          console.error('Batch item failed:', result.reason);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        message: `Processed ${shipments?.length || 0} shipments, updated ${updates.length}`,
        updates 
      }),
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    console.error('Error in sync-delivery-dates function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: corsHeaders }
    );
  }
});

async function processShipment(
  shipment: any, 
  easypostApiKey: string, 
  supabase: any, 
  updates: any[]
) {
  console.log(`Processing shipment ${shipment.id} with EasyPost ID: ${shipment.easypost_id}`);
  
  const shipmentUrl = `https://api.easypost.com/v2/shipments/${shipment.easypost_id}`;
  const shipmentResponse = await fetch(shipmentUrl, {
    headers: {
      'Authorization': `Bearer ${easypostApiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!shipmentResponse.ok) {
    const errorText = await shipmentResponse.text();
    console.error(`Failed to fetch shipment for ${shipment.easypost_id}: ${shipmentResponse.status} - ${errorText}`);
    return;
  }

  const shipmentData = await shipmentResponse.json();
  const trackerId = shipmentData.tracker?.id;
  
  if (!trackerId) {
    console.log(`No tracker found for shipment ${shipment.easypost_id}`);
    return;
  }

  const trackerUrl = `https://api.easypost.com/v2/trackers/${trackerId}`;
  const trackerResponse = await fetch(trackerUrl, {
    headers: {
      'Authorization': `Bearer ${easypostApiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!trackerResponse.ok) {
    const errorText = await trackerResponse.text();
    console.error(`Failed to fetch tracker for ${shipment.easypost_id}: ${trackerResponse.status} - ${errorText}`);
    return;
  }

  const tracker: EasyPostTracker = await trackerResponse.json();
  console.log(`Tracker data for ${shipment.easypost_id}:`, {
    status: tracker.status,
    est_delivery_date: tracker.est_delivery_date,
    tracking_details_count: tracker.tracking_details?.length || 0
  });

  let estimatedDeliveryDate = shipment.estimated_delivery_date;
  let actualDeliveryDate = shipment.actual_delivery_date;
  let status = shipment.status || 'shipped';

  // Always update estimated delivery date from tracker if available
  if (tracker.est_delivery_date) {
    estimatedDeliveryDate = tracker.est_delivery_date;
  }

  // Map EasyPost tracker status to our status
  if (tracker.status === 'delivered') {
    status = 'delivered';
  } else if (tracker.status === 'in_transit' || tracker.status === 'out_for_delivery') {
    status = 'shipped';
  }

  // Check for delivery in tracking details
  const deliveredEvent = tracker.tracking_details?.find(detail => 
    detail.status === 'delivered' || 
    detail.description?.toLowerCase().includes('delivered')
  );

  if (deliveredEvent) {
    actualDeliveryDate = deliveredEvent.datetime;
    status = 'delivered';
    console.log(`Found delivery event: ${deliveredEvent.datetime}`);
  }

  // Update shipment if there are changes
  if (estimatedDeliveryDate !== shipment.estimated_delivery_date || 
      actualDeliveryDate !== shipment.actual_delivery_date ||
      status !== shipment.status) {
    
    console.log(`Updating shipment ${shipment.id} with:`, {
      estimated_delivery_date: estimatedDeliveryDate,
      actual_delivery_date: actualDeliveryDate,
      status: status
    });
    
    const { error: updateError } = await supabase
      .from('shipments')
      .update({
        estimated_delivery_date: estimatedDeliveryDate,
        actual_delivery_date: actualDeliveryDate,
        status: status
      })
      .eq('id', shipment.id);

    if (updateError) {
      console.error(`Failed to update shipment ${shipment.id}:`, updateError);
      return;
    }

    // Propagate to linked orders
    const orderUpdate: Record<string, any> = {};
    if (estimatedDeliveryDate) orderUpdate.estimated_delivery_date = estimatedDeliveryDate;
    if (actualDeliveryDate) orderUpdate.actual_delivery_date = actualDeliveryDate;
    orderUpdate.status = status;

    // Via direct shipment_id
    const { data: linkedOrders } = await supabase
      .from('orders')
      .select('id')
      .eq('shipment_id', shipment.id);

    for (const order of linkedOrders || []) {
      const { error } = await supabase.from('orders').update(orderUpdate).eq('id', order.id);
      if (!error) console.log(`✅ Propagated to order ${order.id}`);
    }

    // Via junction table
    const { data: junctionOrders } = await supabase
      .from('order_shipments')
      .select('order_id')
      .eq('shipment_id', shipment.id);

    for (const jo of junctionOrders || []) {
      const { error } = await supabase.from('orders').update(orderUpdate).eq('id', jo.order_id);
      if (!error) console.log(`✅ Propagated to order ${jo.order_id} via junction`);
    }

    updates.push({
      shipment_id: shipment.id,
      easypost_id: shipment.easypost_id,
      estimated_delivery_date: estimatedDeliveryDate,
      actual_delivery_date: actualDeliveryDate,
      status: status
    });
    console.log(`Successfully updated shipment ${shipment.id}`);
  } else {
    console.log(`No changes needed for shipment ${shipment.id}`);
  }
}