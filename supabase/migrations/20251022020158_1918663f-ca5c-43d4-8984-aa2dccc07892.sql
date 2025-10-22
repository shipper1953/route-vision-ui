-- ============================================================================
-- FIX: Create user_roles table (step by step approach)
-- ============================================================================

-- Step 1: Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES auth.users(id),
  UNIQUE(user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Step 2: Create security definer function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- Step 3: RLS Policies
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Super admins can manage all roles" ON public.user_roles;
CREATE POLICY "Super admins can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'super_admin'))
WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- Step 4: Migrate only valid users (those that exist in auth.users)
INSERT INTO public.user_roles (user_id, role, assigned_at)
SELECT u.id, u.role, NOW()
FROM public.users u
INNER JOIN auth.users au ON u.id = au.id
WHERE u.role IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- Step 5: Update get_user_profile function
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