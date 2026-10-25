-- Invented data. Two tenants, no people: users are known only by a test address.
insert into tenants (id, name) values
  (1, 'Tenant A'),
  (2, 'Tenant B');

insert into users (id, tenant_id, email) values
  (1, 1, 'a1@tenant-a.test'),
  (2, 1, 'a2@tenant-a.test'),
  (3, 1, 'a3@tenant-a.test'),
  (4, 2, 'b1@tenant-b.test'),
  (5, 2, 'b2@tenant-b.test');

insert into projects (id, tenant_id, name, created_on) values
  (1, 1, 'Warehouse move', '2026-08-03'),
  (2, 1, 'Price list refresh', '2026-09-14'),
  (3, 2, 'New supplier portal', '2026-07-21'),
  (4, 2, 'Year-end stock count', '2026-10-01'),
  (5, 1, 'Supplier review', '2026-10-20'),
  (6, 2, 'Fleet check', '2026-10-22');

insert into tasks (id, tenant_id, project_id, title, done) values
  (1, 1, 1, 'Book the truck', true),
  (2, 1, 1, 'Label the shelves', false),
  (3, 1, 2, 'Check last year''s prices', false),
  (4, 2, 3, 'Draft the login page', true),
  (5, 2, 4, 'Print count sheets', false);

insert into invoices (id, tenant_id, amount_cents, issued_on, status) values
  (1, 1, 125000, '2026-09-01', 'paid'),
  (2, 1, 48050, '2026-10-01', 'sent'),
  (3, 2, 990000, '2026-08-15', 'paid'),
  (4, 2, 31500, '2026-09-15', 'paid'),
  (5, 2, 72000, '2026-10-15', 'draft');

-- Move each identity past the seeded ids so new rows don't collide.
select setval(pg_get_serial_sequence('tenants', 'id'), 2);
select setval(pg_get_serial_sequence('users', 'id'), 5);
select setval(pg_get_serial_sequence('projects', 'id'), 6);
select setval(pg_get_serial_sequence('tasks', 'id'), 5);
select setval(pg_get_serial_sequence('invoices', 'id'), 5);
