-- Make user_id nullable to support Shopify webhook orders and other external integrations
ALTER TABLE orders 
ALTER COLUMN user_id DROP NOT NULL;

-- Add a comment explaining why it's nullable
COMMENT ON COLUMN orders.user_id IS 'User who created the order. NULL for orders imported from external sources like Shopify.';