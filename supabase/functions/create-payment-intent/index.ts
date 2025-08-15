import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { amount, companyId, savePaymentMethod = false } = await req.json();

    if (!amount || !companyId) {
      throw new Error("Amount and company ID are required");
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
      .from('companies')
      .select('name, email')
      .eq('id', companyId)
      .single();

    if (companyError) {
      throw new Error(`Company not found: ${companyError.message}`);
    }

    // Check if customer exists in Stripe
    let customerId;
    const customers = await stripe.customers.list({ 
      email: company.email || `company-${companyId}@placeholder.com`,
      limit: 1 
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

    console.log(`Creating payment intent for company ${companyId}, amount: $${(amount / 100).toFixed(2)}`);
    
    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount, // amount in cents
      currency: 'usd',
      customer: customerId,
      description: `Wallet Top-up - Add $${(amount / 100).toFixed(2)} to wallet`,
      metadata: {
        company_id: companyId,
        wallet_topup: 'true',
      },
      ...(savePaymentMethod && {
        setup_future_usage: 'off_session',
      }),
    });

    console.log(`Payment intent created: ${paymentIntent.id}`);

    return new Response(
      JSON.stringify({ 
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error creating payment intent:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});