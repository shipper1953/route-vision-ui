-- Add foreign key constraint between order_shipments and shipments
-- This enables PostgREST to perform automatic joins when querying
ALTER TABLE order_shipments
ADD CONSTRAINT order_shipments_shipment_id_fkey
FOREIGN KEY (shipment_id)
REFERENCES shipments(id)
ON DELETE CASCADE;