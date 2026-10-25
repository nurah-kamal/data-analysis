import { connect, rowsPerTenant, tables, tenantColumn } from './db.js';

const letter = { 1: 'A', 2: 'B' };
const userIn = { 1: 1, 2: 4 }; // one seeded user from each tenant
const projectIn = { 1: 1, 2: 3 }; // a project with tasks, for new tasks to point at
const emptyProjectIn = { 1: 5, 2: 6 }; // a project with no tasks, safe to try to move
const rowIn = { tasks: { 1: 1, 2: 4 }, invoices: { 1: 1, 2: 3 } };

const newRow = {
  projects: (tenant) => ['(tenant_id, name) values ($1, $2)', [tenant, 'planted']],
  tasks: (tenant) => [
    '(tenant_id, project_id, title) values ($1, $2, $3)',
    [tenant, projectIn[tenant], 'planted'],
  ],
  invoices: (tenant) => [
    '(tenant_id, amount_cents, issued_on, status) values ($1, $2, $3, $4)',
    [tenant, 100, '2026-10-26', 'draft'],
  ],
};

const moveOut = {
  projects: (me, other) => ['update projects set tenant_id = $1 where id = $2', [other, emptyProjectIn[me]]],
  tasks: (me, other) => [
    'update tasks set tenant_id = $1, project_id = $2 where id = $3',
    [other, projectIn[other], rowIn.tasks[me]],
  ],
  invoices: (me, other) => ['update invoices set tenant_id = $1 where id = $2', [other, rowIn.invoices[me]]],
};

function fail(message) {
  throw new Error(message);
}

// 42501 is the error Postgres raises when a row breaks a policy's WITH CHECK.
async function expectRefused(client, sql, params) {
  let result;
  try {
    result = await client.query(sql, params);
  } catch (err) {
    if (err.code === '42501') return;
    fail(`refused for the wrong reason: ${err.code} ${err.message}`);
  }
  fail(result.rowCount === 0 ? 'found no row to write' : 'the write went through');
}

async function seen(client, table) {
  const { rows } = await client.query(
    `select ${tenantColumn[table]} as tenant, count(*)::int as n from ${table} group by 1`,
  );
  return Object.fromEntries(rows.map((r) => [r.tenant, r.n]));
}

// Every check, as a list. Each runs in its own transaction, which is rolled back,
// so writes never change what the next check sees.
export function checks(truth) {
  const list = [];
  const add = (name, userId, run) => list.push({ name, userId, run });

  for (const [me, other] of [[1, 2], [2, 1]]) {
    const who = `tenant ${letter[me]}`;
    const them = `tenant ${letter[other]}`;
    const user = userIn[me];

    for (const table of tables) {
      add(`${table}: ${who} sees all of its own rows`, user, async (client) => {
        const n = (await seen(client, table))[me] ?? 0;
        if (n !== truth[table][me]) fail(`saw ${n} of its ${truth[table][me]} rows`);
      });
      add(`${table}: ${who} sees none of ${them}'s rows`, user, async (client) => {
        const n = (await seen(client, table))[other] ?? 0;
        if (n !== 0) fail(`saw ${n} of ${them}'s rows`);
      });
    }

    for (const table of Object.keys(newRow)) {
      add(`${table}: ${who} can't add a row to ${them}`, user, async (client) => {
        const [values, params] = newRow[table](other);
        await expectRefused(client, `insert into ${table} ${values}`, params);
      });
      add(`${table}: ${who} can't change ${them}'s rows`, user, async (client) => {
        const { rowCount } = await client.query(
          `update ${table} set tenant_id = tenant_id where tenant_id = $1`,
          [other],
        );
        if (rowCount !== 0) fail(`changed ${rowCount} rows`);
      });
      add(`${table}: ${who} can't delete ${them}'s rows`, user, async (client) => {
        const { rowCount } = await client.query(`delete from ${table} where tenant_id = $1`, [other]);
        if (rowCount !== 0) fail(`deleted ${rowCount} rows`);
      });
      add(`${table}: ${who} can't move its own row to ${them}`, user, async (client) => {
        const [sql, params] = moveOut[table](me, other);
        await expectRefused(client, sql, params);
      });
    }
  }

  for (const table of tables) {
    add(`${table}: no user set sees no rows`, undefined, async (client) => {
      const total = Object.values(await seen(client, table)).reduce((a, b) => a + b, 0);
      if (total !== 0) fail(`saw ${total} rows`);
    });
    add(`${table}: an unknown user sees no rows`, 999, async (client) => {
      const total = Object.values(await seen(client, table)).reduce((a, b) => a + b, 0);
      if (total !== 0) fail(`saw ${total} rows`);
    });
  }

  return list;
}

// Runs every check against a database and returns one result per check.
// By default it connects as app_user, the role the application uses.
// `setRole` switches the session to another role after connecting.
export async function runChecks(database, { user = 'app_user', setRole } = {}) {
  const truth = await rowsPerTenant(database);
  const client = await connect({ database, user });
  const results = [];
  try {
    if (setRole) await client.query(`set role ${setRole}`);
    for (const check of checks(truth)) {
      await client.query('begin');
      try {
        if (check.userId !== undefined) {
          await client.query("select set_config('app.user_id', $1, true)", [String(check.userId)]);
        }
        await check.run(client);
        results.push({ name: check.name, passed: true });
      } catch (err) {
        results.push({ name: check.name, passed: false, reason: err.message });
      } finally {
        await client.query('rollback');
      }
    }
  } finally {
    await client.end();
  }
  return results;
}
