-- WMS inbound receiving exceptions + putaway + smart cycle counts

ALTER TABLE public.receiving_line_items
  ADD COLUMN IF NOT EXISTS quantity_damaged integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quantity_non_compliant integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quantity_accepted integer,
  ADD COLUMN IF NOT EXISTS non_compliance_reason text,
  ADD COLUMN IF NOT EXISTS putaway_status text NOT NULL DEFAULT 'pending';

UPDATE public.receiving_line_items
SET quantity_accepted = GREATEST(quantity_received - quantity_damaged - quantity_non_compliant, 0)
WHERE quantity_accepted IS NULL;

ALTER TABLE public.receiving_line_items
  ALTER COLUMN quantity_accepted SET DEFAULT 0;

ALTER TABLE public.receiving_line_items
  ADD CONSTRAINT receiving_line_items_non_negative_quantities CHECK (
    quantity_received >= 0
    AND quantity_damaged >= 0
    AND quantity_non_compliant >= 0
    AND quantity_accepted >= 0
    AND quantity_accepted = GREATEST(quantity_received - quantity_damaged - quantity_non_compliant, 0)
  );

CREATE TABLE IF NOT EXISTS public.putaway_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  warehouse_id uuid NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  receiving_line_item_id uuid NOT NULL REFERENCES public.receiving_line_items(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  from_location_id uuid REFERENCES public.warehouse_locations(id) ON DELETE SET NULL,
  to_location_id uuid REFERENCES public.warehouse_locations(id) ON DELETE SET NULL,
  quantity_to_putaway integer NOT NULL,
  quantity_put_away integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  assigned_to uuid REFERENCES auth.users(id),
  started_at timestamptz,
  completed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT putaway_task_qty_non_negative CHECK (quantity_to_putaway >= 0 AND quantity_put_away >= 0)
);

CREATE INDEX IF NOT EXISTS idx_putaway_tasks_company_id ON public.putaway_tasks(company_id);
CREATE INDEX IF NOT EXISTS idx_putaway_tasks_status ON public.putaway_tasks(status);

ALTER TABLE public.putaway_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company putaway tasks"
ON public.putaway_tasks FOR SELECT
USING (company_id = auth_user_company_id());

CREATE POLICY "Users can manage company putaway tasks"
ON public.putaway_tasks FOR ALL
USING (company_id = auth_user_company_id());

CREATE TABLE IF NOT EXISTS public.cycle_count_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  warehouse_id uuid REFERENCES public.warehouses(id) ON DELETE SET NULL,
  name text NOT NULL,
  criteria jsonb NOT NULL DEFAULT '{}'::jsonb,
  frequency text NOT NULL DEFAULT 'daily',
  priority integer NOT NULL DEFAULT 50,
  enabled boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cycle_count_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  warehouse_id uuid REFERENCES public.warehouses(id) ON DELETE SET NULL,
  rule_id uuid REFERENCES public.cycle_count_rules(id) ON DELETE SET NULL,
  location_id uuid REFERENCES public.warehouse_locations(id) ON DELETE SET NULL,
  item_id uuid REFERENCES public.items(id) ON DELETE SET NULL,
  expected_qty integer NOT NULL DEFAULT 0,
  counted_qty integer,
  variance_qty integer,
  status text NOT NULL DEFAULT 'open',
  reason_code text,
  assigned_to uuid REFERENCES auth.users(id),
  counted_by uuid REFERENCES auth.users(id),
  due_date date,
  counted_at timestamptz,
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cycle_count_tasks_company_status ON public.cycle_count_tasks(company_id, status);

ALTER TABLE public.cycle_count_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cycle_count_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company cycle count rules"
ON public.cycle_count_rules FOR SELECT
USING (company_id = auth_user_company_id());

CREATE POLICY "Users can manage company cycle count rules"
ON public.cycle_count_rules FOR ALL
USING (company_id = auth_user_company_id());

CREATE POLICY "Users can view company cycle count tasks"
ON public.cycle_count_tasks FOR SELECT
USING (company_id = auth_user_company_id());

CREATE POLICY "Users can manage company cycle count tasks"
ON public.cycle_count_tasks FOR ALL
USING (company_id = auth_user_company_id());
