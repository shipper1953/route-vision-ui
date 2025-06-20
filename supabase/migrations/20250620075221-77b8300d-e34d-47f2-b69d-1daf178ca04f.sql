
-- Enable RLS on wallets table
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

-- Enable RLS on transactions table  
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Allow super admins to view all wallets
CREATE POLICY "Super admins can view all wallets" 
ON public.wallets 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() 
    AND users.role = 'super_admin'
  )
);

-- Allow super admins to create wallets
CREATE POLICY "Super admins can create wallets" 
ON public.wallets 
FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() 
    AND users.role = 'super_admin'
  )
);

-- Allow super admins to update wallets
CREATE POLICY "Super admins can update wallets" 
ON public.wallets 
FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() 
    AND users.role = 'super_admin'
  )
);

-- Allow company admins to view their own company's wallet
CREATE POLICY "Company admins can view their own wallet" 
ON public.wallets 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() 
    AND users.company_id = wallets.company_id
    AND users.role = 'company_admin'
  )
);

-- Allow company admins to update their own company's wallet
CREATE POLICY "Company admins can update their own wallet" 
ON public.wallets 
FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() 
    AND users.company_id = wallets.company_id
    AND users.role = 'company_admin'
  )
);

-- Allow super admins to view all transactions
CREATE POLICY "Super admins can view all transactions" 
ON public.transactions 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() 
    AND users.role = 'super_admin'
  )
);

-- Allow super admins to create transactions
CREATE POLICY "Super admins can create transactions" 
ON public.transactions 
FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() 
    AND users.role = 'super_admin'
  )
);

-- Allow company admins to view their own company's transactions
CREATE POLICY "Company admins can view their own transactions" 
ON public.transactions 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() 
    AND users.company_id = transactions.company_id
    AND users.role = 'company_admin'
  )
);

-- Allow company admins to create transactions for their own company
CREATE POLICY "Company admins can create their own transactions" 
ON public.transactions 
FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() 
    AND users.company_id = transactions.company_id
    AND users.role = 'company_admin'
  )
);
