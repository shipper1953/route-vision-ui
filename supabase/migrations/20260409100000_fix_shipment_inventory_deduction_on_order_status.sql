-- Deduct on-hand inventory when orders transition to shipped
CREATE OR REPLACE FUNCTION public.apply_order_shipment_deduction(
  p_company_id uuid,
  p_warehouse_id uuid,
  p_items jsonb
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_item jsonb;
  v_item_id uuid;
  v_sku text;
  v_quantity integer;
  v_remaining integer;
  v_level RECORD;
  v_ship_from_level integer;
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
    v_item_id := NULL;

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
      v_sku := NULLIF(BTRIM(COALESCE(v_item->>'sku', v_item->>'SKU', '')), '');

      IF v_sku IS NOT NULL THEN
        SELECT i.id
        INTO v_item_id
        FROM public.items i
        WHERE i.company_id = p_company_id
          AND lower(i.sku) = lower(v_sku)
        ORDER BY i.created_at ASC
        LIMIT 1;
      END IF;
    END IF;

    IF v_item_id IS NULL THEN
      CONTINUE;
    END IF;

    BEGIN
      v_quantity := GREATEST(COALESCE(NULLIF(v_item->>'quantity', '')::integer, 1), 0);
    EXCEPTION WHEN OTHERS THEN
      v_quantity := 1;
    END;

    v_remaining := v_quantity;

    FOR v_level IN
      SELECT id, quantity_on_hand, quantity_available, quantity_allocated
      FROM public.inventory_levels
      WHERE company_id = p_company_id
        AND warehouse_id = p_warehouse_id
        AND item_id = v_item_id
        AND quantity_allocated > 0
      ORDER BY received_date ASC NULLS LAST, created_at ASC
    LOOP
      EXIT WHEN v_remaining <= 0;

      v_ship_from_level := LEAST(v_level.quantity_allocated, v_remaining);

      IF v_ship_from_level <= 0 THEN
        CONTINUE;
      END IF;

      UPDATE public.inventory_levels
      SET
        quantity_on_hand = GREATEST(0, quantity_on_hand - v_ship_from_level),
        quantity_allocated = GREATEST(0, quantity_allocated - v_ship_from_level),
        quantity_available = GREATEST(
          0,
          GREATEST(0, quantity_on_hand - v_ship_from_level) - GREATEST(0, quantity_allocated - v_ship_from_level)
        ),
        updated_at = now()
      WHERE id = v_level.id;

      v_remaining := v_remaining - v_ship_from_level;
    END LOOP;
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
    IF COALESCE(OLD.status, '') <> 'shipped' AND COALESCE(NEW.status, '') = 'shipped' THEN
      PERFORM public.apply_order_shipment_deduction(OLD.company_id, OLD.warehouse_id, OLD.items::jsonb);
      RETURN NEW;
    END IF;

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
