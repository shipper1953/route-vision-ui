UPDATE warehouses
SET address = jsonb_set(address::jsonb, '{state}', '"TX"')
WHERE id = '961d6803-cfed-4a3d-856b-d6ac56c3298a'
  AND address->>'state' = 'Texas';