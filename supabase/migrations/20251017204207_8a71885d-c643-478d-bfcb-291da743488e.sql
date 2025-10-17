-- Add ZPL label storage to shipments table
ALTER TABLE public.shipments 
ADD COLUMN IF NOT EXISTS label_zpl TEXT;

COMMENT ON COLUMN public.shipments.label_zpl IS 'ZPL code for thermal printer direct printing';