-- Multi-tenant architecture setup
-- Introduce tenants table, link companies and users to tenants, and ensure
-- access control helpers are tenant-aware.

-- 1. Create tenants table
CREATE TABLE IF NOT EXISTS public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Helper: tenant id lookup must exist before policies reference it
CREATE OR REPLACE FUNCTION public.auth_user_tenant_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM users WHERE id = auth.uid();
$$;

-- RLS: super admins can manage all tenants
DROP POLICY IF EXISTS "Super admins manage tenants" ON public.tenants;
CREATE POLICY "Super admins manage tenants"
ON public.tenants
FOR ALL
USING (auth_user_role() = 'super_admin'::app_role)
WITH CHECK (auth_user_role() = 'super_admin'::app_role);

-- RLS: tenant members can read their tenant metadata
DROP POLICY IF EXISTS "Tenant members can read tenant" ON public.tenants;
CREATE POLICY "Tenant members can read tenant"
ON public.tenants
FOR SELECT
USING (id = auth_user_tenant_id());

-- 2. Add tenant_id columns to companies and users
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS tenant_id uuid;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS tenant_id uuid;

-- 3. Seed a default tenant and backfill existing data
DO $$
DECLARE
  default_tenant uuid;
BEGIN
  INSERT INTO public.tenants (name, slug)
  VALUES ('Default Tenant', 'default')
  ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO default_tenant;

  UPDATE public.companies
  SET tenant_id = COALESCE(tenant_id, default_tenant);

  UPDATE public.users
  SET tenant_id = COALESCE(tenant_id, default_tenant);
END $$;

-- 4. Enforce referential integrity
ALTER TABLE public.companies
  ADD CONSTRAINT companies_tenant_id_fkey
    FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.users
  ADD CONSTRAINT users_tenant_id_fkey
    FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Ensure tenant_id is always present after backfill
ALTER TABLE public.companies
  ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE public.users
  ALTER COLUMN tenant_id SET NOT NULL;

-- Support tenant/company integrity for users
ALTER TABLE public.companies
  ADD CONSTRAINT companies_tenant_company_unique UNIQUE (tenant_id, id);

ALTER TABLE public.users
  ADD CONSTRAINT users_tenant_company_fkey
    FOREIGN KEY (tenant_id, company_id)
    REFERENCES public.companies(tenant_id, id);

-- 5. User-company access mapping for multi-company assignments
CREATE TABLE IF NOT EXISTS public.user_company_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, company_id)
);

ALTER TABLE public.user_company_access ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins manage user company access" ON public.user_company_access;
CREATE POLICY "Super admins manage user company access"
ON public.user_company_access
FOR ALL
USING (auth_user_role() = 'super_admin'::app_role)
WITH CHECK (auth_user_role() = 'super_admin'::app_role);

DROP POLICY IF EXISTS "Tenant admins manage assignments" ON public.user_company_access;
CREATE POLICY "Tenant admins manage assignments"
ON public.user_company_access
FOR ALL
USING (
  tenant_id = auth_user_tenant_id()
  AND auth_user_role() IN ('super_admin'::app_role, 'company_admin'::app_role)
)
WITH CHECK (
  tenant_id = auth_user_tenant_id()
  AND auth_user_role() IN ('super_admin'::app_role, 'company_admin'::app_role)
);

DROP POLICY IF EXISTS "Users view their assignments" ON public.user_company_access;
CREATE POLICY "Users view their assignments"
ON public.user_company_access
FOR SELECT
USING (user_id = auth.uid());

-- 6. Helper functions for tenant-aware access control
CREATE OR REPLACE FUNCTION public.auth_user_has_company_access(_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid()
      AND u.tenant_id = (
        SELECT tenant_id FROM public.companies WHERE id = _company_id
      )
      AND (
        u.company_id = _company_id
        OR EXISTS (
          SELECT 1 FROM public.user_company_access uca
          WHERE uca.user_id = u.id AND uca.company_id = _company_id
        )
      )
  );
$$;

-- 7. Keep user_company_access in sync with primary company assignments
CREATE OR REPLACE FUNCTION public.ensure_primary_company_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.company_id IS NOT NULL THEN
    INSERT INTO public.user_company_access (tenant_id, company_id, user_id)
    VALUES (NEW.tenant_id, NEW.company_id, NEW.id)
    ON CONFLICT (user_id, company_id) DO UPDATE
      SET tenant_id = EXCLUDED.tenant_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS users_primary_company_access ON public.users;
