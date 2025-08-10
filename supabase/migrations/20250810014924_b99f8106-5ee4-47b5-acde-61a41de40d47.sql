-- Phase 1: Shipping rules, preferences, service mappings, analytics events

-- 1) shipping_rules table
CREATE TABLE IF NOT EXISTS public.shipping_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  name TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 100,
  conditions JSONB NOT NULL DEFAULT '{}'::jsonb,
  actions JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.shipping_rules ENABLE ROW LEVEL SECURITY;

-- keep timestamps fresh
CREATE OR REPLACE FUNCTION public.update_shipping_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_shipping_rules_updated_at ON public.shipping_rules;
CREATE TRIGGER trg_update_shipping_rules_updated_at
BEFORE UPDATE ON public.shipping_rules
FOR EACH ROW EXECUTE FUNCTION public.update_shipping_rules_updated_at();

-- RLS
DROP POLICY IF EXISTS "Users can view company shipping rules" ON public.shipping_rules;
CREATE POLICY "Users can view company shipping rules"
ON public.shipping_rules FOR SELECT
USING (company_id = (SELECT users.company_id FROM public.users WHERE users.id = auth.uid()));

DROP POLICY IF EXISTS "Company admins manage company shipping rules" ON public.shipping_rules;
CREATE POLICY "Company admins manage company shipping rules"
ON public.shipping_rules FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid() AND u.company_id = shipping_rules.company_id AND u.role = 'company_admin'::public.app_role
  ) OR EXISTS (
    SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'super_admin'::public.app_role
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid() AND u.company_id = shipping_rules.company_id AND u.role = 'company_admin'::public.app_role
  ) OR EXISTS (
    SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'super_admin'::public.app_role
  )
);


-- 2) company_shipping_prefs table
CREATE TABLE IF NOT EXISTS public.company_shipping_prefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL UNIQUE,
  sla_preference TEXT NOT NULL DEFAULT 'balanced', -- 'fastest' | 'cheapest' | 'balanced'
  delivery_confidence INTEGER NOT NULL DEFAULT 90, -- desired SmartRate percentile
  carrier_whitelist TEXT[] DEFAULT NULL,
  service_blacklist TEXT[] DEFAULT NULL,
  max_transit_days INTEGER DEFAULT NULL,
  optimize_objective TEXT NOT NULL DEFAULT 'balanced', -- aligns with cartonization objective
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.company_shipping_prefs ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.update_company_shipping_prefs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_company_shipping_prefs_updated_at ON public.company_shipping_prefs;
CREATE TRIGGER trg_update_company_shipping_prefs_updated_at
BEFORE UPDATE ON public.company_shipping_prefs
FOR EACH ROW EXECUTE FUNCTION public.update_company_shipping_prefs_updated_at();

-- RLS
DROP POLICY IF EXISTS "Users can view their company shipping prefs" ON public.company_shipping_prefs;
CREATE POLICY "Users can view their company shipping prefs"
ON public.company_shipping_prefs FOR SELECT
USING (company_id = (SELECT users.company_id FROM public.users WHERE users.id = auth.uid()));

DROP POLICY IF EXISTS "Company admins manage company shipping prefs" ON public.company_shipping_prefs;
CREATE POLICY "Company admins manage company shipping prefs"
ON public.company_shipping_prefs FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid() AND u.company_id = company_shipping_prefs.company_id AND u.role = 'company_admin'::public.app_role
  ) OR EXISTS (
    SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'super_admin'::public.app_role
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid() AND u.company_id = company_shipping_prefs.company_id AND u.role = 'company_admin'::public.app_role
  ) OR EXISTS (
    SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'super_admin'::public.app_role
  )
);


-- 3) service_mappings (reference table for normalization)
CREATE TABLE IF NOT EXISTS public.service_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,         -- 'easypost' | 'shippo'
  carrier TEXT NOT NULL,
  service_code TEXT NOT NULL,     -- provider's service string
  normalized_service TEXT NOT NULL, -- e.g., 'ground', '2_day', 'overnight'
  speed_rank INTEGER NOT NULL,    -- lower is faster
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(provider, carrier, service_code)
);

ALTER TABLE public.service_mappings ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.update_service_mappings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_service_mappings_updated_at ON public.service_mappings;
CREATE TRIGGER trg_update_service_mappings_updated_at
BEFORE UPDATE ON public.service_mappings
FOR EACH ROW EXECUTE FUNCTION public.update_service_mappings_updated_at();

-- RLS: view is public for app users; manage by super_admin
DROP POLICY IF EXISTS "Users can view service mappings" ON public.service_mappings;
CREATE POLICY "Users can view service mappings"
ON public.service_mappings FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Super admins manage service mappings" ON public.service_mappings;
CREATE POLICY "Super admins manage service mappings"
ON public.service_mappings FOR ALL
USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'super_admin'::public.app_role))
WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'super_admin'::public.app_role));


-- 4) analytics_events table
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  user_id UUID,
  event_type TEXT NOT NULL, -- e.g., 'rates_shopped', 'rate_recommended', 'label_purchased', 'label_failed'
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- RLS: users can insert, and view their company events
DROP POLICY IF EXISTS "Authenticated users insert analytics events" ON public.analytics_events;
CREATE POLICY "Authenticated users insert analytics events"
ON public.analytics_events FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users view company analytics events" ON public.analytics_events;
CREATE POLICY "Users view company analytics events"
ON public.analytics_events FOR SELECT
USING (
  company_id = (SELECT users.company_id FROM public.users WHERE users.id = auth.uid())
  OR user_id = auth.uid()
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_shipping_rules_company_priority ON public.shipping_rules(company_id, priority DESC);
CREATE INDEX IF NOT EXISTS idx_company_shipping_prefs_company ON public.company_shipping_prefs(company_id);
CREATE INDEX IF NOT EXISTS idx_service_mappings_norm ON public.service_mappings(normalized_service, speed_rank);
CREATE INDEX IF NOT EXISTS idx_analytics_events_company_time ON public.analytics_events(company_id, created_at DESC);
