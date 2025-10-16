-- Create Shopify Orders Mapping Table
CREATE TABLE IF NOT EXISTS public.shopify_order_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  ship_tornado_order_id BIGINT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  shopify_order_id TEXT NOT NULL,
  shopify_order_number TEXT,
  sync_status TEXT NOT NULL DEFAULT 'synced',
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE(company_id, shopify_order_id)
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_shopify_mappings_company ON public.shopify_order_mappings(company_id);
CREATE INDEX IF NOT EXISTS idx_shopify_mappings_st_order ON public.shopify_order_mappings(ship_tornado_order_id);
CREATE INDEX IF NOT EXISTS idx_shopify_mappings_shopify_order ON public.shopify_order_mappings(shopify_order_id);

-- Enable RLS on shopify_order_mappings
ALTER TABLE public.shopify_order_mappings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for shopify_order_mappings
CREATE POLICY "Users view company shopify mappings" ON public.shopify_order_mappings
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid())
  );

CREATE POLICY "System can insert shopify mappings" ON public.shopify_order_mappings
  FOR INSERT WITH CHECK (true);

-- Create Shopify Sync Logs Table
CREATE TABLE IF NOT EXISTS public.shopify_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL,
  direction TEXT NOT NULL,
  status TEXT NOT NULL,
  shopify_order_id TEXT,
  ship_tornado_order_id BIGINT,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for sync logs
CREATE INDEX IF NOT EXISTS idx_sync_logs_company ON public.shopify_sync_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_created ON public.shopify_sync_logs(created_at DESC);

-- Enable RLS on shopify_sync_logs
ALTER TABLE public.shopify_sync_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for shopify_sync_logs
CREATE POLICY "Users view company sync logs" ON public.shopify_sync_logs
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid())
  );

CREATE POLICY "System can insert sync logs" ON public.shopify_sync_logs
  FOR INSERT WITH CHECK (true);

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.shopify_order_mappings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shopify_sync_logs;