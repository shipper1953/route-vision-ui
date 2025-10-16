-- Update the 50 most recent orders for company 93e83a29-38f3-4b74-be40-a57aa70eefd9 to processing status
UPDATE orders 
SET status = 'processing'
WHERE id IN (
  SELECT id 
  FROM orders 
  WHERE company_id = '93e83a29-38f3-4b74-be40-a57aa70eefd9'
  AND id >= 158
  ORDER BY id
  LIMIT 50
);