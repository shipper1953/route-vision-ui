-- Phase 1: Multi-Store Shopify Support Schema Changes
-- Creates shopify_stores table and migrates existing connections

-- Create shopify_stores table
CREATE TABLE public.shopify_stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Store identity
  store_url TEXT NOT NULL,
  store_name TEXT,
  
  -- Authentication
  access_token TEXT NOT NULL,
  webhook_secret TEXT,
  oauth_state TEXT,
  
  -- Fulfillment service
  fulfillment_service_id TEXT,
  fulfillment_location_id TEXT,
  fulfillment_location_name TEXT,
  
  -- Connection metadata
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  last_sync_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  
  -- Store configuration (inherits from company defaults, stores overrides)
  settings JSONB DEFAULT '{}'::jsonb,
  
  -- Customer identification (for 3PL use case)
  customer_name TEXT,
  customer_email TEXT,
  customer_reference TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(company_id, store_url)
);

-- Create indexes for fast lookups
CREATE INDEX idx_shopify_stores_company ON public.shopify_stores(company_id);
CREATE INDEX idx_shopify_stores_url ON public.shopify_stores(store_url);
CREATE INDEX idx_shopify_stores_active ON public.shopify_stores(company_id, is_active);

-- Add shopify_store_id to related tables
ALTER TABLE public.shopify_order_mappings 
  ADD COLUMN shopify_store_id UUID REFERENCES public.shopify_stores(id) ON DELETE CASCADE;

ALTER TABLE public.shopify_fulfillment_orders 
  ADD COLUMN shopify_store_id UUID REFERENCES public.shopify_stores(id) ON DELETE CASCADE;

ALTER TABLE public.shopify_sync_logs 
  ADD COLUMN shopify_store_id UUID REFERENCES public.shopify_stores(id) ON DELETE SET NULL;

ALTER TABLE public.items 
  ADD COLUMN shopify_store_id UUID REFERENCES public.shopify_stores(id) ON DELETE SET NULL;

-- Migrate existing Shopify connections from companies.settings to shopify_stores
INSERT INTO public.shopify_stores (
  company_id, 
  store_url, 
  access_token, 
  webhook_secret,
  fulfillment_service_id,
  fulfillment_location_id,
  fulfillment_location_name,
  settings,
  customer_name,
  is_active
)
SELECT 
  c.id as company_id,
  c.settings->'shopify'->>'store_url',
  c.settings->'shopify'->>'access_token',
  c.settings->'shopify'->>'webhook_secret',
  c.settings->'shopify'->'fulfillment_service'->>'id',
  c.settings->'shopify'->'fulfillment_service'->>'location_id',
  c.settings->'shopify'->'fulfillment_service'->>'location_name',
  c.settings->'shopify' as settings,
  c.name as customer_name,
  COALESCE((c.settings->'shopify'->>'connected')::boolean, false) as is_active
FROM public.companies c
WHERE c.settings->'shopify' IS NOT NULL
  AND c.settings->'shopify'->>'store_url' IS NOT NULL
  AND c.settings->'shopify'->>'access_token' IS NOT NULL;

-- Update foreign keys in related tables to link to the new shopify_stores
UPDATE public.shopify_order_mappings som
SET shopify_store_id = ss.id
FROM public.shopify_stores ss
WHERE som.company_id = ss.company_id
  AND som.shopify_store_id IS NULL;

UPDATE public.shopify_fulfillment_orders sfo
SET shopify_store_id = ss.id
FROM public.shopify_stores ss
WHERE sfo.company_id = ss.company_id
  AND sfo.shopify_store_id IS NULL;

UPDATE public.shopify_sync_logs ssl
SET shopify_store_id = ss.id
FROM public.shopify_stores ss
WHERE ssl.company_id = ss.company_id
  AND ssl.shopify_store_id IS NULL;

-- Enable RLS on shopify_stores
ALTER TABLE public.shopify_stores ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view stores for their company
CREATE POLICY "Users view company stores" ON public.shopify_stores
  FOR SELECT 
  USING (
    company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid())
  );

-- RLS Policy: Company admins can manage stores
CREATE POLICY "Company admins manage stores" ON public.shopify_stores
  FOR ALL 
  USING (
    company_id IN (
      SELECT company_id FROM public.users 
      WHERE id = auth.uid() 
      AND role IN ('company_admin', 'super_admin')
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.users 
      WHERE id = auth.uid() 
      AND role IN ('company_admin', 'super_admin')
    )
  );

-- RLS Policy: Super admins can view all stores
CREATE POLICY "Super admins view all stores" ON public.shopify_stores
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role = 'super_admin'
    )
  );

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_shopify_stores_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_shopify_stores_updated_at
  BEFORE UPDATE ON public.shopify_stores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_shopify_stores_updated_at();