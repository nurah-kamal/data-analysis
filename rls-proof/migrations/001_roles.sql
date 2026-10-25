-- Roles are shared by every database on the server, so create them only once.
-- app_owner owns the tables and never logs in.
-- app_user is what the application connects as. It is subject to row-level security.
-- service_role is a back-office role that skips row-level security on purpose.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'app_owner') then
    create role app_owner nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'app_user') then
    create role app_user login nobypassrls;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role login bypassrls;
  end if;
end
$$;

grant create, usage on schema public to app_owner;
