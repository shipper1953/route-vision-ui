-- Ensure order-driven allocation works even when order items only contain SKU values
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
  v_sku text;
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

-- Re-run allocation backfill using the updated SKU-aware matching logic
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
