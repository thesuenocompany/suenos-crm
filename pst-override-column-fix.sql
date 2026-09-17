-- pst-override-column-fix.sql
-- The app reads/writes accounts.pst_override (admin PST-exemption override) in the
-- account form, invoice PST logic, and the order->account save-back, but the column
-- was missing from this database, so ALL account inserts/updates failed in PostgREST
-- ("Could not find the 'pst_override' column of 'accounts' in the schema cache").
-- Applied to project dowfjjthshbbgnvwxzjv. Idempotent.

alter table public.accounts add column if not exists pst_override text;
notify pgrst, 'reload schema';
