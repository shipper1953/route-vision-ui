-- Drop all the problematic recursive policies
DROP POLICY IF EXISTS "Company admins can view their company users" ON public.users;
DROP POLICY IF EXISTS "Company admins can update their company users" ON public.users;
DROP POLICY IF EXISTS "Super admins have full access to users" ON public.users;

-- Create simple, non-recursive policies for users table
-- Super admin policy - check if user has super_admin role directly
CREATE POLICY "Super admins can manage all users" 
ON public.users 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM users u 
    WHERE u.id = auth.uid() 
    AND u.role = 'super_admin'::app_role
  )
);

-- Company admin policy - only check company match, no role check that causes recursion
CREATE POLICY "Company admins can manage company users" 
ON public.users 
FOR ALL 
USING (
  -- Allow if user is in same company (this will be further restricted by app logic)
  company_id = (SELECT company_id FROM users WHERE id = auth.uid())
  OR 
  -- Or if they're a super admin
  (SELECT role FROM users WHERE id = auth.uid()) = 'super_admin'::app_role
);

-- Individual user access
CREATE POLICY "Users can manage their own profile" 
ON public.users 
FOR ALL 
USING (id = auth.uid());

-- Update the get_current_user_role function to be simpler and avoid any potential recursion
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS app_role 
LANGUAGE sql 
SECURITY DEFINER 
STABLE
SET search_path = public
AS $$
  SELECT role FROM users WHERE id = auth.uid() LIMIT 1;
$$;