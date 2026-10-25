import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { breaks } from '../src/breaks.js';
import { build, drop } from '../src/db.js';
import { tryBreak } from '../src/try-break.js';

const base = 'rls_proof_breaks';
const scratch = 'rls_proof_broken';

before(() => build(base));
after(async () => {
  await drop(scratch);
  await drop(base);
});

test('there are 24 breaks', () => {
  assert.equal(breaks.length, 24);
});

for (const broken of breaks) {
  test(`caught: ${broken.name}`, async () => {
    const caughtBy = await tryBreak(base, scratch, broken);
    assert.ok(caughtBy.length > 0, 'every check still passed');
  });
}
