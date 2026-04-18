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
    const { paymentIntentId, companyId } = await req.json();

    if (!paymentIntentId) {
      return new Response(JSON.stringify({ error: "Missing paymentIntentId" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (!pi) {
      return new Response(JSON.stringify({ error: "PaymentIntent not found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    if (pi.status !== "succeeded") {
      return new Response(
        JSON.stringify({ error: `PaymentIntent not succeeded (status: ${pi.status})` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const derivedCompanyId =
      (pi.metadata?.company_id as string) || companyId;
    if (!derivedCompanyId) {
      return new Response(JSON.stringify({ error: "Missing companyId" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const amountDollars = (pi.amount_received || pi.amount || 0) / 100;

    // Idempotency check
    const { data: existingTx } = await supabase
      .from("transactions")
      .select("id")
      .eq("reference_id", pi.id)
      .eq("company_id", derivedCompanyId)
      .limit(1);

    if (existingTx && existingTx.length > 0) {
      console.log("Transaction already recorded for", pi.id);
      return new Response(
        JSON.stringify({ credited: false, alreadyRecorded: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Get or create wallet
    let { data: wallet, error: walletError } = await supabase
      .from("wallets")
      .select("*")
      .eq("company_id", derivedCompanyId)
      .single();

    if (walletError && walletError.code === "PGRST116") {
      const { data: users } = await supabase
        .from("users")
        .select("id")
        .eq("company_id", derivedCompanyId)
        .limit(1);
      const ownerId = users && users.length > 0 ? users[0].id : null;
      if (!ownerId) throw new Error("No user found for company to own wallet");

      const { data: newWallet, error: createError } = await supabase
        .from("wallets")
        .insert({ company_id: derivedCompanyId, user_id: ownerId, balance: 0, currency: "USD" })
        .select()
        .single();
      if (createError) throw createError;
      wallet = newWallet;
    } else if (walletError) {
      throw walletError;
    }

    const newBalance = (wallet?.balance || 0) + amountDollars;

    // IMPORTANT: Insert transaction BEFORE updating balance so the
    // wallet audit trigger sees a matching transaction and does not
    // create a duplicate "Undocumented balance change" entry.
    const { error: txError } = await supabase.from("transactions").insert({
      wallet_id: wallet!.id,
      company_id: derivedCompanyId,
      amount: amountDollars,
      type: "credit",
      description: `Stripe payment - Intent: ${pi.id}`,
      reference_id: pi.id,
      reference_type: "stripe_payment_intent",
    });
    if (txError) throw txError;

    const { error: updateError } = await supabase
      .from("wallets")
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq("id", wallet!.id);
    if (updateError) throw updateError;

    console.log(`Wallet credited via PI ${pi.id}: +$${amountDollars}`);

    return new Response(
      JSON.stringify({ credited: true, amount: amountDollars, balance: newBalance }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("confirm-payment-intent error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
