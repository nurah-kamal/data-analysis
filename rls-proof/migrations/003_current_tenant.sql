-- The application sets app.user_id at the start of each transaction:
--   set local app.user_id = '3';
-- This turns it into a tenant. It runs as the table owner (security definer)
-- so it can read users without going through the users policy, which calls it.
-- No setting, a blank one or an unknown user gives null, and null matches no rows.
create function app_current_tenant() returns integer
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select tenant_id
  from users
  where id = nullif(current_setting('app.user_id', true), '')::integer
$$;

revoke all on function app_current_tenant() from public;
