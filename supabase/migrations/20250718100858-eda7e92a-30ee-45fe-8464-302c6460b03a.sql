-- Drop the incorrect trigger and function
DROP TRIGGER IF EXISTS sync_shipment_delivery_dates ON public.shipments;
DROP FUNCTION IF EXISTS update_delivery_dates_from_easypost();

-- Create the correct trigger function
CREATE OR REPLACE FUNCTION update_delivery_dates_from_easypost()
RETURNS TRIGGER AS $$
BEGIN
    -- Update linked orders when shipment delivery dates change
    -- Find orders that reference this shipment ID
    IF (NEW.estimated_delivery_date IS DISTINCT FROM OLD.estimated_delivery_date OR
        NEW.actual_delivery_date IS DISTINCT FROM OLD.actual_delivery_date) THEN
        
        UPDATE public.orders 
        SET 
            estimated_delivery_date = NEW.estimated_delivery_date,
            actual_delivery_date = NEW.actual_delivery_date
        WHERE shipment_id = NEW.id;
        
        -- Log the update for debugging
        RAISE NOTICE 'Updated orders linked to shipment % with delivery dates', NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the correct trigger
CREATE TRIGGER sync_shipment_delivery_dates
    AFTER UPDATE ON public.shipments
    FOR EACH ROW
    EXECUTE FUNCTION update_delivery_dates_from_easypost();