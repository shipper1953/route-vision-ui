-- Create function for update_updated_at_column if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create warehouse_locations table for bin management
CREATE TABLE warehouse_locations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  name text NOT NULL,
  zone text,
  aisle text,
  rack text,
  shelf text,
  bin text,
  location_type text NOT NULL DEFAULT 'bin',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(company_id, warehouse_id, name)
);

-- Add indexes for performance
CREATE INDEX idx_warehouse_locations_company_id ON warehouse_locations(company_id);
CREATE INDEX idx_warehouse_locations_warehouse_id ON warehouse_locations(warehouse_id);
CREATE INDEX idx_warehouse_locations_active ON warehouse_locations(is_active);

-- Enable RLS
ALTER TABLE warehouse_locations ENABLE ROW LEVEL SECURITY;

-- RLS policies for warehouse_locations
CREATE POLICY "Users can view their company warehouse locations"
  ON warehouse_locations FOR SELECT
  USING (company_id = auth_user_company_id());

CREATE POLICY "Company admins can create warehouse locations"
  ON warehouse_locations FOR INSERT
  WITH CHECK (
    company_id = auth_user_company_id() AND
    (auth_user_role() = 'company_admin'::app_role OR auth_user_role() = 'super_admin'::app_role)
  );

CREATE POLICY "Company admins can update their warehouse locations"
  ON warehouse_locations FOR UPDATE
  USING (
    company_id = auth_user_company_id() AND
    (auth_user_role() = 'company_admin'::app_role OR auth_user_role() = 'super_admin'::app_role)
  );

CREATE POLICY "Company admins can delete their warehouse locations"
  ON warehouse_locations FOR DELETE
  USING (
    company_id = auth_user_company_id() AND
    (auth_user_role() = 'company_admin'::app_role OR auth_user_role() = 'super_admin'::app_role)
  );

-- Create trigger to update updated_at
CREATE TRIGGER update_warehouse_locations_updated_at
  BEFORE UPDATE ON warehouse_locations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();