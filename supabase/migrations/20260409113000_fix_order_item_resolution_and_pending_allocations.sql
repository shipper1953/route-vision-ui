-- Improve order item resolution for allocation/deduction and include pending orders in allocation scope
CREATE OR REPLACE FUNCTION public.order_status_requires_inventory_allocation(order_status text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(order_status, '') IN ('ready_to_ship', 'processing', 'pending');
$$;

CREATE OR REPLACE FUNCTION public.resolve_order_item_id(
  p_company_id uuid,
  p_item jsonb
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_item_id uuid;
  v_sku text;
  v_variant_id text;
  v_product_id text;
BEGIN
  IF p_company_id IS NULL OR p_item IS NULL THEN
    RETURN NULL;
  END IF;

  BEGIN
    v_item_id := COALESCE(
      NULLIF(p_item->>'itemId', '')::uuid,
      NULLIF(p_item->>'item_id', '')::uuid,
      NULLIF(p_item->>'id', '')::uuid
    );
  EXCEPTION WHEN OTHERS THEN
    v_item_id := NULL;
  END;

  IF v_item_id IS NOT NULL THEN
    RETURN v_item_id;
  END IF;

  v_sku := NULLIF(BTRIM(COALESCE(p_item->>'sku', p_item->>'SKU', '')), '');
  v_variant_id := NULLIF(BTRIM(COALESCE(p_item->>'variant_id', p_item->>'variantId', p_item->>'shopify_variant_id', '')), '');
  v_product_id := NULLIF(BTRIM(COALESCE(p_item->>'product_id', p_item->>'productId', p_item->>'shopify_product_id', '')), '');

  SELECT i.id
  INTO v_item_id
  FROM public.items i
  WHERE i.company_id = p_company_id
    AND (
      (v_variant_id IS NOT NULL AND i.shopify_variant_id = v_variant_id)
      OR (v_product_id IS NOT NULL AND i.shopify_product_id = v_product_id)
      OR (v_sku IS NOT NULL AND lower(i.sku) = lower(v_sku))
    )
  ORDER BY
    CASE
      WHEN v_variant_id IS NOT NULL AND i.shopify_variant_id = v_variant_id THEN 0
      WHEN v_product_id IS NOT NULL AND i.shopify_product_id = v_product_id THEN 1
      WHEN v_sku IS NOT NULL AND lower(i.sku) = lower(v_sku) THEN 2
      ELSE 3
    END,
    i.created_at ASC
  LIMIT 1;

  RETURN v_item_id;
END;
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
    v_item_id := public.resolve_order_item_id(p_company_id, v_item);

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
    v_item_id := public.resolve_order_item_id(p_company_id, v_item);

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

-- Rebuild allocations with expanded status coverage + improved item resolution.
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
