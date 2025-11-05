-- Create customers table for WMS
CREATE TABLE IF NOT EXISTS public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  email text,
  phone text,
  address jsonb,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT customers_company_code_unique UNIQUE (company_id, code)
);

-- Enable RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for multi-tenant isolation
CREATE POLICY "Users can view their company customers"
ON public.customers
FOR SELECT
USING (company_id = auth_user_company_id());

CREATE POLICY "Users can create customers for their company"
ON public.customers
FOR INSERT
WITH CHECK (company_id = auth_user_company_id());

CREATE POLICY "Users can update their company customers"
ON public.customers
FOR UPDATE
USING (company_id = auth_user_company_id())
WITH CHECK (company_id = auth_user_company_id());

CREATE POLICY "Users can delete their company customers"
ON public.customers
FOR DELETE
USING (company_id = auth_user_company_id());

-- Super admins can manage all customers
CREATE POLICY "Super admins can manage all customers"
ON public.customers
FOR ALL
USING (EXISTS (
  SELECT 1 FROM users
  WHERE id = auth.uid() AND role = 'super_admin'::app_role
));

-- Index for performance
CREATE INDEX idx_customers_company_id ON public.customers(company_id);
CREATE INDEX idx_customers_code ON public.customers(code) WHERE code IS NOT NULL;