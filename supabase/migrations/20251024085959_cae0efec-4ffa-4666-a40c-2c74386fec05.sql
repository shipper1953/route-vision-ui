-- Create shopify_fulfillment_orders table for tracking Shopify fulfillment orders
CREATE TABLE IF NOT EXISTS shopify_fulfillment_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  ship_tornado_order_id BIGINT REFERENCES orders(id) ON DELETE SET NULL,
  shopify_order_id TEXT NOT NULL,
  fulfillment_order_id TEXT NOT NULL UNIQUE,
  fulfillment_order_number TEXT,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'open',
  request_status TEXT,
  
  -- Line items from Shopify
  line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Fulfillment tracking
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  fulfilled_at TIMESTAMP WITH TIME ZONE,
  fulfillment_id TEXT,
  
  -- Location
  assigned_location_id TEXT,
  
  -- Metadata
  destination JSONB,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_shopify_fo_company ON shopify_fulfillment_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_shopify_fo_st_order ON shopify_fulfillment_orders(ship_tornado_order_id);
CREATE INDEX IF NOT EXISTS idx_shopify_fo_status ON shopify_fulfillment_orders(status);
CREATE INDEX IF NOT EXISTS idx_shopify_fo_shopify_order ON shopify_fulfillment_orders(shopify_order_id);

-- Enable RLS
ALTER TABLE shopify_fulfillment_orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Companies view own fulfillment orders"
  ON shopify_fulfillment_orders FOR SELECT
  USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "System can insert fulfillment orders"
  ON shopify_fulfillment_orders FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update fulfillment orders"
  ON shopify_fulfillment_orders FOR UPDATE
  USING (true);

-- Add comment for documentation
COMMENT ON TABLE shopify_fulfillment_orders IS 'Tracks Shopify fulfillment orders assigned to Ship Tornado as a fulfillment service';