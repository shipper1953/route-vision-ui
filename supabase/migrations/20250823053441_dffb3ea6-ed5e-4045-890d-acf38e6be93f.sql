-- Add package tracking to shipments
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS actual_package_sku text;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS actual_package_master_id uuid REFERENCES packaging_master_list(id);

-- Create inventory records for all companies with sample data from packaging master list
INSERT INTO packaging_inventory (company_id, master_list_id, quantity_on_hand, reorder_threshold, reorder_quantity)
SELECT 
    c.id as company_id,
    pml.id as master_list_id,
    CASE 
        WHEN pml.type = 'Box' THEN floor(random() * 500 + 50)::integer
        WHEN pml.type = 'Poly Bag' THEN floor(random() * 1000 + 100)::integer
        ELSE floor(random() * 200 + 25)::integer
    END as quantity_on_hand,
    CASE 
        WHEN pml.type = 'Box' THEN 20
        WHEN pml.type = 'Poly Bag' THEN 50
        ELSE 15
    END as reorder_threshold,
    CASE 
        WHEN pml.type = 'Box' THEN 100
        WHEN pml.type = 'Poly Bag' THEN 200
        ELSE 75
    END as reorder_quantity
FROM companies c
CROSS JOIN packaging_master_list pml
WHERE c.is_active = true AND pml.is_active = true
ON CONFLICT (company_id, master_list_id) DO NOTHING;

-- Create some low stock scenarios for demo purposes
UPDATE packaging_inventory 
SET quantity_on_hand = floor(random() * 15 + 5)::integer
WHERE id IN (
    SELECT id FROM packaging_inventory 
    WHERE master_list_id IN (
        SELECT id FROM packaging_master_list 
        WHERE vendor_sku LIKE '%S-%' OR vendor_sku LIKE '%M-%'
        LIMIT 10
    )
);

-- Update some shipments with actual package data for analysis
UPDATE shipments 
SET actual_package_sku = (
    SELECT vendor_sku FROM packaging_master_list 
    WHERE type = 'Box' 
    ORDER BY random() 
    LIMIT 1
),
actual_package_master_id = (
    SELECT id FROM packaging_master_list 
    WHERE type = 'Box' 
    ORDER BY random() 
    LIMIT 1
)
WHERE id IN (
    SELECT id FROM shipments 
    WHERE created_at >= NOW() - INTERVAL '30 days'
    LIMIT 20
);