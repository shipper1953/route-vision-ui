import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { trackingNumber } = await req.json();
    
    if (!trackingNumber) {
      return new Response(JSON.stringify({ error: 'Tracking number required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Find shipment by tracking number
    const { data: shipment, error: shipmentError } = await supabase
      .from('shipments')
      .select(`
        id,
        tracking_number,
        carrier,
        service,
        status,
        label_url,
        tracking_url,
        cost,
        estimated_delivery_date,
        actual_delivery_date,
        created_at,
        from_address,
        to_address,
        package_dimensions,
        package_weights,
        company_id
      `)
      .eq('tracking_number', trackingNumber)
      .single();

    if (shipmentError || !shipment) {
      return new Response(JSON.stringify({ error: 'Tracking number not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get tracking events timeline
    const { data: events } = await supabase
      .from('tracking_events')
      .select('*')
      .eq('shipment_id', shipment.id)
      .order('carrier_timestamp', { ascending: false });

    // Get order info (if linked)
    const { data: orderShipments } = await supabase
      .from('order_shipments')
      .select(`
        order_id,
        package_index,
        package_info,
        orders (
          order_id,
          customer_name,
          customer_email,
          status,
          order_date
        )
      `)
      .eq('shipment_id', shipment.id);

    // Get company info for branding
    const { data: company } = await supabase
      .from('companies')
      .select('name, settings')
      .eq('id', shipment.company_id)
      .single();

    // Mask sensitive info for public access
    const toAddress = shipment.to_address as any;
    const maskedAddress = {
      city: toAddress?.city,
      state: toAddress?.state,
      zip: toAddress?.zip?.slice(0, 5),
      country: toAddress?.country
    };

    const response = {
      tracking_number: shipment.tracking_number,
      carrier: shipment.carrier,
      service: shipment.service,
      status: shipment.status,
      tracking_url: shipment.tracking_url,
      estimated_delivery: shipment.estimated_delivery_date,
      actual_delivery: shipment.actual_delivery_date,
      shipped_date: shipment.created_at,
      destination: maskedAddress,
      timeline: events || [],
      order_info: orderShipments?.[0] ? {
        order_number: orderShipments[0].orders?.order_id,
        order_date: orderShipments[0].orders?.order_date,
        items: orderShipments[0].package_info?.items || []
      } : null,
      company_name: company?.name || 'Ship Tornado'
    };

    // Track view
    await supabase.rpc('increment_tracking_views', {
      p_tracking_number: trackingNumber
    });

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Tracking API error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
