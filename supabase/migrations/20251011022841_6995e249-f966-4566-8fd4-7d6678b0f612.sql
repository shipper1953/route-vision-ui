-- Add dimensions_updated_at column to items table
ALTER TABLE items 
ADD COLUMN dimensions_updated_at timestamp with time zone;

-- Create index for better query performance
CREATE INDEX idx_items_dimensions_updated_at ON items(dimensions_updated_at DESC);

-- Update trigger to set dimensions_updated_at when dimensions or weight change
CREATE OR REPLACE FUNCTION update_items_dimensions_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.length IS DISTINCT FROM OLD.length OR
      NEW.width IS DISTINCT FROM OLD.width OR
      NEW.height IS DISTINCT FROM OLD.height OR
      NEW.weight IS DISTINCT FROM OLD.weight) THEN
    NEW.dimensions_updated_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_items_dimensions_timestamp_trigger
BEFORE UPDATE ON items
FOR EACH ROW
EXECUTE FUNCTION update_items_dimensions_timestamp();