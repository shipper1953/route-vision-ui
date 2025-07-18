-- Update the handle_new_user trigger function to use the active Demo company
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    demo_company_uuid uuid;
    demo_warehouse_uuid uuid;
BEGIN
    -- Get the active Demo company ID
    SELECT id INTO demo_company_uuid 
    FROM public.companies 
    WHERE name = 'Demo' AND is_active = true 
    ORDER BY created_at DESC 
    LIMIT 1;
    
    -- Get Demo warehouse ID  
    SELECT id INTO demo_warehouse_uuid 
    FROM public.warehouses 
    WHERE company_id = demo_company_uuid AND is_default = true 
    LIMIT 1;
    
    -- Insert into users table with Demo company assignment
    INSERT INTO public.users (id, name, email, password, role, company_id, warehouse_ids)
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
        new.email,
        '', -- Password managed by Supabase auth
        'company_admin'::public.app_role,
        demo_company_uuid,
        CASE 
            WHEN demo_warehouse_uuid IS NOT NULL THEN jsonb_build_array(demo_warehouse_uuid)
            ELSE '[]'::jsonb
        END
    );
    
    RETURN new;
EXCEPTION
    WHEN others THEN
        -- Log the error but don't fail user creation
        RAISE WARNING 'Failed to create user profile: %', SQLERRM;
        RETURN new;
END;
$function$;