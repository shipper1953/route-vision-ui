-- Update recent shipments with suboptimal actual packaging for demo purposes
-- This will create discrepancies for the "Top Packaging Opportunities" section

UPDATE shipments 
SET actual_package_sku = CASE 
    WHEN id = 90 THEN 'S-19070'  -- Use a larger/more expensive box
    WHEN id = 89 THEN 'S-23951'  -- Use a different box  
    WHEN id = 88 THEN 'S-19070'  -- Use oversized box
    WHEN id = 84 THEN 'S-18338'  -- Use expensive box
    WHEN id = 80 THEN 'S-19070'  -- Use oversized again
    WHEN id = 78 THEN 'S-23951'  -- Use different box
    WHEN id = 76 THEN 'S-18338'  -- Use expensive box
    WHEN id = 75 THEN 'S-19070'  -- Pattern of suboptimal choices
END,
actual_package_master_id = CASE 
    WHEN id = 90 THEN (SELECT id FROM packaging_master_list WHERE vendor_sku = 'S-19070' LIMIT 1)
    WHEN id = 89 THEN (SELECT id FROM packaging_master_list WHERE vendor_sku = 'S-23951' LIMIT 1)
    WHEN id = 88 THEN (SELECT id FROM packaging_master_list WHERE vendor_sku = 'S-19070' LIMIT 1)
    WHEN id = 84 THEN (SELECT id FROM packaging_master_list WHERE vendor_sku = 'S-18338' LIMIT 1)
    WHEN id = 80 THEN (SELECT id FROM packaging_master_list WHERE vendor_sku = 'S-19070' LIMIT 1)
    WHEN id = 78 THEN (SELECT id FROM packaging_master_list WHERE vendor_sku = 'S-23951' LIMIT 1)
    WHEN id = 76 THEN (SELECT id FROM packaging_master_list WHERE vendor_sku = 'S-18338' LIMIT 1)
    WHEN id = 75 THEN (SELECT id FROM packaging_master_list WHERE vendor_sku = 'S-19070' LIMIT 1)
END
WHERE id IN (90, 89, 88, 84, 80, 78, 76, 75);