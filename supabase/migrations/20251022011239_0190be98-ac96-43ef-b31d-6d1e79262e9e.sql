-- Fix order #221 partial fulfillment tracking
-- This order has 2 shipments (345, 346) but package_info is NULL

-- First, verify the current state
SELECT 
  os.id,
  os.order_id,
  os.shipment_id,
  os.package_info,
  s.tracking_number,
  s.created_at
FROM order_shipments os
JOIN shipments s ON s.id = os.shipment_id
WHERE os.order_id = 221
ORDER BY s.created_at;

-- Update shipment #345 (first shipment) - shipped 1 WEED EATER
UPDATE order_shipments 
SET package_info = jsonb_build_object(
  'items', jsonb_build_array(
    jsonb_build_object(
      'itemId', '2a35d041-a404-422f-bb28-98e8264cfff1',
      'name', 'WEED EATER',
      'sku', 'BOX001',
      'quantity', 1,
      'dimensions', jsonb_build_object(
        'width', 4,
        'height', 4,
        'length', 38,
        'weight', 35
      )
    )
  ),
  'boxName', 'Small Poly Bag',
  'boxData', jsonb_build_object(
    'name', 'Small Poly Bag',
    'length', 10,
    'width', 8,
    'height', 2
  ),
  'weight', 35,
  'packageIndex', 0
)
WHERE order_id = 221 AND shipment_id = 345;

-- Update shipment #346 (second shipment) - shipped 1 Picture Frame
UPDATE order_shipments 
SET package_info = jsonb_build_object(
  'items', jsonb_build_array(
    jsonb_build_object(
      'itemId', '5e61d482-7002-4015-a2e0-02b247b6a663',
      'name', 'Picture Frame 8x10',
      'sku', 'HOME-002',
      'quantity', 1,
      'dimensions', jsonb_build_object(
        'width', 10,
        'height', 1,
        'length', 12,
        'weight', 1.1
      )
    )
  ),
  'boxName', 'Small Poly Bag',
  'boxData', jsonb_build_object(
    'name', 'Small Poly Bag',
    'length', 10,
    'width', 8,
    'height', 2
  ),
  'weight', 1.1,
  'packageIndex', 0
)
WHERE order_id = 221 AND shipment_id = 346;

-- Manually trigger fulfillment calculation for order 221
SELECT calculate_order_fulfillment(221);

-- Verify the fix worked
SELECT 
  id,
  order_id,
  status,
  fulfillment_status,
  items_total,
  items_shipped,
  fulfillment_percentage,
  items
FROM orders
WHERE id = 221;