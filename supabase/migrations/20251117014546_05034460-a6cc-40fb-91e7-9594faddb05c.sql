-- Add Shopify destination location tracking to purchase_orders
ALTER TABLE purchase_orders
ADD COLUMN IF NOT EXISTS shopify_destination_location_id TEXT,
ADD COLUMN IF NOT EXISTS shopify_destination_location_name TEXT;

-- Add index for destination lookup
CREATE INDEX IF NOT EXISTS idx_purchase_orders_shopify_destination 
ON purchase_orders(shopify_destination_location_id) 
WHERE shopify_destination_location_id IS NOT NULL;

-- Add comment
COMMENT ON COLUMN purchase_orders.shopify_destination_location_id IS 'Shopify location ID where items should be received';
COMMENT ON COLUMN purchase_orders.shopify_destination_location_name IS 'Display name of Shopify destination location';