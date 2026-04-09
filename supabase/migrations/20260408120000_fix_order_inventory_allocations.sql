-- Keep inventory allocations in sync with order status transitions
CREATE OR REPLACE FUNCTION public.order_status_requires_inventory_allocation(order_status text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(order_status, '') IN ('ready_to_ship', 'processing');
$$;

CREATE OR REPLACE FUNCTION public.apply_order_inventory_allocation(
  p_company_id uuid,
  p_warehouse_id uuid,
  p_items jsonb,
  p_direction integer
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_item jsonb;
  v_item_id uuid;
  v_quantity integer;
  v_delta integer;
BEGIN
  IF p_company_id IS NULL OR p_warehouse_id IS NULL OR p_items IS NULL THEN
    RETURN;
  END IF;

  FOR v_item IN
    SELECT value
    FROM jsonb_array_elements(
      CASE
        WHEN jsonb_typeof(p_items) = 'array' THEN p_items
        ELSE jsonb_build_array(p_items)
      END
    )
  LOOP
    BEGIN
      v_item_id := COALESCE(
        NULLIF(v_item->>'itemId', '')::uuid,
        NULLIF(v_item->>'item_id', '')::uuid,
        NULLIF(v_item->>'id', '')::uuid
      );
    EXCEPTION WHEN OTHERS THEN
      v_item_id := NULL;
    END;

    IF v_item_id IS NULL THEN
      CONTINUE;
    END IF;

    BEGIN
      v_quantity := GREATEST(COALESCE(NULLIF(v_item->>'quantity', '')::integer, 1), 0);
    EXCEPTION WHEN OTHERS THEN
      v_quantity := 1;
    END;

    v_delta := p_direction * v_quantity;

    UPDATE public.inventory_levels
    SET
      quantity_allocated = GREATEST(0, quantity_allocated + v_delta),
      quantity_available = GREATEST(0, quantity_on_hand - GREATEST(0, quantity_allocated + v_delta)),
      updated_at = now()
    WHERE company_id = p_company_id
      AND warehouse_id = p_warehouse_id
      AND item_id = v_item_id;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_inventory_allocations_from_orders()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF public.order_status_requires_inventory_allocation(NEW.status) THEN
      PERFORM public.apply_order_inventory_allocation(NEW.company_id, NEW.warehouse_id, NEW.items::jsonb, 1);
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF public.order_status_requires_inventory_allocation(OLD.status) THEN
      PERFORM public.apply_order_inventory_allocation(OLD.company_id, OLD.warehouse_id, OLD.items::jsonb, -1);
    END IF;

    IF public.order_status_requires_inventory_allocation(NEW.status) THEN
      PERFORM public.apply_order_inventory_allocation(NEW.company_id, NEW.warehouse_id, NEW.items::jsonb, 1);
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF public.order_status_requires_inventory_allocation(OLD.status) THEN
      PERFORM public.apply_order_inventory_allocation(OLD.company_id, OLD.warehouse_id, OLD.items::jsonb, -1);
    END IF;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_inventory_allocations_from_orders ON public.orders;

CREATE TRIGGER trigger_sync_inventory_allocations_from_orders
AFTER INSERT OR UPDATE OR DELETE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.sync_inventory_allocations_from_orders();

-- Backfill allocations for existing orders
UPDATE public.inventory_levels
SET
  quantity_allocated = 0,
  quantity_available = quantity_on_hand,
  updated_at = now();

DO $$
DECLARE
  v_order RECORD;
BEGIN
  FOR v_order IN
    SELECT company_id, warehouse_id, items
    FROM public.orders
    WHERE public.order_status_requires_inventory_allocation(status)
      AND company_id IS NOT NULL
      AND warehouse_id IS NOT NULL
  LOOP
    PERFORM public.apply_order_inventory_allocation(v_order.company_id, v_order.warehouse_id, v_order.items::jsonb, 1);
  END LOOP;
END;
$$;
