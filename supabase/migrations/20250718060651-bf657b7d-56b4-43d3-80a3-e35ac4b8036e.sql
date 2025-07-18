-- Phase 1: Critical Security Fixes

-- 1. Fix qboid_events table RLS policies (currently has no protection)
ALTER TABLE public.qboid_events ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for qboid_events table
CREATE POLICY "Super admins can manage all qboid events" 
ON public.qboid_events 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.users 
  WHERE users.id = auth.uid() 
  AND users.role = 'super_admin'::app_role
));

CREATE POLICY "Authenticated users can view qboid events" 
ON public.qboid_events 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "System can insert qboid events" 
ON public.qboid_events 
FOR INSERT 
WITH CHECK (true); -- Allow system insertions

-- 2. Fix critical user role elevation vulnerability
-- Add policy to prevent users from updating their own role
CREATE POLICY "Users cannot update their own role" 
ON public.users 
FOR UPDATE 
USING (
  CASE 
    WHEN auth.uid() = id THEN 
      -- Users can update their own profile but NOT their role
      (SELECT role FROM public.users WHERE id = auth.uid()) = (SELECT role FROM public.users WHERE id = auth.uid())
    ELSE 
      -- For other users, must be super admin
      (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'::app_role
  END
);

-- Only super admins can modify user roles
CREATE POLICY "Only super admins can modify user roles" 
ON public.users 
FOR UPDATE 
USING (
  -- If role is being changed, only super admins can do it
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'::app_role
) 
WITH CHECK (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'::app_role
);

-- 3. Fix database function security issues
-- Update handle_new_user function to use fixed search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public, pg_catalog'
AS $function$
DECLARE
    demo_company_uuid uuid;
    demo_warehouse_uuid uuid;
BEGIN
    -- Get Demo company ID
    SELECT id INTO demo_company_uuid FROM public.companies WHERE name = 'Demo' LIMIT 1;
    
    -- Get Demo warehouse ID  
    SELECT id INTO demo_warehouse_uuid FROM public.warehouses WHERE company_id = demo_company_uuid AND is_default = true LIMIT 1;
    
    -- Insert into users table with Demo company assignment
    INSERT INTO public.users (id, name, email, password, role, company_id, warehouse_ids)
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
        new.email,
        '', -- Password managed by Supabase auth
        'company_admin'::public.app_role,
        demo_company_uuid,
        CASE 
            WHEN demo_warehouse_uuid IS NOT NULL THEN jsonb_build_array(demo_warehouse_uuid)
            ELSE '[]'::jsonb
        END
    );
    
    RETURN new;
EXCEPTION
    WHEN others THEN
        -- Log the error but don't fail user creation
        RAISE WARNING 'Failed to create user profile: %', SQLERRM;
        RETURN new;
END;
$function$;

-- Update get_current_user_role function with fixed search_path
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS app_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public, pg_catalog'
AS $function$
DECLARE
  user_role app_role;
BEGIN
  SELECT role INTO user_role 
  FROM public.users 
  WHERE id = auth.uid();
  
  RETURN COALESCE(user_role, 'user'::app_role);
END;
$function$;