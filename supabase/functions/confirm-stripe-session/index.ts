
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId, companyId } = await req.json();

    if (!sessionId) {
      return new Response(JSON.stringify({ error: "Missing sessionId" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session) {
      return new Response(JSON.stringify({ error: "Session not found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    if (session.payment_status !== "paid" && session.status !== "complete") {
      return new Response(JSON.stringify({ error: "Session not paid yet" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });

    const derivedCompanyId = (session.metadata?.company_id as string) || companyId;
    if (!derivedCompanyId) {
      return new Response(JSON.stringify({ error: "Missing companyId" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const amountDollars = (session.amount_total || 0) / 100;

    // Idempotency: if a transaction with this payment_intent already exists, don't credit again
    const paymentIntentId = (session.payment_intent || "") as string;
    if (paymentIntentId) {
      const { data: existingTx, error: existingTxError } = await supabase
        .from("transactions")
        .select("id")
        .eq("reference_id", paymentIntentId)
        .eq("company_id", derivedCompanyId)
        .limit(1);

      if (existingTxError) {
        console.warn("Error checking existing transaction:", existingTxError);
      }

      if (existingTx && existingTx.length > 0) {
        console.log("Transaction already recorded, skipping credit");
        return new Response(JSON.stringify({ credited: false, alreadyRecorded: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    }

    // Get or create wallet
    let { data: wallet, error: walletError } = await supabase
      .from("wallets")
      .select("*")
      .eq("company_id", derivedCompanyId)
      .single();

    if (walletError && walletError.code === "PGRST116") {
      // Create wallet if it doesn't exist, attach to any user in this company
      const { data: users, error: userFetchError } = await supabase
        .from("users")
        .select("id")
        .eq("company_id", derivedCompanyId)
        .limit(1);
      if (userFetchError) throw userFetchError;
      const ownerId = users && users.length > 0 ? users[0].id : null;
      if (!ownerId) {
        throw new Error("No user found for company to own wallet");
      }
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

    // Update balance
    const newBalance = (wallet?.balance || 0) + amountDollars;
    const { error: updateError } = await supabase
      .from("wallets")
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq("id", wallet!.id);

    if (updateError) throw updateError;

    // Record transaction
    const { error: txError } = await supabase.from("transactions").insert({
      wallet_id: wallet!.id,
      company_id: derivedCompanyId,
      amount: amountDollars,
      type: "credit",
      description: `Stripe payment - Session: ${session.id}`,
      reference_id: paymentIntentId,
      reference_type: "stripe_payment",
    });

    if (txError) throw txError;

    console.log(`Wallet credited: company ${derivedCompanyId}, +$${amountDollars}`);

    return new Response(
      JSON.stringify({ credited: true, amount: amountDollars, walletId: wallet!.id, balance: newBalance }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("confirm-stripe-session error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
