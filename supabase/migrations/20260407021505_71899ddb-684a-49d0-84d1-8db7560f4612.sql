ALTER TABLE public.orders DROP CONSTRAINT orders_shopify_store_id_fkey;
ALTER TABLE public.orders ADD CONSTRAINT orders_shopify_store_id_fkey 
  FOREIGN KEY (shopify_store_id) REFERENCES shopify_stores(id) ON DELETE SET NULL;