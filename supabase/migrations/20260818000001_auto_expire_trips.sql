-- Create an extension to enable pg_cron if not already active
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Set up a daily cron job to automatically mark ended trips as 'completed'
-- Runs every night at midnight (UTC)
SELECT cron.schedule(
  'auto-expire-ended-trips',
  '0 0 * * *',
  $$UPDATE public.trips SET status = 'completed'::public.trip_status WHERE end_date < CURRENT_DATE AND status = 'open'::public.trip_status$$
);
