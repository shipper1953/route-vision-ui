-- Backfill package_info for Order 222's shipments
-- Each shipment contains 1 WEED EATER item (itemId: 2a35d041-a404-422f-bb28-98e8264cfff1)
-- This will allow the calculate_order_fulfillment trigger to properly track partial fulfillment

UPDATE order_shipments
SET package_info = jsonb_build_object(
  'boxName', 'Long Box',
  'boxDimensions', jsonb_build_object(
    'length', 38,
    'width', 4,
    'height', 4
  ),
  'items', jsonb_build_array(
    jsonb_build_object(
      'itemId', '2a35d041-a404-422f-bb28-98e8264cfff1',
      'name', 'WEED EATER',
      'sku', 'BOX001',
      'quantity', 1,
      'unitPrice', 350,
      'dimensions', jsonb_build_object(
        'length', 38,
        'width', 4,
        'height', 4,
        'weight', 35
      )
    )
  ),
  'weight', 35
)
WHERE order_id = 222 AND shipment_id IN (350, 351);