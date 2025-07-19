-- Fix warehouse addresses with invalid state data
UPDATE warehouses 
SET address = jsonb_set(address, '{state}', '"CA"')
WHERE address->>'state' = 'Demo State';

-- Also ensure zip codes are valid
UPDATE warehouses 
SET address = jsonb_set(address, '{zip}', '"90210"')
WHERE address->>'zip' = '12345';