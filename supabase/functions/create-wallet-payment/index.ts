import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { WalletPaymentSchema } from "./validation.ts";
import { ZodError } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // SECURITY: authenticate caller
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401,
      });
    }
    const sbUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(sbUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await userClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401,
      });
    }

    const requestBody = await req.json();
    const validated = WalletPaymentSchema.parse(requestBody);
    const { amount, companyId, savePaymentMethod } = validated;

    // SECURITY: caller must belong to the company
    const supabaseAuth = createClient(sbUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: cp } = await supabaseAuth.from("users")
      .select("company_id, role").eq("id", caller.id).single();
    if (cp?.role !== "super_admin" && cp?.company_id !== companyId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403,
      });
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get company information
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("name, email")
      .eq("id", companyId)
      .single();

    if (companyError) {
      throw new Error(`Company not found: ${companyError.message}`);
    }

    // Check if customer exists in Stripe
    let customerId;
    const customers = await stripe.customers.list({
      email: company.email || `company-${companyId}@placeholder.com`,
      limit: 1,
    });

    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      // Create new customer
      const customer = await stripe.customers.create({
        email: company.email || `company-${companyId}@placeholder.com`,
        name: company.name,
        metadata: {
          company_id: companyId,
        },
      });
      customerId = customer.id;
    }

    console.log(
      `Creating checkout session for company ${companyId}, amount: $${
        (amount / 100).toFixed(2)
      }`,
    );

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"], // Simplified to just cards for better loading
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Wallet Top-up",
              description: `Add $${(amount / 100).toFixed(2)} to wallet`,
            },
            unit_amount: amount, // amount in cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${
        req.headers.get("origin")
      }/company-admin?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/company-admin?canceled=true`,
      metadata: {
        company_id: companyId,
        wallet_topup: "true",
      },
      ...(savePaymentMethod && {
        payment_intent_data: {
          setup_future_usage: "off_session",
        },
      }),
    });

    console.log(`Checkout session created: ${session.id}, URL: ${session.url}`);

    return new Response(
      JSON.stringify({ url: session.url, sessionId: session.id }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("Error creating payment session:", error);

    // Handle validation errors separately
    if (error instanceof ZodError) {
      return new Response(
        JSON.stringify({
          error: "Invalid request data",
          details: error.errors,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        },
      );
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});
