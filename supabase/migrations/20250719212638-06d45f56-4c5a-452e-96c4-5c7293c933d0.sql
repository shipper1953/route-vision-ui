-- Add RLS policies to allow company admins to manage users in their company

-- Company admins can view users in their company
CREATE POLICY "Company admins can view company users" 
ON public.users 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM users AS current_user 
  WHERE current_user.id = auth.uid() 
  AND current_user.role = 'company_admin'::app_role 
  AND current_user.company_id = users.company_id
));

-- Company admins can update users in their company
CREATE POLICY "Company admins can update company users" 
ON public.users 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM users AS current_user 
  WHERE current_user.id = auth.uid() 
  AND current_user.role = 'company_admin'::app_role 
  AND current_user.company_id = users.company_id
))
WITH CHECK (EXISTS (
  SELECT 1 FROM users AS current_user 
  WHERE current_user.id = auth.uid() 
  AND current_user.role = 'company_admin'::app_role 
  AND current_user.company_id = users.company_id
));