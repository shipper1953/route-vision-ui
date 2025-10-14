-- Add original_cost column to shipments table to store the base cost from EasyPost/Shippo
-- The existing cost column will store the marked-up rate (what company is charged)
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS original_cost NUMERIC;

-- Add comment to document the column purpose
COMMENT ON COLUMN shipments.original_cost IS 'Base shipping cost from EasyPost/Shippo before markup';
COMMENT ON COLUMN shipments.cost IS 'Marked-up shipping rate charged to company (revenue)';