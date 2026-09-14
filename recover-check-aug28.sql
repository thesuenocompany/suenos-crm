-- recover-check-aug28.sql — Diagnose Alex's "lost" accounts & visits
-- Run these in Supabase → SQL editor. READ-ONLY (no changes). They tell you
-- whether the records ARE in the database (hidden = recoverable) or were never
-- written (silent save failure = not recoverable, but now fixed).
-- Adjust the date window / name if needed.
-- ============================================================================

-- 1) Find Alex's user id (rep_id / assigned_rep reference this).
select id, name, email, role, region, active
from profiles
where name ilike '%alex%' or email ilike '%alex%';

-- 2) ACCOUNTS created around Aug 28. If Alex says he entered ~N and far fewer
--    show here, the missing ones failed to save (were never written).
--    If they ARE here but he can't see them, check assigned_rep / region below.
select id, name, region, assigned_rep, status, created_at
from accounts
where created_at::date between '2026-08-26' and '2026-08-30'
order by created_at;

-- 3) VISITS logged around Aug 28 by Alex (paste his id from query 1).
select v.id, v.date, v.type, v.rep_id, v.account_id, a.name as account_name, a.region
from visits v
left join accounts a on a.id = v.account_id
where v.rep_id = 'PASTE-ALEX-ID-HERE'
  and v.date between '2026-08-20' and '2026-09-01'
order by v.date;

-- 4) VISIBILITY check — are Alex's Aug-28 accounts assigned to him / his region?
--    If assigned_rep is null or another rep, or region differs, they exist but
--    are filtered out of his list. Reassigning them (below) makes them reappear.
select id, name, region, assigned_rep, created_at
from accounts
where created_at::date between '2026-08-26' and '2026-08-30'
  and (assigned_rep is distinct from 'PASTE-ALEX-ID-HERE');

-- ── RECOVERY (only if query 2/4 show the rows EXIST but are mis-assigned) ────
-- Uncomment and run to hand those accounts back to Alex. Double-check the WHERE
-- clause first so you don't reassign someone else's accounts.
-- update accounts
--   set assigned_rep = 'PASTE-ALEX-ID-HERE'
--   where created_at::date between '2026-08-26' and '2026-08-30'
--     and id in ('paste','the','specific','ids');
