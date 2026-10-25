import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { build, drop } from '../src/db.js';
import { runChecks } from '../src/suite.js';

const database = 'rls_proof_isolation';
let results;

before(async () => {
  await build(database);
  results = await runChecks(database);
});

after(() => drop(database));

test('every isolation check passes as app_user', () => {
  const failed = results.filter((r) => !r.passed);
  assert.deepEqual(failed, []);
  assert.equal(results.length, 54);
});
