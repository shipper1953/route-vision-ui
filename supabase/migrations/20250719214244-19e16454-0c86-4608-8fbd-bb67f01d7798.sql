-- First, remove the temporary permissive policies
DROP POLICY IF EXISTS "Allow super admin access to users" ON public.users;
DROP POLICY IF EXISTS "Allow all authenticated users to view companies" ON public.companies;
DROP POLICY IF EXISTS "Allow company management" ON public.companies;

-- Create proper security definer functions that bypass RLS
CREATE OR REPLACE FUNCTION public.auth_user_role()
RETURNS app_role
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.auth_user_company_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM users WHERE id = auth.uid();
$$;

-- Now create proper policies using these functions for users table
CREATE POLICY "Super admins full access" 
ON public.users 
FOR ALL 
USING (auth_user_role() = 'super_admin'::app_role);

CREATE POLICY "Company admins manage company users" 
ON public.users 
FOR ALL 
USING (
  auth_user_role() = 'company_admin'::app_role 
  AND company_id = auth_user_company_id()
);

CREATE POLICY "Users manage own profile" 
ON public.users 
FOR ALL 
USING (id = auth.uid());

-- Policies for companies table
CREATE POLICY "Super admins view all companies" 
ON public.companies 
FOR SELECT 
USING (auth_user_role() = 'super_admin'::app_role);

CREATE POLICY "Super admins insert companies" 
ON public.companies 
FOR INSERT 
WITH CHECK (auth_user_role() = 'super_admin'::app_role);

CREATE POLICY "Super admins update companies" 
ON public.companies 
FOR UPDATE 
USING (auth_user_role() = 'super_admin'::app_role);

CREATE POLICY "Super admins delete companies" 
ON public.companies 
FOR DELETE 
USING (auth_user_role() = 'super_admin'::app_role);

CREATE POLICY "Company users view their company" 
ON public.companies 
FOR SELECT 
USING (id = auth_user_company_id());

CREATE POLICY "Company admins update their company" 
ON public.companies 
FOR UPDATE 
USING (
  auth_user_role() = 'company_admin'::app_role 
  AND id = auth_user_company_id()
);