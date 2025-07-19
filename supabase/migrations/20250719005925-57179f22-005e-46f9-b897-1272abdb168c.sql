-- Fix order 34 status and ensure trigger works properly
UPDATE orders 
SET status = 'delivered' 
WHERE shipment_id = 41 AND actual_delivery_date IS NOT NULL;

-- Verify the trigger is properly attached
SELECT tgname, tgrelid::regclass, tgenabled 
FROM pg_trigger 
WHERE tgname = 'sync_shipment_delivery_dates';