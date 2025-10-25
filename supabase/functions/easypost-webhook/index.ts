import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EasyPostWebhookEvent {
  id: string;
  object: string;
  created_at: string;
  updated_at: string;
  description: string;
  mode: string;
  previous_attributes: any;
  pending_urls: string[];
  completed_urls: string[];
  result: {
    id: string;
    object: string;
    tracking_code: string;
    status: string;
    status_detail: string;
    signed_by: string;
    weight: number;
    est_delivery_date: string;
    shipment_id: string;
    carrier: string;
    carrier_detail: string;
    public_url: string;
    fees: any[];
    tracking_details: Array<{
      object: string;
      message: string;
      description: string;
      status: string;
      status_detail: string;
      datetime: string;
      source: string;
      carrier_code: string;
      tracking_location: {
        object: string;
        city: string;
        state: string;
        country: string;
        zip: string;
      };
    }>;
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

    const webhookEvent: EasyPostWebhookEvent = await req.json();
    console.log('Received EasyPost webhook:', {
      id: webhookEvent.id,
      object: webhookEvent.object,
      description: webhookEvent.description,
      mode: webhookEvent.mode
    });

    // EasyPost recommends responding with 200 OK immediately, then processing
    // Return early acknowledgment for non-tracker events
    if (webhookEvent.object !== 'Event' || !webhookEvent.result || webhookEvent.result.object !== 'Tracker') {
      console.log('Not a tracker event, ignoring:', webhookEvent.description);
      return new Response('OK', { status: 200, headers: corsHeaders });
    }

    // Process tracker events
    const tracker = webhookEvent.result;
    const trackingCode = tracker.tracking_code;
    const shipmentId = tracker.shipment_id;

    console.log(`Processing tracker event: ${webhookEvent.description}`, {
      tracking_code: trackingCode,
      shipment_id: shipmentId,
      status: tracker.status,
      status_detail: tracker.status_detail
    });

    // Find the shipment in our database by EasyPost ID or tracking number
    const { data: shipments, error: shipmentError } = await supabase
      .from('shipments')
      .select('id, estimated_delivery_date, actual_delivery_date, status')
      .or(`easypost_id.eq.${shipmentId},tracking_number.eq.${trackingCode}`)
      .limit(1);

    if (shipmentError) {
      console.error('Error finding shipment:', shipmentError);
      return new Response('Database error', { status: 500, headers: corsHeaders });
    }

    if (!shipments || shipments.length === 0) {
      console.log(`No shipment found for tracking code: ${trackingCode} or shipment ID: ${shipmentId}`);
      return new Response('Shipment not found', { status: 404, headers: corsHeaders });
    }

    const shipment = shipments[0];
    let estimatedDeliveryDate = shipment.estimated_delivery_date;
    let actualDeliveryDate = shipment.actual_delivery_date;
    let status = shipment.status;
    
    // Store all tracking events for timeline
    if (tracker.tracking_details && tracker.tracking_details.length > 0) {
      const trackingEvents = tracker.tracking_details.map((detail: any) => ({
        shipment_id: shipment.id,
        provider: 'easypost',
        event_type: mapStatusToEventType(detail.status, detail.status_detail),
        status: detail.status,
        status_detail: detail.status_detail,
        message: detail.message,
        description: detail.description,
        location: detail.tracking_location ? {
          city: detail.tracking_location.city,
          state: detail.tracking_location.state,
          country: detail.tracking_location.country,
          zip: detail.tracking_location.zip
        } : null,
        carrier_timestamp: detail.datetime,
        carrier_code: detail.carrier_code,
        source: 'webhook',
        raw_data: detail
      }));
      
      // Upsert events to avoid duplicates
      for (const event of trackingEvents) {
        await supabase.from('tracking_events').upsert(event, {
          onConflict: 'shipment_id,carrier_timestamp,status',
          ignoreDuplicates: true
        });
      }
      
      console.log(`Stored ${trackingEvents.length} tracking events for shipment ${shipment.id}`);
    }

    // Update estimated delivery date if available from EasyPost
    if (tracker.est_delivery_date) {
      estimatedDeliveryDate = tracker.est_delivery_date;
      console.log(`Setting estimated delivery date from EasyPost: ${estimatedDeliveryDate}`);
    }

    // Check for delivery status - EasyPost uses specific status values
    let isDelivered = false;
    if (tracker.status === 'delivered' || tracker.status_detail === 'arrived_at_destination') {
      isDelivered = true;
    }

    // Also check tracking details for delivery events
    const deliveredEvent = tracker.tracking_details?.find(detail => 
      detail.status === 'delivered' || 
      detail.status_detail === 'arrived_at_destination' ||
      detail.status === 'out_for_delivery' && detail.message?.toLowerCase().includes('delivered')
    );

    if ((isDelivered || deliveredEvent) && !actualDeliveryDate) {
      // Use the most recent tracking detail datetime or current time
      actualDeliveryDate = deliveredEvent?.datetime || new Date().toISOString();
      status = 'delivered';
      console.log(`Package delivered at: ${actualDeliveryDate}`);
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

      console.log(`Updated shipment ${shipment.id} with delivery information from EasyPost webhook`);
      
      // Trigger notifications for status changes
      if (status === 'out_for_delivery' && shipment.status !== 'out_for_delivery') {
        await triggerNotification(supabase, shipment.id, 'out_for_delivery');
      } else if (status === 'delivered' && shipment.status !== 'delivered') {
        await triggerNotification(supabase, shipment.id, 'delivered');
      } else if (tracker.status === 'failure' || tracker.status === 'error') {
        await triggerNotification(supabase, shipment.id, 'exception');
      }
    } else {
      console.log(`No updates needed for shipment ${shipment.id}`);
    }

    // Always return 200 OK to acknowledge receipt of webhook
    return new Response('OK', { status: 200, headers: corsHeaders });

  } catch (error) {
    console.error('Error processing EasyPost webhook:', error);
    // Still return 200 to prevent EasyPost from retrying
    return new Response('OK', { status: 200, headers: corsHeaders });
  }
});

function mapStatusToEventType(status: string, statusDetail: string): string {
  const statusLower = status?.toLowerCase() || '';
  const detailLower = statusDetail?.toLowerCase() || '';
  
  if (statusLower === 'delivered' || detailLower.includes('delivered')) return 'delivered';
  if (statusLower === 'out_for_delivery' || detailLower.includes('out for delivery')) return 'out_for_delivery';
  if (statusLower === 'in_transit') return 'in_transit';
  if (statusLower === 'pre_transit') return 'pre_transit';
  if (statusLower === 'returned' || detailLower.includes('return')) return 'returned';
  if (statusLower === 'failure' || statusLower === 'error') return 'exception';
  
  return 'in_transit';
}

async function triggerNotification(supabase: any, shipmentId: number, notificationType: string) {
  try {
    // Get customer info from linked order
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