-- Setup cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
-- Example: schedule auto-delete every hour
-- SELECT cron.schedule('invoke_auto_delete', '0 * * * *', 'SELECT net.http_post(''https://project.supabase.co/functions/v1/auto-delete'')');
