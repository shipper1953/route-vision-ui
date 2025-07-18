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
    const { shipmentId } = await req.json();
    
    const easypostApiKey = Deno.env.get('EASYPOST_API_KEY');
    if (!easypostApiKey) {
      return new Response(
        JSON.stringify({ error: 'EasyPost API key not configured' }),
        { status: 500, headers: corsHeaders }
      );
    }

    console.log(`Testing tracking for shipment: ${shipmentId}`);

    // Fetch shipment details from EasyPost
    const shipmentResponse = await fetch(
      `https://api.easypost.com/v2/shipments/${shipmentId}`,
      {
        headers: {
          'Authorization': `Bearer ${easypostApiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log(`Shipment response status: ${shipmentResponse.status}`);
    
    if (!shipmentResponse.ok) {
      const errorText = await shipmentResponse.text();
      console.error(`Failed to fetch shipment: ${shipmentResponse.status} - ${errorText}`);
      return new Response(
        JSON.stringify({ error: `EasyPost API error: ${errorText}` }),
        { status: shipmentResponse.status, headers: corsHeaders }
      );
    }

    const shipmentData = await shipmentResponse.json();
    console.log('Shipment data:', JSON.stringify(shipmentData, null, 2));

    // Try to fetch tracker if available
    if (shipmentData.tracker && shipmentData.tracker.id) {
      console.log(`Fetching tracker: ${shipmentData.tracker.id}`);
      
      const trackerResponse = await fetch(
        `https://api.easypost.com/v2/trackers/${shipmentData.tracker.id}`,
        {
          headers: {
            'Authorization': `Bearer ${easypostApiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (trackerResponse.ok) {
        const trackerData = await trackerResponse.json();
        console.log('Tracker data:', JSON.stringify(trackerData, null, 2));
        
        return new Response(
          JSON.stringify({ 
            shipment: shipmentData,
            tracker: trackerData
          }),
          { status: 200, headers: corsHeaders }
        );
      }
    }

    return new Response(
      JSON.stringify({ shipment: shipmentData }),
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    console.error('Error in test-easypost-tracking:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});