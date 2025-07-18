-- Drop all existing RLS policies on users table that cause recursion
DROP POLICY IF EXISTS "Prevent unauthorized role changes" ON users;
DROP POLICY IF EXISTS "Super admins can delete users" ON users;
DROP POLICY IF EXISTS "Super admins can insert users" ON users;
DROP POLICY IF EXISTS "Super admins can update all users" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile or super admins can update" ON users;
DROP POLICY IF EXISTS "Users can update their own profile or super admins can update a" ON users;
DROP POLICY IF EXISTS "Users can view their own profile or super admins can view all" ON users;

-- Drop the problematic function that causes recursion
DROP FUNCTION IF EXISTS public.get_current_user_role();

-- Create simple, non-recursive RLS policies for users table
CREATE POLICY "Super admins can view all users" ON users
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.id = auth.uid() AND u.role = 'super_admin'
  )
);

CREATE POLICY "Users can view their own profile" ON users
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Super admins can update all users" ON users
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.id = auth.uid() AND u.role = 'super_admin'
  )
);

CREATE POLICY "Users can update their own profile" ON users
FOR UPDATE USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id AND (
    -- Prevent role changes unless super admin
    role = (SELECT role FROM public.users WHERE id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin')
  )
);

CREATE POLICY "Super admins can insert users" ON users
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.id = auth.uid() AND u.role = 'super_admin'
  )
);

CREATE POLICY "Super admins can delete users" ON users
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.id = auth.uid() AND u.role = 'super_admin'
  )
);

-- Add missing SELECT policies for shipments (currently only has INSERT/UPDATE/DELETE policies)
CREATE POLICY "Super admins view all shipments" ON shipments
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'super_admin'
  )
);

CREATE POLICY "Company admins view company shipments" ON shipments
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role = 'company_admin' 
    AND company_id = shipments.company_id
  )
);

CREATE POLICY "Users view their shipments" ON shipments
FOR SELECT USING (user_id = auth.uid());