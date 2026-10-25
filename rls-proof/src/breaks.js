// Ways to get tenant isolation wrong. Each break is applied to a fresh copy of the
// database (or changes how the checks connect), and at least one check must fail.
// A break that every check passes would mean the checks can't see that mistake.

const policy = {
  tenants: 'tenants_own_row',
  users: 'users_same_tenant',
  projects: 'projects_same_tenant',
  tasks: 'tasks_same_tenant',
  invoices: 'invoices_same_tenant',
};
const readOnly = new Set(['tenants', 'users']);
const own = (table) => (table === 'tenants' ? 'id' : 'tenant_id') + ' = (select app_current_tenant())';

function replacePolicy(table, using, check) {
  const name = policy[table];
  const scope = readOnly.has(table) ? 'for select' : 'for all';
  const withCheck = readOnly.has(table) ? '' : ` with check (${check ?? own(table)})`;
  return `drop policy ${name} on ${table};
create policy ${name} on ${table} ${scope} using (${using})${withCheck};`;
}

export const breaks = [];

for (const table of Object.keys(policy)) {
  breaks.push(
    {
      name: `${table}: row-level security switched off`,
      sql: `alter table ${table} disable row level security;`,
    },
    {
      name: `${table}: policy dropped, security still on`,
      sql: `drop policy ${policy[table]} on ${table};`,
    },
    {
      name: `${table}: USING (true)`,
      sql: replacePolicy(table, 'true'),
    },
  );
}

for (const table of ['projects', 'tasks', 'invoices']) {
  breaks.push({
    name: `${table}: WITH CHECK (true), so writes aren't checked`,
    sql: replacePolicy(table, own(table), 'true'),
  });
}

breaks.push(
  {
    name: 'projects: <= instead of = in USING',
    sql: replacePolicy('projects', 'tenant_id <= (select app_current_tenant())'),
  },
  {
    name: 'invoices: USING compares the user id, not the tenant',
    sql: replacePolicy('invoices', "tenant_id = nullif(current_setting('app.user_id', true), '')::integer"),
  },
  {
    name: 'app_current_tenant() falls back to tenant A when no user is set',
    sql: `create or replace function app_current_tenant() returns integer
language sql stable security definer set search_path = public, pg_temp
as $$
  select coalesce(
    (select tenant_id from users where id = nullif(current_setting('app.user_id', true), '')::integer),
    1)
$$;`,
  },
  {
    name: 'connecting as service_role, which bypasses row-level security',
    connect: { user: 'service_role' },
  },
  {
    name: 'connecting as the superuser',
    connect: { user: process.env.PGUSER ?? 'postgres' },
  },
  {
    name: 'connecting as the table owner',
    connect: { user: process.env.PGUSER ?? 'postgres', setRole: 'app_owner' },
  },
);
