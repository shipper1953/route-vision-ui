INSERT INTO public.user_roles (user_id, role)
SELECT u.id, u.role::public.app_role
FROM public.users u
WHERE u.role IN ('company_admin', 'super_admin', 'user')
  AND EXISTS (SELECT 1 FROM auth.users au WHERE au.id = u.id)
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = u.id AND ur.role = u.role::public.app_role
  );