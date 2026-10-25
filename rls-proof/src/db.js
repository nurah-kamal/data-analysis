import { readFileSync, readdirSync } from 'node:fs';
import pg from 'pg';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');
const sqlIn = (dir) =>
  readdirSync(new URL(dir, root))
    .filter((name) => name.endsWith('.sql'))
    .sort()
    .map((name) => `${dir}/${name}`);

// The column that says which tenant a row belongs to.
export const tenantColumn = {
  tenants: 'id',
  users: 'tenant_id',
  projects: 'tenant_id',
  tasks: 'tenant_id',
  invoices: 'tenant_id',
};
export const tables = Object.keys(tenantColumn);
export const policyFiles = () => sqlIn('policies');
export const migrationFiles = () => sqlIn('migrations');

// Host, port, superuser and password come from the usual PGHOST, PGPORT,
// PGUSER and PGPASSWORD settings.
export async function connect({ database, user } = {}) {
  const client = new pg.Client({ database, user });
  await client.connect();
  return client;
}

async function admin(sql) {
  const client = await connect({ database: 'postgres' });
  try {
    await client.query(sql);
  } finally {
    await client.end();
  }
}

// Builds a database from nothing: roles, migrations, policies, seed.
// Everything after the roles runs as app_owner, so app_owner owns the tables.
export async function build(database) {
  await admin(`drop database if exists ${database} with (force)`);
  await admin(`create database ${database}`);
  const client = await connect({ database });
  try {
    const [roles, ...migrations] = migrationFiles();
    await client.query(read(roles));
    if (process.env.PGPASSWORD) {
      const password = client.escapeLiteral(process.env.PGPASSWORD);
      await client.query(`alter role app_user password ${password}`);
      await client.query(`alter role service_role password ${password}`);
    }
    await client.query('set role app_owner');
    for (const file of [...migrations, ...policyFiles(), 'seed.sql']) {
      await client.query(read(file));
    }
  } finally {
    await client.end();
  }
}

// A fresh copy of a built database, so each break starts from the same state.
export async function copy(from, to) {
  await admin(`drop database if exists ${to} with (force)`);
  await admin(`create database ${to} template ${from}`);
}

export async function drop(database) {
  await admin(`drop database if exists ${database} with (force)`);
}

// Rows per tenant in each table, read as the superuser so no policy applies.
// The tests compare what a tenant sees against this.
export async function rowsPerTenant(database) {
  const client = await connect({ database });
  try {
    const counts = {};
    for (const table of tables) {
      const { rows } = await client.query(
        `select ${tenantColumn[table]} as tenant, count(*)::int as n from ${table} group by 1`,
      );
      counts[table] = Object.fromEntries(rows.map((r) => [r.tenant, r.n]));
    }
    return counts;
  } finally {
    await client.end();
  }
}
