-- Privileges decide which commands a role may run at all.
-- Row-level security then decides which rows those commands can see.
grant usage on schema public to app_user, service_role;

grant select on tenants, users to app_user, service_role;
grant select, insert, update, delete on projects, tasks, invoices to app_user, service_role;
grant usage on all sequences in schema public to app_user, service_role;
grant execute on function app_current_tenant() to app_user, service_role;
