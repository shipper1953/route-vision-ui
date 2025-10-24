-- Add Global ID columns to items table for GraphQL compatibility
ALTER TABLE items 
ADD COLUMN shopify_product_gid text,
ADD COLUMN shopify_variant_gid text;

-- Create indexes for faster lookups
CREATE INDEX idx_items_shopify_variant_gid ON items(shopify_variant_gid);
CREATE INDEX idx_items_shopify_product_gid ON items(shopify_product_gid);