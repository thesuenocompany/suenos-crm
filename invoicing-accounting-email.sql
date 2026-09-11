-- invoicing-accounting-email.sql — Accounting copy address for invoices
-- Adds two admin-managed settings (editable in the CRM under Settings):
--   accounting_email        — where a copy of every emailed invoice is sent
--   accounting_cc_enabled   — whether that copy is sent automatically on each send
-- app_settings is a simple key/value store; these rows are read on login and
-- can be changed any time in Settings. Safe to re-run (idempotent upsert).
-- ============================================================================

insert into app_settings (key, value) values
  ('accounting_email',      'ksmolne@vwdevelopments.com'),
  ('accounting_cc_enabled', 'true')
on conflict (key) do update set value = excluded.value;

-- To change later without editing the app, just re-run with a new value, e.g.:
--   update app_settings set value = 'newaccounting@example.com' where key = 'accounting_email';
--   update app_settings set value = 'false' where key = 'accounting_cc_enabled';
