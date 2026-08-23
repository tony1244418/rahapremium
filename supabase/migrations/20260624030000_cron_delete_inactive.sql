-- Auto-delete inactive accounts every month, run INSIDE Supabase via pg_cron.
--
-- "Inactive" = ALL of:
--   * last login (or account creation if never logged in) older than 30 days
--   * no active normal subscription
--   * no active Live TV subscription
-- Admins live in a separate `admins` table and are never affected.

-- 1) Enable pg_cron (no-op if already enabled)
create extension if not exists pg_cron;

-- 2) Deletion function (SECURITY DEFINER so the cron job can delete rows)
create or replace function public.delete_inactive_accounts()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  with del as (
    delete from public.rahapremium_users u
    where coalesce(u.last_login_at, u.created_at) < (now() - interval '30 days')
      -- not an active normal subscription
      and not (
        u.subscription is not null
        and (u.subscription ->> 'isActive') = 'true'
        and (u.subscription ->> 'endDate') is not null
        and (u.subscription ->> 'endDate')::timestamptz > now()
      )
      -- not an active Live TV subscription
      and not (
        u.live_tv_subscription is not null
        and (u.live_tv_subscription ->> 'isActive') = 'true'
        and (u.live_tv_subscription ->> 'endDate') is not null
        and (u.live_tv_subscription ->> 'endDate')::timestamptz > now()
      )
    returning 1
  )
  select count(*) into deleted_count from del;

  raise notice 'delete_inactive_accounts: deleted % account(s)', deleted_count;
  return deleted_count;
end;
$$;

-- 3) Schedule monthly at 03:00 on the 1st (replace any existing job of same name)
do $$
begin
  perform cron.unschedule('delete-inactive-accounts-monthly');
exception when others then
  null; -- job didn't exist yet
end $$;

select cron.schedule(
  'delete-inactive-accounts-monthly',
  '0 3 1 * *',
  $$ select public.delete_inactive_accounts(); $$
);
