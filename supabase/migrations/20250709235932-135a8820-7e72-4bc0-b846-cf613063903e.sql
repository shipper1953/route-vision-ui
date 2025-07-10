-- Create enum for box types
CREATE TYPE public.box_type AS ENUM ('box', 'poly_bag', 'envelope', 'tube', 'custom');

-- Create boxes table for company-specific box inventory
CREATE TABLE public.boxes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    length NUMERIC NOT NULL CHECK (length > 0),
    width NUMERIC NOT NULL CHECK (width > 0),
    height NUMERIC NOT NULL CHECK (height > 0),
    max_weight NUMERIC NOT NULL CHECK (max_weight > 0),
    cost NUMERIC NOT NULL DEFAULT 0 CHECK (cost >= 0),
    in_stock INTEGER NOT NULL DEFAULT 0 CHECK (in_stock >= 0),
    box_type public.box_type NOT NULL DEFAULT 'box',
    is_active BOOLEAN NOT NULL DEFAULT true,
    sku TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    -- Ensure unique box names per company
    UNIQUE(company_id, name)
);

-- Enable Row Level Security
ALTER TABLE public.boxes ENABLE ROW LEVEL SECURITY;

-- Create policies for box access
CREATE POLICY "Users can view their company boxes" 
ON public.boxes 
FOR SELECT 
USING (company_id = (
    SELECT users.company_id 
    FROM public.users 
    WHERE users.id = auth.uid()
));

CREATE POLICY "Company admins can create boxes" 
ON public.boxes 
FOR INSERT 
WITH CHECK (
    company_id = (
        SELECT users.company_id 
        FROM public.users 
        WHERE users.id = auth.uid() 
        AND users.role IN ('company_admin', 'super_admin')
    )
);

CREATE POLICY "Company admins can update their company boxes" 
ON public.boxes 
FOR UPDATE 
USING (
    company_id = (
        SELECT users.company_id 
        FROM public.users 
        WHERE users.id = auth.uid() 
        AND users.role IN ('company_admin', 'super_admin')
    )
)
WITH CHECK (
    company_id = (
        SELECT users.company_id 
        FROM public.users 
        WHERE users.id = auth.uid() 
        AND users.role IN ('company_admin', 'super_admin')
    )
);

CREATE POLICY "Company admins can delete their company boxes" 
ON public.boxes 
FOR DELETE 
USING (
    company_id = (
        SELECT users.company_id 
        FROM public.users 
        WHERE users.id = auth.uid() 
        AND users.role IN ('company_admin', 'super_admin')
    )
);

CREATE POLICY "Super admins can manage all boxes" 
ON public.boxes 
FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE users.id = auth.uid() 
        AND users.role = 'super_admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE users.id = auth.uid() 
        AND users.role = 'super_admin'
    )
);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_boxes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_boxes_updated_at
    BEFORE UPDATE ON public.boxes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_boxes_updated_at();

-- Insert default boxes for Demo company
INSERT INTO public.boxes (company_id, name, length, width, height, max_weight, cost, in_stock, box_type)
SELECT 
    companies.id,
    box_data.name,
    box_data.length,
    box_data.width,
    box_data.height,
    box_data.max_weight,
    box_data.cost,
    box_data.in_stock,
    box_data.box_type::public.box_type
FROM 
    public.companies,
    (VALUES
        ('Small Box', 8, 6, 4, 10, 1.50, 50, 'box'),
        ('Medium Box', 12, 9, 6, 25, 2.75, 30, 'box'),
        ('Large Box', 18, 12, 8, 50, 4.25, 20, 'box'),
        ('Small Poly Bag', 10, 8, 2, 5, 0.75, 100, 'poly_bag'),
        ('Large Poly Bag', 16, 12, 4, 15, 1.25, 75, 'poly_bag')
    ) AS box_data(name, length, width, height, max_weight, cost, in_stock, box_type)
WHERE companies.name = 'Demo';