
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
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    const signature = req.headers.get("stripe-signature");
    const body = await req.text();

    let event;
    try {
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature!,
        Deno.env.get("STRIPE_WEBHOOK_SECRET") || ""
      );
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return new Response("Webhook signature verification failed", { status: 400 });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      
      if (session.metadata?.wallet_topup === 'true') {
        const companyId = session.metadata.company_id;
        const amount = session.amount_total! / 100; // Convert cents to dollars

        // Get or create wallet
        let { data: wallet, error: walletError } = await supabase
          .from('wallets')
          .select('*')
          .eq('company_id', companyId)
          .single();

        if (walletError && walletError.code === 'PGRST116') {
          // Create wallet if it doesn't exist
          // Find a user to own this wallet (first user in the company)
          const { data: users, error: usersError } = await supabase
            .from('users')
            .select('id')
            .eq('company_id', companyId)
            .limit(1);

          if (usersError) {
            throw usersError;
          }
          const ownerId = users && users.length > 0 ? users[0].id : null;
          if (!ownerId) {
            throw new Error('No user found for company to own wallet');
          }

          const { data: newWallet, error: createError } = await supabase
            .from('wallets')
            .insert({
              company_id: companyId,
              user_id: ownerId,
              balance: amount,
              currency: 'USD'
            })
            .select()
            .single();

          if (createError) {
            throw createError;
          }
          wallet = newWallet;
        } else if (walletError) {
          throw walletError;
        } else {
          // Update existing wallet balance
          const { error: updateError } = await supabase
            .from('wallets')
            .update({ 
              balance: wallet.balance + amount,
              updated_at: new Date().toISOString()
            })
            .eq('id', wallet.id);

          if (updateError) {
            throw updateError;
          }
        }

        // Record transaction
        const { error: transactionError } = await supabase
          .from('transactions')
          .insert({
            wallet_id: wallet.id,
            company_id: companyId,
            amount: amount,
            type: 'credit',
            description: `Stripe payment - Session: ${session.id}`,
            reference_id: session.payment_intent as string,
            reference_type: 'stripe_payment',
          });

        if (transactionError) {
          throw transactionError;
        }

        console.log(`Wallet topped up: Company ${companyId}, Amount: $${amount}`);
      }
    }

    // Handle payment intent succeeded (for embedded payments)
    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      
      if (paymentIntent.metadata?.wallet_topup === 'true') {
        const companyId = paymentIntent.metadata.company_id;
        const amount = paymentIntent.amount / 100; // Convert cents to dollars

        // Get or create wallet
        let { data: wallet, error: walletError } = await supabase
          .from('wallets')
          .select('*')
          .eq('company_id', companyId)
          .single();

        if (walletError && walletError.code === 'PGRST116') {
          // Create wallet if it doesn't exist
          const { data: users, error: usersError } = await supabase
            .from('users')
            .select('id')
            .eq('company_id', companyId)
            .limit(1);

          if (usersError) {
            throw usersError;
          }
          const ownerId = users && users.length > 0 ? users[0].id : null;
          if (!ownerId) {
            throw new Error('No user found for company to own wallet');
          }

          const { data: newWallet, error: createError } = await supabase
            .from('wallets')
            .insert({
              company_id: companyId,
              user_id: ownerId,
              balance: amount,
              currency: 'USD'
            })
            .select()
            .single();

          if (createError) {
            throw createError;
          }
          wallet = newWallet;
        } else if (walletError) {
          throw walletError;
        } else {
          // Update existing wallet balance
          const { error: updateError } = await supabase
            .from('wallets')
            .update({ 
              balance: wallet.balance + amount,
              updated_at: new Date().toISOString()
            })
            .eq('id', wallet.id);

          if (updateError) {
            throw updateError;
          }
        }

        // Record transaction
        const { error: transactionError } = await supabase
          .from('transactions')
          .insert({
            wallet_id: wallet.id,
            company_id: companyId,
            amount: amount,
            type: 'credit',
            description: `Stripe payment - Intent: ${paymentIntent.id}`,
            reference_id: paymentIntent.id,
            reference_type: 'stripe_payment_intent',
          });

        if (transactionError) {
          throw transactionError;
        }

        console.log(`Wallet topped up via payment intent: Company ${companyId}, Amount: $${amount}`);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