CREATE TRIGGER users_primary_company_access
AFTER INSERT OR UPDATE OF company_id ON public.users
FOR EACH ROW EXECUTE FUNCTION public.ensure_primary_company_access();

-- 8. Update get_user_profile to return tenant-aware metadata
CREATE OR REPLACE FUNCTION public.get_user_profile(user_id uuid)
RETURNS TABLE(
  id uuid,
  name text,
  email text,
  role app_role,
  tenant_id uuid,
  company_id uuid,
  warehouse_ids jsonb,
  accessible_companies jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  v_role app_role;
BEGIN
  SELECT
    CASE
      WHEN EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = $1 AND user_roles.role = 'super_admin')
        THEN 'super_admin'::app_role
      WHEN EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = $1 AND user_roles.role = 'company_admin')
        THEN 'company_admin'::app_role
      ELSE 'user'::app_role
    END
  INTO v_role;

  RETURN QUERY
  WITH accessible AS (
    SELECT DISTINCT c.id, c.name
    FROM public.companies c
    WHERE c.tenant_id = (SELECT tenant_id FROM public.users WHERE id = $1)
      AND (
        c.id = (SELECT company_id FROM public.users WHERE id = $1)
        OR EXISTS (
          SELECT 1
          FROM public.user_company_access uca
          WHERE uca.user_id = $1 AND uca.company_id = c.id
        )
      )
  )
  SELECT
    u.id,
    u.name,
    u.email,
    v_role,
    u.tenant_id,
    u.company_id,
    u.warehouse_ids,
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('id', a.id, 'name', a.name)) FROM accessible a),
      '[]'::jsonb
    )
  FROM public.users u
  WHERE u.id = $1;
END;
$function$;

-- 9. Update companies policies to be tenant-aware
DROP POLICY IF EXISTS "Super admins view all companies" ON public.companies;
CREATE POLICY "Super admins view all companies"
ON public.companies
FOR SELECT
USING (auth_user_role() = 'super_admin'::app_role);

DROP POLICY IF EXISTS "Super admins insert companies" ON public.companies;
CREATE POLICY "Super admins insert companies"
ON public.companies
FOR INSERT
WITH CHECK (auth_user_role() = 'super_admin'::app_role);

DROP POLICY IF EXISTS "Super admins update companies" ON public.companies;
CREATE POLICY "Super admins update companies"
ON public.companies
FOR UPDATE
USING (auth_user_role() = 'super_admin'::app_role);

DROP POLICY IF EXISTS "Super admins delete companies" ON public.companies;
CREATE POLICY "Super admins delete companies"
ON public.companies
FOR DELETE
USING (auth_user_role() = 'super_admin'::app_role);

DROP POLICY IF EXISTS "Company users view their company" ON public.companies;
CREATE POLICY "Company users view their company"
ON public.companies
FOR SELECT
USING (
  tenant_id = auth_user_tenant_id()
  AND auth_user_has_company_access(id)
);

DROP POLICY IF EXISTS "Company admins update their company" ON public.companies;
CREATE POLICY "Company admins update their company"
ON public.companies
FOR UPDATE
USING (
  tenant_id = auth_user_tenant_id()
  AND auth_user_role() = 'company_admin'::app_role
  AND auth_user_has_company_access(id)
);

-- 10. Update users policies to enforce tenant boundaries
DROP POLICY IF EXISTS "Super admins full access" ON public.users;
CREATE POLICY "Super admins full access"
ON public.users
FOR ALL
USING (auth_user_role() = 'super_admin'::app_role);

DROP POLICY IF EXISTS "Company admins manage company users" ON public.users;
CREATE POLICY "Company admins manage company users"
ON public.users
FOR ALL
USING (
  tenant_id = auth_user_tenant_id()
  AND auth_user_role() = 'company_admin'::app_role
  AND (
    id = auth.uid()
    OR company_id IS NOT DISTINCT FROM auth_user_company_id()
  )
);

DROP POLICY IF EXISTS "Users manage own profile" ON public.users;
CREATE POLICY "Users manage own profile"
ON public.users
FOR ALL
USING (id = auth.uid());

-- 11. Convenience index for lookups
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON public.users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_companies_tenant_id ON public.companies(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_company_access_tenant ON public.user_company_access(tenant_id, company_id);
