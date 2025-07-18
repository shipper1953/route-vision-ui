-- Phase 1: Critical Security Fixes (Fixed)

-- 1. Fix qboid_events table RLS policies (currently has no protection)
ALTER TABLE public.qboid_events ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for qboid_events table
CREATE POLICY "Super admins can manage all qboid events" 
ON public.qboid_events 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.users 
  WHERE users.id = auth.uid() 
  AND users.role = 'super_admin'
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
-- Drop existing conflicting policies first
DROP POLICY IF EXISTS "Users cannot update their own role" ON public.users;
DROP POLICY IF EXISTS "Only super admins can modify user roles" ON public.users;

-- Add policy to prevent role escalation - only super admins can change roles
CREATE POLICY "Prevent role escalation" 
ON public.users 
FOR UPDATE 
USING (
  -- Must be super admin to update any user's role
  (get_current_user_role() = 'super_admin') OR 
  -- OR user updating their own profile without changing role
  (auth.uid() = id AND NOT (
    SELECT CASE 
      WHEN OLD.role IS DISTINCT FROM NEW.role THEN true 
      ELSE false 
    END
  ))
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
        'company_admin',
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
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public, pg_catalog'
AS $function$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role::TEXT INTO user_role 
  FROM public.users 
  WHERE id = auth.uid();
  
  RETURN COALESCE(user_role, 'user');
END;
$function$;