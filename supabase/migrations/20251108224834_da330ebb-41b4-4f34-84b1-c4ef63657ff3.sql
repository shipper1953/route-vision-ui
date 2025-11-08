-- Add shopify_store_id column to orders table for store segregation
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS shopify_store_id UUID REFERENCES shopify_stores(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_orders_shopify_store_id ON orders(shopify_store_id);

-- Backfill existing orders with store ID from mappings
UPDATE orders o
SET shopify_store_id = som.shopify_store_id
FROM shopify_order_mappings som
WHERE o.id = som.ship_tornado_order_id
AND o.shopify_store_id IS NULL;