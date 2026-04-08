-- Remove the broken cron job
SELECT cron.unschedule('sync-delivery-dates-cron');

-- Recreate with proper URL and anon key
SELECT cron.schedule(
  'sync-delivery-dates-cron',
  '*/15 * * * *',
  $$
  SELECT
    net.http_post(
        url:='https://wqfefrlnzfkngkihlyij.supabase.co/functions/v1/sync-delivery-dates',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndxZmVmcmxuemZrbmdraWhseWlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1MDQ4NzIsImV4cCI6MjA5MTA4MDg3Mn0.-0EsKvhDGhnXYHCUhp-n8JvI9bkY4BqITlSQg_qWCM8"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);