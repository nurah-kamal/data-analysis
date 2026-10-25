-- Prevents a user from listing the users of another tenant.
alter table users enable row level security;

create policy users_same_tenant on users
  for select
  using (tenant_id = (select app_current_tenant()));
