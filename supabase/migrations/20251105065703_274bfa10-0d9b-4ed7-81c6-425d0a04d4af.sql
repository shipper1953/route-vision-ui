-- Create warehouse ownership validation function
CREATE OR REPLACE FUNCTION public.validate_warehouse_ownership(
  p_warehouse_id uuid,
  p_company_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM warehouses
    WHERE id = p_warehouse_id
      AND company_id = p_company_id
  );
$$;