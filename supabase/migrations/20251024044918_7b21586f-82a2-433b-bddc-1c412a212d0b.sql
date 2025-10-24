-- Add Shopify product/variant tracking to items table
ALTER TABLE items 
ADD COLUMN shopify_product_id text,
ADD COLUMN shopify_variant_id text;

-- Add indexes for fast lookups when webhooks arrive
CREATE INDEX idx_items_shopify_product_id ON items(company_id, shopify_product_id);
CREATE INDEX idx_items_shopify_variant_id ON items(company_id, shopify_variant_id);

-- Add comments explaining the fields
COMMENT ON COLUMN items.shopify_product_id IS 'Shopify product ID for synced products. Used for matching orders to Item Master.';
COMMENT ON COLUMN items.shopify_variant_id IS 'Shopify variant ID for synced products. More specific than product_id for variants.';