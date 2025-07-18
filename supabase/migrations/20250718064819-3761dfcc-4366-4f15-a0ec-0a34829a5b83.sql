-- Fix recursion issues and ensure Demo company exists

-- First, let's ensure there's an active Demo company
INSERT INTO public.companies (name, is_active, email, address, settings)
VALUES (
  'Demo',
  true,
  'demo@company.com',
  '{"street1": "123 Demo Street", "city": "Demo City", "state": "Demo State", "zip": "12345", "country": "US"}',
  '{}'
)
ON CONFLICT (name) DO UPDATE SET is_active = true;

-- Create a default warehouse for the Demo company
INSERT INTO public.warehouses (name, company_id, address, is_default)
SELECT 
  'Demo Warehouse',
  c.id,
  '{"street1": "123 Demo Street", "city": "Demo City", "state": "Demo State", "zip": "12345", "country": "US"}',
  true
FROM public.companies c
WHERE c.name = 'Demo' AND c.is_active = true
ON CONFLICT DO NOTHING;

-- Drop the recursive function that's causing issues
DROP FUNCTION IF EXISTS public.get_user_company_and_role();

-- Drop all policies that were causing recursion
DROP POLICY IF EXISTS "Super admins can manage all orders" ON orders;
DROP POLICY IF EXISTS "Company admins can manage company orders" ON orders;
DROP POLICY IF EXISTS "Users can manage their own orders" ON orders;

DROP POLICY IF EXISTS "Super admins can manage all shipments" ON shipments;
DROP POLICY IF EXISTS "Company admins can manage company shipments" ON shipments;
DROP POLICY IF EXISTS "Users can manage their own shipments" ON shipments;

-- Create simple, non-recursive policies for orders
CREATE POLICY "Super admins view all orders" ON orders
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'super_admin'
  )
);

CREATE POLICY "Company admins view company orders" ON orders
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role = 'company_admin' 
    AND company_id = orders.company_id
  )
);

CREATE POLICY "Users view their orders" ON orders
FOR SELECT USING (user_id = auth.uid());

-- Insert/Update policies for orders
CREATE POLICY "Super admins manage all orders" ON orders
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'super_admin'
  )
);

CREATE POLICY "Company admins manage company orders" ON orders
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role = 'company_admin' 
    AND company_id = orders.company_id
  )
);

CREATE POLICY "Company admins update company orders" ON orders
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role = 'company_admin' 
    AND company_id = orders.company_id
  )
);

CREATE POLICY "Users manage their orders" ON orders
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update their orders" ON orders
FOR UPDATE USING (user_id = auth.uid());

-- Similar simple policies for shipments
CREATE POLICY "Super admins view all shipments" ON shipments
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'super_admin'
  )
);

CREATE POLICY "Company admins view company shipments" ON shipments
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role = 'company_admin' 
    AND company_id = shipments.company_id
  )
);

CREATE POLICY "Users view their shipments" ON shipments
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Authenticated users insert shipments" ON shipments
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);