-- Update the 50 orders for company 93e83a29-38f3-4b74-be40-a57aa70eefd9 to ready_to_ship status
UPDATE orders 
SET status = 'ready_to_ship'
WHERE id IN (
  SELECT id 
  FROM orders 
  WHERE company_id = '93e83a29-38f3-4b74-be40-a57aa70eefd9'
  AND id >= 158
  ORDER BY id
  LIMIT 50
);