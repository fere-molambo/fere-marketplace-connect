SELECT cron.schedule(
  'expire-pending-bookings',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://jajfuajmkjulujnwfqen.supabase.co/functions/v1/expire-bookings',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImphamZ1YWpta2p1bHVqbndmcWVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NjY3MzUsImV4cCI6MjA3OTA0MjczNX0.ME5XNJsLbB0InLeKexBcIGe5sxZZsd6Jg2W9oB0IBEQ"}'::jsonb,
    body := concat('{"time": "', now(), '"}')::jsonb
  ) AS request_id;
  $$
);