-- Insert default boxes for Vortex Advisors company
INSERT INTO public.boxes (company_id, name, length, width, height, max_weight, cost, in_stock, box_type)
SELECT 
    'c66dec77-03cd-4776-9bea-f96a1b2e2d5b'::uuid as company_id,
    box_data.name,
    box_data.length,
    box_data.width,
    box_data.height,
    box_data.max_weight,
    box_data.cost,
    box_data.in_stock,
    box_data.box_type::public.box_type
FROM 
    (VALUES
        ('Small Box', 8, 6, 4, 10, 1.50, 50, 'box'),
        ('Medium Box', 12, 9, 6, 25, 2.75, 30, 'box'),
        ('Large Box', 18, 12, 8, 50, 4.25, 20, 'box'),
        ('Small Poly Bag', 10, 8, 2, 5, 0.75, 100, 'poly_bag'),
        ('Large Poly Bag', 16, 12, 4, 15, 1.25, 75, 'poly_bag')
    ) AS box_data(name, length, width, height, max_weight, cost, in_stock, box_type);