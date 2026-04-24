-- Recompute order 376 fulfillment counters from order_shipments
UPDATE orders
SET items_shipped = 6,
    items_total = 6,
    fulfillment_percentage = 100,
    fulfillment_status = 'fulfilled',
    status = CASE WHEN status IN ('delivered') THEN status ELSE 'shipped' END
WHERE id = 376;

-- Update local mapping metadata so it reflects the second (most recent) package fulfillment
UPDATE shopify_order_mappings
SET metadata = jsonb_set(
      jsonb_set(
        COALESCE(metadata, '{}'::jsonb),
        '{last_fulfillment_id}',
        '"gid://shopify/Fulfillment/6633567617185"'
      ),
      '{last_tracking_number}',
      '"794807639955"'
    )
WHERE ship_tornado_order_id = 376;