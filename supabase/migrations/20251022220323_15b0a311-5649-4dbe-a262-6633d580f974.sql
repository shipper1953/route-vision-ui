-- Delete the 3 shipments with incorrect itemId ('order-item-0')
-- These were created before the fix and have wrong item tracking
-- After deletion, the trigger will automatically recalculate fulfillment
DELETE FROM order_shipments 
WHERE order_id = 222 
AND shipment_id IN (352, 353, 354);