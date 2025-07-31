-- Create demo boxes for the Demo company to enable package recommendations
-- This will ensure the cartonization functionality works properly

-- Get the Demo company ID first
DO $$
DECLARE
    demo_company_id uuid;
BEGIN
    -- Find the Demo company
    SELECT id INTO demo_company_id 
    FROM public.companies 
    WHERE name = 'Demo' AND is_active = true 
    ORDER BY created_at DESC 
    LIMIT 1;
    
    -- Only insert boxes if the Demo company exists and doesn't already have boxes
    IF demo_company_id IS NOT NULL THEN
        -- Check if the company already has boxes
        IF NOT EXISTS (SELECT 1 FROM public.boxes WHERE company_id = demo_company_id) THEN
            -- Insert common shipping box sizes for Demo company
            INSERT INTO public.boxes (
                company_id, name, description, length, width, height, 
                max_weight, cost, box_type, in_stock, is_active
            ) VALUES
            -- Small boxes
            (demo_company_id, 'Small Box 6x4x4', 'Perfect for small items like electronics, jewelry', 6, 4, 4, 5, 1.25, 'box', 50, true),
            (demo_company_id, 'Small Box 8x6x4', 'Ideal for books, small clothing items', 8, 6, 4, 8, 1.50, 'box', 40, true),
            
            -- Medium boxes  
            (demo_company_id, 'Medium Box 12x9x6', 'Great for multiple small items or medium products', 12, 9, 6, 15, 2.25, 'box', 35, true),
            (demo_company_id, 'Medium Box 14x10x8', 'Popular choice for general shipping', 14, 10, 8, 20, 2.75, 'box', 30, true),
            (demo_company_id, 'Medium Box 16x12x8', 'Good for clothing, home goods', 16, 12, 8, 25, 3.25, 'box', 25, true),
            
            -- Large boxes
            (demo_company_id, 'Large Box 18x14x10', 'For larger items or multiple products', 18, 14, 10, 35, 4.50, 'box', 20, true),
            (demo_company_id, 'Large Box 20x16x12', 'Bulk orders and large products', 20, 16, 12, 45, 5.25, 'box', 15, true),
            (demo_company_id, 'Large Box 24x18x12', 'Extra large items', 24, 18, 12, 50, 6.75, 'box', 10, true),
            
            -- Specialty boxes
            (demo_company_id, 'Flat Box 12x9x2', 'Documents, thin items', 12, 9, 2, 3, 1.75, 'flat', 30, true),
            (demo_company_id, 'Tall Box 8x8x12', 'Bottles, tall items', 8, 8, 12, 12, 2.50, 'box', 20, true),
            
            -- Mailer boxes
            (demo_company_id, 'Mailer 10x7x3', 'Small mailer box for lightweight items', 10, 7, 3, 2, 1.00, 'mailer', 60, true),
            (demo_company_id, 'Mailer 12x9x3', 'Medium mailer for apparel', 12, 9, 3, 3, 1.25, 'mailer', 45, true),
            
            -- Padded envelopes
            (demo_company_id, 'Padded Envelope #0', 'Very small items', 6, 10, 0.5, 1, 0.75, 'envelope', 100, true),
            (demo_company_id, 'Padded Envelope #1', 'Small flat items', 7.25, 12, 0.5, 1, 0.85, 'envelope', 80, true),
            (demo_company_id, 'Padded Envelope #2', 'Medium flat items', 8.5, 12, 0.5, 2, 0.95, 'envelope', 70, true);
            
            RAISE NOTICE 'Successfully created % demo boxes for company %', 
                (SELECT COUNT(*) FROM public.boxes WHERE company_id = demo_company_id), demo_company_id;
        ELSE
            RAISE NOTICE 'Demo company already has boxes, skipping insertion';
        END IF;
    ELSE
        RAISE NOTICE 'Demo company not found, cannot create boxes';
    END IF;
END $$;