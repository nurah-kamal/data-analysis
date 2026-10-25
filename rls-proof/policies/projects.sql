-- Prevents reading, adding, changing or deleting another tenant's projects.
-- USING filters the rows a query can see or touch. WITH CHECK refuses a new or
-- changed row that would belong to another tenant, so a row can't be moved out either.
alter table projects enable row level security;

create policy projects_same_tenant on projects
  for all
  using (tenant_id = (select app_current_tenant()))
  with check (tenant_id = (select app_current_tenant()));
