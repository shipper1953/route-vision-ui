ALTER TABLE public.shopify_stores 
  ADD COLUMN IF NOT EXISTS fulfillment_sync_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS inventory_sync_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS product_sync_enabled boolean NOT NULL DEFAULT true;