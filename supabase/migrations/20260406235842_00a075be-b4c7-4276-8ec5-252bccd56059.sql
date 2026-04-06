
-- 1. Decision policy versions table
CREATE TABLE public.decision_policy_versions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  policy_type text NOT NULL CHECK (policy_type IN ('packaging', 'rate', 'service_constraint')),
  version_number integer NOT NULL DEFAULT 1,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  UNIQUE(company_id, policy_type, version_number)
);

ALTER TABLE public.decision_policy_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company policy versions" ON public.decision_policy_versions
  FOR SELECT USING (company_id = auth_user_company_id() OR auth_user_role() = 'super_admin');

CREATE POLICY "Company admins can manage policy versions" ON public.decision_policy_versions
  FOR ALL USING (
    (company_id = auth_user_company_id() AND auth_user_role() IN ('company_admin', 'super_admin'))
    OR auth_user_role() = 'super_admin'
  ) WITH CHECK (
    (company_id = auth_user_company_id() AND auth_user_role() IN ('company_admin', 'super_admin'))
    OR auth_user_role() = 'super_admin'
  );

-- 2. Tenant packaging policies
CREATE TABLE public.tenant_packaging_policies (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  optimization_objective text NOT NULL DEFAULT 'smallest_fit' CHECK (optimization_objective IN ('smallest_fit', 'lowest_landed_cost', 'damage_risk_min')),
  tie_breaker_order jsonb NOT NULL DEFAULT '["smallest_volume", "lowest_dim_weight", "lowest_cost"]'::jsonb,
  max_void_ratio numeric DEFAULT 0.6,
  fragility_rules jsonb DEFAULT '{}'::jsonb,
  custom_rules jsonb DEFAULT '[]'::jsonb,
  policy_version_id uuid REFERENCES public.decision_policy_versions(id),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id)
);

ALTER TABLE public.tenant_packaging_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company packaging policies" ON public.tenant_packaging_policies
  FOR SELECT USING (company_id = auth_user_company_id() OR auth_user_role() = 'super_admin');

CREATE POLICY "Company admins can manage packaging policies" ON public.tenant_packaging_policies
  FOR ALL USING (
    (company_id = auth_user_company_id() AND auth_user_role() IN ('company_admin', 'super_admin'))
    OR auth_user_role() = 'super_admin'
  ) WITH CHECK (
    (company_id = auth_user_company_id() AND auth_user_role() IN ('company_admin', 'super_admin'))
    OR auth_user_role() = 'super_admin'
  );

-- 3. Tenant rate policies
CREATE TABLE public.tenant_rate_policies (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  allowed_carriers text[] DEFAULT NULL,
  denied_services text[] DEFAULT NULL,
  max_transit_days integer DEFAULT NULL,
  min_ontime_score numeric DEFAULT NULL,
  insurance_threshold numeric DEFAULT 100,
  signature_threshold numeric DEFAULT 500,
  preferred_objective text NOT NULL DEFAULT 'best_value' CHECK (preferred_objective IN ('cheapest', 'fastest', 'best_value')),
  policy_version_id uuid REFERENCES public.decision_policy_versions(id),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id)
);

ALTER TABLE public.tenant_rate_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company rate policies" ON public.tenant_rate_policies
  FOR SELECT USING (company_id = auth_user_company_id() OR auth_user_role() = 'super_admin');

CREATE POLICY "Company admins can manage rate policies" ON public.tenant_rate_policies
  FOR ALL USING (
    (company_id = auth_user_company_id() AND auth_user_role() IN ('company_admin', 'super_admin'))
    OR auth_user_role() = 'super_admin'
  ) WITH CHECK (
    (company_id = auth_user_company_id() AND auth_user_role() IN ('company_admin', 'super_admin'))
    OR auth_user_role() = 'super_admin'
  );

