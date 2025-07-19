-- Comprehensive super admin access policies

-- Fix shipping_rates table (has no RLS policies)
ALTER TABLE public.shipping_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage all shipping rates" 
ON public.shipping_rates 
FOR ALL 
USING (get_current_user_role() = 'super_admin'::app_role);

CREATE POLICY "Users can view shipping rates" 
ON public.shipping_rates 
FOR SELECT 
USING (true);

-- Fix warehouses table (missing management policies for super admin)
CREATE POLICY "Super admins can manage all warehouses" 
ON public.warehouses 
FOR ALL 
USING (get_current_user_role() = 'super_admin'::app_role);

CREATE POLICY "Company admins can manage their warehouses" 
ON public.warehouses 
FOR ALL 
USING (
  get_current_user_role() = 'company_admin'::app_role 
  AND company_id = (SELECT company_id FROM users WHERE id = auth.uid())
);

-- Add super admin delete policy for companies
CREATE POLICY "Super admins can delete companies" 
ON public.companies 
FOR DELETE 
USING (get_current_user_role() = 'super_admin'::app_role);

-- Add super admin delete policy for wallets  
CREATE POLICY "Super admins can delete wallets" 
ON public.wallets 
FOR DELETE 
USING (get_current_user_role() = 'super_admin'::app_role);

-- Fix users table super admin policies (the existing ones are too restrictive)
DROP POLICY IF EXISTS "Super admins can manage all users" ON public.users;
DROP POLICY IF EXISTS "Super admins can view all users" ON public.users;

CREATE POLICY "Super admins have full access to users" 
ON public.users 
FOR ALL 
USING (get_current_user_role() = 'super_admin'::app_role);

-- Add company admin INSERT policy for users (invite functionality)
CREATE POLICY "Company admins can invite users to their company" 
ON public.users 
FOR INSERT 
WITH CHECK (
  get_current_user_role() = 'company_admin'::app_role 
  AND company_id = (SELECT company_id FROM users WHERE id = auth.uid())
);

-- Fix search path for functions to address linter warnings
CREATE OR REPLACE FUNCTION public.get_user_profile(user_id uuid)
RETURNS TABLE(
  id uuid,
  name text,
  email text,
  role app_role,
  company_id uuid,
  warehouse_ids jsonb
) 
LANGUAGE plpgsql 
SECURITY DEFINER 
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.name, u.email, u.role, u.company_id, u.warehouse_ids
  FROM users u
  WHERE u.id = user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS app_role 
LANGUAGE plpgsql 
SECURITY DEFINER 
STABLE
SET search_path = public
AS $$
DECLARE
  user_role app_role;
BEGIN
  SELECT role INTO user_role FROM users WHERE id = auth.uid();
  RETURN user_role;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_boxes_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    demo_company_uuid uuid;
    demo_warehouse_uuid uuid;
BEGIN
    -- Get the active Demo company ID
    SELECT id INTO demo_company_uuid 
    FROM public.companies 
    WHERE name = 'Demo' AND is_active = true 
    ORDER BY created_at DESC 
    LIMIT 1;
    
    -- Get Demo warehouse ID  
    SELECT id INTO demo_warehouse_uuid 
    FROM public.warehouses 
    WHERE company_id = demo_company_uuid AND is_default = true 
    LIMIT 1;
    
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
$$;