
-- Backfill allocation for order 312 (SHOP-1015-012739)
-- SKU cso: inventory_levels id = 53aa35c9-ee71-4ecb-b722-3fd8ee1baace
UPDATE inventory_levels
SET quantity_allocated = quantity_allocated + 1,
    quantity_available = quantity_available - 1,
    updated_at = now()
WHERE id = '53aa35c9-ee71-4ecb-b722-3fd8ee1baace';

-- SKU css: inventory_levels id = 7cd5b6f8-bb3f-491d-8fe6-5cbb3bc4c2ca
UPDATE inventory_levels
SET quantity_allocated = quantity_allocated + 1,
    quantity_available = quantity_available - 1,
    updated_at = now()
WHERE id = '7cd5b6f8-bb3f-491d-8fe6-5cbb3bc4c2ca';
