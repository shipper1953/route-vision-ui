-- Create a security definer function to fetch user profiles without RLS recursion
CREATE OR REPLACE FUNCTION public.get_user_profile(user_id uuid)
RETURNS TABLE(
  id uuid,
  name text,
  email text,
  role app_role,
  company_id uuid,
  warehouse_ids jsonb
) AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.name, u.email, u.role, u.company_id, u.warehouse_ids
  FROM users u
  WHERE u.id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create a simplified function to get current user role without recursion
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS app_role AS $$
DECLARE
  user_role app_role;
BEGIN
  SELECT role INTO user_role FROM users WHERE id = auth.uid();
  RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Company admins can view their company users" ON public.users;
DROP POLICY IF EXISTS "Company admins can update their company users" ON public.users;

-- Create new non-recursive policies using the security definer function
CREATE POLICY "Company admins can view their company users" 
ON public.users 
FOR SELECT 
USING (
  CASE 
    WHEN get_current_user_role() = 'super_admin'::app_role THEN true
    WHEN get_current_user_role() = 'company_admin'::app_role THEN 
      company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    ELSE id = auth.uid()
  END
);

CREATE POLICY "Company admins can update their company users" 
ON public.users 
FOR UPDATE 
USING (
  CASE 
    WHEN get_current_user_role() = 'super_admin'::app_role THEN true
    WHEN get_current_user_role() = 'company_admin'::app_role THEN 
      company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    ELSE id = auth.uid()
  END
)
WITH CHECK (
  CASE 
    WHEN get_current_user_role() = 'super_admin'::app_role THEN true
    WHEN get_current_user_role() = 'company_admin'::app_role THEN 
      company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    ELSE id = auth.uid()
  END
);