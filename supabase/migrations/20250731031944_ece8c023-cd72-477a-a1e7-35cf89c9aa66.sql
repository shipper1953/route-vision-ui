-- Create the recalculate-cartonization edge function
-- This function will handle cartonization calculations for orders

-- First, let's ensure the order_cartonization table has proper indexes for performance
CREATE INDEX IF NOT EXISTS idx_order_cartonization_order_id ON public.order_cartonization(order_id);
CREATE INDEX IF NOT EXISTS idx_order_cartonization_updated_at ON public.order_cartonization(updated_at);

-- Create a function to get company boxes for cartonization
CREATE OR REPLACE FUNCTION public.get_company_boxes_for_cartonization(p_company_id uuid)
RETURNS TABLE(
    id uuid,
    name text,
    length numeric,
    width numeric,
    height numeric,
    max_weight numeric,
    cost numeric,
    box_type text
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
    SELECT b.id, b.name, b.length, b.width, b.height, b.max_weight, b.cost, b.box_type::text
    FROM boxes b
    WHERE b.company_id = p_company_id 
    AND b.is_active = true
    ORDER BY (b.length * b.width * b.height) ASC;
$$;

-- Create a function to update order cartonization
CREATE OR REPLACE FUNCTION public.update_order_cartonization(
    p_order_id bigint,
    p_recommended_box_id uuid,
    p_recommended_box_data jsonb,
    p_utilization numeric,
    p_confidence integer,
    p_total_weight numeric,
    p_items_weight numeric,
    p_box_weight numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    INSERT INTO public.order_cartonization (
        order_id,
        recommended_box_id,
        recommended_box_data,
        utilization,
        confidence,
        total_weight,
        items_weight,
        box_weight,
        calculation_timestamp,
        updated_at
    )
    VALUES (
        p_order_id,
        p_recommended_box_id,
        p_recommended_box_data,
        p_utilization,
        p_confidence,
        p_total_weight,
        p_items_weight,
        p_box_weight,
        now(),
        now()
    )
    ON CONFLICT (order_id)
    DO UPDATE SET
        recommended_box_id = EXCLUDED.recommended_box_id,
        recommended_box_data = EXCLUDED.recommended_box_data,
        utilization = EXCLUDED.utilization,
        confidence = EXCLUDED.confidence,
        total_weight = EXCLUDED.total_weight,
        items_weight = EXCLUDED.items_weight,
        box_weight = EXCLUDED.box_weight,
        calculation_timestamp = EXCLUDED.calculation_timestamp,
        updated_at = EXCLUDED.updated_at;
END;
$$;