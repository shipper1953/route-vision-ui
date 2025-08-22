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
    const { action, amount, companyId, paymentMethodId } = await req.json();

    if (!companyId) throw new Error("companyId is required");
    if (!action) throw new Error("Action is required ('setup' or 'topup')");

    const origin = req.headers.get("origin") || "https://gidrlosmhpvdcogrkidj.supabase.co";

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Create Supabase service client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get company info, including stored Stripe customer id if present
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id, name, email, stripe_customer_id')
      .eq('id', companyId)
      .single();

    if (companyError || !company) {
      throw new Error(`Company not found: ${companyError?.message || 'no record'}`);
    }

    // Ensure Stripe customer exists and is saved on company
    let customerId = (company as any).stripe_customer_id as string | null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: company.email || `company-${companyId}@placeholder.com`,
        name: company.name,
        metadata: { company_id: companyId },
      });
      customerId = customer.id;
      await supabase
        .from('companies')
        .update({ stripe_customer_id: customerId })
        .eq('id', companyId);
    }

    if (action === 'setup') {
      // Phase 1: Create SetupIntent to attach a new payment method
      const setupIntent = await stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ['card'],
        usage: 'off_session',
        description: `Add payment method for ${company.name}`,
        metadata: { company_id: companyId },
      });

      return new Response(
        JSON.stringify({ clientSecret: setupIntent.client_secret, intentId: setupIntent.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    if (action === 'topup') {
      if (!amount || typeof amount !== 'number') {
        throw new Error("Amount (in cents) is required for top-up");
      }

      const paymentIntentData: Record<string, any> = {
        amount,
        currency: 'usd',
        customer: customerId,
        description: `Wallet Top-up - Add $${(amount / 100).toFixed(2)} to wallet`,
        metadata: { company_id: companyId, wallet_topup: 'true' },
      };

      if (paymentMethodId) {
        // We attach the provided payment method, return client secret for client-side confirmation
        paymentIntentData.payment_method = paymentMethodId;
        // Do NOT confirm server-side to allow Stripe.js to handle SCA if needed
        // Provide return_url only as metadata for reference; client will pass confirmParams.return_url
      } else {
        // No specific PM yet, allow automatic payment methods and let client confirm with Elements
        paymentIntentData.automatic_payment_methods = { enabled: true };
      }

      const paymentIntent = await stripe.paymentIntents.create(paymentIntentData);
      console.log(`Payment intent created: ${paymentIntent.id}, status: ${paymentIntent.status}`);

      return new Response(
        JSON.stringify({
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id,
          status: paymentIntent.status,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    throw new Error("Invalid action");
  } catch (error) {
    console.error("[create-payment-intent] Error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
