-- Part A: Rename "processing" status to "ready_to_ship"
UPDATE orders 
SET status = 'ready_to_ship' 
WHERE status = 'processing';

-- Part B Phase 1: Add fulfillment tracking columns to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS fulfillment_status TEXT DEFAULT 'unfulfilled',
ADD COLUMN IF NOT EXISTS items_shipped INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS items_total INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS fulfillment_percentage NUMERIC DEFAULT 0;

-- Calculate items_total for existing orders (handle both array and scalar)
UPDATE orders 
SET items_total = CASE
  WHEN jsonb_typeof(items) = 'array' THEN (
    SELECT COALESCE(SUM((item->>'quantity')::integer), 0)
    FROM jsonb_array_elements(items) AS item
  )
  WHEN jsonb_typeof(items) = 'number' THEN items::integer
  ELSE 0
END
WHERE items_total = 0 AND items IS NOT NULL;

-- Create function to calculate order fulfillment
CREATE OR REPLACE FUNCTION calculate_order_fulfillment(p_order_id BIGINT)
RETURNS TABLE(
  items_total INTEGER,
  items_shipped INTEGER,
  fulfillment_percentage NUMERIC,
  fulfillment_status TEXT
) AS $$
DECLARE
  v_items_total INTEGER;
  v_items_shipped INTEGER;
  v_percentage NUMERIC;
  v_status TEXT;
  v_items_type TEXT;
BEGIN
  -- Get items type and calculate total
  SELECT jsonb_typeof(o.items) INTO v_items_type
  FROM orders o
  WHERE o.id = p_order_id;
  
  IF v_items_type = 'array' THEN
    SELECT COALESCE(SUM((item->>'quantity')::integer), 0)
    INTO v_items_total
    FROM orders o,
         jsonb_array_elements(o.items) AS item
    WHERE o.id = p_order_id;
  ELSIF v_items_type = 'number' THEN
    SELECT items::integer INTO v_items_total
    FROM orders WHERE id = p_order_id;
  ELSE
    v_items_total := 0;
  END IF;
  
  -- Calculate shipped items from all shipments
  SELECT COALESCE(SUM((item->>'quantity')::integer), 0)
  INTO v_items_shipped
  FROM order_shipments os
  WHERE os.order_id = p_order_id
    AND os.package_info IS NOT NULL
    AND jsonb_typeof(os.package_info->'items') = 'array'
    AND jsonb_array_length(os.package_info->'items') > 0
    AND EXISTS (
      SELECT 1 FROM jsonb_array_elements(os.package_info->'items') AS item
    );
  
  -- If no shipped items found, set to 0
  v_items_shipped := COALESCE(v_items_shipped, 0);
  
  -- Calculate percentage
  IF v_items_total > 0 THEN
    v_percentage := ROUND((v_items_shipped::NUMERIC / v_items_total::NUMERIC * 100)::NUMERIC, 2);
  ELSE
    v_percentage := 0;
  END IF;
  
  -- Determine status
  IF v_items_shipped = 0 THEN
    v_status := 'unfulfilled';
  ELSIF v_items_shipped < v_items_total THEN
    v_status := 'partially_fulfilled';
  ELSE
    v_status := 'fulfilled';
  END IF;
  
  RETURN QUERY SELECT v_items_total, v_items_shipped, v_percentage, v_status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public;

-- Create trigger function to auto-update fulfillment
CREATE OR REPLACE FUNCTION update_order_fulfillment_on_shipment_change()
RETURNS TRIGGER AS $$
DECLARE
  v_fulfillment RECORD;
  v_order_id BIGINT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_order_id := OLD.order_id;
  ELSE
    v_order_id := NEW.order_id;
  END IF;
  
  SELECT * INTO v_fulfillment
  FROM calculate_order_fulfillment(v_order_id);
  
  UPDATE orders
  SET items_shipped = v_fulfillment.items_shipped,
      items_total = v_fulfillment.items_total,
      fulfillment_percentage = v_fulfillment.fulfillment_percentage,
      fulfillment_status = v_fulfillment.fulfillment_status,
      status = CASE 
        WHEN v_fulfillment.fulfillment_status = 'fulfilled' THEN 'shipped'
        WHEN v_fulfillment.fulfillment_status = 'partially_fulfilled' THEN 'partially_fulfilled'
        WHEN v_fulfillment.fulfillment_status = 'unfulfilled' AND status NOT IN ('cancelled', 'on_hold') THEN 'ready_to_ship'
        ELSE status
      END
  WHERE id = v_order_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_order_fulfillment ON order_shipments;
CREATE TRIGGER trigger_update_order_fulfillment
AFTER INSERT OR UPDATE OR DELETE ON order_shipments
FOR EACH ROW
EXECUTE FUNCTION update_order_fulfillment_on_shipment_change();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_orders_fulfillment_status ON orders(fulfillment_status);
CREATE INDEX IF NOT EXISTS idx_order_shipments_order_id ON order_shipments(order_id);