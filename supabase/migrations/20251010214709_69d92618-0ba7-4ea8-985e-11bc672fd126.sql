-- Add min_stock and max_stock columns to boxes table for inventory management
ALTER TABLE public.boxes
ADD COLUMN min_stock integer NOT NULL DEFAULT 10,
ADD COLUMN max_stock integer NOT NULL DEFAULT 100;

-- Add comment to explain the columns
COMMENT ON COLUMN public.boxes.min_stock IS 'Minimum stock level to trigger low inventory alert';
COMMENT ON COLUMN public.boxes.max_stock IS 'Maximum stock level for reorder suggestions';