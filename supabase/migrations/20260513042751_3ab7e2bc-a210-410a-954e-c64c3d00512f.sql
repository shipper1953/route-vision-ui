
-- Audit trail table for inventory quantity changes
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  warehouse_id uuid,
  inventory_level_id uuid REFERENCES public.inventory_levels(id) ON DELETE SET NULL,
  item_id uuid,
  location_id uuid,
  transaction_type text NOT NULL,
  quantity_change integer NOT NULL DEFAULT 0,
  quantity_on_hand_before integer,
  quantity_on_hand_after integer,
  quantity_allocated_before integer,
  quantity_allocated_after integer,
  reason_code text,
  notes text,
  source text,
  performed_by uuid,
  lot_number text,
  serial_number text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inv_tx_item ON public.inventory_transactions(item_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inv_tx_level ON public.inventory_transactions(inventory_level_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inv_tx_company ON public.inventory_transactions(company_id, created_at DESC);

ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own company inventory transactions"
ON public.inventory_transactions FOR SELECT TO authenticated
USING (company_id = public.auth_user_company_id() OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Users insert own company inventory transactions"
ON public.inventory_transactions FOR INSERT TO authenticated
WITH CHECK (company_id = public.auth_user_company_id() OR public.has_role(auth.uid(), 'super_admin'));

-- Trigger to auto-log every inventory_levels change
CREATE OR REPLACE FUNCTION public.log_inventory_level_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_change int;
  v_alloc_change int;
  v_type text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.inventory_transactions(
      company_id, warehouse_id, inventory_level_id, item_id, location_id,
      transaction_type, quantity_change,
      quantity_on_hand_before, quantity_on_hand_after,
      quantity_allocated_before, quantity_allocated_after,
      lot_number, serial_number, source
    ) VALUES (
      NEW.company_id, NEW.warehouse_id, NEW.id, NEW.item_id, NEW.location_id,
      'receive', NEW.quantity_on_hand,
      0, NEW.quantity_on_hand,
      0, NEW.quantity_allocated,
      NEW.lot_number, NEW.serial_number, 'inventory_level_insert'
    );
    RETURN NEW;
  END IF;

  v_change := COALESCE(NEW.quantity_on_hand,0) - COALESCE(OLD.quantity_on_hand,0);
  v_alloc_change := COALESCE(NEW.quantity_allocated,0) - COALESCE(OLD.quantity_allocated,0);

  IF v_change = 0 AND v_alloc_change = 0 THEN
    RETURN NEW;
  END IF;

  IF v_change > 0 THEN
    v_type := 'adjust_increase';
  ELSIF v_change < 0 THEN
    v_type := 'adjust_decrease';
  ELSIF v_alloc_change > 0 THEN
    v_type := 'allocate';
  ELSE
    v_type := 'deallocate';
  END IF;

  INSERT INTO public.inventory_transactions(
    company_id, warehouse_id, inventory_level_id, item_id, location_id,
    transaction_type, quantity_change,
    quantity_on_hand_before, quantity_on_hand_after,
    quantity_allocated_before, quantity_allocated_after,
    lot_number, serial_number, source
  ) VALUES (
    NEW.company_id, NEW.warehouse_id, NEW.id, NEW.item_id, NEW.location_id,
    v_type, v_change,
    OLD.quantity_on_hand, NEW.quantity_on_hand,
    OLD.quantity_allocated, NEW.quantity_allocated,
    NEW.lot_number, NEW.serial_number, 'inventory_level_update'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_inventory_level_change ON public.inventory_levels;
CREATE TRIGGER trg_log_inventory_level_change
AFTER INSERT OR UPDATE OF quantity_on_hand, quantity_allocated
ON public.inventory_levels
FOR EACH ROW EXECUTE FUNCTION public.log_inventory_level_change();
