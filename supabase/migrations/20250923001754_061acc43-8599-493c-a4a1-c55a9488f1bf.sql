-- Check what alert types are currently allowed
SELECT constraint_name, check_clause 
FROM information_schema.check_constraints 
WHERE table_name = 'packaging_alerts' AND constraint_name LIKE '%alert_type%';

-- Drop the constraint if it exists and recreate with proper values
ALTER TABLE packaging_alerts DROP CONSTRAINT IF EXISTS packaging_alerts_alert_type_check;

-- Add constraint allowing the alert types we use
ALTER TABLE packaging_alerts ADD CONSTRAINT packaging_alerts_alert_type_check 
CHECK (alert_type IN ('low_efficiency', 'savings_opportunity', 'low_stock', 'high_utilization', 'optimization_opportunity'));

-- Also check the severity constraint
ALTER TABLE packaging_alerts DROP CONSTRAINT IF EXISTS packaging_alerts_severity_check;
ALTER TABLE packaging_alerts ADD CONSTRAINT packaging_alerts_severity_check 
CHECK (severity IN ('info', 'warning', 'error', 'critical'));