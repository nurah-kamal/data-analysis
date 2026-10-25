import { connect, copy } from './db.js';
import { runChecks } from './suite.js';

// Applies one break to a fresh copy of `base` and returns the checks that failed.
export async function tryBreak(base, scratch, broken) {
  await copy(base, scratch);
  if (broken.sql) {
    const client = await connect({ database: scratch });
    try {
      await client.query(broken.sql);
    } finally {
      await client.end();
    }
  }
  const results = await runChecks(scratch, broken.connect);
  return results.filter((r) => !r.passed).map((r) => r.name);
}
