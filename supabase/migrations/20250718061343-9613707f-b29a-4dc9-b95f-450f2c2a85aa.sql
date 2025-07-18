-- Phase 1: Critical Security Fixes (Step by Step)

-- 1. Fix qboid_events table RLS policies (currently has no protection)
ALTER TABLE public.qboid_events ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for qboid_events table
CREATE POLICY "Super admins can manage all qboid events" 
ON public.qboid_events 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.users 
  WHERE users.id = auth.uid() 
  AND users.role = 'super_admin'
));

CREATE POLICY "Authenticated users can view qboid events" 
ON public.qboid_events 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "System can insert qboid events" 
ON public.qboid_events 
FOR INSERT 
WITH CHECK (true); -- Allow system insertions

-- 2. Add critical user role protection policy
CREATE POLICY "Prevent unauthorized role changes" 
ON public.users 
FOR UPDATE 
USING (
  -- Super admins can update anyone
  (get_current_user_role() = 'super_admin') OR
  -- Regular users can only update their own profile  
  (auth.uid() = id)
)
WITH CHECK (
  -- Super admins can change anything
  (get_current_user_role() = 'super_admin') OR
  -- Regular users cannot escalate their role
  (auth.uid() = id AND role = (SELECT role FROM public.users WHERE id = auth.uid()))
);