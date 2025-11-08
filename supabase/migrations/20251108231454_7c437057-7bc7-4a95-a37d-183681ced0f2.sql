-- Create pick_waves table for batch picking operations
CREATE TABLE IF NOT EXISTS pick_waves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  wave_number TEXT NOT NULL,
  wave_type TEXT NOT NULL DEFAULT 'batch', -- single, batch, zone, wave
  status TEXT NOT NULL DEFAULT 'pending', -- pending, released, in_progress, completed, cancelled
  priority INTEGER DEFAULT 1,
  total_orders INTEGER DEFAULT 0,
  total_picks INTEGER DEFAULT 0,
  assigned_to UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  released_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  notes TEXT
);

-- Create pick_lists table with FK to orders
CREATE TABLE IF NOT EXISTS pick_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  wave_id UUID REFERENCES pick_waves(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, assigned, in_progress, completed, cancelled
  assigned_to UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  notes TEXT
);

-- Create pick_list_items table
CREATE TABLE IF NOT EXISTS pick_list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pick_list_id UUID NOT NULL REFERENCES pick_lists(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  location_id UUID REFERENCES warehouse_locations(id),
  quantity_ordered INTEGER NOT NULL DEFAULT 0,
  quantity_picked INTEGER NOT NULL DEFAULT 0,
  lot_number TEXT,
  serial_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  picked_at TIMESTAMPTZ
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_pick_waves_company ON pick_waves(company_id);
CREATE INDEX IF NOT EXISTS idx_pick_waves_warehouse ON pick_waves(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_pick_waves_status ON pick_waves(status);

CREATE INDEX IF NOT EXISTS idx_pick_lists_company ON pick_lists(company_id);
CREATE INDEX IF NOT EXISTS idx_pick_lists_warehouse ON pick_lists(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_pick_lists_order ON pick_lists(order_id);
CREATE INDEX IF NOT EXISTS idx_pick_lists_wave ON pick_lists(wave_id);
CREATE INDEX IF NOT EXISTS idx_pick_lists_status ON pick_lists(status);

CREATE INDEX IF NOT EXISTS idx_pick_list_items_pick_list ON pick_list_items(pick_list_id);
CREATE INDEX IF NOT EXISTS idx_pick_list_items_item ON pick_list_items(item_id);
CREATE INDEX IF NOT EXISTS idx_pick_list_items_location ON pick_list_items(location_id);

-- Enable RLS
ALTER TABLE pick_waves ENABLE ROW LEVEL SECURITY;
ALTER TABLE pick_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE pick_list_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pick_waves
CREATE POLICY "Users can view company pick waves"
  ON pick_waves FOR SELECT
  USING (company_id = auth_user_company_id());

CREATE POLICY "Users can create company pick waves"
  ON pick_waves FOR INSERT
  WITH CHECK (company_id = auth_user_company_id());

CREATE POLICY "Users can update company pick waves"
  ON pick_waves FOR UPDATE
  USING (company_id = auth_user_company_id());

CREATE POLICY "Users can delete company pick waves"
  ON pick_waves FOR DELETE
  USING (company_id = auth_user_company_id());

-- RLS Policies for pick_lists
CREATE POLICY "Users can view company pick lists"
  ON pick_lists FOR SELECT
  USING (company_id = auth_user_company_id());

CREATE POLICY "Users can create company pick lists"
  ON pick_lists FOR INSERT
  WITH CHECK (company_id = auth_user_company_id());

CREATE POLICY "Users can update company pick lists"
  ON pick_lists FOR UPDATE
  USING (company_id = auth_user_company_id());

CREATE POLICY "Users can delete company pick lists"
  ON pick_lists FOR DELETE
  USING (company_id = auth_user_company_id());

-- RLS Policies for pick_list_items
CREATE POLICY "Users can view company pick list items"
  ON pick_list_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pick_lists
      WHERE pick_lists.id = pick_list_items.pick_list_id
      AND pick_lists.company_id = auth_user_company_id()
    )
  );

CREATE POLICY "Users can create company pick list items"
  ON pick_list_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pick_lists
      WHERE pick_lists.id = pick_list_items.pick_list_id
      AND pick_lists.company_id = auth_user_company_id()
    )
  );

CREATE POLICY "Users can update company pick list items"
  ON pick_list_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM pick_lists
      WHERE pick_lists.id = pick_list_items.pick_list_id
      AND pick_lists.company_id = auth_user_company_id()
    )
  );

CREATE POLICY "Users can delete company pick list items"
  ON pick_list_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM pick_lists
      WHERE pick_lists.id = pick_list_items.pick_list_id
      AND pick_lists.company_id = auth_user_company_id()
    )
  );