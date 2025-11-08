import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { companyId, storeId, dateRangeDays } = await req.json();

    if (!companyId) {
      throw new Error('Company ID is required');
    }

    if (!storeId) {
      throw new Error('Store ID is required');
    }

    console.log('Starting Shopify bulk import for store:', storeId);

    // Get store-specific Shopify credentials
    const { data: store, error: storeError } = await supabase
      .from('shopify_stores')
      .select('id, company_id, store_url, access_token, customer_id')
      .eq('id', storeId)
      .eq('company_id', companyId)
      .single();

    if (storeError) throw storeError;

    if (!store?.access_token || !store?.store_url) {
      throw new Error('Store credentials not found or invalid');
    }

    // Clean and format store URL (remove https://, http://, trailing slashes)
    let storeUrl = store.store_url
      .replace(/^https?:\/\//, '')
      .replace(/\/$/, '');
    
    const accessToken = store.access_token;

    console.log(`Using store URL: ${storeUrl}`);

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - dateRangeDays);

    console.log(`Importing orders from ${startDate.toISOString()} to ${endDate.toISOString()}`);

    // Fetch orders from Shopify
    const shopifyApiUrl = `https://${storeUrl}/admin/api/2024-01/orders.json`;
    const params = new URLSearchParams({
      status: 'any',
      created_at_min: startDate.toISOString(),
      created_at_max: endDate.toISOString(),
      limit: '250',
    });

    const response = await fetch(`${shopifyApiUrl}?${params}`, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Shopify API error - Status: ${response.status} ${response.statusText}`);
      console.error(`URL called: ${shopifyApiUrl}?${params}`);
      console.error(`Response body: ${errorBody}`);
      throw new Error(`Shopify API error (${response.status}): ${response.statusText}. ${errorBody}`);
    }

    const { orders } = await response.json();

    console.log(`Found ${orders.length} orders to import`);

    // Get default warehouse
    const { data: warehouse } = await supabase
      .from('warehouses')
      .select('id')
      .eq('company_id', companyId)
      .eq('is_default', true)
      .single();

    let succeeded = 0;
    let failed = 0;

    // Import each order
    for (const shopifyOrder of orders) {
      try {
        // Check if order already exists
        const { data: existingMapping } = await supabase
          .from('shopify_order_mappings')
          .select('id')
          .eq('company_id', companyId)
          .eq('shopify_order_id', shopifyOrder.id.toString())
          .single();

        if (existingMapping) {
          console.log(`Order ${shopifyOrder.id} already imported, skipping`);
          continue;
        }

        // Transform and create order
        const orderData = {
          order_id: `SHOP-${shopifyOrder.order_number}`,
          customer_name: `${shopifyOrder.customer?.first_name || ''} ${shopifyOrder.customer?.last_name || ''}`.trim() || 'Unknown',
          customer_email: shopifyOrder.customer?.email || null,
          customer_phone: shopifyOrder.customer?.phone || null,
          customer_company: shopifyOrder.customer?.company || null,
          shipping_address: shopifyOrder.shipping_address ? {
            street1: shopifyOrder.shipping_address.address1 || '',
            street2: shopifyOrder.shipping_address.address2 || '',
            city: shopifyOrder.shipping_address.city || '',
            state: shopifyOrder.shipping_address.province_code || '',
            zip: shopifyOrder.shipping_address.zip || '',
            country: shopifyOrder.shipping_address.country_code || 'US'
          } : null,
          items: shopifyOrder.line_items?.map((item: any) => ({
            sku: item.sku || item.name,
            name: item.name,
            quantity: item.quantity,
            unitPrice: parseFloat(item.price)
          })) || [],
          value: parseFloat(shopifyOrder.total_price || '0'),
          order_date: shopifyOrder.created_at,
          status: 'processing',
          company_id: companyId,
          warehouse_id: warehouse?.id || null,
          user_id: user.id,
          shopify_store_id: storeId,
          customer_id: store.customer_id || null,
        };

        const { data: newOrder, error: orderError } = await supabase
          .from('orders')
          .insert(orderData)
          .select()
          .single();

        if (orderError) throw orderError;

        // Create mapping
        await supabase
          .from('shopify_order_mappings')
          .insert({
            company_id: companyId,
            ship_tornado_order_id: newOrder.id,
            shopify_order_id: shopifyOrder.id.toString(),
            shopify_order_number: shopifyOrder.order_number.toString(),
            shopify_store_id: storeId,
            sync_status: 'synced',
          });

        // Log success
        await supabase
          .from('shopify_sync_logs')
          .insert({
            company_id: companyId,
            sync_type: 'bulk_import',
            direction: 'inbound',
            status: 'success',
            shopify_order_id: shopifyOrder.id.toString(),
            ship_tornado_order_id: newOrder.id,
            metadata: { order_number: shopifyOrder.order_number },
          });

        succeeded++;
        console.log(`Imported order ${shopifyOrder.id}`);

      } catch (error) {
        failed++;
        console.error(`Failed to import order ${shopifyOrder.id}:`, error);

        // Log failure
        await supabase
          .from('shopify_sync_logs')
          .insert({
            company_id: companyId,
            sync_type: 'bulk_import',
            direction: 'inbound',
            status: 'failed',
            shopify_order_id: shopifyOrder.id.toString(),
            error_message: error.message,
            metadata: { order_number: shopifyOrder.order_number },
          });
      }
    }

    console.log(`Bulk import complete: ${succeeded} succeeded, ${failed} failed`);

    return new Response(JSON.stringify({
      success: true,
      total: orders.length,
      processed: succeeded + failed,
      succeeded,
      failed,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Bulk import error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
