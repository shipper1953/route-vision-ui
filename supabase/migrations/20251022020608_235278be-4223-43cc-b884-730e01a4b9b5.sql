-- Create atomic wallet deduction function to prevent race conditions
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
  
  -- Atomically deduct funds
  UPDATE wallets
  SET balance = balance - p_amount,
      updated_at = NOW()
  WHERE id = v_wallet_id
  RETURNING balance INTO v_new_balance;
  
  -- Record transaction
  INSERT INTO transactions (wallet_id, company_id, amount, type, description, reference_id, reference_type, created_by)
  VALUES (v_wallet_id, p_company_id, -p_amount, 'debit', p_description, p_reference_id, 'shipping_label', p_user_id);
  
  RETURN QUERY SELECT true, v_new_balance, 'Success'::text;
END;
$$;

-- Create audit trail trigger function
CREATE OR REPLACE FUNCTION public.log_wallet_balance_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only log if balance actually changed
  IF NEW.balance != OLD.balance THEN
    -- Verify transaction record exists (within 5 seconds)
    IF NOT EXISTS (
      SELECT 1 FROM transactions
      WHERE wallet_id = NEW.id
      AND created_at >= NOW() - INTERVAL '5 seconds'
      AND ABS(amount - (NEW.balance - OLD.balance)) < 0.01
    ) THEN
      -- Log suspicious balance change without transaction
      INSERT INTO transactions (wallet_id, company_id, amount, type, description, reference_type, created_by)
      VALUES (
        NEW.id,
        NEW.company_id,
        NEW.balance - OLD.balance,
        CASE WHEN NEW.balance > OLD.balance THEN 'credit' ELSE 'debit' END,
        'SYSTEM: Undocumented balance change detected',
        'audit_trail',
        NEW.user_id
      );
      
      RAISE WARNING 'Wallet % balance changed without transaction record: % -> %', 
        NEW.id, OLD.balance, NEW.balance;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Apply audit trail trigger to wallets table
DROP TRIGGER IF EXISTS enforce_wallet_audit_trail ON wallets;
CREATE TRIGGER enforce_wallet_audit_trail
AFTER UPDATE OF balance ON wallets
FOR EACH ROW
EXECUTE FUNCTION log_wallet_balance_change();