-- Drop the problematic recursive policies that are causing infinite recursion
DROP POLICY IF EXISTS "Company admins can view company users" ON public.users;
DROP POLICY IF EXISTS "Company admins can update company users" ON public.users;

-- Create non-recursive policies using auth.uid() directly
CREATE POLICY "Company admins can view their company users" 
ON public.users 
FOR SELECT 
USING (
  company_id IN (
    SELECT company_id FROM users 
    WHERE id = auth.uid() 
    AND role = 'company_admin'::app_role
  )
);

CREATE POLICY "Company admins can update their company users" 
ON public.users 
FOR UPDATE 
USING (
  company_id IN (
    SELECT company_id FROM users 
    WHERE id = auth.uid() 
    AND role = 'company_admin'::app_role
  )
)
WITH CHECK (
  company_id IN (
    SELECT company_id FROM users 
    WHERE id = auth.uid() 
    AND role = 'company_admin'::app_role
  )
);