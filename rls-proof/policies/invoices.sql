-- Prevents reading, adding, changing or deleting another tenant's invoices.
-- USING filters the rows a query can see or touch. WITH CHECK refuses a new or
-- changed row that would belong to another tenant, so a row can't be moved out either.
alter table invoices enable row level security;

create policy invoices_same_tenant on invoices
  for all
  using (tenant_id = (select app_current_tenant()))
  with check (tenant_id = (select app_current_tenant()));
