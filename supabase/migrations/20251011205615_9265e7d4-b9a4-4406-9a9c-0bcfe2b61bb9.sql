-- Function to handle box inventory updates when shipments are created or updated
CREATE OR REPLACE FUNCTION public.update_box_inventory_on_shipment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    old_box_id uuid;
    new_box_id uuid;
BEGIN
    -- Get the box IDs
    old_box_id := OLD.actual_package_master_id;
    new_box_id := NEW.actual_package_master_id;
    
    -- Handle INSERT or UPDATE where a box is being used
    IF (TG_OP = 'INSERT' AND new_box_id IS NOT NULL) THEN
        -- Decrement inventory for new box
        UPDATE boxes 
        SET in_stock = GREATEST(in_stock - 1, 0)
        WHERE id = new_box_id;
        
        RAISE NOTICE 'Decremented inventory for box % due to new shipment %', new_box_id, NEW.id;
        
    ELSIF (TG_OP = 'UPDATE' AND old_box_id IS DISTINCT FROM new_box_id) THEN
        -- If the box changed
        
        -- Increment inventory for old box (if it existed)
        IF old_box_id IS NOT NULL THEN
            UPDATE boxes 
            SET in_stock = in_stock + 1
            WHERE id = old_box_id;
            
            RAISE NOTICE 'Incremented inventory for old box % due to shipment % update', old_box_id, NEW.id;
        END IF;
        
        -- Decrement inventory for new box (if it exists)
        IF new_box_id IS NOT NULL THEN
            UPDATE boxes 
            SET in_stock = GREATEST(in_stock - 1, 0)
            WHERE id = new_box_id;
            
            RAISE NOTICE 'Decremented inventory for new box % due to shipment % update', new_box_id, NEW.id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger for shipments table
DROP TRIGGER IF EXISTS trigger_update_box_inventory ON shipments;
CREATE TRIGGER trigger_update_box_inventory
    AFTER INSERT OR UPDATE OF actual_package_master_id
    ON shipments
    FOR EACH ROW
    EXECUTE FUNCTION update_box_inventory_on_shipment();

-- Also handle when shipments are deleted (restore inventory)
CREATE OR REPLACE FUNCTION public.restore_box_inventory_on_shipment_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- Restore inventory for the box that was used
    IF OLD.actual_package_master_id IS NOT NULL THEN
        UPDATE boxes 
        SET in_stock = in_stock + 1
        WHERE id = OLD.actual_package_master_id;
        
        RAISE NOTICE 'Restored inventory for box % due to shipment % deletion', OLD.actual_package_master_id, OLD.id;
    END IF;
    
    RETURN OLD;
END;
$$;

-- Create trigger for shipment deletion
DROP TRIGGER IF EXISTS trigger_restore_box_inventory ON shipments;
CREATE TRIGGER trigger_restore_box_inventory
    AFTER DELETE
    ON shipments
    FOR EACH ROW
    EXECUTE FUNCTION restore_box_inventory_on_shipment_delete();