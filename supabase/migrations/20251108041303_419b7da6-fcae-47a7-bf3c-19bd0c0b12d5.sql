-- Remove super_admin role from Bill Parcels
-- He should only have company_admin role for Demo Company
DELETE FROM public.user_roles
WHERE user_id = '1df09637-58d7-4f67-b11a-e84e12380e0b'
AND role = 'super_admin';