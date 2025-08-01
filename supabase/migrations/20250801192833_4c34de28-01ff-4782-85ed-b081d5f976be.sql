-- Extend order_cartonization table to support multi-package cartonization
ALTER TABLE public.order_cartonization 
ADD COLUMN packages jsonb DEFAULT '[]'::jsonb,
ADD COLUMN total_packages integer DEFAULT 1,
ADD COLUMN splitting_strategy text,
ADD COLUMN optimization_objective text DEFAULT 'minimize_packages';