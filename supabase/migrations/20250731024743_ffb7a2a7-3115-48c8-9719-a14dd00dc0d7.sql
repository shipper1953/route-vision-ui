-- Create order cartonization table to store calculated box recommendations
CREATE TABLE IF NOT EXISTS public.order_cartonization (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id BIGINT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    recommended_box_id UUID REFERENCES public.boxes(id) ON DELETE SET NULL,
    recommended_box_data JSONB, -- Store box details in case box is deleted
    utilization NUMERIC(5,2),
    confidence INTEGER,
    total_weight NUMERIC(10,2),
    items_weight NUMERIC(10,2),
    box_weight NUMERIC(10,2),
    calculation_timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(order_id) -- One cartonization record per order
);

-- Enable RLS
ALTER TABLE public.order_cartonization ENABLE ROW LEVEL SECURITY;

-- Create policies for order_cartonization
CREATE POLICY "Users can view company order cartonization" 
ON public.order_cartonization 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.orders o 
        JOIN public.users u ON u.id = auth.uid()
        WHERE o.id = order_cartonization.order_id 
        AND o.company_id = u.company_id
    )
);

CREATE POLICY "Users can insert company order cartonization" 
ON public.order_cartonization 
FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.orders o 
        JOIN public.users u ON u.id = auth.uid()
        WHERE o.id = order_cartonization.order_id 
        AND o.company_id = u.company_id
    )
);

CREATE POLICY "Users can update company order cartonization" 
ON public.order_cartonization 
FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM public.orders o 
        JOIN public.users u ON u.id = auth.uid()
        WHERE o.id = order_cartonization.order_id 
        AND o.company_id = u.company_id
    )
);

CREATE POLICY "Super admins can manage all order cartonization" 
ON public.order_cartonization 
FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND role = 'super_admin'
    )
);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_order_cartonization_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_order_cartonization_updated_at
    BEFORE UPDATE ON public.order_cartonization
    FOR EACH ROW
    EXECUTE FUNCTION public.update_order_cartonization_updated_at();