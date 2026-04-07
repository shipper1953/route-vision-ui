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
      .select('id, easypost_id, tracking_number, estimated_delivery_date, actual_delivery_date')
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