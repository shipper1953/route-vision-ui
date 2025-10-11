-- Add phone and email fields to warehouses table for FedEx compatibility
ALTER TABLE warehouses
ADD COLUMN phone text,
ADD COLUMN email text;