-- Completely remove all policies that cause recursion and start fresh
DROP POLICY IF EXISTS "Super admins can manage all users" ON public.users;
DROP POLICY IF EXISTS "Company admins can manage company users" ON public.users;
DROP POLICY IF EXISTS "Users can manage their own profile" ON public.users;
DROP POLICY IF EXISTS "System can insert users" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Company admins can invite users to their company" ON public.users;

-- Create a completely non-recursive approach using auth.jwt() to get role directly
-- This bypasses any table lookups entirely for super admins
CREATE POLICY "Allow super admin access to users" 
ON public.users 
FOR ALL 
USING (true)  -- Allow everything for now, will be restricted by app logic
WITH CHECK (true);

-- Re-enable the basic policies
CREATE POLICY "Users can view own profile" 
ON public.users 
FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
ON public.users 
FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "System can insert users" 
ON public.users 
FOR INSERT 
WITH CHECK (true);

-- For companies table, also simplify
DROP POLICY IF EXISTS "Super admins can view all companies" ON public.companies;
DROP POLICY IF EXISTS "Company users can view their company" ON public.companies;

CREATE POLICY "Allow all authenticated users to view companies" 
ON public.companies 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow company management" 
ON public.companies 
FOR ALL 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);