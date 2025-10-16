import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { storeUrl, accessToken } = await req.json();

    if (!storeUrl || !accessToken) {
      throw new Error('Store URL and access token are required');
    }

    // Clean up store URL
    const cleanUrl = storeUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
    
    // Test connection to Shopify Admin API
    const shopifyUrl = `https://${cleanUrl}/admin/api/2024-01/shop.json`;
    
    const response = await fetch(shopifyUrl, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Shopify API error:', errorText);
      throw new Error(`Failed to connect to Shopify: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const shop = data.shop;

    console.log('Successfully connected to Shopify store:', shop.name);

    return new Response(
      JSON.stringify({
        success: true,
        shop: {
          name: shop.name,
          email: shop.email,
          domain: shop.domain,
          currency: shop.currency,
          timezone: shop.timezone,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Connection test error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
