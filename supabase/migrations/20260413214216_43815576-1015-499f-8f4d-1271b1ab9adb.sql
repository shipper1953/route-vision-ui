
-- Function: Allocate inventory when a new order is inserted with status 'processing'
CREATE OR REPLACE FUNCTION public.allocate_inventory_on_order_create()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  order_item jsonb;
  item_sku text;
  item_qty int;
  matched_item_id uuid;
  inv_record record;
  remaining int;
BEGIN
  -- Only act on new orders with processing status
  IF NEW.status IS DISTINCT FROM 'processing' THEN
    RETURN NEW;
  END IF;

  -- Skip if no company_id or warehouse_id
  IF NEW.company_id IS NULL OR NEW.warehouse_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Loop through each item in the order's items JSONB array
  FOR order_item IN SELECT jsonb_array_elements(NEW.items)
  LOOP
    item_sku := order_item ->> 'sku';
    item_qty := COALESCE((order_item ->> 'quantity')::int, 1);

    IF item_sku IS NULL OR item_sku = '' THEN
      CONTINUE;
    END IF;

    -- Find the item_id from the items table
    SELECT id INTO matched_item_id
    FROM items
    WHERE sku = item_sku
      AND company_id = NEW.company_id
    LIMIT 1;

    IF matched_item_id IS NULL THEN
      CONTINUE;
    END IF;

    -- Allocate using FIFO (oldest received_date first)
    remaining := item_qty;
    FOR inv_record IN
      SELECT id, quantity_available
      FROM inventory_levels
      WHERE item_id = matched_item_id
        AND company_id = NEW.company_id
        AND warehouse_id = NEW.warehouse_id
        AND quantity_available > 0
      ORDER BY received_date ASC
    LOOP
      IF remaining <= 0 THEN
        EXIT;
      END IF;

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

  RETURN NEW;
END;
$$;

-- Function: Deduct on_hand and deallocate when order ships
CREATE OR REPLACE FUNCTION public.deduct_inventory_on_order_ship()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  order_item jsonb;
  item_sku text;
  item_qty int;
  matched_item_id uuid;
  inv_record record;
  remaining int;
BEGIN
  -- Only act when status changes TO 'shipped'
  IF NOT (OLD.status IS DISTINCT FROM 'shipped' AND NEW.status = 'shipped') THEN
    RETURN NEW;
  END IF;

  IF NEW.company_id IS NULL OR NEW.warehouse_id IS NULL THEN
    RETURN NEW;
  END IF;

  FOR order_item IN SELECT jsonb_array_elements(NEW.items)
  LOOP
    item_sku := order_item ->> 'sku';
    item_qty := COALESCE((order_item ->> 'quantity')::int, 1);

    IF item_sku IS NULL OR item_sku = '' THEN
      CONTINUE;
    END IF;

    SELECT id INTO matched_item_id
    FROM items
    WHERE sku = item_sku
      AND company_id = NEW.company_id
    LIMIT 1;

    IF matched_item_id IS NULL THEN
      CONTINUE;
    END IF;

    -- Deduct on_hand and deallocate using FIFO
    remaining := item_qty;
    FOR inv_record IN
      SELECT id, quantity_on_hand, quantity_allocated
      FROM inventory_levels
      WHERE item_id = matched_item_id
        AND company_id = NEW.company_id
        AND warehouse_id = NEW.warehouse_id
        AND quantity_on_hand > 0
      ORDER BY received_date ASC
    LOOP
      IF remaining <= 0 THEN
        EXIT;
      END IF;

      DECLARE
        deduct_qty int;
        dealloc_qty int;
      BEGIN
        deduct_qty := LEAST(inv_record.quantity_on_hand, remaining);
        dealloc_qty := LEAST(inv_record.quantity_allocated, deduct_qty);

        UPDATE inventory_levels
        SET quantity_on_hand = quantity_on_hand - deduct_qty,
            quantity_allocated = GREATEST(quantity_allocated - dealloc_qty, 0),
            quantity_available = (quantity_on_hand - deduct_qty) - GREATEST(quantity_allocated - dealloc_qty, 0),
            updated_at = now()
        WHERE id = inv_record.id;

        remaining := remaining - deduct_qty;
      END;
    END LOOP;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Trigger: allocate on order insert
CREATE TRIGGER trg_allocate_inventory_on_order_create
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.allocate_inventory_on_order_create();

-- Trigger: deduct on order ship
CREATE TRIGGER trg_deduct_inventory_on_order_ship
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.deduct_inventory_on_order_ship();
