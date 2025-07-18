-- Update the trigger function to also sync order status
CREATE OR REPLACE FUNCTION update_delivery_dates_from_easypost()
RETURNS TRIGGER AS $$
BEGIN
    -- Update linked orders when shipment delivery dates or status change
    IF (NEW.estimated_delivery_date IS DISTINCT FROM OLD.estimated_delivery_date OR
        NEW.actual_delivery_date IS DISTINCT FROM OLD.actual_delivery_date OR
        NEW.status IS DISTINCT FROM OLD.status) THEN
        
        UPDATE public.orders 
        SET 
            estimated_delivery_date = NEW.estimated_delivery_date,
            actual_delivery_date = NEW.actual_delivery_date,
            -- Update order status to delivered when shipment is delivered
            status = CASE 
                WHEN NEW.status = 'delivered' THEN 'delivered'
                WHEN NEW.status = 'shipped' AND OLD.status != 'shipped' THEN 'shipped'
                ELSE status
            END
        WHERE shipment_id = NEW.id;
        
        -- Log the update for debugging
        RAISE NOTICE 'Updated orders linked to shipment % with delivery dates and status %', NEW.id, NEW.status;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;