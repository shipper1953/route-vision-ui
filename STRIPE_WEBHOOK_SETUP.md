# Stripe Webhook Configuration

## Critical: Your Stripe webhook is not configured, which is why you're seeing zero logs since July.

### Step 1: Configure Webhook in Stripe Dashboard

1. Go to your [Stripe Dashboard](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Set the endpoint URL to: `https://gidrlosmhpvdcogrkidj.supabase.co/functions/v1/stripe-webhook`
4. Select these events:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
5. Copy the webhook signing secret

### Step 2: Update Webhook Secret

The webhook secret in your Supabase secrets should match the one from Stripe Dashboard.

### Step 3: Test the Webhook

1. Make a test payment through your embedded Stripe form
2. Check the webhook logs in Stripe Dashboard
3. Verify the wallet balance updates correctly

## Why This Broke

The webhook configuration in Stripe Dashboard needs to be manually set up and wasn't pointing to your Supabase edge function. This is why payments worked (Stripe processed them) but your wallet balances weren't updating (webhook wasn't triggered).

## Current Status

- ✅ Stripe edge functions are properly configured
- ✅ Embedded payment dialog is now restored
- ❌ Webhook endpoint needs configuration in Stripe Dashboard
- ❌ Webhook secret verification needs to match

Once you configure the webhook in Stripe Dashboard, the embedded payments should work end-to-end and wallet balances will update automatically.