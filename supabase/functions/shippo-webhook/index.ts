import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ShippoWebhookEvent {
  event: string;
  test: boolean;
  data: {
    object_id: string;
    object_updated: string;
    object_created: string;
    object_state: string;
    messages: string[];
    carrier: string;
    tracking_number: string;
    tracking_status: {
      object_created: string;
      object_id: string;
      status: string;
      status_details: string;
      status_date: string;
      substatus: {
        code: string;
        text: string;
        action_required: boolean;
      };
      location: {
        city: string;
        state: string;
        zip: string;
        country: string;
      };
    };
    tracking_history: Array<{
      object_created: string;
      object_id: string;
      status: string;
      status_details: string;
      status_date: string;
      location: {
        city: string;
        state: string;
        zip: string;
        country: string;
      };
    }>;
    eta: string;
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const webhookEvent: ShippoWebhookEvent = await req.json();
    console.log('Received Shippo webhook:', webhookEvent);

    // Only process tracking update events
    if (webhookEvent.event !== 'track_updated') {
      console.log('Not a tracking update event, ignoring');
      return new Response('OK', { status: 200, headers: corsHeaders });
    }

    const trackingData = webhookEvent.data;
    const trackingNumber = trackingData.tracking_number;

    console.log(`Processing Shippo tracking update for: ${trackingNumber}`);

    // Find the shipment in our database by tracking number
    const { data: shipments, error: shipmentError } = await supabase
      .from('shipments')
      .select('id, estimated_delivery_date, actual_delivery_date, status')
      .eq('tracking_number', trackingNumber)
      .limit(1);

    if (shipmentError) {
      console.error('Error finding shipment:', shipmentError);
      return new Response('Database error', { status: 500, headers: corsHeaders });
    }

    if (!shipments || shipments.length === 0) {
      console.log(`No shipment found for tracking number: ${trackingNumber}`);
      return new Response('Shipment not found', { status: 404, headers: corsHeaders });
    }

    const shipment = shipments[0];
    let estimatedDeliveryDate = shipment.estimated_delivery_date;
    let actualDeliveryDate = shipment.actual_delivery_date;
    let status = shipment.status;

    // Update estimated delivery date if available and not already set
    if (trackingData.eta && !estimatedDeliveryDate) {
      estimatedDeliveryDate = trackingData.eta;
    }

    // Check current tracking status for delivery
    const currentStatus = trackingData.tracking_status;
    if (currentStatus && 
        (currentStatus.status === 'DELIVERED' || 
         currentStatus.status_details?.toLowerCase().includes('delivered')) &&
        !actualDeliveryDate) {
      actualDeliveryDate = currentStatus.status_date;
      status = 'delivered';
      console.log(`Package delivered at: ${currentStatus.status_date}`);
    }

    // Also check tracking history for delivery events
    const deliveredEvent = trackingData.tracking_history?.find(event => 
      event.status === 'DELIVERED' || 
      event.status_details?.toLowerCase().includes('delivered')
    );

    if (deliveredEvent && !actualDeliveryDate) {
      actualDeliveryDate = deliveredEvent.status_date;
      status = 'delivered';
      console.log(`Package delivered at: ${deliveredEvent.status_date}`);
    }

    // Update the shipment if there are changes
    if (estimatedDeliveryDate !== shipment.estimated_delivery_date || 
        actualDeliveryDate !== shipment.actual_delivery_date ||
        status !== shipment.status) {

      const { error: updateError } = await supabase
        .from('shipments')
        .update({
          estimated_delivery_date: estimatedDeliveryDate,
          actual_delivery_date: actualDeliveryDate,
          status: status
        })
        .eq('id', shipment.id);

      if (updateError) {
        console.error('Error updating shipment:', updateError);
        return new Response('Update failed', { status: 500, headers: corsHeaders });
      }

      console.log(`Updated shipment ${shipment.id} with Shippo delivery information`);
    }

    return new Response('OK', { status: 200, headers: corsHeaders });

  } catch (error) {
    console.error('Error processing Shippo webhook:', error);
    return new Response('Internal error', { status: 500, headers: corsHeaders });
  }
});