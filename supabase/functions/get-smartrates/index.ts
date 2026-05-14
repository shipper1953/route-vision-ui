import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const easyPostApiKey = Deno.env.get("EASYPOST_API_KEY") ||
  Deno.env.get("VITE_EASYPOST_API_KEY");

const corsHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    // SECURITY: require authenticated caller
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { headers: corsHeaders, status: 401 });
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { headers: corsHeaders, status: 401 });
    }

    const { shipmentId, accuracy = "percentile_75" } = await req.json();

    if (!shipmentId) {
      return new Response(JSON.stringify({ error: "Missing shipment ID" }), { headers: corsHeaders, status: 400 });
    }
    if (!easyPostApiKey) {
      return new Response(JSON.stringify({ error: "EasyPost API key not available" }), { headers: corsHeaders, status: 500 });
    }

    const response = await fetch(
      `https://api.easypost.com/v2/shipments/${shipmentId}/smartrate`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${easyPostApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ smartrate_accuracy: accuracy }),
      },
    );

    if (!response.ok) {
      const errorData = await response.json();
      return new Response(
        JSON.stringify({ error: "SmartRate API error", details: errorData }),
        { headers: corsHeaders, status: response.status },
      );
    }

    const smartRateData = await response.json();
    return new Response(
      JSON.stringify({
        smartRates: smartRateData.smartrates,
        count: smartRateData.smartrates ? smartRateData.smartrates.length : 0,
      }),
      { headers: corsHeaders },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal server error", details: (err as Error).message }),
      { headers: corsHeaders, status: 500 },
    );
  }
});
