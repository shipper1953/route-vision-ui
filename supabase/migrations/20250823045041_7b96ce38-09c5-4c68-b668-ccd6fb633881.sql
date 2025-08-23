-- Enhance shipments table to better match the architecture
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS from_address JSONB;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS to_address JSONB;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS total_weight NUMERIC;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS package_count INTEGER DEFAULT 1;

-- Create packages table for better package management
CREATE TABLE IF NOT EXISTS packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shipment_id BIGINT REFERENCES shipments(id) ON DELETE CASCADE,
    length NUMERIC NOT NULL,
    width NUMERIC NOT NULL,
    height NUMERIC NOT NULL,
    weight NUMERIC NOT NULL,
    description TEXT,
    nmfc_code TEXT, -- For freight classification
    freight_class INTEGER, -- For LTL shipping
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create shipment_quotes table for storing all rate options
CREATE TABLE IF NOT EXISTS shipment_quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shipment_id BIGINT REFERENCES shipments(id) ON DELETE CASCADE,
    carrier TEXT NOT NULL,
    service TEXT NOT NULL,
    rate NUMERIC NOT NULL,
    estimated_days INTEGER,
    carrier_quote_id TEXT, -- ID from carrier API for booking
    quote_type TEXT DEFAULT 'parcel', -- 'parcel' or 'freight'
    details JSONB, -- Raw response from carrier
    is_selected BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on new tables
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment_quotes ENABLE ROW LEVEL SECURITY;

-- Packages policies - users can manage packages for their company's shipments
CREATE POLICY "Users can view company packages" ON packages
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM shipments s 
        JOIN users u ON u.id = auth.uid()
        WHERE s.id = packages.shipment_id 
        AND (s.company_id = u.company_id OR u.role = 'super_admin')
    )
);

CREATE POLICY "Users can insert company packages" ON packages
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM shipments s 
        JOIN users u ON u.id = auth.uid()
        WHERE s.id = packages.shipment_id 
        AND (s.company_id = u.company_id OR u.role = 'super_admin')
    )
);

CREATE POLICY "Users can update company packages" ON packages
FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM shipments s 
        JOIN users u ON u.id = auth.uid()
        WHERE s.id = packages.shipment_id 
        AND (s.company_id = u.company_id OR u.role = 'super_admin')
    )
);

-- Quotes policies - users can view and manage quotes for their company's shipments
CREATE POLICY "Users can view company quotes" ON shipment_quotes
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM shipments s 
        JOIN users u ON u.id = auth.uid()
        WHERE s.id = shipment_quotes.shipment_id 
        AND (s.company_id = u.company_id OR u.role = 'super_admin')
    )
);

CREATE POLICY "System can insert quotes" ON shipment_quotes
FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update company quotes" ON shipment_quotes
FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM shipments s 
        JOIN users u ON u.id = auth.uid()
        WHERE s.id = shipment_quotes.shipment_id 
        AND (s.company_id = u.company_id OR u.role = 'super_admin')
    )
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_packages_shipment_id ON packages(shipment_id);
CREATE INDEX IF NOT EXISTS idx_shipment_quotes_shipment_id ON shipment_quotes(shipment_id);
CREATE INDEX IF NOT EXISTS idx_shipment_quotes_rate ON shipment_quotes(rate);
CREATE INDEX IF NOT EXISTS idx_shipment_quotes_carrier_service ON shipment_quotes(carrier, service);