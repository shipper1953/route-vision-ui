
-- 1) Remove unused password column from public.users
-- Drop from realtime publication first (ignore if not present)
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime DROP TABLE public.users;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Update handle_new_user to not reference password column
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    demo_company_uuid uuid;
    demo_warehouse_uuid uuid;
BEGIN
    SELECT id INTO demo_company_uuid
    FROM public.companies
    WHERE name = 'Demo' AND is_active = true
    ORDER BY created_at DESC
    LIMIT 1;

    SELECT id INTO demo_warehouse_uuid
    FROM public.warehouses
    WHERE company_id = demo_company_uuid AND is_default = true
    LIMIT 1;

    INSERT INTO public.users (id, name, email, role, company_id, warehouse_ids)
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
        new.email,
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
        RAISE WARNING 'Failed to create user profile: %', SQLERRM;
        RETURN new;
END;
$$;

ALTER TABLE public.users DROP COLUMN IF EXISTS password;

-- 2) tracking_tokens - remove public SELECT
DROP POLICY IF EXISTS "Anyone can view tracking tokens" ON public.tracking_tokens;
DROP POLICY IF EXISTS "Public can view tracking tokens" ON public.tracking_tokens;

CREATE POLICY "Company users view own tracking tokens"
ON public.tracking_tokens
FOR SELECT
TO authenticated
USING (company_id = auth_user_company_id() OR has_role(auth.uid(), 'super_admin'::app_role));

-- 3) qboid_events - restrict SELECT
DROP POLICY IF EXISTS "Authenticated users can view qboid events" ON public.qboid_events;
-- Keep super admin policy and system insert. Tighten insert to service_role only.
DROP POLICY IF EXISTS "System can insert qboid events" ON public.qboid_events;
CREATE POLICY "Service role inserts qboid events"
ON public.qboid_events
FOR INSERT
TO public
WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

-- 4) customer_notifications - lock down "System can manage notifications"
DROP POLICY IF EXISTS "System can manage notifications" ON public.customer_notifications;
CREATE POLICY "Service role manages notifications"
ON public.customer_notifications
FOR ALL
TO public
USING ((auth.jwt() ->> 'role') = 'service_role')
WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

-- 5) shipment_quotes - restrict insert
DROP POLICY IF EXISTS "System can insert quotes" ON public.shipment_quotes;
CREATE POLICY "Service role inserts quotes"
ON public.shipment_quotes
FOR INSERT
TO public
WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

-- 6) shopify_fulfillment_orders
DROP POLICY IF EXISTS "System can insert fulfillment orders" ON public.shopify_fulfillment_orders;
DROP POLICY IF EXISTS "System can update fulfillment orders" ON public.shopify_fulfillment_orders;
CREATE POLICY "Service role inserts fulfillment orders"
ON public.shopify_fulfillment_orders
FOR INSERT
TO public
WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');
CREATE POLICY "Service role updates fulfillment orders"
ON public.shopify_fulfillment_orders
FOR UPDATE
TO public
USING ((auth.jwt() ->> 'role') = 'service_role')
WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

-- 7) shopify_sync_logs
DROP POLICY IF EXISTS "System can insert sync logs" ON public.shopify_sync_logs;
CREATE POLICY "Service role inserts sync logs"
ON public.shopify_sync_logs
FOR INSERT
TO public
WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

-- 8) shopify_order_mappings
DROP POLICY IF EXISTS "System can insert shopify mappings" ON public.shopify_order_mappings;
CREATE POLICY "Service role inserts shopify mappings"
ON public.shopify_order_mappings
FOR INSERT
TO public
WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

-- 9) shopify_po_mappings (if exists)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='shopify_po_mappings') THEN
    EXECUTE 'DROP POLICY IF EXISTS "System can insert po mappings" ON public.shopify_po_mappings';
    EXECUTE 'DROP POLICY IF EXISTS "System can manage po mappings" ON public.shopify_po_mappings';
    EXECUTE $p$CREATE POLICY "Service role inserts po mappings" ON public.shopify_po_mappings FOR INSERT TO public WITH CHECK ((auth.jwt() ->> 'role') = 'service_role')$p$;
  END IF;
END $$;

-- 10) shipping_rates - drop overly permissive SELECT
DROP POLICY IF EXISTS "Public can view shipping rates" ON public.shipping_rates;
DROP POLICY IF EXISTS "Anyone can view shipping rates" ON public.shipping_rates;
DROP POLICY IF EXISTS "Authenticated users can view shipping rates" ON public.shipping_rates;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='shipping_rates'
      AND policyname='Company users view shipping rates'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "Company users view shipping rates"
      ON public.shipping_rates
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.shipments s
          WHERE s.id = shipping_rates.shipment_id
            AND (s.company_id = auth_user_company_id() OR has_role(auth.uid(), 'super_admin'::app_role))
        )
      )
    $p$;
  END IF;
END $$;
