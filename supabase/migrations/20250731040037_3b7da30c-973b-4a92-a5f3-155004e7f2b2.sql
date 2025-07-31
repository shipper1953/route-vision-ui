-- Create items table for product catalog
CREATE TABLE public.items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sku text NOT NULL UNIQUE,
  name text NOT NULL,
  length numeric NOT NULL,
  width numeric NOT NULL,
  height numeric NOT NULL,
  weight numeric NOT NULL,
  category text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  company_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

-- Create policies for company-based access
CREATE POLICY "Users can view their company items" 
ON public.items 
FOR SELECT 
USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can create their company items" 
ON public.items 
FOR INSERT 
WITH CHECK (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update their company items" 
ON public.items 
FOR UPDATE 
USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()))
WITH CHECK (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can delete their company items" 
ON public.items 
FOR DELETE 
USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

-- Super admin policies
CREATE POLICY "Super admins can manage all items" 
ON public.items 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM users 
  WHERE id = auth.uid() AND role = 'super_admin'::app_role
));

-- Create trigger for automatic timestamp updates
CREATE OR REPLACE FUNCTION public.update_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_items_updated_at
BEFORE UPDATE ON public.items
FOR EACH ROW
EXECUTE FUNCTION public.update_items_updated_at();