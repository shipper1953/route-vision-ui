
-- Create order_shipments junction table to link orders to multiple shipments
CREATE TABLE IF NOT EXISTS public.order_shipments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id bigint NOT NULL,
    shipment_id bigint NOT NULL,
    package_index integer NOT NULL DEFAULT 0,
    package_info jsonb,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(order_id, shipment_id)
);

-- Add RLS policies for order_shipments
ALTER TABLE public.order_shipments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company order shipments" ON public.order_shipments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM orders o
            JOIN users u ON u.id = auth.uid()
            WHERE o.id = order_shipments.order_id 
            AND o.company_id = u.company_id
        )
    );

CREATE POLICY "Users can insert company order shipments" ON public.order_shipments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM orders o
            JOIN users u ON u.id = auth.uid()
            WHERE o.id = order_shipments.order_id 
            AND o.company_id = u.company_id
        )
    );

CREATE POLICY "Super admins can manage all order shipments" ON public.order_shipments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid() 
            AND users.role = 'super_admin'::app_role
        )
    );
