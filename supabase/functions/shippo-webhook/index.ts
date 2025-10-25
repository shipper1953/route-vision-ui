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
    
    // Store all tracking events for timeline
    if (trackingData.tracking_history && trackingData.tracking_history.length > 0) {
      const trackingEvents = trackingData.tracking_history.map((event: any) => ({
        shipment_id: shipment.id,
        provider: 'shippo',
        event_type: mapShippoStatusToEventType(event.status, event.status_details),
        status: event.status,
        status_detail: event.status_details,
        message: event.status_details,
        location: event.location ? {
          city: event.location.city,
          state: event.location.state,
          country: event.location.country,
          zip: event.location.zip
        } : null,
        carrier_timestamp: event.status_date,
        source: 'webhook',
        raw_data: event
      }));
      
      for (const event of trackingEvents) {
        await supabase.from('tracking_events').upsert(event, {
          onConflict: 'shipment_id,carrier_timestamp,status',
          ignoreDuplicates: true
        });
      }
      
      console.log(`Stored ${trackingEvents.length} Shippo tracking events for shipment ${shipment.id}`);
    }

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
      
      // Trigger notifications for status changes
      const currentStatus = trackingData.tracking_status?.status;
      if (currentStatus === 'OUT_FOR_DELIVERY' && shipment.status !== 'out_for_delivery') {
        await triggerNotification(supabase, shipment.id, 'out_for_delivery');
      } else if (status === 'delivered' && shipment.status !== 'delivered') {
        await triggerNotification(supabase, shipment.id, 'delivered');
      } else if (currentStatus === 'FAILURE' || currentStatus === 'RETURNED') {
        await triggerNotification(supabase, shipment.id, 'exception');
      }
    }

    return new Response('OK', { status: 200, headers: corsHeaders });

  } catch (error) {
    console.error('Error processing Shippo webhook:', error);
    return new Response('Internal error', { status: 500, headers: corsHeaders });
  }
});

function mapShippoStatusToEventType(status: string, statusDetail: string): string {
  const statusUpper = status?.toUpperCase() || '';
  const detailLower = statusDetail?.toLowerCase() || '';
  
  if (statusUpper === 'DELIVERED' || detailLower.includes('delivered')) return 'delivered';
  if (statusUpper === 'OUT_FOR_DELIVERY') return 'out_for_delivery';
  if (statusUpper === 'TRANSIT') return 'in_transit';
  if (statusUpper === 'PRE_TRANSIT') return 'pre_transit';
  if (statusUpper === 'RETURNED' || detailLower.includes('return')) return 'returned';
  if (statusUpper === 'FAILURE' || statusUpper === 'UNKNOWN') return 'exception';
  
  return 'in_transit';
}

async function triggerNotification(supabase: any, shipmentId: number, notificationType: string) {
  try {
    const { data: orderShipment } = await supabase
      .from('order_shipments')
      .select('order_id, orders(customer_email, customer_name)')
      .eq('shipment_id', shipmentId)
      .single();
    
    if (orderShipment?.orders) {
      await supabase.functions.invoke('send-shipment-notification', {
        body: {
          type: notificationType,
          shipmentId: shipmentId,
          orderId: orderShipment.order_id,
          customerEmail: orderShipment.orders.customer_email,
          customerName: orderShipment.orders.customer_name
        }
      });
      console.log(`Triggered ${notificationType} notification for shipment ${shipmentId}`);
    }
  } catch (error) {
    console.error('Error triggering notification:', error);
  }
}