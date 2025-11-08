-- Fix security warning: Set search_path for validate_shopify_store_customer function
-- Need to drop trigger first, then function, then recreate both

DROP TRIGGER IF EXISTS check_shopify_store_customer ON shopify_stores;
DROP FUNCTION IF EXISTS validate_shopify_store_customer();

CREATE OR REPLACE FUNCTION validate_shopify_store_customer()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.customer_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM customers 
      WHERE id = NEW.customer_id 
      AND company_id = NEW.company_id
    ) THEN
      RAISE EXCEPTION 'Customer must belong to the same company as the store';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER check_shopify_store_customer
  BEFORE INSERT OR UPDATE ON shopify_stores
  FOR EACH ROW
  EXECUTE FUNCTION validate_shopify_store_customer();