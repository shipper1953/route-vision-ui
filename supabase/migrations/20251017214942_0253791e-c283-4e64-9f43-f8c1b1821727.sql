-- Add column to store ZPL label content for direct printing to thermal printers
ALTER TABLE shipments 
ADD COLUMN IF NOT EXISTS zpl_label TEXT;