
-- Fix CSO inventory directly: only order 315 (ready_to_ship) has 1 CSO allocated
UPDATE inventory_levels
SET quantity_allocated = 1,
    quantity_on_hand = 37,
    quantity_available = 36,
    updated_at = now()
WHERE id = '53aa35c9-ee71-4ecb-b722-3fd8ee1baace';

-- Recalculate all inventory allocations from scratch based on active orders
-- First, reset all allocations to 0 and set available = on_hand
UPDATE inventory_levels
SET quantity_allocated = 0,
    quantity_available = quantity_on_hand,
    updated_at = now()
WHERE id != '53aa35c9-ee71-4ecb-b722-3fd8ee1baace';

-- Now re-allocate based on active (non-terminal) orders
DO $$
DECLARE
  ord record;
  order_item jsonb;
  item_sku text;
  item_qty int;
  matched_item_id uuid;
  inv_record record;
  remaining int;
BEGIN
  FOR ord IN
    SELECT id, items, company_id, warehouse_id
    FROM orders
    WHERE status NOT IN ('shipped', 'delivered', 'cancelled')
      AND company_id IS NOT NULL
      AND warehouse_id IS NOT NULL
    ORDER BY created_at ASC
  LOOP
    FOR order_item IN SELECT jsonb_array_elements(ord.items)
    LOOP
      item_sku := order_item ->> 'sku';
      item_qty := COALESCE((order_item ->> 'quantity')::int, 1);

      IF item_sku IS NULL OR item_sku = '' THEN
        CONTINUE;
      END IF;

      SELECT id INTO matched_item_id
      FROM items
      WHERE sku = item_sku AND company_id = ord.company_id
      LIMIT 1;

      IF matched_item_id IS NULL THEN
        CONTINUE;
      END IF;

      remaining := item_qty;
      FOR inv_record IN
        SELECT id, quantity_available
        FROM inventory_levels
        WHERE item_id = matched_item_id
          AND company_id = ord.company_id
          AND warehouse_id = ord.warehouse_id
          AND quantity_available > 0
        ORDER BY received_date ASC
      LOOP
        IF remaining <= 0 THEN EXIT; END IF;
        
        DECLARE
          alloc_qty int;
        BEGIN
          alloc_qty := LEAST(inv_record.quantity_available, remaining);
          UPDATE inventory_levels
          SET quantity_allocated = quantity_allocated + alloc_qty,
              quantity_available = quantity_available - alloc_qty,
              updated_at = now()
          WHERE id = inv_record.id;
          remaining := remaining - alloc_qty;
        END;
      END LOOP;
    END LOOP;
  END LOOP;
END $$;
