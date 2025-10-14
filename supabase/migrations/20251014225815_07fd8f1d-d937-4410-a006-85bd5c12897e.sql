-- Allow users to view shipments that are linked to their company's orders
-- This enables viewing shipment details when looking at orders from the same company
CREATE POLICY "Users can view shipments linked to company orders"
ON shipments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM order_shipments os
    JOIN orders o ON o.id = os.order_id
    JOIN users u ON u.id = auth.uid()
    WHERE os.shipment_id = shipments.id
    AND o.company_id = u.company_id
  )
);