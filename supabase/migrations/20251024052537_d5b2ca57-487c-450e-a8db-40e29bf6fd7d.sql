-- Create function to add business days (skip weekends)
CREATE OR REPLACE FUNCTION add_business_days(start_date DATE, days_to_add INTEGER)
RETURNS DATE AS $$
DECLARE
  result_date DATE := start_date;
  added_days INTEGER := 0;
BEGIN
  WHILE added_days < days_to_add LOOP
    result_date := result_date + 1;
    -- Skip weekends (0 = Sunday, 6 = Saturday in PostgreSQL)
    IF EXTRACT(DOW FROM result_date) NOT IN (0, 6) THEN
      added_days := added_days + 1;
    END IF;
  END LOOP;
  RETURN result_date;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Backfill required_delivery_date for existing orders
UPDATE orders
SET required_delivery_date = add_business_days(order_date, 5)
WHERE required_delivery_date IS NULL
  AND order_date IS NOT NULL;