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

    for (const shipment of shipments || []) {
      try {
        console.log(`Processing shipment ${shipment.id} with EasyPost ID: ${shipment.easypost_id}`);
        
        // First try to get the shipment details to get the tracker ID
        const shipmentUrl = `https://api.easypost.com/v2/shipments/${shipment.easypost_id}`;
        console.log(`Fetching shipment from: ${shipmentUrl}`);
        
        const shipmentResponse = await fetch(shipmentUrl, {
          headers: {
            'Authorization': `Bearer ${easypostApiKey}`,
            'Content-Type': 'application/json',
          },
        });

        if (!shipmentResponse.ok) {
          const errorText = await shipmentResponse.text();
          console.error(`Failed to fetch shipment for ${shipment.easypost_id}: ${shipmentResponse.status} - ${errorText}`);
          continue;
        }

        const shipmentData = await shipmentResponse.json();
        const trackerId = shipmentData.tracker?.id;
        
        if (!trackerId) {
          console.log(`No tracker found for shipment ${shipment.easypost_id}`);
          continue;
        }

        // Now fetch the tracker data
        const trackerUrl = `https://api.easypost.com/v2/trackers/${trackerId}`;
        console.log(`Fetching tracker from: ${trackerUrl}`);
        
        const trackerResponse = await fetch(trackerUrl, {
          headers: {
            'Authorization': `Bearer ${easypostApiKey}`,
            'Content-Type': 'application/json',
          },
        });

        console.log(`Tracker response status: ${trackerResponse.status}`);
        
        if (!trackerResponse.ok) {
          const errorText = await trackerResponse.text();
          console.error(`Failed to fetch tracker for ${shipment.easypost_id}: ${trackerResponse.status} - ${errorText}`);
          continue;
        }

        const tracker: EasyPostTracker = await trackerResponse.json();
        console.log(`Tracker data for ${shipment.easypost_id}:`, {
          status: tracker.status,
          est_delivery_date: tracker.est_delivery_date,
          tracking_details_count: tracker.tracking_details?.length || 0
        });

        let estimatedDeliveryDate = shipment.estimated_delivery_date;
        let actualDeliveryDate = shipment.actual_delivery_date;
        let status = 'shipped';

        // Update estimated delivery date if available
        if (tracker.est_delivery_date && !estimatedDeliveryDate) {
          estimatedDeliveryDate = tracker.est_delivery_date;
          console.log(`Setting estimated delivery date: ${estimatedDeliveryDate}`);
        }

        // Check for delivery in tracking details
        const deliveredEvent = tracker.tracking_details?.find(detail => 
          detail.status === 'delivered' || 
          detail.description?.toLowerCase().includes('delivered')
        );

        if (deliveredEvent && !actualDeliveryDate) {
          actualDeliveryDate = deliveredEvent.datetime;
          status = 'delivered';
          console.log(`Found delivery event: ${deliveredEvent.datetime}`);
        }

        // Update shipment if there are changes
        if (estimatedDeliveryDate !== shipment.estimated_delivery_date || 
            actualDeliveryDate !== shipment.actual_delivery_date ||
            (deliveredEvent && status === 'delivered')) {
          
          console.log(`Updating shipment ${shipment.id} with:`, {
            estimated_delivery_date: estimatedDeliveryDate,
            actual_delivery_date: actualDeliveryDate,
            status: status
          });
          
          const { error: updateError } = await supabase
            .from('shipments')
            .update({
              estimated_delivery_date: estimatedDeliveryDate,
              actual_delivery_date: actualDeliveryDate,
              status: status
            })
            .eq('id', shipment.id);

          if (updateError) {
            console.error(`Failed to update shipment ${shipment.id}:`, updateError);
          } else {
            updates.push({
              shipment_id: shipment.id,
              easypost_id: shipment.easypost_id,
              estimated_delivery_date: estimatedDeliveryDate,
              actual_delivery_date: actualDeliveryDate,
              status: status
            });
            console.log(`Successfully updated shipment ${shipment.id}`);
          }
        } else {
          console.log(`No changes needed for shipment ${shipment.id}`);
        }

      } catch (error) {
        console.error(`Error processing shipment ${shipment.easypost_id}:`, error);
        // Continue processing other shipments even if one fails
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