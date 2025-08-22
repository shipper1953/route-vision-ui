-- Create packaging master list table (Uline catalog data)
CREATE TABLE public.packaging_master_list (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor TEXT NOT NULL DEFAULT 'Uline',
  vendor_sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('box', 'poly_mailer', 'tube', 'envelope')),
  length_in NUMERIC NOT NULL,
  width_in NUMERIC NOT NULL,
  height_in NUMERIC NOT NULL,
  weight_oz NUMERIC NOT NULL DEFAULT 0,
  cost NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create packaging inventory table (current warehouse stock)
CREATE TABLE public.packaging_inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  master_list_id UUID NOT NULL REFERENCES public.packaging_master_list(id) ON DELETE CASCADE,
  quantity_on_hand INTEGER NOT NULL DEFAULT 0,
  reorder_threshold INTEGER NOT NULL DEFAULT 10,
  reorder_quantity INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, master_list_id)
);

-- Create order packaging recommendations table
CREATE TABLE public.order_packaging_recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id BIGINT NOT NULL,
  recommended_master_list_id UUID REFERENCES public.packaging_master_list(id),
  recommended_billable_weight NUMERIC,
  calculated_volume NUMERIC,
  calculated_weight NUMERIC,
  confidence_score INTEGER DEFAULT 0,
  potential_savings NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(order_id)
);

-- Create packaging intelligence reports table
CREATE TABLE public.packaging_intelligence_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  analysis_period TEXT NOT NULL DEFAULT 'Last 30 days',
  total_orders_analyzed INTEGER NOT NULL DEFAULT 0,
  potential_savings NUMERIC NOT NULL DEFAULT 0,
  top_5_most_used_boxes JSONB NOT NULL DEFAULT '[]',
  top_5_box_discrepancies JSONB NOT NULL DEFAULT '[]',
  inventory_suggestions JSONB NOT NULL DEFAULT '[]',
  projected_packaging_need JSONB NOT NULL DEFAULT '{}',
  report_data JSONB NOT NULL DEFAULT '{}'
);

-- Create packaging alerts table
CREATE TABLE public.packaging_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('low_stock', 'suboptimal_package', 'cost_opportunity')),
  message TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for all tables
ALTER TABLE public.packaging_master_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packaging_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_packaging_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packaging_intelligence_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packaging_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for packaging_master_list (public catalog data)
CREATE POLICY "Everyone can view packaging master list" 
ON public.packaging_master_list FOR SELECT 
USING (true);

CREATE POLICY "Super admins can manage packaging master list" 
ON public.packaging_master_list FOR ALL 
USING (EXISTS (
  SELECT 1 FROM users 
  WHERE id = auth.uid() AND role = 'super_admin'
));

-- RLS Policies for packaging_inventory
CREATE POLICY "Users can view company packaging inventory" 
ON public.packaging_inventory FOR SELECT 
USING (company_id = (
  SELECT company_id FROM users WHERE id = auth.uid()
));

CREATE POLICY "Company admins can manage packaging inventory" 
ON public.packaging_inventory FOR ALL 
USING (company_id = (
  SELECT company_id FROM users 
  WHERE id = auth.uid() AND role IN ('company_admin', 'super_admin')
));

-- RLS Policies for order_packaging_recommendations
CREATE POLICY "Users can view company order recommendations" 
ON public.order_packaging_recommendations FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM orders o 
  JOIN users u ON u.id = auth.uid()
  WHERE o.id = order_packaging_recommendations.order_id 
  AND o.company_id = u.company_id
));

CREATE POLICY "Users can manage company order recommendations" 
ON public.order_packaging_recommendations FOR ALL 
USING (EXISTS (
  SELECT 1 FROM orders o 
  JOIN users u ON u.id = auth.uid()
  WHERE o.id = order_packaging_recommendations.order_id 
  AND o.company_id = u.company_id
));

-- RLS Policies for packaging_intelligence_reports
CREATE POLICY "Users can view company intelligence reports" 
ON public.packaging_intelligence_reports FOR SELECT 
USING (company_id = (
  SELECT company_id FROM users WHERE id = auth.uid()
));

CREATE POLICY "Company admins can manage intelligence reports" 
ON public.packaging_intelligence_reports FOR ALL 
USING (company_id = (
  SELECT company_id FROM users 
  WHERE id = auth.uid() AND role IN ('company_admin', 'super_admin')
));

-- RLS Policies for packaging_alerts
CREATE POLICY "Users can view company packaging alerts" 
ON public.packaging_alerts FOR SELECT 
USING (company_id = (
  SELECT company_id FROM users WHERE id = auth.uid()
));

CREATE POLICY "Company admins can manage packaging alerts" 
ON public.packaging_alerts FOR ALL 
USING (company_id = (
  SELECT company_id FROM users 
  WHERE id = auth.uid() AND role IN ('company_admin', 'super_admin')
));

-- Create indexes for performance
CREATE INDEX idx_packaging_inventory_company_id ON public.packaging_inventory(company_id);
CREATE INDEX idx_order_packaging_recommendations_order_id ON public.order_packaging_recommendations(order_id);
CREATE INDEX idx_packaging_intelligence_reports_company_id ON public.packaging_intelligence_reports(company_id);
CREATE INDEX idx_packaging_alerts_company_id ON public.packaging_alerts(company_id);
CREATE INDEX idx_packaging_alerts_unresolved ON public.packaging_alerts(company_id, is_resolved) WHERE is_resolved = false;