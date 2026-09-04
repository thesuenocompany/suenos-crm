-- weather-ads-cron.sql — Weather Triggered Ads (Phase 4 scheduler)
-- ===========================================================================
-- Runs the weather engine automatically every 2 hours via pg_cron + pg_net.
-- The engine (weather-rules-check) evaluates every active rule, logs the run,
-- creates recommendations for approval rules, AUTO-EXECUTES auto-mode rules,
-- and AUTO-ROLLS-BACK any rule whose weather has cleared — all through the
-- weather-execute function, so every safeguard stays enforced.
--
-- IMPORTANT: CRON_SECRET is ALREADY configured on this project (your social
-- scheduler uses it). REUSE that same value — do NOT set a new one, or the
-- social scheduler cron will break. Get the value from your existing
-- social-scheduler cron job:
--     select command from cron.job where jobname ilike '%social%';
-- copy the cron_secret string out of that job's body, and paste it in place of
-- <CRON_SECRET> below. (If you truly have no CRON_SECRET yet, add one under
-- Supabase → Edge Functions → Secrets and use that same value here.)
--
-- The Authorization bearer below is the project's PUBLIC anon key — it only
-- gets the request past the functions gateway; real authorization is the
-- CRON_SECRET in the body. Safe to keep in SQL. Re-runnable.
-- ===========================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- drop any previous schedule of this job so re-running is clean
do $$
begin
  if exists (select 1 from cron.job where jobname = 'weather-ads-tick') then
    perform cron.unschedule('weather-ads-tick');
  end if;
end $$;

-- every 2 hours, on the hour (change to '0 */1 * * *' or '0 */3 * * *' to taste)
select cron.schedule('weather-ads-tick', '0 */2 * * *', $job$
  select net.http_post(
    url     := 'https://dowfjjthshbbgnvwxzjv.supabase.co/functions/v1/weather-rules-check',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvd2ZqanRoc2hiYmdudnd4emp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NzMxNjMsImV4cCI6MjA5NjI0OTE2M30.KnXWIp7BXqoxTv2-os77_7FphL5ZVn1XbB1HTwbxKsU'
    ),
    body    := jsonb_build_object('cron_secret', '<CRON_SECRET>'),
    timeout_milliseconds := 120000
  );
$job$);

-- verify it registered:
--   select jobid, schedule, jobname, active from cron.job where jobname = 'weather-ads-tick';
-- recent runs:
--   select job_pid, status, return_message, start_time
--     from cron.job_run_details
--    where jobid = (select jobid from cron.job where jobname = 'weather-ads-tick')
--    order by start_time desc limit 10;
-- to pause automation entirely:  select cron.unschedule('weather-ads-tick');
