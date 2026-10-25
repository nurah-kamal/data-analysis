// Runs the checks and every break, and writes results/checks.md.
import { mkdirSync, writeFileSync } from 'node:fs';
import { breaks } from '../src/breaks.js';
import { build, drop } from '../src/db.js';
import { runChecks } from '../src/suite.js';
import { tryBreak } from '../src/try-break.js';

const base = 'rls_proof_report';
const scratch = 'rls_proof_report_broken';

await build(base);
const results = await runChecks(base);
const passed = results.filter((r) => r.passed).length;

const rows = [];
for (const broken of breaks) {
  const caughtBy = await tryBreak(base, scratch, broken);
  rows.push({ name: broken.name, caughtBy });
}
await drop(scratch);
await drop(base);

const caught = rows.filter((r) => r.caughtBy.length > 0).length;
const lines = [
  '# Results',
  '',
  `Written by \`npm run report\`. CI runs it again and fails if this file changes.`,
  '',
  `**Isolation checks as app_user:** ${passed} of ${results.length} pass.`,
  '',
  `**Breaks caught:** ${caught} of ${rows.length}.`,
  '',
  '| Break | Checks that fail | For example |',
  '| --- | ---: | --- |',
  ...rows.map((r) => `| ${r.name} | ${r.caughtBy.length} | ${r.caughtBy[0] ?? '**not caught**'} |`),
  '',
  '## The checks',
  '',
  ...results.map((r) => `- ${r.passed ? 'pass' : 'FAIL'}: ${r.name}`),
  '',
];

mkdirSync(new URL('../results/', import.meta.url), { recursive: true });
writeFileSync(new URL('../results/checks.md', import.meta.url), lines.join('\n'));
console.log(`${passed}/${results.length} checks pass, ${caught}/${rows.length} breaks caught`);
if (passed !== results.length || caught !== rows.length) process.exitCode = 1;