-- 4. Shipment decisions (immutable audit log)
CREATE TABLE public.shipment_decisions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  order_id bigint REFERENCES public.orders(id),
  shipment_id bigint REFERENCES public.shipments(id),
  decision_type text NOT NULL CHECK (decision_type IN ('packaging', 'rate')),
  inputs_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  outputs_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  explanation jsonb DEFAULT '{}'::jsonb,
  reason_code text,
  algorithm_version text NOT NULL DEFAULT '1.0.0',
  policy_version_id uuid REFERENCES public.decision_policy_versions(id),
  degraded_mode boolean NOT NULL DEFAULT false,
  degraded_providers text[] DEFAULT NULL,
  overridden boolean NOT NULL DEFAULT false,
  override_reason text,
  override_category text,
  processing_time_ms integer,
  confidence integer,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.shipment_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company decisions" ON public.shipment_decisions
  FOR SELECT USING (company_id = auth_user_company_id() OR auth_user_role() = 'super_admin');

CREATE POLICY "Users can insert company decisions" ON public.shipment_decisions
  FOR INSERT WITH CHECK (
    company_id = auth_user_company_id() OR auth_user_role() = 'super_admin'
  );

CREATE POLICY "Super admins can manage all decisions" ON public.shipment_decisions
  FOR ALL USING (auth_user_role() = 'super_admin')
  WITH CHECK (auth_user_role() = 'super_admin');

-- Index for fast lookups
CREATE INDEX idx_shipment_decisions_order ON public.shipment_decisions(order_id);
CREATE INDEX idx_shipment_decisions_company ON public.shipment_decisions(company_id, decision_type);

-- 5. Shipment override reason lookup
CREATE TABLE public.shipment_override_reasons (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  code text NOT NULL,
  label text NOT NULL,
  description text,
  applies_to text NOT NULL DEFAULT 'both' CHECK (applies_to IN ('packaging', 'rate', 'both')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.shipment_override_reasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view override reasons" ON public.shipment_override_reasons
  FOR SELECT USING (company_id IS NULL OR company_id = auth_user_company_id() OR auth_user_role() = 'super_admin');

CREATE POLICY "Company admins can manage override reasons" ON public.shipment_override_reasons
  FOR ALL USING (
    (company_id = auth_user_company_id() AND auth_user_role() IN ('company_admin', 'super_admin'))
    OR auth_user_role() = 'super_admin'
  ) WITH CHECK (
    (company_id = auth_user_company_id() AND auth_user_role() IN ('company_admin', 'super_admin'))
    OR auth_user_role() = 'super_admin'
  );

-- Seed default override reasons (global, not company-specific)
INSERT INTO public.shipment_override_reasons (company_id, code, label, description, applies_to) VALUES
  (NULL, 'customer_request', 'Customer Request', 'Customer specifically requested different packaging or shipping', 'both'),
  (NULL, 'fragile_item', 'Fragile Item', 'Items require extra protection beyond algorithm recommendation', 'packaging'),
  (NULL, 'carrier_preference', 'Carrier Preference', 'Customer or business prefers a specific carrier', 'rate'),
  (NULL, 'box_unavailable', 'Box Unavailable', 'Recommended box is out of stock', 'packaging'),
  (NULL, 'special_dimensions', 'Special Dimensions', 'Items have unusual dimensions not well handled by algorithm', 'packaging'),
  (NULL, 'expedite_required', 'Expedite Required', 'Faster shipping needed than originally recommended', 'rate'),
  (NULL, 'cost_override', 'Cost Override', 'Manager approved different cost option', 'rate'),
  (NULL, 'hazmat_compliance', 'Hazmat Compliance', 'Hazardous materials require specific packaging/carrier', 'both');

-- Add updated_at triggers
CREATE TRIGGER update_decision_policy_versions_updated_at
  BEFORE UPDATE ON public.decision_policy_versions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tenant_packaging_policies_updated_at
  BEFORE UPDATE ON public.tenant_packaging_policies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tenant_rate_policies_updated_at
  BEFORE UPDATE ON public.tenant_rate_policies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shipment_override_reasons_updated_at
  BEFORE UPDATE ON public.shipment_override_reasons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
