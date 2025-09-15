-- Insert random items for testing packaging opportunities
INSERT INTO public.items (name, sku, category, length, width, height, weight, company_id) VALUES
-- Electronics/Tech Items
('Wireless Bluetooth Headphones', 'TECH-001', 'Electronics', 8, 6, 3, 0.75, '93e83a29-38f3-4b74-be40-a57aa70eefd9'),
('USB-C Power Bank', 'TECH-002', 'Electronics', 6, 3, 1, 1.2, '93e83a29-38f3-4b74-be40-a57aa70eefd9'),
('Smartphone Case', 'TECH-003', 'Electronics', 7, 4, 0.5, 0.3, '93e83a29-38f3-4b74-be40-a57aa70eefd9'),
('Wireless Charging Pad', 'TECH-004', 'Electronics', 5, 5, 0.8, 0.8, '93e83a29-38f3-4b74-be40-a57aa70eefd9'),
('Bluetooth Speaker', 'TECH-005', 'Electronics', 8, 3, 3, 1.5, '93e83a29-38f3-4b74-be40-a57aa70eefd9'),

-- Clothing Items
('Cotton T-Shirt', 'CLOTH-001', 'Apparel', 12, 8, 1, 0.5, '93e83a29-38f3-4b74-be40-a57aa70eefd9'),
('Denim Jeans', 'CLOTH-002', 'Apparel', 14, 10, 2, 1.8, '93e83a29-38f3-4b74-be40-a57aa70eefd9'),
('Winter Jacket', 'CLOTH-003', 'Apparel', 16, 12, 4, 2.5, '93e83a29-38f3-4b74-be40-a57aa70eefd9'),
('Running Shoes', 'CLOTH-004', 'Apparel', 13, 8, 5, 2.2, '93e83a29-38f3-4b74-be40-a57aa70eefd9'),
('Baseball Cap', 'CLOTH-005', 'Apparel', 8, 8, 4, 0.4, '93e83a29-38f3-4b74-be40-a57aa70eefd9'),

-- Home & Garden Items
('Coffee Mug Set (4 pcs)', 'HOME-001', 'Home & Garden', 10, 8, 6, 3.2, '93e83a29-38f3-4b74-be40-a57aa70eefd9'),
('Picture Frame 8x10', 'HOME-002', 'Home & Garden', 12, 10, 1, 1.1, '93e83a29-38f3-4b74-be40-a57aa70eefd9'),
('Scented Candle', 'HOME-003', 'Home & Garden', 4, 4, 5, 1.5, '93e83a29-38f3-4b74-be40-a57aa70eefd9'),
('Kitchen Knife Set', 'HOME-004', 'Home & Garden', 14, 6, 2, 2.8, '93e83a29-38f3-4b74-be40-a57aa70eefd9'),
('Garden Gloves', 'HOME-005', 'Home & Garden', 10, 5, 2, 0.6, '93e83a29-38f3-4b74-be40-a57aa70eefd9'),

-- Books & Media
('Hardcover Novel', 'BOOK-001', 'Books', 9, 6, 1.5, 1.2, '93e83a29-38f3-4b74-be40-a57aa70eefd9'),
('Tech Magazine Subscription', 'BOOK-002', 'Books', 11, 8, 0.3, 0.4, '93e83a29-38f3-4b74-be40-a57aa70eefd9'),
('Board Game', 'GAME-001', 'Games', 12, 12, 3, 3.5, '93e83a29-38f3-4b74-be40-a57aa70eefd9'),
('Puzzle 1000 pieces', 'GAME-002', 'Games', 14, 10, 2, 1.8, '93e83a29-38f3-4b74-be40-a57aa70eefd9'),
('Art Supplies Kit', 'ART-001', 'Arts & Crafts', 16, 12, 3, 2.4, '93e83a29-38f3-4b74-be40-a57aa70eefd9');

