-- Add fulfillment service columns to shopify_stores if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shopify_stores' 
    AND column_name = 'fulfillment_service_id'
  ) THEN
    ALTER TABLE shopify_stores 
    ADD COLUMN fulfillment_service_id TEXT,
    ADD COLUMN fulfillment_service_location_id TEXT;
  END IF;
END $$;