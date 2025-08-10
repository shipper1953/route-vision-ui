-- Enable realtime for orders and shipments
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.shipments REPLICA IDENTITY FULL;

-- Add to realtime publication (safe if already added)
DO $$
BEGIN
  PERFORM 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'orders';
  IF NOT FOUND THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.orders';
  END IF;
END$$;

DO $$
BEGIN
  PERFORM 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'shipments';
  IF NOT FOUND THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.shipments';
  END IF;
END$$;