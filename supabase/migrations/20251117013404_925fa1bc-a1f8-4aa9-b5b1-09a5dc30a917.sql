-- Add shopify_location_id to warehouses table for mapping WMS warehouses to Shopify locations
ALTER TABLE public.warehouses
ADD COLUMN IF NOT EXISTS shopify_location_id text;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_warehouses_shopify_location 
ON public.warehouses(shopify_location_id) 
WHERE shopify_location_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.warehouses.shopify_location_id IS 'Maps warehouse to Shopify location ID for inventory sync';