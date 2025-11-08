-- Add customer_id foreign key to shopify_stores table
ALTER TABLE shopify_stores 
ADD COLUMN customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX idx_shopify_stores_customer_id ON shopify_stores(customer_id);

-- Add helpful comment
COMMENT ON COLUMN shopify_stores.customer_id IS 'Links Shopify store to 3PL customer for inventory isolation';

-- Add validation function to ensure customer belongs to same company as store
CREATE OR REPLACE FUNCTION validate_shopify_store_customer()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Create trigger to validate customer-company relationship
CREATE TRIGGER check_shopify_store_customer
  BEFORE INSERT OR UPDATE ON shopify_stores
  FOR EACH ROW
  EXECUTE FUNCTION validate_shopify_store_customer();