-- Generate random orders with these items
WITH random_items AS (
  SELECT id, name, sku FROM items WHERE company_id = '93e83a29-38f3-4b74-be40-a57aa70eefd9'
),
shipping_addresses AS (
  SELECT * FROM (VALUES
    ('{"street1": "123 Main St", "city": "New York", "state": "NY", "zip": "10001", "country": "US"}'),
    ('{"street1": "456 Oak Ave", "city": "Los Angeles", "state": "CA", "zip": "90210", "country": "US"}'),
    ('{"street1": "789 Pine Rd", "city": "Chicago", "state": "IL", "zip": "60601", "country": "US"}'),
    ('{"street1": "321 Elm St", "city": "Houston", "state": "TX", "zip": "77001", "country": "US"}'),
    ('{"street1": "654 Maple Dr", "city": "Phoenix", "state": "AZ", "zip": "85001", "country": "US"}'),
    ('{"street1": "987 Cedar Ln", "city": "Philadelphia", "state": "PA", "zip": "19101", "country": "US"}'),
    ('{"street1": "147 Birch Way", "city": "San Antonio", "state": "TX", "zip": "78201", "country": "US"}'),
    ('{"street1": "258 Spruce St", "city": "San Diego", "state": "CA", "zip": "92101", "country": "US"}'),
    ('{"street1": "369 Willow Ave", "city": "Dallas", "state": "TX", "zip": "75201", "country": "US"}'),
    ('{"street1": "741 Ash Blvd", "city": "San Jose", "state": "CA", "zip": "95101", "country": "US"}'
    )
  ) AS t(address)
),
customers AS (
  SELECT * FROM (VALUES
    ('John Smith', 'Smith Electronics', 'john@smith-electronics.com', '555-0101'),
    ('Sarah Johnson', 'Johnson Boutique', 'sarah@johnsonboutique.com', '555-0102'),
    ('Mike Brown', 'Brown Home Goods', 'mike@brownhome.com', '555-0103'),
    ('Lisa Davis', 'Davis Books & More', 'lisa@davisbooks.com', '555-0104'),
    ('Tom Wilson', 'Wilson Tech Solutions', 'tom@wilsontech.com', '555-0105'),
    ('Amy Garcia', 'Garcia Lifestyle', 'amy@garcialifestyle.com', '555-0106'),
    ('David Martinez', 'Martinez Imports', 'david@martinezimports.com', '555-0107'),
    ('Jennifer Lee', 'Lee Enterprises', 'jennifer@leeenterprises.com', '555-0108'),
    ('Robert Taylor', 'Taylor Trading Co', 'robert@taylortrade.com', '555-0109'),
    ('Michelle Anderson', 'Anderson Retail', 'michelle@andersonretail.com', '555-0110')
  ) AS t(name, company, email, phone)
)
INSERT INTO public.orders (
  order_id, customer_name, customer_company, customer_email, customer_phone,
  shipping_address, items, value, status, order_date, required_delivery_date,
  user_id, company_id, warehouse_id
)
SELECT 
  'ORD-' || LPAD((ROW_NUMBER() OVER())::text, 4, '0'),
  c.name,
  c.company,
  c.email,
  c.phone,
  sa.address::jsonb,
  -- Create random item combinations
  CASE 
    WHEN (ROW_NUMBER() OVER()) % 4 = 1 THEN 
      jsonb_build_array(
        jsonb_build_object('itemId', (SELECT id FROM random_items ORDER BY RANDOM() LIMIT 1), 'quantity', 1 + (RANDOM() * 2)::integer, 'unitPrice', 25 + (RANDOM() * 75)::numeric)
      )
    WHEN (ROW_NUMBER() OVER()) % 4 = 2 THEN 
      jsonb_build_array(
        jsonb_build_object('itemId', (SELECT id FROM random_items ORDER BY RANDOM() LIMIT 1), 'quantity', 1, 'unitPrice', 35 + (RANDOM() * 65)::numeric),
        jsonb_build_object('itemId', (SELECT id FROM random_items ORDER BY RANDOM() LIMIT 1), 'quantity', 1, 'unitPrice', 20 + (RANDOM() * 40)::numeric)
      )
    WHEN (ROW_NUMBER() OVER()) % 4 = 3 THEN 
      jsonb_build_array(
        jsonb_build_object('itemId', (SELECT id FROM random_items ORDER BY RANDOM() LIMIT 1), 'quantity', 2, 'unitPrice', 15 + (RANDOM() * 35)::numeric),
        jsonb_build_object('itemId', (SELECT id FROM random_items ORDER BY RANDOM() LIMIT 1), 'quantity', 1, 'unitPrice', 45 + (RANDOM() * 55)::numeric),
        jsonb_build_object('itemId', (SELECT id FROM random_items ORDER BY RANDOM() LIMIT 1), 'quantity', 1, 'unitPrice', 30 + (RANDOM() * 70)::numeric)
      )
    ELSE 
      jsonb_build_array(
        jsonb_build_object('itemId', (SELECT id FROM random_items ORDER BY RANDOM() LIMIT 1), 'quantity', 1, 'unitPrice', 50 + (RANDOM() * 100)::numeric),
        jsonb_build_object('itemId', (SELECT id FROM random_items ORDER BY RANDOM() LIMIT 1), 'quantity', 3, 'unitPrice', 12 + (RANDOM() * 25)::numeric),
        jsonb_build_object('itemId', (SELECT id FROM random_items ORDER BY RANDOM() LIMIT 1), 'quantity', 1, 'unitPrice', 35 + (RANDOM() * 45)::numeric),
        jsonb_build_object('itemId', (SELECT id FROM random_items ORDER BY RANDOM() LIMIT 1), 'quantity', 2, 'unitPrice', 18 + (RANDOM() * 32)::numeric)
      )
  END,
  -- Calculate value based on items (simplified)
  (50 + (RANDOM() * 200))::numeric,
  -- Mix of shipped and delivered orders
  CASE 
    WHEN RANDOM() < 0.7 THEN 'shipped'
    ELSE 'delivered'
  END,
  -- Random order dates in the last 60 days
  (CURRENT_DATE - (RANDOM() * 60)::integer),
  -- Required delivery dates 3-10 days after order date
  (CURRENT_DATE - (RANDOM() * 60)::integer + (3 + RANDOM() * 7)::integer),
  '00be6af7-a275-49fe-842f-1bd402bf113b',
  '93e83a29-38f3-4b74-be40-a57aa70eefd9',
  'a5d7b17a-67be-4f23-8e2c-fbc2b09ab57e'
FROM 
  (SELECT ROW_NUMBER() OVER() as rn FROM generate_series(1, 25)) nums
  CROSS JOIN (SELECT name, company, email, phone, ROW_NUMBER() OVER() as customer_rn FROM customers) c
  CROSS JOIN (SELECT address, ROW_NUMBER() OVER() as addr_rn FROM shipping_addresses) sa
WHERE nums.rn <= 25 
  AND c.customer_rn = ((nums.rn - 1) % 10) + 1
  AND sa.addr_rn = ((nums.rn - 1) % 10) + 1;