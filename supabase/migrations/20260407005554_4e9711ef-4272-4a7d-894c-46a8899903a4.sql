
ALTER TABLE public.order_cartonization
  ADD COLUMN IF NOT EXISTS score_breakdown JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS rejected_candidates JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS policy_version_id UUID REFERENCES public.decision_policy_versions(id),
  ADD COLUMN IF NOT EXISTS algorithm_version TEXT DEFAULT 'cartonization_v1.0';
