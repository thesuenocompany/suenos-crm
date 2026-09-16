-- pst-order-sync.sql — Ensure a PST number entered on an order is saved to the account
-- ============================================================================
-- The order form already tries to copy a PST number onto the account, but that
-- client-side write can be missed (some order paths, silent failures). This adds
-- a database trigger so the propagation is guaranteed and path-independent:
-- whenever an order row is saved with a non-empty PST number, the linked account
-- inherits it IF the account does not already have one on file. Existing account
-- PST numbers are never overwritten. Also backfills accounts already missing it.
-- Safe / idempotent to re-run.
-- ============================================================================

create or replace function public.sync_order_pst_to_account()
returns trigger language plpgsql security definer set search_path to 'public','pg_temp' as $$
begin
  if new.pst_number is not null and btrim(new.pst_number) <> '' then
    update accounts
       set pst_number = btrim(new.pst_number), updated_at = now()
     where id = new.account_id
       and (pst_number is null or btrim(pst_number) = '');
  end if;
  return new;
end $$;

drop trigger if exists trg_order_pst_to_account on orders;
create trigger trg_order_pst_to_account
  after insert or update of pst_number on orders
  for each row execute function public.sync_order_pst_to_account();

-- Backfill: fill any account currently missing a PST from its most recent order
-- that has one. Never overwrites an account that already has a PST on file.
update accounts a
   set pst_number = btrim(sub.pst_number), updated_at = now()
  from (
    select distinct on (o.account_id) o.account_id, o.pst_number
      from orders o
     where o.pst_number is not null and btrim(o.pst_number) <> ''
     order by o.account_id, o.created_at desc
  ) sub
 where a.id = sub.account_id
   and (a.pst_number is null or btrim(a.pst_number) = '');
