-- Add delivery date columns to orders table
ALTER TABLE public.orders 
ADD COLUMN estimated_delivery_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN actual_delivery_date TIMESTAMP WITH TIME ZONE;

-- Create function to update delivery dates from EasyPost tracking
CREATE OR REPLACE FUNCTION update_delivery_dates_from_easypost()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the linked order when shipment delivery dates change
    IF NEW.shipment_id IS NOT NULL AND (
        NEW.estimated_delivery_date IS DISTINCT FROM OLD.estimated_delivery_date OR
        NEW.actual_delivery_date IS DISTINCT FROM OLD.actual_delivery_date
    ) THEN
        UPDATE public.orders 
        SET 
            estimated_delivery_date = NEW.estimated_delivery_date,
            actual_delivery_date = NEW.actual_delivery_date
        WHERE shipment_id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to sync delivery dates from shipments to orders
CREATE TRIGGER sync_shipment_delivery_dates
    AFTER UPDATE ON public.shipments
    FOR EACH ROW
    EXECUTE FUNCTION update_delivery_dates_from_easypost();