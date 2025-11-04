-- Add super_admin role to bill@parcels.com user
-- This allows access to debug and system administration functions

INSERT INTO public.user_roles (user_id, role)
VALUES ('1df09637-58d7-4f67-b11a-e84e12380e0b', 'super_admin')
ON CONFLICT (user_id, role) DO NOTHING;