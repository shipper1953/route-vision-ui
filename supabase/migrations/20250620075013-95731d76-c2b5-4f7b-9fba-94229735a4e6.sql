
-- Enable RLS on companies table if not already enabled
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Create policy to allow super admins to view all companies
CREATE POLICY "Super admins can view all companies" 
ON public.companies 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() 
    AND users.role = 'super_admin'
  )
);

-- Create policy to allow super admins to insert companies
CREATE POLICY "Super admins can create companies" 
ON public.companies 
FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() 
    AND users.role = 'super_admin'
  )
);

-- Create policy to allow super admins to update companies
CREATE POLICY "Super admins can update companies" 
ON public.companies 
FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() 
    AND users.role = 'super_admin'
  )
);

-- Create policy to allow company admins to view their own company
CREATE POLICY "Company admins can view their own company" 
ON public.companies 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() 
    AND users.company_id = companies.id
    AND users.role = 'company_admin'
  )
);

-- Create policy to allow company admins to update their own company
CREATE POLICY "Company admins can update their own company" 
ON public.companies 
FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() 
    AND users.company_id = companies.id
    AND users.role = 'company_admin'
  )
);
