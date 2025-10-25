-- Phase 4: Database Query Optimizations

-- Create RPC for bulk order linking to avoid repeated .or() filters
CREATE OR REPLACE FUNCTION public.link_shipments_to_orders(
  p_order_identifiers TEXT[],
  p_shipment_ids BIGINT[]
)
RETURNS TABLE(
  order_id BIGINT,
  shipment_id BIGINT,
  matched BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH matched_orders AS (
    SELECT o.id as order_id, unnest(p_shipment_ids) as shipment_id
    FROM orders o
    WHERE o.id::TEXT = ANY(p_order_identifiers)
       OR o.order_id = ANY(p_order_identifiers)
       OR LOWER(o.order_id) = ANY(SELECT LOWER(unnest(p_order_identifiers)))
  )
  SELECT 
    mo.order_id,
    mo.shipment_id,
    true as matched
  FROM matched_orders mo;
END;
$$;

-- Create optimized qboid lookup function with JSONB indexing
CREATE INDEX IF NOT EXISTS idx_qboid_events_data_orderid 
  ON qboid_events USING gin ((data));

CREATE INDEX IF NOT EXISTS idx_qboid_events_created_at_type 
  ON qboid_events (created_at DESC, event_type) 
  WHERE event_type = 'dimensions_received';

CREATE OR REPLACE FUNCTION public.get_qboid_dimensions_for_orders(
  p_order_identifiers TEXT[],
  p_days_lookback INTEGER DEFAULT 30
)
RETURNS TABLE(
  order_identifier TEXT,
  dimensions JSONB,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cutoff_date TIMESTAMPTZ;
BEGIN
  v_cutoff_date := NOW() - (p_days_lookback || ' days')::INTERVAL;
  
  RETURN QUERY
  WITH ranked_events AS (
    SELECT 
      data->>'orderId' as order_id,
      data->>'barcode' as barcode,
      data as dimensions,
      qe.created_at,
      ROW_NUMBER() OVER (
        PARTITION BY COALESCE(data->>'orderId', data->>'barcode')
        ORDER BY qe.created_at DESC
      ) as rn
    FROM qboid_events qe
    WHERE qe.event_type = 'dimensions_received'
      AND qe.created_at >= v_cutoff_date
      AND (
        data->>'orderId' = ANY(p_order_identifiers)
        OR data->>'barcode' = ANY(p_order_identifiers)
      )
  )
  SELECT 
    COALESCE(order_id, barcode) as order_identifier,
    dimensions,
    ranked_events.created_at
  FROM ranked_events
  WHERE rn = 1
  ORDER BY ranked_events.created_at DESC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.link_shipments_to_orders(TEXT[], BIGINT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_qboid_dimensions_for_orders(TEXT[], INTEGER) TO authenticated;