-- Fix companies table policies to prevent recursion
DROP POLICY IF EXISTS "Authenticated users can view their companies" ON public.companies;
DROP POLICY IF EXISTS "Company admins can view their own company" ON public.companies;
DROP POLICY IF EXISTS "Super admins can view all companies" ON public.companies;
DROP POLICY IF EXISTS "Users can view their company" ON public.companies;

-- Create simple, direct policies for companies
CREATE POLICY "Super admins can view all companies" 
ON public.companies 
FOR SELECT 
USING (
  (SELECT role FROM users WHERE id = auth.uid()) = 'super_admin'::app_role
);

CREATE POLICY "Company users can view their company" 
ON public.companies 
FOR SELECT 
USING (
  id = (SELECT company_id FROM users WHERE id = auth.uid())
);