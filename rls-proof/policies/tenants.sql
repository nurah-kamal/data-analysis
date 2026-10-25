-- Prevents a user from reading any tenant's row except their own.
-- The application can only read tenants (see 007_grants.sql), so there is no write policy.
alter table tenants enable row level security;

create policy tenants_own_row on tenants
  for select
  using (id = (select app_current_tenant()));
