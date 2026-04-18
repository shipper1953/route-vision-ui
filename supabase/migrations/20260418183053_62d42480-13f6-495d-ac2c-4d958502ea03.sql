-- Credit the $500 Stripe top-up that was paid but not credited (PI: pi_3TNda5PG6Epr77zt2WyV8eR2)
-- Idempotent: only inserts if no transaction exists for this payment intent
DO $$
DECLARE
  v_wallet_id uuid;
  v_company_id uuid := '990e494f-e952-4ab4-b620-fc27727ba984';
  v_pi text := 'pi_3TNda5PG6Epr77zt2WyV8eR2';
  v_amount numeric := 500.00;
BEGIN
  -- Skip if already credited
  IF EXISTS (SELECT 1 FROM public.transactions WHERE reference_id = v_pi AND company_id = v_company_id) THEN
    RAISE NOTICE 'Already credited, skipping';
    RETURN;
  END IF;

  SELECT id INTO v_wallet_id FROM public.wallets WHERE company_id = v_company_id LIMIT 1;
  IF v_wallet_id IS NULL THEN
    RAISE EXCEPTION 'Wallet not found for company %', v_company_id;
  END IF;

  INSERT INTO public.transactions (wallet_id, company_id, amount, type, description, reference_id, reference_type)
  VALUES (v_wallet_id, v_company_id, v_amount, 'credit',
          'Stripe payment - Intent: ' || v_pi || ' (manual reconciliation)',
          v_pi, 'stripe_payment_intent');

  UPDATE public.wallets
  SET balance = balance + v_amount, updated_at = now()
  WHERE id = v_wallet_id;
END $$;