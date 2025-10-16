import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OrderItem {
  sku: string;
  name: string;
  quantity: number;
  unitPrice?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting backfill of fulfillment item tracking...');

    // Get the request body to check for specific order_id or run all
    const body = await req.json().catch(() => ({}));
    const { orderId, limit = 100 } = body;

    // Find order_shipments records that don't have items in package_info
    let query = supabase
      .from('order_shipments')
      .select(`
        id,
        order_id,
        shipment_id,
        package_index,
        package_info,
        orders!inner(
          id,
          order_id,
          items
        )
      `)
      .order('created_at', { ascending: false });

    if (orderId) {
      query = query.eq('order_id', orderId);
    } else {
      query = query.limit(limit);
    }

    const { data: orderShipments, error: fetchError } = await query;

    if (fetchError) {
      throw new Error(`Failed to fetch order shipments: ${fetchError.message}`);
    }

    if (!orderShipments || orderShipments.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'No order shipments found to backfill',
          updated: 0 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    console.log(`Found ${orderShipments.length} order shipments to process`);

    let updatedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (const orderShipment of orderShipments) {
      try {
        // Check if package_info already has items
        const packageInfo = orderShipment.package_info || {};
        
        if (packageInfo.items && Array.isArray(packageInfo.items) && packageInfo.items.length > 0) {
          console.log(`Order shipment ${orderShipment.id} already has item tracking, skipping`);
          skippedCount++;
          continue;
        }

        // Get order items
        const order = (orderShipment as any).orders;
        let orderItems: OrderItem[] = [];

        if (order.items) {
          if (Array.isArray(order.items)) {
            orderItems = order.items;
          } else if (typeof order.items === 'object') {
            // Handle old format if items is an object
            orderItems = [order.items];
          }
        }

        if (orderItems.length === 0) {
          console.log(`Order ${order.order_id} has no items to backfill`);
          skippedCount++;
          continue;
        }

        // Update package_info with items
        const updatedPackageInfo = {
          ...packageInfo,
          items: orderItems.map(item => ({
            sku: item.sku || item.name,
            name: item.name || item.sku,
            quantity: item.quantity || 1
          })),
          backfilled: true,
          backfilled_at: new Date().toISOString()
        };

        // Update the order_shipments record
        const { error: updateError } = await supabase
          .from('order_shipments')
          .update({ package_info: updatedPackageInfo })
          .eq('id', orderShipment.id);

        if (updateError) {
          const errorMsg = `Failed to update order_shipment ${orderShipment.id}: ${updateError.message}`;
          console.error(errorMsg);
          errors.push(errorMsg);
          continue;
        }

        console.log(`✅ Backfilled items for order_shipment ${orderShipment.id} (order ${order.order_id})`);
        updatedCount++;

      } catch (itemError) {
        const errorMsg = `Error processing order_shipment ${orderShipment.id}: ${itemError.message}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    console.log(`Backfill complete: ${updatedCount} updated, ${skippedCount} skipped, ${errors.length} errors`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Backfill completed',
        stats: {
          processed: orderShipments.length,
          updated: updatedCount,
          skipped: skippedCount,
          errors: errors.length
        },
        errors: errors.length > 0 ? errors : undefined
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Backfill error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
