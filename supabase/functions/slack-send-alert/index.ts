import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SLACK_WEBHOOK_URL = Deno.env.get("SLACK_WEBHOOK_URL");
    
    if (!SLACK_WEBHOOK_URL) {
      console.log("Slack webhook not configured - alert would be sent to Slack if configured");
      return new Response(
        JSON.stringify({ 
          status: "Alert logged (Slack not configured)",
          message: "To enable Slack alerts, add SLACK_WEBHOOK_URL to your Supabase secrets"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { 
      message, 
      channel = "#wms-alerts", 
      icon_emoji = ":package:",
      username = "Packaging Intelligence Bot"
    } = await req.json();

    if (!message) {
      throw new Error("Message is required");
    }

    console.log(`Sending alert to Slack: ${message}`);

    const slackResponse = await fetch(SLACK_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channel,
        username,
        icon_emoji,
        text: message,
        attachments: [{
          color: "warning",
          fields: [{
            title: "Tornado Pack Alert",
            value: message,
            short: false
          }],
          footer: "Packaging Intelligence System",
          ts: Math.floor(Date.now() / 1000)
        }]
      }),
    });

    if (!slackResponse.ok) {
      const errorText = await slackResponse.text();
      throw new Error(`Slack API error: ${slackResponse.status} - ${errorText}`);
    }

    console.log("Alert sent to Slack successfully");

    return new Response(
      JSON.stringify({ 
        status: "Alert sent to Slack successfully",
        channel,
        message
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error sending Slack alert:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        status: "Failed to send alert"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});