-- Insert the missing user profile for the authenticated user
-- First, get or create a Demo company
INSERT INTO public.users (id, name, email, password, role, company_id, warehouse_ids)
VALUES (
  '00be6af7-a275-49fe-842f-1bd402bf113b',
  'Billy Bob',
  'bobs2456@gmail.com',
  '', -- Password managed by Supabase auth
  'company_admin'::public.app_role,
  '93e83a29-38f3-4b74-be40-a57aa70eefd9', -- Assign to the company with most orders (57 orders)
  '[]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  company_id = EXCLUDED.company_id;