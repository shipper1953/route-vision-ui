-- Update get_user_profile function to fetch roles from user_roles table
CREATE OR REPLACE FUNCTION public.get_user_profile(user_id uuid)
RETURNS TABLE(id uuid, name text, email text, role app_role, company_id uuid, warehouse_ids jsonb)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_role app_role;
BEGIN
  -- Get the highest privilege role for the user
  SELECT 
    CASE 
      WHEN EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = $1 AND user_roles.role = 'super_admin') 
        THEN 'super_admin'::app_role
      WHEN EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = $1 AND user_roles.role = 'company_admin')
        THEN 'company_admin'::app_role
      ELSE 'user'::app_role
    END INTO v_role;

  -- Return user profile with role from user_roles table
  RETURN QUERY
  SELECT u.id, u.name, u.email, v_role, u.company_id, u.warehouse_ids
  FROM users u
  WHERE u.id = $1;
END;
$function$;