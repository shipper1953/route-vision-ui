-- ============================================
-- PHASE 1: TRACKING PORTAL INFRASTRUCTURE
-- ============================================

-- Store every tracking event for detailed timeline visualization
CREATE TABLE IF NOT EXISTS tracking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id BIGINT NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('easypost', 'shippo')),
  
  -- Event data
  event_type TEXT NOT NULL,
  status TEXT NOT NULL,
  status_detail TEXT,
  message TEXT,
  description TEXT,
  
  -- Location data
  location JSONB,
  
  -- Timing
  carrier_timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Metadata
  carrier_code TEXT,
  source TEXT DEFAULT 'webhook',
  raw_data JSONB
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_tracking_shipment_time ON tracking_events(shipment_id, carrier_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_tracking_event_type ON tracking_events(event_type);
CREATE INDEX IF NOT EXISTS idx_tracking_created ON tracking_events(created_at DESC);

-- Prevent duplicate tracking events
CREATE UNIQUE INDEX IF NOT EXISTS idx_tracking_events_unique 
ON tracking_events(shipment_id, carrier_timestamp, status);

-- Public tracking tokens for secure anonymous access
CREATE TABLE IF NOT EXISTS tracking_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id BIGINT NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  tracking_number TEXT NOT NULL UNIQUE,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  company_id UUID REFERENCES companies(id),
  
  -- Privacy settings
  show_customer_info BOOLEAN DEFAULT false,
  show_items BOOLEAN DEFAULT true,
  custom_message TEXT,
  
  -- Analytics
  views INTEGER DEFAULT 0,
  last_viewed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_tracking_tokens_number ON tracking_tokens(tracking_number);
CREATE INDEX IF NOT EXISTS idx_tracking_tokens_token ON tracking_tokens(token);

-- Customer notification history
CREATE TABLE IF NOT EXISTS customer_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id BIGINT REFERENCES shipments(id) ON DELETE CASCADE,
  order_id BIGINT REFERENCES orders(id) ON DELETE CASCADE,
  
  notification_type TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'email',
  recipient TEXT NOT NULL,
  
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_shipment ON customer_notifications(shipment_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON customer_notifications(status);

-- Customer delivery preferences
CREATE TABLE IF NOT EXISTS customer_delivery_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_email TEXT NOT NULL,
  company_id UUID REFERENCES companies(id),
  
  -- Delivery instructions
  delivery_instructions TEXT,
  safe_place TEXT,
  gate_code TEXT,
  access_code TEXT,
  signature_required BOOLEAN DEFAULT false,
  
  -- Notification preferences
  email_notifications BOOLEAN DEFAULT true,
  sms_notifications BOOLEAN DEFAULT false,
  phone_number TEXT,
  
  -- Scheduling
  vacation_hold_start DATE,
  vacation_hold_end DATE,
  preferred_delivery_window TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(customer_email, company_id)
);

-- Company processing times for delivery estimates
CREATE TABLE IF NOT EXISTS company_processing_times (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  warehouse_id UUID REFERENCES warehouses(id),
  
  standard_processing_days INTEGER DEFAULT 1,
  cutoff_time TIME DEFAULT '14:00:00',
  weekend_processing BOOLEAN DEFAULT false,
  holiday_processing BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(company_id, warehouse_id)
);

-- ============================================
-- RLS POLICIES
-- ============================================

-- Tracking events: Companies can view their own events
ALTER TABLE tracking_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Companies view own tracking events"
ON tracking_events FOR SELECT
USING (
  shipment_id IN (
    SELECT id FROM shipments WHERE company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  )
);

CREATE POLICY "System can insert tracking events"
ON tracking_events FOR INSERT
WITH CHECK (true);

-- Tracking tokens: Public read access
ALTER TABLE tracking_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view tracking tokens"
ON tracking_tokens FOR SELECT
USING (true);

CREATE POLICY "Companies manage own tracking tokens"
ON tracking_tokens FOR ALL
USING (
  company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  )
);

-- Customer notifications: Companies view their own
ALTER TABLE customer_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Companies view own notifications"
ON customer_notifications FOR SELECT
USING (
  shipment_id IN (
    SELECT id FROM shipments WHERE company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  )
);

CREATE POLICY "System can manage notifications"
ON customer_notifications FOR ALL
WITH CHECK (true);

-- Delivery preferences: Customers and companies can manage
ALTER TABLE customer_delivery_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Companies view own customer preferences"
ON customer_delivery_preferences FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  )
);

CREATE POLICY "Companies manage customer preferences"
ON customer_delivery_preferences FOR ALL
USING (
  company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  )
);

-- Processing times: Companies manage their own
ALTER TABLE company_processing_times ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Companies view own processing times"
ON company_processing_times FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  )
);

CREATE POLICY "Company admins manage processing times"
ON company_processing_times FOR ALL
USING (
  company_id IN (
    SELECT company_id FROM users 
    WHERE id = auth.uid() 
    AND role IN ('company_admin', 'super_admin')
  )
);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to increment tracking views
CREATE OR REPLACE FUNCTION increment_tracking_views(p_tracking_number TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE tracking_tokens
  SET views = views + 1,
      last_viewed_at = NOW()
  WHERE tracking_number = p_tracking_number;
END;
$$;

-- Auto-create tracking tokens when shipments are created
CREATE OR REPLACE FUNCTION create_tracking_token_for_shipment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.tracking_number IS NOT NULL THEN
    INSERT INTO tracking_tokens (shipment_id, tracking_number, company_id)
    VALUES (NEW.id, NEW.tracking_number, NEW.company_id)
    ON CONFLICT (tracking_number) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_create_tracking_token
AFTER INSERT OR UPDATE OF tracking_number ON shipments
FOR EACH ROW
WHEN (NEW.tracking_number IS NOT NULL)
EXECUTE FUNCTION create_tracking_token_for_shipment();