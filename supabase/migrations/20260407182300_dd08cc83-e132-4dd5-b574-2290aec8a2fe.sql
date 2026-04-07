
-- Seed warehouse locations
INSERT INTO warehouse_locations (id, warehouse_id, name, zone, aisle, rack, shelf, bin, location_type, is_active, company_id)
VALUES
  ('b1a00001-0000-0000-0000-000000000001', 'a5d7b17a-67be-4f23-8e2c-fbc2b09ab57e', 'A-01-01', 'A', '01', '01', '01', '01', 'shelf', true, '93e83a29-38f3-4b74-be40-a57aa70eefd9'),
  ('b1a00001-0000-0000-0000-000000000002', 'a5d7b17a-67be-4f23-8e2c-fbc2b09ab57e', 'A-01-02', 'A', '01', '01', '02', '01', 'shelf', true, '93e83a29-38f3-4b74-be40-a57aa70eefd9'),
  ('b1a00001-0000-0000-0000-000000000003', 'a5d7b17a-67be-4f23-8e2c-fbc2b09ab57e', 'B-02-01', 'B', '02', '01', '01', '01', 'shelf', true, '93e83a29-38f3-4b74-be40-a57aa70eefd9'),
  ('b1a00001-0000-0000-0000-000000000004', 'a5d7b17a-67be-4f23-8e2c-fbc2b09ab57e', 'B-02-02', 'B', '02', '01', '02', '01', 'shelf', true, '93e83a29-38f3-4b74-be40-a57aa70eefd9'),
  ('b1a00001-0000-0000-0000-000000000005', 'a5d7b17a-67be-4f23-8e2c-fbc2b09ab57e', 'C-03-01', 'C', '03', '01', '01', '01', 'bulk', true, '93e83a29-38f3-4b74-be40-a57aa70eefd9')
ON CONFLICT (id) DO NOTHING;

-- Seed inventory levels
INSERT INTO inventory_levels (company_id, item_id, warehouse_id, location_id, customer_id, quantity_on_hand, quantity_allocated, quantity_available, condition, lot_number)
VALUES
  ('93e83a29-38f3-4b74-be40-a57aa70eefd9', '2a35d041-a404-422f-bb28-98e8264cfff1', 'a5d7b17a-67be-4f23-8e2c-fbc2b09ab57e', 'b1a00001-0000-0000-0000-000000000001', '30e0de08-83c7-4b81-99bc-9c6cbaaa0e48', 50, 5, 45, 'good', 'LOT-2026-001'),
  ('93e83a29-38f3-4b74-be40-a57aa70eefd9', 'fdb452e2-7682-41f1-a90f-3559be8fbc30', 'a5d7b17a-67be-4f23-8e2c-fbc2b09ab57e', 'b1a00001-0000-0000-0000-000000000002', '30e0de08-83c7-4b81-99bc-9c6cbaaa0e48', 120, 20, 100, 'good', 'LOT-2026-002'),
  ('93e83a29-38f3-4b74-be40-a57aa70eefd9', '05403515-34e4-4ee4-a349-c7f2a27e35c7', 'a5d7b17a-67be-4f23-8e2c-fbc2b09ab57e', 'b1a00001-0000-0000-0000-000000000003', '46a72688-bb18-4332-a5aa-1f60d5d6558d', 30, 0, 30, 'good', 'LOT-2026-003'),
  ('93e83a29-38f3-4b74-be40-a57aa70eefd9', '6f6678bf-a156-4c1c-bcc6-75470da4fa0a', 'a5d7b17a-67be-4f23-8e2c-fbc2b09ab57e', 'b1a00001-0000-0000-0000-000000000001', '30e0de08-83c7-4b81-99bc-9c6cbaaa0e48', 200, 35, 165, 'good', 'LOT-2026-004'),
  ('93e83a29-38f3-4b74-be40-a57aa70eefd9', '1c5c05d3-3a99-46a2-bfc1-3e61c560c216', 'a5d7b17a-67be-4f23-8e2c-fbc2b09ab57e', 'b1a00001-0000-0000-0000-000000000004', '1fc0088d-1753-4624-951f-717f3bd14948', 15, 2, 13, 'good', NULL),
  ('93e83a29-38f3-4b74-be40-a57aa70eefd9', '11765b90-ce3f-480c-bcba-739c310179c8', 'a5d7b17a-67be-4f23-8e2c-fbc2b09ab57e', 'b1a00001-0000-0000-0000-000000000002', '46a72688-bb18-4332-a5aa-1f60d5d6558d', 75, 10, 65, 'good', 'LOT-2026-005'),
  ('93e83a29-38f3-4b74-be40-a57aa70eefd9', 'd1b988dd-ecf3-4903-9bd4-62ed6a7de1ba', 'a5d7b17a-67be-4f23-8e2c-fbc2b09ab57e', 'b1a00001-0000-0000-0000-000000000003', '1fc0088d-1753-4624-951f-717f3bd14948', 40, 8, 32, 'good', 'LOT-2026-006'),
  ('93e83a29-38f3-4b74-be40-a57aa70eefd9', '9f01ce29-1df3-4948-863d-b56a2d81297c', 'a5d7b17a-67be-4f23-8e2c-fbc2b09ab57e', 'b1a00001-0000-0000-0000-000000000005', NULL, 300, 50, 250, 'good', 'LOT-2026-007'),
  ('93e83a29-38f3-4b74-be40-a57aa70eefd9', '8e882466-467a-4d88-80bc-d0621e6be1a7', 'a5d7b17a-67be-4f23-8e2c-fbc2b09ab57e', 'b1a00001-0000-0000-0000-000000000004', '30e0de08-83c7-4b81-99bc-9c6cbaaa0e48', 60, 0, 60, 'good', NULL),
  ('93e83a29-38f3-4b74-be40-a57aa70eefd9', '94ae7714-49d8-425b-b14c-8424eb208dc4', 'a5d7b17a-67be-4f23-8e2c-fbc2b09ab57e', 'b1a00001-0000-0000-0000-000000000005', '46a72688-bb18-4332-a5aa-1f60d5d6558d', 25, 3, 22, 'damaged', 'LOT-2026-008');
