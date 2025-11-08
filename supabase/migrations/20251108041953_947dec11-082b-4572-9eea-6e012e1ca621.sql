-- ============================================
-- SECURITY FIX: Restrict RLS Policies
-- ============================================

-- ==========================================
-- 1. FIX USERS TABLE RLS POLICIES
-- ==========================================

-- Drop overlapping and insecure policies
DROP POLICY IF EXISTS "Company admins manage company users" ON public.users;
DROP POLICY IF EXISTS "Super admins create users manually" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users manage own profile" ON public.users;

-- Create clean, secure policies
CREATE POLICY "users_select_own_profile"
ON public.users FOR SELECT
TO authenticated
USING (auth.uid() = id OR auth_user_role() = 'super_admin'::app_role);

CREATE POLICY "users_update_own_profile"
ON public.users FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id 
  AND role = (SELECT role FROM public.users WHERE id = auth.uid())
);

CREATE POLICY "users_company_admins_manage"
ON public.users FOR ALL
TO authenticated
USING (
  auth_user_role() IN ('company_admin'::app_role, 'super_admin'::app_role)
  AND (
    company_id = auth_user_company_id() 
    OR auth_user_role() = 'super_admin'::app_role
  )
)
WITH CHECK (
  auth_user_role() IN ('company_admin'::app_role, 'super_admin'::app_role)
  AND (
    company_id = auth_user_company_id() 
    OR auth_user_role() = 'super_admin'::app_role
  )
);

-- ==========================================
-- 2. FIX ORDERS TABLE INSERT POLICY
-- ==========================================

-- Drop the overly permissive policy that allows any authenticated user to insert orders
DROP POLICY IF EXISTS "Authenticated users insert orders" ON public.orders;

-- Create secure policy that verifies company ownership
CREATE POLICY "orders_insert_company_verified"
ON public.orders FOR INSERT
TO authenticated
WITH CHECK (
  -- User must belong to the company they're creating the order for
  (company_id = auth_user_company_id() OR auth_user_role() = 'super_admin'::app_role)
  -- If user_id is set, it must match the authenticated user
  AND (user_id IS NULL OR user_id = auth.uid())
);

-- ==========================================
-- 3. CONSOLIDATE ORDERS UPDATE POLICIES  
-- ==========================================

-- Keep only the company-scoped policy, remove redundant ones
DROP POLICY IF EXISTS "Users update their orders" ON public.orders;
DROP POLICY IF EXISTS "Company admins update company orders" ON public.orders;

-- Single consolidated update policy
CREATE POLICY "orders_update_company_scoped"
ON public.orders FOR UPDATE
TO authenticated
USING (
  company_id = auth_user_company_id()
  OR auth_user_role() = 'super_admin'::app_role
)
WITH CHECK (
  company_id = auth_user_company_id()
  OR auth_user_role() = 'super_admin'::app_role
);

-- ==========================================
-- 4. CONSOLIDATE ORDERS SELECT POLICIES
-- ==========================================

DROP POLICY IF EXISTS "Users can view their orders" ON public.orders;
DROP POLICY IF EXISTS "Users view their orders" ON public.orders;
DROP POLICY IF EXISTS "Company admins view company orders" ON public.orders;

CREATE POLICY "orders_select_company_scoped"
ON public.orders FOR SELECT
TO authenticated
USING (
  company_id = auth_user_company_id()
  OR auth_user_role() = 'super_admin'::app_role
);

-- ==========================================
-- 5. CREATE SHOPIFY_STORES TABLE IF NOT EXISTS
-- (Migration should be idempotent)
-- ==========================================

-- Note: shopify_stores should already exist from previous migration
-- This section ensures RLS is properly configured

-- Ensure RLS is enabled
ALTER TABLE public.shopify_stores ENABLE ROW LEVEL SECURITY;

-- Add RLS policies if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'shopify_stores' 
    AND policyname = 'shopify_stores_select_company'
  ) THEN
    CREATE POLICY "shopify_stores_select_company"
    ON public.shopify_stores FOR SELECT
    TO authenticated
    USING (
      company_id = auth_user_company_id()
      OR auth_user_role() = 'super_admin'::app_role
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'shopify_stores' 
    AND policyname = 'shopify_stores_manage_admins'
  ) THEN
    CREATE POLICY "shopify_stores_manage_admins"
    ON public.shopify_stores FOR ALL
    TO authenticated
    USING (
      (company_id = auth_user_company_id() AND auth_user_role() IN ('company_admin'::app_role, 'super_admin'::app_role))
      OR auth_user_role() = 'super_admin'::app_role
    )
    WITH CHECK (
      (company_id = auth_user_company_id() AND auth_user_role() IN ('company_admin'::app_role, 'super_admin'::app_role))
      OR auth_user_role() = 'super_admin'::app_role
    );
  END IF;
END $$;