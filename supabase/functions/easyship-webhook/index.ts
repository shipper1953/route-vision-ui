import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    // ========== AUTH: token via query string (Option A) ==========
    const url = new URL(req.url);
    const providedToken = url.searchParams.get('token');
    const expectedToken = Deno.env.get('EASYSHIP_WEBHOOK_SECRET');

    if (!expectedToken) {
      console.error('EASYSHIP_WEBHOOK_SECRET not configured');
      return new Response('Server misconfigured', { status: 500, headers: corsHeaders });
    }

    if (!providedToken || providedToken !== expectedToken) {
      console.warn('Easyship webhook: invalid or missing token', {
        provided_len: providedToken?.length ?? 0,
        provided_prefix: providedToken?.slice(0, 4) ?? null,
        expected_len: expectedToken.length,
        expected_prefix: expectedToken.slice(0, 4),
      });
      return new Response('Unauthorized', { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const event = await req.json();
    console.log('📩 Easyship webhook received:', {
      event_type: event.event_type || event.type,
      resource_type: event.resource_type,
      easyship_shipment_id: event.easyship_shipment_id || event.resource?.easyship_shipment_id,
    });

    const eventType: string = event.event_type || event.type || '';
    const resource = event.resource || event.data || event;

    const easyshipShipmentId =
      resource.easyship_shipment_id ||
      event.easyship_shipment_id ||
      resource.shipment_id;
    const trackingNumber =
      resource.tracking_number ||
      resource.label?.tracking_number ||
      event.tracking_number;

    if (!easyshipShipmentId && !trackingNumber) {
      console.log('No identifier found in webhook payload, acknowledging');
      return new Response('OK', { status: 200, headers: corsHeaders });
    }

    // Find shipment in DB
    const orFilters: string[] = [];
    if (easyshipShipmentId) orFilters.push(`easypost_id.eq.${easyshipShipmentId}`);
    if (trackingNumber) orFilters.push(`tracking_number.eq.${trackingNumber}`);

    const { data: shipments, error: shipmentError } = await supabase
      .from('shipments')
      .select('id, estimated_delivery_date, actual_delivery_date, status')
      .or(orFilters.join(','))
      .limit(1);

    if (shipmentError) {
      console.error('DB error finding shipment:', shipmentError);
      return new Response('OK', { status: 200, headers: corsHeaders });
    }

    if (!shipments || shipments.length === 0) {
      console.log(`No shipment found for easyship_id=${easyshipShipmentId} tracking=${trackingNumber}`);
      return new Response('OK', { status: 200, headers: corsHeaders });
    }

    const shipment = shipments[0];

    // Map Easyship event types to our internal status
    let newStatus = shipment.status;
    let actualDeliveryDate = shipment.actual_delivery_date;
    let estimatedDeliveryDate = shipment.estimated_delivery_date;
    let notificationType: string | null = null;

    const checkpointStatus = (resource.status || resource.tracking_status || '').toLowerCase();

    if (eventType.includes('label.created')) {
      newStatus = 'shipped';
    } else if (eventType.includes('label.failed') || eventType.includes('cancelled')) {
      newStatus = 'cancelled';
    } else if (eventType.includes('tracking') || eventType.includes('checkpoint')) {
      if (checkpointStatus.includes('delivered')) {
        newStatus = 'delivered';
        actualDeliveryDate = resource.delivered_at || resource.checkpoint_at || new Date().toISOString();
        notificationType = 'delivered';
      } else if (checkpointStatus.includes('out_for_delivery') || checkpointStatus.includes('out for delivery')) {
        newStatus = 'out_for_delivery';
        notificationType = 'out_for_delivery';
      } else if (checkpointStatus.includes('in_transit') || checkpointStatus.includes('in transit')) {
        newStatus = 'in_transit';
      } else if (checkpointStatus.includes('exception') || checkpointStatus.includes('failure')) {
        notificationType = 'exception';
      }

      if (resource.estimated_delivery_date || resource.eta) {
        estimatedDeliveryDate = resource.estimated_delivery_date || resource.eta;
      }
    }

    // Persist tracking event
    if (eventType.includes('tracking') || eventType.includes('checkpoint')) {
      await supabase.from('tracking_events').upsert(
        {
          shipment_id: shipment.id,
          provider: 'easyship',
          event_type: newStatus,
          status: checkpointStatus || newStatus,
          status_detail: resource.status_detail || null,
          message: resource.message || resource.description || null,
          description: resource.description || null,
          location: resource.location || null,
          carrier_timestamp: resource.checkpoint_at || resource.timestamp || new Date().toISOString(),
          carrier_code: resource.courier_name || null,
          source: 'webhook',
          raw_data: resource,
        },
        { onConflict: 'shipment_id,carrier_timestamp,status', ignoreDuplicates: true }
      );
    }

    // Update shipment if changed
    if (
      newStatus !== shipment.status ||
      actualDeliveryDate !== shipment.actual_delivery_date ||
      estimatedDeliveryDate !== shipment.estimated_delivery_date
    ) {
      const { error: updateError } = await supabase
        .from('shipments')
        .update({
          status: newStatus,
          actual_delivery_date: actualDeliveryDate,
          estimated_delivery_date: estimatedDeliveryDate,
        })
        .eq('id', shipment.id);

      if (updateError) {
        console.error('Failed to update shipment:', updateError);
      } else {
        console.log(`✅ Shipment ${shipment.id} updated to ${newStatus}`);
      }

      // Propagate to orders
      const orderUpdate: Record<string, any> = {};
      if (estimatedDeliveryDate) orderUpdate.estimated_delivery_date = estimatedDeliveryDate;
      if (actualDeliveryDate) orderUpdate.actual_delivery_date = actualDeliveryDate;
      if (newStatus === 'delivered') orderUpdate.status = 'delivered';

      if (Object.keys(orderUpdate).length > 0) {
        const { data: linkedOrders } = await supabase
          .from('orders')
          .select('id')
          .eq('shipment_id', shipment.id);
        for (const order of linkedOrders || []) {
          await supabase.from('orders').update(orderUpdate).eq('id', order.id);
        }
        const { data: junctionOrders } = await supabase
          .from('order_shipments')
          .select('order_id')
          .eq('shipment_id', shipment.id);
        for (const jo of junctionOrders || []) {
          await supabase.from('orders').update(orderUpdate).eq('id', jo.order_id);
        }
      }

      // Trigger customer notifications
      if (notificationType) {
        try {
          const { data: orderShipment } = await supabase
            .from('order_shipments')
            .select('order_id, orders(customer_email, customer_name)')
            .eq('shipment_id', shipment.id)
            .single();

          if (orderShipment?.orders) {
            const orders: any = orderShipment.orders;
            await supabase.functions.invoke('send-shipment-notification', {
              body: {
                type: notificationType,
                shipmentId: shipment.id,
                orderId: orderShipment.order_id,
                customerEmail: orders.customer_email,
                customerName: orders.customer_name,
              },
            });
          }
        } catch (notifyErr) {
          console.error('Notification trigger failed:', notifyErr);
        }
      }
    }

    return new Response('OK', { status: 200, headers: corsHeaders });
  } catch (err) {
    console.error('💥 easyship-webhook error:', err);
    // Always 200 to avoid Easyship retries on bad payloads
    return new Response('OK', { status: 200, headers: corsHeaders });
  }
});
