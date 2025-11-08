-- Create purchase_orders table
CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  po_number TEXT NOT NULL,
  vendor_name TEXT,
  vendor_id TEXT,
  expected_date DATE,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  shopify_po_id TEXT,
  shopify_store_id UUID REFERENCES public.shopify_stores(id) ON DELETE SET NULL,
  source_type TEXT DEFAULT 'manual',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, po_number)
);

-- Create po_line_items table
CREATE TABLE IF NOT EXISTS public.po_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.items(id) ON DELETE SET NULL,
  sku TEXT NOT NULL,
  product_name TEXT NOT NULL,
  quantity_ordered INTEGER NOT NULL DEFAULT 0,
  quantity_received INTEGER NOT NULL DEFAULT 0,
  unit_cost NUMERIC(10,2),
  uom TEXT DEFAULT 'unit',
  shopify_line_item_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create shopify_po_mappings table
CREATE TABLE IF NOT EXISTS public.shopify_po_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  shopify_store_id UUID NOT NULL REFERENCES public.shopify_stores(id) ON DELETE CASCADE,
  shopify_po_id TEXT NOT NULL,
  shopify_po_number TEXT,
  ship_tornado_po_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL DEFAULT 'purchase_order',
  sync_status TEXT NOT NULL DEFAULT 'synced',
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(shopify_store_id, shopify_po_id)
);

-- Create receiving_sessions table
CREATE TABLE IF NOT EXISTS public.receiving_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  po_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  paused_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create receiving_line_items table
CREATE TABLE IF NOT EXISTS public.receiving_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.receiving_sessions(id) ON DELETE CASCADE,
  po_line_id UUID NOT NULL REFERENCES public.po_line_items(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  quantity_received INTEGER NOT NULL DEFAULT 0,
  uom TEXT NOT NULL DEFAULT 'unit',
  lot_number TEXT,
  serial_numbers TEXT[],
  condition TEXT NOT NULL DEFAULT 'new',
  qc_required BOOLEAN DEFAULT FALSE,
  qc_passed BOOLEAN,
  notes TEXT,
  received_by UUID REFERENCES auth.users(id),
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_purchase_orders_company_id ON public.purchase_orders(company_id);
CREATE INDEX idx_purchase_orders_warehouse_id ON public.purchase_orders(warehouse_id);
CREATE INDEX idx_purchase_orders_status ON public.purchase_orders(status);
CREATE INDEX idx_purchase_orders_shopify_po_id ON public.purchase_orders(shopify_po_id);
CREATE INDEX idx_po_line_items_po_id ON public.po_line_items(po_id);
CREATE INDEX idx_po_line_items_item_id ON public.po_line_items(item_id);
CREATE INDEX idx_receiving_sessions_po_id ON public.receiving_sessions(po_id);
CREATE INDEX idx_receiving_sessions_status ON public.receiving_sessions(status);
CREATE INDEX idx_receiving_line_items_session_id ON public.receiving_line_items(session_id);

-- Enable RLS
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.po_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopify_po_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receiving_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receiving_line_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for purchase_orders
CREATE POLICY "Users can view company purchase orders"
  ON public.purchase_orders FOR SELECT
  USING (company_id = auth_user_company_id());

CREATE POLICY "Users can insert company purchase orders"
  ON public.purchase_orders FOR INSERT
  WITH CHECK (company_id = auth_user_company_id());

CREATE POLICY "Users can update company purchase orders"
  ON public.purchase_orders FOR UPDATE
  USING (company_id = auth_user_company_id());

CREATE POLICY "Super admins can manage all purchase orders"
  ON public.purchase_orders FOR ALL
  USING (auth_user_role() = 'super_admin');

-- RLS Policies for po_line_items
CREATE POLICY "Users can view company po line items"
  ON public.po_line_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.purchase_orders po
    WHERE po.id = po_line_items.po_id
    AND po.company_id = auth_user_company_id()
  ));

CREATE POLICY "Users can insert company po line items"
  ON public.po_line_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.purchase_orders po
    WHERE po.id = po_line_items.po_id
    AND po.company_id = auth_user_company_id()
  ));

CREATE POLICY "Users can update company po line items"
  ON public.po_line_items FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.purchase_orders po
    WHERE po.id = po_line_items.po_id
    AND po.company_id = auth_user_company_id()
  ));

-- RLS Policies for shopify_po_mappings
CREATE POLICY "Users can view company shopify po mappings"
  ON public.shopify_po_mappings FOR SELECT
  USING (company_id = auth_user_company_id());

CREATE POLICY "System can insert shopify po mappings"
  ON public.shopify_po_mappings FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update shopify po mappings"
  ON public.shopify_po_mappings FOR UPDATE
  USING (true);

-- RLS Policies for receiving_sessions
CREATE POLICY "Users can view company receiving sessions"
  ON public.receiving_sessions FOR SELECT
  USING (company_id = auth_user_company_id());

CREATE POLICY "Users can manage company receiving sessions"
  ON public.receiving_sessions FOR ALL
  USING (company_id = auth_user_company_id());

-- RLS Policies for receiving_line_items
CREATE POLICY "Users can view company receiving line items"
  ON public.receiving_line_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.receiving_sessions rs
    WHERE rs.id = receiving_line_items.session_id
    AND rs.company_id = auth_user_company_id()
  ));

CREATE POLICY "Users can manage company receiving line items"
  ON public.receiving_line_items FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.receiving_sessions rs
    WHERE rs.id = receiving_line_items.session_id
    AND rs.company_id = auth_user_company_id()
  ));

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_po_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_purchase_orders_updated_at
  BEFORE UPDATE ON public.purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_po_updated_at();

CREATE TRIGGER update_po_line_items_updated_at
  BEFORE UPDATE ON public.po_line_items
  FOR EACH ROW
  EXECUTE FUNCTION update_po_updated_at();

CREATE TRIGGER update_receiving_sessions_updated_at
  BEFORE UPDATE ON public.receiving_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_po_updated_at();