-- Fix the random orders to use valid item IDs
WITH valid_items AS (
  SELECT id, name, sku FROM items WHERE company_id = '93e83a29-38f3-4b74-be40-a57aa70eefd9'
),
item_array AS (
  SELECT array_agg(id) as item_ids FROM valid_items
)
UPDATE orders 
SET items = CASE 
  -- Single item orders
  WHEN (id % 4) = 1 THEN 
    jsonb_build_array(
      jsonb_build_object(
        'itemId', (SELECT item_ids[1 + (id % array_length(item_ids, 1))] FROM item_array), 
        'quantity', 1 + (RANDOM() * 2)::integer, 
        'unitPrice', 25 + (RANDOM() * 75)::numeric
      )
    )
  -- Two item orders  
  WHEN (id % 4) = 2 THEN 
    jsonb_build_array(
      jsonb_build_object(
        'itemId', (SELECT item_ids[1 + (id % array_length(item_ids, 1))] FROM item_array), 
        'quantity', 1, 
        'unitPrice', 35 + (RANDOM() * 65)::numeric
      ),
      jsonb_build_object(
        'itemId', (SELECT item_ids[1 + ((id + 1) % array_length(item_ids, 1))] FROM item_array), 
        'quantity', 1, 
        'unitPrice', 20 + (RANDOM() * 40)::numeric
      )
    )
  -- Three item orders
  WHEN (id % 4) = 3 THEN 
    jsonb_build_array(
      jsonb_build_object(
        'itemId', (SELECT item_ids[1 + (id % array_length(item_ids, 1))] FROM item_array), 
        'quantity', 2, 
        'unitPrice', 15 + (RANDOM() * 35)::numeric
      ),
      jsonb_build_object(
        'itemId', (SELECT item_ids[1 + ((id + 1) % array_length(item_ids, 1))] FROM item_array), 
        'quantity', 1, 
        'unitPrice', 45 + (RANDOM() * 55)::numeric
      ),
      jsonb_build_object(
        'itemId', (SELECT item_ids[1 + ((id + 2) % array_length(item_ids, 1))] FROM item_array), 
        'quantity', 1, 
        'unitPrice', 30 + (RANDOM() * 70)::numeric
      )
    )
  -- Four item orders
  ELSE 
    jsonb_build_array(
      jsonb_build_object(
        'itemId', (SELECT item_ids[1 + (id % array_length(item_ids, 1))] FROM item_array), 
        'quantity', 1, 
        'unitPrice', 50 + (RANDOM() * 100)::numeric
      ),
      jsonb_build_object(
        'itemId', (SELECT item_ids[1 + ((id + 1) % array_length(item_ids, 1))] FROM item_array), 
        'quantity', 3, 
        'unitPrice', 12 + (RANDOM() * 25)::numeric
      ),
      jsonb_build_object(
        'itemId', (SELECT item_ids[1 + ((id + 2) % array_length(item_ids, 1))] FROM item_array), 
        'quantity', 1, 
        'unitPrice', 35 + (RANDOM() * 45)::numeric
      ),
      jsonb_build_object(
        'itemId', (SELECT item_ids[1 + ((id + 3) % array_length(item_ids, 1))] FROM item_array), 
        'quantity', 2, 
        'unitPrice', 18 + (RANDOM() * 32)::numeric
      )
    )
END
WHERE company_id = '93e83a29-38f3-4b74-be40-a57aa70eefd9' 
  AND status IN ('shipped', 'delivered')
  AND order_id LIKE 'ORD-%';