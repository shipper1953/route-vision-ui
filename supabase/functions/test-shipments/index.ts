import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { company_id } = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log(`Testing shipment data for company: ${company_id}`);
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Test the shipment query
    const { data: recentShipments, error: shipmentsError } = await supabase
      .from('shipments')
      .select(`
        id,
        easypost_id,
        carrier,
        service,
        cost,
        package_dimensions,
        package_weights,
        total_weight,
        actual_package_sku,
        actual_package_master_id,
        created_at
      `)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .not('actual_package_sku', 'is', null)
      .not('package_dimensions', 'is', null)
      .order('created_at', { ascending: false })
      .limit(200);

    console.log('Shipments query result:', { 
      count: recentShipments?.length || 0, 
      error: shipmentsError,
      thirtyDaysAgo: thirtyDaysAgo.toISOString()
    });

    if (recentShipments && recentShipments.length > 0) {
      console.log('Sample shipment:', JSON.stringify(recentShipments[0], null, 2));

      // Test orders query
      const shipmentIds = recentShipments.map(s => s.id);
      
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('id, order_id, items, company_id, shipment_id')
        .eq('company_id', company_id)
        .in('shipment_id', shipmentIds);

      console.log('Orders query result:', { 
        count: ordersData?.length || 0, 
        error: ordersError,
        company_id
      });

      if (ordersData && ordersData.length > 0) {
        console.log('Sample order:', JSON.stringify(ordersData[0], null, 2));
      }

      // Match them up
      const companyShipments = [];
      for (const shipment of recentShipments) {
        const order = ordersData?.find(o => o.shipment_id === shipment.id);
        if (order) {
          companyShipments.push({
            ...shipment,
            orders: order
          });
        }
      }

      console.log('Matched company shipments:', companyShipments.length);
      if (companyShipments.length > 0) {
        console.log('Sample matched:', JSON.stringify(companyShipments[0], null, 2));
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        shipments_found: recentShipments?.length || 0,
        thirtyDaysAgo: thirtyDaysAgo.toISOString()
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});