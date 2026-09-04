-- weather-report.sql — Weather Triggered Ads (Phase 5 reporting)
-- Adds baseline-comparison + sync-timestamp columns to automation_periods so the
-- weather-report function can store each triggered window's Meta performance AND
-- the same object's performance in the equal-length window just before it.
-- Metric columns (spend_cents, impressions, clicks, results, revenue_cents)
-- already exist from weather-ads.sql. Idempotent / safe to re-run.
-- ============================================================================

alter table automation_periods add column if not exists baseline_spend_cents  integer;
alter table automation_periods add column if not exists baseline_impressions  integer;
alter table automation_periods add column if not exists baseline_clicks       integer;
alter table automation_periods add column if not exists baseline_results      integer;
alter table automation_periods add column if not exists metrics_synced_at     timestamptz;

-- (RLS on automation_periods is already admin-only from weather-ads.sql.)
