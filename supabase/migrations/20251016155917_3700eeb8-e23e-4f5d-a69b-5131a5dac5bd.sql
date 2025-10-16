-- ============================================
-- CRITICAL SECURITY FIX: Fix Users Table Policies
-- ============================================

-- Drop the dangerous unrestricted insert policy
DROP POLICY IF EXISTS "System can insert users" ON users;

-- Keep trigger-based user creation for Supabase Auth signups
-- The handle_new_user() trigger will still work for legitimate auth signups

-- Only super admins can manually create users (for admin panel)
CREATE POLICY "Super admins create users manually"
ON users FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role = 'super_admin'::app_role
  )
);

-- ============================================
-- CRITICAL SECURITY FIX: Consolidate Companies Policies
-- ============================================

-- Drop all overlapping/duplicate policies
DROP POLICY IF EXISTS "Super admins view all companies" ON companies;
DROP POLICY IF EXISTS "Company users view their company" ON companies;
DROP POLICY IF EXISTS "Company admins can update their own company" ON companies;
DROP POLICY IF EXISTS "Company admins update their company" ON companies;
DROP POLICY IF EXISTS "Company admins and super admins can update companies" ON companies;
DROP POLICY IF EXISTS "Super admins can update companies" ON companies;
DROP POLICY IF EXISTS "Super admins update companies" ON companies;
DROP POLICY IF EXISTS "Super admins insert companies" ON companies;
DROP POLICY IF EXISTS "Super admins can create companies" ON companies;
DROP POLICY IF EXISTS "Super admins delete companies" ON companies;
DROP POLICY IF EXISTS "Super admins can delete companies" ON companies;

-- Create single, clear policies for companies
CREATE POLICY "Users view appropriate companies"
ON companies FOR SELECT 
USING (
  auth_user_role() = 'super_admin'::app_role
  OR id = auth_user_company_id()
);

CREATE POLICY "Admins update companies"
ON companies FOR UPDATE 
USING (
  auth_user_role() = 'super_admin'::app_role
  OR (auth_user_role() = 'company_admin'::app_role AND id = auth_user_company_id())
);

CREATE POLICY "Super admins insert companies"
ON companies FOR INSERT
WITH CHECK (
  auth_user_role() = 'super_admin'::app_role
);

CREATE POLICY "Super admins delete companies"
ON companies FOR DELETE
USING (
  auth_user_role() = 'super_admin'::app_role
);

-- ============================================
-- FIX: Add search_path to SECURITY DEFINER functions
-- ============================================

CREATE OR REPLACE FUNCTION public.update_boxes_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_items_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_items_dimensions_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  IF (NEW.length IS DISTINCT FROM OLD.length OR
      NEW.width IS DISTINCT FROM OLD.width OR
      NEW.height IS DISTINCT FROM OLD.height OR
      NEW.weight IS DISTINCT FROM OLD.weight) THEN
    NEW.dimensions_updated_at = now();
  END IF;
  RETURN NEW;
END;
$function$;