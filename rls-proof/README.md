# rls-proof

[![rls-proof](https://github.com/nurah-kamal/data-analysis/actions/workflows/rls-proof.yml/badge.svg?branch=main&event=push)](https://github.com/nurah-kamal/data-analysis/actions/workflows/rls-proof.yml) 26 tests

**Proves that PostgreSQL row-level security keeps two tenants' data apart, and that the tests would notice if it didn't. Five tables, five policies and 54 isolation checks run as the application's own database role. Then 24 deliberate mistakes are planted one at a time, from a switched-off policy to a connection that bypasses security, and the checks catch all 24.**

From [results/checks.md](results/checks.md), which CI rebuilds on every run:

| Break | Checks that fail | For example |
| --- | ---: | --- |
| invoices: row-level security switched off | 12 | invoices: tenant A sees none of tenant B's rows |
| tasks: policy dropped, security still on | 4 | tasks: tenant A sees all of its own rows |
| projects: WITH CHECK (true), so writes aren't checked | 2 | projects: tenant A can't add a row to tenant B |
| projects: <= instead of = in USING | 3 | projects: tenant B sees none of tenant A's rows |
| connecting as service_role, which bypasses row-level security | 44 | tenants: tenant A sees none of tenant B's rows |

## What it shows

| | |
| --- | --- |
| **Tables** | 5: `tenants`, `users`, and three tables of tenant data (`projects`, `tasks`, `invoices`). |
| **Policies** | 5, one per table, each in its own file with a comment saying what it prevents. |
| **Isolation checks** | 54, all passing as `app_user`: for each table and each direction (A looking at B, B looking at A), a tenant sees exactly its own rows and none of the other's (20). For the three data tables, it can't add, change or delete the other tenant's rows, or move its own row across (24). With no user set, or an unknown user, every table is empty (10). |
| **Breaks caught** | 24 of 24. Per table: security switched off, the policy dropped, `USING (true)` (15). Per data table: `WITH CHECK (true)` (3). Two subtler mistakes in a `USING` clause, a lookup that falls back to tenant A, and three connections that skip the policies: `service_role`, the superuser and the table owner (6). |

## The part worth copying

- **Check that the tests can fail.** A policy that blocks everything also passes "tenant A sees none of tenant B's rows". So every table also has "tenant A sees all of its own rows", compared with a count taken as the superuser, and each mistake is planted on purpose to prove some check goes red. On `tenants` and `users`, the dropped-policy breaks are caught by nothing else.
- **Check both directions.** `tenant_id <= current tenant` looks right from tenant A, the lower id, and leaks A's rows to tenant B. Only the B-to-A checks catch it. Comparing the user id with the tenant id is the same: user 1 happens to be in tenant 1, so A looks fine and B sees nothing of its own.
- **Fail closed.** `app_current_tenant()` returns null when no user is set, the setting is blank, or the user doesn't exist, and `tenant_id = null` matches nothing. The break that makes it fall back to a default tenant is caught by all 10 no-user and unknown-user checks.
- **The connection matters as much as the policy.** The superuser, any role with `BYPASSRLS`, and the table owner all skip row-level security. The application connects as `app_user`, which owns nothing and can't bypass. The tables belong to `app_owner`, which can't log in.
- **Keep the tenant consistent in foreign keys too.** A task points at its project through `(tenant_id, project_id)`, so it can't point at another tenant's project even through a role that skips the policies.

## How it is built

| | |
| --- | --- |
| **Who is asking** | The application starts each transaction with `set local app.user_id = '3'`. `app_current_tenant()` (in [migrations/003_current_tenant.sql](migrations/003_current_tenant.sql)) looks that user up and returns their tenant. It runs as the table owner, so it can read `users` without going through the `users` policy that calls it. |
| **Policies** | [policies/](policies/). The three data tables use `FOR ALL` with the same test in `USING` (which rows a query can see or touch) and `WITH CHECK` (which rows it may write). `tenants` and `users` are read-only to the application, so they have a `SELECT` policy only. The tenant lookup is wrapped as `(select app_current_tenant())` so Postgres works it out once per query, not once per row. |
| **Roles** | `app_owner` owns the tables and can't log in. `app_user` is the application, with table privileges in [migrations/007_grants.sql](migrations/007_grants.sql) and no way round the policies. `service_role` has `BYPASSRLS`, for back-office jobs, and is there to be tested as a bypass. |
| **Building** | [src/db.js](src/db.js) creates a database, runs the migrations in number order, then the policies, then [seed.sql](seed.sql), all as `app_owner`. |
| **Checks** | [src/suite.js](src/suite.js). Each check connects as `app_user`, opens a transaction, sets the user, runs, and rolls back, so a write that slipped through can't affect the next check. A refused write must fail with error 42501, the code for a policy violation. Failing for another reason, such as a foreign key, doesn't count. |
| **Breaks** | [src/breaks.js](src/breaks.js). Each is applied to a fresh copy of the built database (`create database … template`), or changes the role the checks connect as. All 54 checks run against it, and at least one must fail. |
| **Tests** | 26 with `node:test`: the 54 checks passing, the number of breaks, and one test per break. About 25 seconds on a laptop. |
| **CI** | [.github/workflows/rls-proof.yml](../.github/workflows/rls-proof.yml) in the repository root, with a Postgres 18 service container pinned to its image digest. It runs the tests, rebuilds `results/checks.md` and fails if it changed. Actions are pinned to exact commits. |

## Try it on your own machine

Node 22 or later, and a **throwaway** PostgreSQL 13 or later that you can reach as a superuser. The build creates the server-wide roles `app_owner`, `app_user` and `service_role`, and creates and drops databases whose names start `rls_proof_`. Tested on PostgreSQL 18.

With Docker:

```bash
docker run --rm -d --name rls-proof -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:18
```

Then:

```bash
cd rls-proof
npm ci
export PGHOST=localhost PGPORT=5432 PGUSER=postgres PGPASSWORD=postgres
npm test
npm run report        # rewrites results/checks.md
```

The login roles get the same password as `PGPASSWORD`, so the checks connect the same way under password or trust authentication.

To see a break for yourself, comment out the `alter table … enable row level security` line in one of the policy files and run `npm test`: the isolation test fails and lists the checks that went red.

## Things worth knowing

**Moving a row out is refused even with `WITH CHECK (true)`.** For an `UPDATE`, Postgres also checks the changed row against the `USING` clause of any policy that covers `SELECT`, and a `FOR ALL` policy does. So the "can't move its own row" checks stay green under that break, and the "can't add a row" checks are the ones that catch it.

**Row-level security is only as good as the user setting.** `app.user_id` is whatever the application sets. The database trusts it the way it trusts the connection. In a real system it would come from a verified sign-in token, never from the request body.

**The table owner skipping policies is Postgres's default.** `alter table … force row level security` would make the owner obey them too. Here the owner can't log in, and the break that connects as the owner shows what happens if that changes.

**Superusers always skip row-level security.** No policy can stop them, which is why the test for that is about how the application connects, not about the SQL.

**The data is invented.** Two tenants called Tenant A and Tenant B, five users known only by `.test` addresses, and made-up projects, tasks and invoices. No person is in it.

## Folders

```
migrations/          numbered SQL: roles, tables, the tenant lookup, grants
policies/            one file per table's policy
seed.sql             two tenants and their rows
src/db.js            builds, copies and drops the test databases
src/suite.js         the 54 isolation checks
src/breaks.js        the 24 planted mistakes
src/try-break.js     applies one break and runs the checks
scripts/report.js    writes results/checks.md
results/checks.md    every check and every break, from the last run
test/                26 tests
```

## Licence

MIT, in the [repository root](../LICENSE).
