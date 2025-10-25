import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ConsolidationRequest {
  customerEmail: string;
  companyId: string;
  currentOrderId?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { customerEmail, companyId, currentOrderId }: ConsolidationRequest = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Find other unshipped orders for this customer
    const { data: eligibleOrders } = await supabase
      .from('orders')
      .select('*')
      .eq('customer_email', customerEmail)
      .eq('company_id', companyId)
      .in('status', ['ready_to_ship', 'processing', 'pending'])
      .neq('id', currentOrderId || 0);

    if (!eligibleOrders || eligibleOrders.length === 0) {
      return new Response(JSON.stringify({ 
        consolidatable: false,
        opportunities: []
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Group orders by shipping address
    const ordersByAddress = new Map<string, any[]>();
    
    eligibleOrders.forEach(order => {
      const addressKey = `${order.shipping_street}-${order.shipping_city}-${order.shipping_zip}`;
      if (!ordersByAddress.has(addressKey)) {
        ordersByAddress.set(addressKey, []);
      }
      ordersByAddress.get(addressKey)!.push(order);
    });

    // Calculate potential savings for each consolidation opportunity
    const opportunities = [];

    for (const [addressKey, orders] of ordersByAddress) {
      if (orders.length === 0) continue;

      // Simplified savings calculation (in production, would get actual shipping quotes)
      // Assume average shipping cost per order is $10, consolidation saves ~30%
      const individualShippingCost = orders.length * 10;
      const consolidatedCost = 12; // Slightly more than single package
      const savings = individualShippingCost - consolidatedCost;

      opportunities.push({
        orders: orders.map(o => ({
          order_id: o.order_id,
          order_date: o.order_date,
          item_count: o.order_items?.length || 0,
          total: o.total
        })),
        shipping_address: {
          street: orders[0].shipping_street,
          city: orders[0].shipping_city,
          state: orders[0].shipping_state,
          zip: orders[0].shipping_zip
        },
        estimated_savings: savings.toFixed(2),
        individual_cost: individualShippingCost.toFixed(2),
        consolidated_cost: consolidatedCost.toFixed(2),
        package_count_reduction: orders.length - 1,
        carbon_savings_lbs: (orders.length * 0.5).toFixed(1) // Simplified CO2 calc
      });
    }

    return new Response(JSON.stringify({
      consolidatable: opportunities.length > 0,
      opportunities: opportunities.sort((a, b) => 
        parseFloat(b.estimated_savings) - parseFloat(a.estimated_savings)
      )
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Consolidation detection error:', error);
    return new Response(JSON.stringify({ error: 'Failed to detect opportunities' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
