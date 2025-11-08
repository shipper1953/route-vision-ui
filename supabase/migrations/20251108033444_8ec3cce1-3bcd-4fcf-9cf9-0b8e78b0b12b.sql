-- Fix wallet deduction function to prevent duplicate transactions
-- Insert transaction BEFORE updating balance so the audit trigger can find it

CREATE OR REPLACE FUNCTION public.deduct_from_wallet(
  p_wallet_id UUID,
  p_company_id UUID,
  p_amount NUMERIC,
  p_user_id UUID,
  p_reference_id TEXT,
  p_description TEXT
) RETURNS TABLE(success BOOLEAN, new_balance NUMERIC, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet_id UUID;
  v_current_balance NUMERIC;
  v_new_balance NUMERIC;
BEGIN
  -- Lock the wallet row for update (prevents race conditions)
  SELECT id, balance INTO v_wallet_id, v_current_balance
  FROM wallets
  WHERE (p_wallet_id IS NOT NULL AND id = p_wallet_id) 
     OR (p_wallet_id IS NULL AND company_id = p_company_id)
  FOR UPDATE;
  
  IF v_wallet_id IS NULL THEN
    RETURN QUERY SELECT false, 0.0, 'Wallet not found'::text;
    RETURN;
  END IF;
  
  -- Check sufficient funds
  IF v_current_balance < p_amount THEN
    RETURN QUERY SELECT false, v_current_balance, 
      format('Insufficient funds. Required: $%s, Available: $%s', p_amount, v_current_balance);
    RETURN;
  END IF;
  
  -- CRITICAL FIX: Record transaction BEFORE updating balance
  -- This allows the audit trigger to find the transaction record
  INSERT INTO transactions (wallet_id, company_id, amount, type, description, reference_id, reference_type, created_by)
  VALUES (v_wallet_id, p_company_id, -p_amount, 'debit', p_description, p_reference_id, 'shipping_label', p_user_id);
  
  -- Now atomically deduct funds
  UPDATE wallets
  SET balance = balance - p_amount,
      updated_at = NOW()
  WHERE id = v_wallet_id
  RETURNING balance INTO v_new_balance;
  
  RETURN QUERY SELECT true, v_new_balance, 'Success'::text;
END;
$$;