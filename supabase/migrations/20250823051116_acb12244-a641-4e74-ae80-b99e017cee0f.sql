-- Create the missing tables for packaging intelligence system

-- 1. Create order_packaging_recommendations table
CREATE TABLE IF NOT EXISTS public.order_packaging_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id BIGINT NOT NULL,
    recommended_master_list_id UUID REFERENCES public.packaging_master_list(id),
    calculated_volume DECIMAL,
    calculated_weight DECIMAL,
    confidence_score INTEGER DEFAULT 0,
    potential_savings DECIMAL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(order_id) -- This constraint is needed for ON CONFLICT
);

-- 2. Create packaging_intelligence_reports table (simplified unique constraint)
CREATE TABLE IF NOT EXISTS public.packaging_intelligence_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id),
    generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    analysis_period TEXT,
    total_orders_analyzed INTEGER DEFAULT 0,
    potential_savings DECIMAL DEFAULT 0,
    top_5_most_used_boxes JSONB,
    top_5_box_discrepancies JSONB,
    inventory_suggestions JSONB,
    projected_packaging_need JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create a unique index instead of constraint for daily reports
CREATE UNIQUE INDEX IF NOT EXISTS idx_packaging_reports_company_date 
ON public.packaging_intelligence_reports(company_id, DATE(generated_at));

-- 3. Create packaging_alerts table
CREATE TABLE IF NOT EXISTS public.packaging_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id),
    alert_type TEXT NOT NULL,
    message TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
    metadata JSONB,
    resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ
);

-- Enable RLS on all tables
ALTER TABLE public.order_packaging_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packaging_intelligence_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packaging_alerts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "order_packaging_recommendations_company_policy" ON public.order_packaging_recommendations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.orders o 
            WHERE o.id = order_packaging_recommendations.order_id 
            AND o.company_id = auth_user_company_id()
        )
    );

CREATE POLICY "packaging_intelligence_reports_company_policy" ON public.packaging_intelligence_reports
    FOR ALL USING (company_id = auth_user_company_id());

CREATE POLICY "packaging_alerts_company_policy" ON public.packaging_alerts
    FOR ALL USING (company_id = auth_user_company_id());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_order_packaging_recommendations_order_id ON public.order_packaging_recommendations(order_id);
CREATE INDEX IF NOT EXISTS idx_packaging_intelligence_reports_company_generated ON public.packaging_intelligence_reports(company_id, generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_packaging_alerts_company_unresolved ON public.packaging_alerts(company_id, resolved) WHERE resolved = FALSE;