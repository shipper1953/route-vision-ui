INSERT INTO public.wallets (company_id, user_id, balance)
SELECT '990e494f-e952-4ab4-b620-fc27727ba984', '0ee58a1e-a985-431b-92af-b38af0d58290', 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.wallets WHERE company_id = '990e494f-e952-4ab4-b620-fc27727ba984'
);