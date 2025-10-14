-- First, set invalid box IDs to NULL
UPDATE shipments 
SET actual_package_master_id = NULL
WHERE actual_package_master_id IS NOT NULL
AND actual_package_master_id NOT IN (SELECT id FROM boxes);

-- Drop the existing foreign key constraint that points to packaging_master_list
ALTER TABLE shipments 
DROP CONSTRAINT IF EXISTS shipments_actual_package_master_id_fkey;

-- Add the correct foreign key constraint pointing to boxes table
ALTER TABLE shipments 
ADD CONSTRAINT shipments_actual_package_master_id_fkey 
FOREIGN KEY (actual_package_master_id) 
REFERENCES boxes(id) 
ON DELETE SET NULL;