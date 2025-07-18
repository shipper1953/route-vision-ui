-- Clean up conflicting RLS policies and implement proper role-based access

-- First, create a security definer function to safely get user company and role
CREATE OR REPLACE FUNCTION public.get_user_company_and_role()
RETURNS TABLE(company_id uuid, user_role app_role)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT u.company_id, u.role
  FROM public.users u
  WHERE u.id = auth.uid();
$$;

-- Drop all conflicting policies on orders table
DROP POLICY IF EXISTS "Admins and users can update orders" ON orders;
DROP POLICY IF EXISTS "Admins can delete all orders" ON orders;
DROP POLICY IF EXISTS "Admins can delete orders" ON orders;
DROP POLICY IF EXISTS "Admins can insert orders" ON orders;
DROP POLICY IF EXISTS "Admins can select all orders" ON orders;
DROP POLICY IF EXISTS "Admins can select all orders or users can view their own orders" ON orders;
DROP POLICY IF EXISTS "Dashboard User Can Select Orders" ON orders;
DROP POLICY IF EXISTS "Users can create orders" ON orders;

-- Create clean, simple policies for orders table
CREATE POLICY "Super admins can manage all orders" ON orders
FOR ALL USING (
  (SELECT user_role FROM public.get_user_company_and_role()) = 'super_admin'
);

CREATE POLICY "Company admins can manage company orders" ON orders
FOR ALL USING (
  (SELECT user_role FROM public.get_user_company_and_role()) = 'company_admin'
  AND company_id = (SELECT get_user_company_and_role.company_id FROM public.get_user_company_and_role())
) WITH CHECK (
  (SELECT user_role FROM public.get_user_company_and_role()) = 'company_admin'
  AND company_id = (SELECT get_user_company_and_role.company_id FROM public.get_user_company_and_role())
);

CREATE POLICY "Users can manage their own orders" ON orders
FOR ALL USING (
  user_id = auth.uid()
) WITH CHECK (
  user_id = auth.uid()
);

-- Clean up shipments table policies
DROP POLICY IF EXISTS "Admins and users can delete shipments" ON shipments;
DROP POLICY IF EXISTS "Admins and users can update shipments" ON shipments;
DROP POLICY IF EXISTS "Admins can create shipments" ON shipments;
DROP POLICY IF EXISTS "Admins can delete shipments" ON shipments;
DROP POLICY IF EXISTS "Admins can update shipments" ON shipments;
DROP POLICY IF EXISTS "Allow updates for admins and users" ON shipments;
DROP POLICY IF EXISTS "Consolidated view policy for shipments" ON shipments;
DROP POLICY IF EXISTS "Users and Admins can view shipments" ON shipments;

-- Create clean policies for shipments table
CREATE POLICY "Super admins can manage all shipments" ON shipments
FOR ALL USING (
  (SELECT user_role FROM public.get_user_company_and_role()) = 'super_admin'
);

CREATE POLICY "Company admins can manage company shipments" ON shipments
FOR ALL USING (
  (SELECT user_role FROM public.get_user_company_and_role()) = 'company_admin'
  AND company_id = (SELECT get_user_company_and_role.company_id FROM public.get_user_company_and_role())
) WITH CHECK (
  (SELECT user_role FROM public.get_user_company_and_role()) = 'company_admin'
  AND company_id = (SELECT get_user_company_and_role.company_id FROM public.get_user_company_and_role())
);

CREATE POLICY "Users can manage their own shipments" ON shipments
FOR ALL USING (
  user_id = auth.uid()
) WITH CHECK (
  user_id = auth.uid()
);

-- Clean up shipping_rates table policies
DROP POLICY IF EXISTS "Admins can create shipping rates" ON shipping_rates;
DROP POLICY IF EXISTS "Admins can delete shipping rates" ON shipping_rates;
DROP POLICY IF EXISTS "Admins can update shipping rates" ON shipping_rates;
DROP POLICY IF EXISTS "Users and Admins can view shipping rates" ON shipping_rates;

-- Create clean policies for shipping_rates table
CREATE POLICY "Super admins can manage all shipping rates" ON shipping_rates
FOR ALL USING (
  (SELECT user_role FROM public.get_user_company_and_role()) = 'super_admin'
);

CREATE POLICY "Users can view shipping rates" ON shipping_rates
FOR SELECT USING (
  auth.uid() IS NOT NULL
);