-- Bin-management capabilities for putaway and picking workflows.

UPDATE public.warehouse_locations
SET location_type = CASE location_type
  WHEN 'receiving' THEN 'inbound'
  WHEN 'shipping' THEN 'outbound'
  WHEN 'staging' THEN 'outbound'
  ELSE location_type
END
WHERE location_type IN ('receiving', 'shipping', 'staging');

ALTER TABLE public.warehouse_locations
  DROP CONSTRAINT IF EXISTS warehouse_locations_location_type_check;

ALTER TABLE public.warehouse_locations
  ADD CONSTRAINT warehouse_locations_location_type_check
  CHECK (location_type IN ('inbound', 'picking', 'storage', 'outbound'));

ALTER TABLE public.putaway_tasks
  ALTER COLUMN receiving_line_item_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_warehouse_locations_company_type
ON public.warehouse_locations(company_id, warehouse_id, location_type)
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_inventory_levels_pickable_location
ON public.inventory_levels(item_id, warehouse_id, location_id, quantity_available)
WHERE quantity_available > 0;
