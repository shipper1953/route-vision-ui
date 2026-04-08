-- Update existing shipments with status 'purchased' to 'shipped'
UPDATE shipments SET status = 'shipped' WHERE status = 'purchased';

-- Enable pg_net extension for HTTP calls from cron
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;

-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron SCHEMA extensions;

-- Schedule sync-delivery-dates to run every 15 minutes
SELECT cron.schedule(
  'sync-delivery-dates-cron',
  '*/15 * * * *',
  $$
  SELECT extensions.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/sync-delivery-dates',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);