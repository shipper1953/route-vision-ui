-- Drop all policies that depend on the function first, then drop the function

-- Drop all order policies
DROP POLICY IF EXISTS "Super admins can manage all orders" ON orders;
DROP POLICY IF EXISTS "Company admins can manage company orders" ON orders;
DROP POLICY IF EXISTS "Users can manage their own orders" ON orders;
DROP POLICY IF EXISTS "Super admins view all orders" ON orders;
DROP POLICY IF EXISTS "Company admins view company orders" ON orders;
DROP POLICY IF EXISTS "Users view their orders" ON orders;
DROP POLICY IF EXISTS "Company admins manage company orders" ON orders;
DROP POLICY IF EXISTS "Company admins update company orders" ON orders;
DROP POLICY IF EXISTS "Users manage their orders" ON orders;
DROP POLICY IF EXISTS "Users update their orders" ON orders;

-- Drop all shipment policies  
DROP POLICY IF EXISTS "Super admins can manage all shipments" ON shipments;
DROP POLICY IF EXISTS "Company admins can manage company shipments" ON shipments;
DROP POLICY IF EXISTS "Users can manage their own shipments" ON shipments;
DROP POLICY IF EXISTS "Super admins view all shipments" ON shipments;
DROP POLICY IF EXISTS "Company admins view company shipments" ON shipments;
DROP POLICY IF EXISTS "Users view their shipments" ON shipments;
DROP POLICY IF EXISTS "Authenticated users insert shipments" ON shipments;

-- Drop shipping rates policies
DROP POLICY IF EXISTS "Super admins can manage all shipping rates" ON shipping_rates;
DROP POLICY IF EXISTS "Users can view shipping rates" ON shipping_rates;

-- Now drop the function
DROP FUNCTION IF EXISTS public.get_user_company_and_role();

-- Ensure Demo company exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.companies WHERE name = 'Demo') THEN
    INSERT INTO public.companies (name, is_active, email, address, settings)
    VALUES (
      'Demo',
      true,
      'demo@company.com',
      '{"street1": "123 Demo Street", "city": "Demo City", "state": "Demo State", "zip": "12345", "country": "US"}',
      '{}'
    );
  ELSE
    UPDATE public.companies SET is_active = true WHERE name = 'Demo';
  END IF;
END $$;

-- Create a default warehouse for the Demo company if it doesn't exist
DO $$
DECLARE
  demo_company_id uuid;
BEGIN
  SELECT id INTO demo_company_id FROM public.companies WHERE name = 'Demo' AND is_active = true;
  
  IF demo_company_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.warehouses WHERE company_id = demo_company_id
  ) THEN
    INSERT INTO public.warehouses (name, company_id, address, is_default)
    VALUES (
      'Demo Warehouse',
      demo_company_id,
      '{"street1": "123 Demo Street", "city": "Demo City", "state": "Demo State", "zip": "12345", "country": "US"}',
      true
    );
  END IF;
END $$;

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

CREATE POLICY "Authenticated users insert orders" ON orders
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Company admins update company orders" ON orders
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role = 'company_admin' 
    AND company_id = orders.company_id
  )
);

CREATE POLICY "Users update their orders" ON orders
FOR UPDATE USING (user_id = auth.uid());