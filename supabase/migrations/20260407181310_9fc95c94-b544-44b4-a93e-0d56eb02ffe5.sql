CREATE TABLE public.inventory_levels (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  warehouse_id uuid NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  location_id uuid REFERENCES public.warehouse_locations(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  quantity_on_hand integer NOT NULL DEFAULT 0,
  quantity_allocated integer NOT NULL DEFAULT 0,
  quantity_available integer NOT NULL DEFAULT 0,
  lot_number text,
  serial_number text,
  expiry_date date,
  received_date timestamp with time zone NOT NULL DEFAULT now(),
  condition text NOT NULL DEFAULT 'good',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_inventory_levels_unique 
ON public.inventory_levels (item_id, warehouse_id, COALESCE(location_id, '00000000-0000-0000-0000-000000000000'), COALESCE(lot_number, ''), COALESCE(serial_number, ''));

CREATE INDEX idx_inventory_levels_company ON public.inventory_levels (company_id);
CREATE INDEX idx_inventory_levels_warehouse ON public.inventory_levels (warehouse_id);
CREATE INDEX idx_inventory_levels_item ON public.inventory_levels (item_id);
CREATE INDEX idx_inventory_levels_customer ON public.inventory_levels (customer_id);

ALTER TABLE public.inventory_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company inventory"
ON public.inventory_levels FOR SELECT
USING (company_id = auth_user_company_id());

CREATE POLICY "Users can insert company inventory"
ON public.inventory_levels FOR INSERT
WITH CHECK (company_id = auth_user_company_id());

CREATE POLICY "Users can update company inventory"
ON public.inventory_levels FOR UPDATE
USING (company_id = auth_user_company_id());

CREATE POLICY "Users can delete company inventory"
ON public.inventory_levels FOR DELETE
USING (company_id = auth_user_company_id());

CREATE POLICY "Super admins manage all inventory"
ON public.inventory_levels FOR ALL
USING (auth_user_role() = 'super_admin'::app_role);

CREATE TRIGGER update_inventory_levels_updated_at
BEFORE UPDATE ON public.inventory_levels
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();