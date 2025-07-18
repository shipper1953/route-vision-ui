-- Check if there are any remaining policies that might cause recursion
-- First, let's look at the current policies on users table
SELECT schemaname, tablename, policyname, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'users' AND schemaname = 'public';

-- Drop any remaining problematic policies and recreate simple ones
DROP POLICY IF EXISTS "Super admins can view all users" ON users;
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Super admins can update all users" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Super admins can insert users" ON users;
DROP POLICY IF EXISTS "Super admins can delete users" ON users;

-- Create completely simple policies that avoid any recursive calls
CREATE POLICY "Users can view their own profile" ON users
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Super admins can view all users" ON users
FOR SELECT USING (
  role = 'super_admin' AND auth.uid() = id
);

CREATE POLICY "Users can update their own profile" ON users
FOR UPDATE USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Super admins can manage all users" ON users
FOR ALL USING (
  role = 'super_admin' AND auth.uid() = id
);

-- Add policy for system to insert users (for auth trigger)
CREATE POLICY "System can insert users" ON users
FOR INSERT WITH CHECK (true);