-- Add customer_id column to items table
ALTER TABLE items 
ADD COLUMN customer_id uuid REFERENCES customers(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX idx_items_customer_id ON items(customer_id);

-- Add composite index for company + customer queries
CREATE INDEX idx_items_company_customer ON items(company_id, customer_id);

-- Create function to validate customer belongs to same company
CREATE OR REPLACE FUNCTION validate_item_customer_company()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.customer_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM customers 
      WHERE customers.id = NEW.customer_id 
      AND customers.company_id = NEW.company_id
    ) THEN
      RAISE EXCEPTION 'Customer must belong to the same company as the item';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate customer-company relationship
CREATE TRIGGER validate_item_customer_company_trigger
BEFORE INSERT OR UPDATE ON items
FOR EACH ROW
EXECUTE FUNCTION validate_item_customer_company();