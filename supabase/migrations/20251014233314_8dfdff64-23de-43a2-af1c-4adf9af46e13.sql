-- Manually repair Order 157's missing order_shipments links
-- These shipments were created but not linked due to the bug we just fixed

INSERT INTO order_shipments (order_id, shipment_id, package_index)
VALUES 
  (157, 256, 1),
  (157, 257, 2),
  (157, 258, 3),
  (157, 259, 4),
  (157, 260, 5)
ON CONFLICT DO NOTHING;