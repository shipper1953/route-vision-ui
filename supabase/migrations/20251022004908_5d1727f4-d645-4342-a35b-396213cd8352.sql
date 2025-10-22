-- Fix the calculate_order_fulfillment function to properly calculate shipped items
CREATE OR REPLACE FUNCTION public.calculate_order_fulfillment(p_order_id bigint)
 RETURNS TABLE(items_total integer, items_shipped integer, fulfillment_percentage numeric, fulfillment_status text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  
  -- Calculate shipped items from all shipments - FIX: use cross join properly
  SELECT COALESCE(SUM((shipped_item->>'quantity')::integer), 0)
  INTO v_items_shipped
  FROM order_shipments os
  CROSS JOIN LATERAL jsonb_array_elements(os.package_info->'items') AS shipped_item
  WHERE os.order_id = p_order_id
    AND os.package_info IS NOT NULL
    AND jsonb_typeof(os.package_info->'items') = 'array';
  
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
$function$;

-- Fix RLS policy for order_shipments to allow service role inserts
DROP POLICY IF EXISTS "Users can insert company order shipments" ON order_shipments;

CREATE POLICY "Users can insert company order shipments" 
ON order_shipments 
FOR INSERT
WITH CHECK (
  -- Allow if using service role (edge functions)
  (auth.jwt() ->> 'role' = 'service_role')
  OR
  -- Allow if user is inserting for their company's order
  (EXISTS (
    SELECT 1
    FROM orders o
    JOIN users u ON u.id = auth.uid()
    WHERE o.id = order_shipments.order_id 
    AND o.company_id = u.company_id
  ))
);

-- Insert missing order_shipments record for order #219 / shipment #341
INSERT INTO order_shipments (order_id, shipment_id, package_index, package_info)
VALUES (
  219,
  341,
  0,
  '{
    "boxName": "Box-12x10x5",
    "boxDimensions": {"length": 12, "width": 10, "height": 5},
    "items": [
      {"itemId": "c03a505d-9681-4062-a88a-a608c479c884", "name": "Art Supplies Kit", "sku": "ART-001", "quantity": 1},
      {"itemId": "3e60a0e6-67bb-45a9-99f9-5ae3090a0463", "name": "BIG FLAG", "sku": "FLAG001", "quantity": 1}
    ],
    "weight": 7
  }'::jsonb
)
ON CONFLICT DO NOTHING;