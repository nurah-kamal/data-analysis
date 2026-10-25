# Results

Written by `npm run report`. CI runs it again and fails if this file changes.

**Isolation checks as app_user:** 54 of 54 pass.

**Breaks caught:** 24 of 24.

| Break | Checks that fail | For example |
| --- | ---: | --- |
| tenants: row-level security switched off | 4 | tenants: tenant A sees none of tenant B's rows |
| tenants: policy dropped, security still on | 2 | tenants: tenant A sees all of its own rows |
| tenants: USING (true) | 4 | tenants: tenant A sees none of tenant B's rows |
| users: row-level security switched off | 4 | users: tenant A sees none of tenant B's rows |
| users: policy dropped, security still on | 2 | users: tenant A sees all of its own rows |
| users: USING (true) | 4 | users: tenant A sees none of tenant B's rows |
| projects: row-level security switched off | 12 | projects: tenant A sees none of tenant B's rows |
| projects: policy dropped, security still on | 4 | projects: tenant A sees all of its own rows |
| projects: USING (true) | 8 | projects: tenant A sees none of tenant B's rows |
| tasks: row-level security switched off | 12 | tasks: tenant A sees none of tenant B's rows |
| tasks: policy dropped, security still on | 4 | tasks: tenant A sees all of its own rows |
| tasks: USING (true) | 8 | tasks: tenant A sees none of tenant B's rows |
| invoices: row-level security switched off | 12 | invoices: tenant A sees none of tenant B's rows |
| invoices: policy dropped, security still on | 4 | invoices: tenant A sees all of its own rows |
| invoices: USING (true) | 8 | invoices: tenant A sees none of tenant B's rows |
| projects: WITH CHECK (true), so writes aren't checked | 2 | projects: tenant A can't add a row to tenant B |
| tasks: WITH CHECK (true), so writes aren't checked | 2 | tasks: tenant A can't add a row to tenant B |
| invoices: WITH CHECK (true), so writes aren't checked | 2 | invoices: tenant A can't add a row to tenant B |
| projects: <= instead of = in USING | 3 | projects: tenant B sees none of tenant A's rows |
| invoices: USING compares the user id, not the tenant | 2 | invoices: tenant B sees all of its own rows |
| app_current_tenant() falls back to tenant A when no user is set | 10 | tenants: no user set sees no rows |
| connecting as service_role, which bypasses row-level security | 44 | tenants: tenant A sees none of tenant B's rows |
| connecting as the superuser | 44 | tenants: tenant A sees none of tenant B's rows |
| connecting as the table owner | 44 | tenants: tenant A sees none of tenant B's rows |

## The checks

- pass: tenants: tenant A sees all of its own rows
- pass: tenants: tenant A sees none of tenant B's rows
- pass: users: tenant A sees all of its own rows
- pass: users: tenant A sees none of tenant B's rows
- pass: projects: tenant A sees all of its own rows
- pass: projects: tenant A sees none of tenant B's rows
- pass: tasks: tenant A sees all of its own rows
- pass: tasks: tenant A sees none of tenant B's rows
- pass: invoices: tenant A sees all of its own rows
- pass: invoices: tenant A sees none of tenant B's rows
- pass: projects: tenant A can't add a row to tenant B
- pass: projects: tenant A can't change tenant B's rows
- pass: projects: tenant A can't delete tenant B's rows
- pass: projects: tenant A can't move its own row to tenant B
- pass: tasks: tenant A can't add a row to tenant B
- pass: tasks: tenant A can't change tenant B's rows
- pass: tasks: tenant A can't delete tenant B's rows
- pass: tasks: tenant A can't move its own row to tenant B
- pass: invoices: tenant A can't add a row to tenant B
- pass: invoices: tenant A can't change tenant B's rows
- pass: invoices: tenant A can't delete tenant B's rows
- pass: invoices: tenant A can't move its own row to tenant B
- pass: tenants: tenant B sees all of its own rows
- pass: tenants: tenant B sees none of tenant A's rows
- pass: users: tenant B sees all of its own rows
- pass: users: tenant B sees none of tenant A's rows
- pass: projects: tenant B sees all of its own rows
- pass: projects: tenant B sees none of tenant A's rows
- pass: tasks: tenant B sees all of its own rows
- pass: tasks: tenant B sees none of tenant A's rows
- pass: invoices: tenant B sees all of its own rows
- pass: invoices: tenant B sees none of tenant A's rows
- pass: projects: tenant B can't add a row to tenant A
- pass: projects: tenant B can't change tenant A's rows
- pass: projects: tenant B can't delete tenant A's rows
- pass: projects: tenant B can't move its own row to tenant A
- pass: tasks: tenant B can't add a row to tenant A
- pass: tasks: tenant B can't change tenant A's rows
- pass: tasks: tenant B can't delete tenant A's rows
- pass: tasks: tenant B can't move its own row to tenant A
- pass: invoices: tenant B can't add a row to tenant A
- pass: invoices: tenant B can't change tenant A's rows
- pass: invoices: tenant B can't delete tenant A's rows
- pass: invoices: tenant B can't move its own row to tenant A
- pass: tenants: no user set sees no rows
- pass: tenants: an unknown user sees no rows
- pass: users: no user set sees no rows
- pass: users: an unknown user sees no rows
- pass: projects: no user set sees no rows
- pass: projects: an unknown user sees no rows
- pass: tasks: no user set sees no rows
- pass: tasks: an unknown user sees no rows
- pass: invoices: no user set sees no rows
- pass: invoices: an unknown user sees no rows
