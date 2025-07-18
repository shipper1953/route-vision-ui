-- Drop all existing wallet policies to clean up conflicts
DROP POLICY IF EXISTS "Authenticated users can view wallets" ON public.wallets;
DROP POLICY IF EXISTS "Authenticated users can update their own wallets or admins can" ON public.wallets;
DROP POLICY IF EXISTS "Authenticated users can update their own wallets or admins can " ON public.wallets;
DROP POLICY IF EXISTS "Company admins can update their own wallet" ON public.wallets;
DROP POLICY IF EXISTS "Super admins can update wallets" ON public.wallets;
DROP POLICY IF EXISTS "Super admins can create wallets" ON public.wallets;

-- Create clean, working policies for wallets
-- Allow viewing wallets for users in the same company or super admins
CREATE POLICY "Users can view company wallets" ON public.wallets
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE public.users.id = auth.uid() 
    AND (
      public.users.role = 'super_admin'::app_role OR 
      public.users.company_id = public.wallets.company_id
    )
  )
);

-- Allow super admins to create wallets
CREATE POLICY "Super admins can create wallets" ON public.wallets
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE public.users.id = auth.uid() 
    AND public.users.role = 'super_admin'::app_role
  )
);

-- Allow company admins and super admins to update wallets for their company
CREATE POLICY "Admins can update company wallets" ON public.wallets
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE public.users.id = auth.uid() 
    AND (
      public.users.role = 'super_admin'::app_role OR 
      (
        public.users.role = 'company_admin'::app_role AND 
        public.users.company_id = public.wallets.company_id
      )
    )
  )
);