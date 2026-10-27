// Runs the check on each month of examples/orders in turn, starting from an
// empty history, and writes results/: every snapshot, and one report covering
// the year. A test fails if the committed results are not what this makes.

import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { check } from '../schema-drift.js';
import { count, summary } from '../src/report.js';
import { MONTHS } from './make-demo.js';

const root = fileURLToPath(new URL('../', import.meta.url));

export function runDemo(history = `${root}results/snapshots`) {
  rmSync(history, { recursive: true, force: true });
  return MONTHS.map((month) => ({
    month,
    ...check(`${root}examples/orders/orders-${month}.csv`, { history, asOf: month }),
  }));
}

export function demoReport(runs) {
  const lines = [
    '# The demo, month by month',
    '',
    'Each month of [examples/orders](../examples/orders) checked against the month before, in order, starting from an empty history. `npm run demo` remakes this file and [snapshots/](snapshots).',
    '',
    '| Month | Rows | Found |',
    '| --- | ---: | --- |',
    ...runs.map((r) => `| [${r.month}](#orders-${r.month}csv) | ${count(r.snapshot.rows)} | ${r.before ? summary(r.findings) : 'baseline'} |`),
    '',
  ];
  for (const r of runs) lines.push(r.report);
  return lines.join('\n');
}

if (process.argv[1] && import.meta.filename === process.argv[1]) {
  const runs = runDemo();
  mkdirSync(`${root}results`, { recursive: true });
  writeFileSync(`${root}results/demo.md`, demoReport(runs));
  console.log(`Wrote results/demo.md and ${readdirSync(`${root}results/snapshots`).length} snapshots`);
  for (const r of runs) console.log(`${r.month}  ${r.before ? summary(r.findings) : 'baseline'}`);
}
