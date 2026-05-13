ALTER TABLE public.items
ADD COLUMN IF NOT EXISTS uom_eaches jsonb NOT NULL DEFAULT jsonb_build_object(
  'each', 1,
  'innerpack', 1,
  'case', 1,
  'pallet', 1
);

COMMENT ON COLUMN public.items.uom_eaches IS 'UOM-to-eaches conversion values used by receiving and PO UOM logic.';
