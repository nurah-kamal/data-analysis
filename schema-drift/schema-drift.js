#!/usr/bin/env node
// node schema-drift.js check <file> --history <folder> [--name orders] [--as-of 2025-03]
//                            [--out report.md] [--fail-on high|medium|low|none] [--dry-run]
// node schema-drift.js profile <file>

import { writeFileSync } from 'node:fs';
import { basename } from 'node:path';
import { parseArgs } from 'node:util';
import { SEVERITIES, compare } from './src/compare.js';
import { defaultName, loadHistory, saveSnapshot } from './src/history.js';
import { readTable } from './src/read.js';
import { toMarkdown } from './src/report.js';
import { profile } from './src/shape.js';

const USAGE = `Usage:
  node schema-drift.js check <file> --history <folder> [options]
  node schema-drift.js profile <file>

Options for check:
  --history <folder>   where snapshots are kept (required)
  --name <name>        which history to use (default: the file name without its date)
  --as-of <label>      label for this run (default: now)
  --out <file>         write the report there as well as printing it
  --fail-on <level>    exit with 1 if anything this severe or worse is found
                       (high, medium, low or none; default high)
  --dry-run            compare, but don't save the new snapshot`;

export function check(file, { history, name = defaultName(file), asOf, dryRun = false } = {}) {
  const earlier = loadHistory(history, name);
  const snapshot = profile(readTable(file), { name, asOf, source: basename(file) });
  const before = earlier.at(-1) ?? null;
  const findings = before ? compare(before, snapshot, earlier) : [];
  const saved = dryRun ? null : saveSnapshot(history, snapshot, earlier);
  return { snapshot, before, findings, saved, report: toMarkdown({ snapshot, before, findings }) };
}

function main(argv) {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      history: { type: 'string' }, name: { type: 'string' }, 'as-of': { type: 'string' },
      out: { type: 'string' }, 'fail-on': { type: 'string', default: 'high' }, 'dry-run': { type: 'boolean' },
      help: { type: 'boolean', short: 'h' },
    },
  });
  const [command, file] = positionals;
  if (values.help || !command) return console.log(USAGE), 0;
  if (!file) return console.error(USAGE), 2;

  if (command === 'profile') {
    console.log(JSON.stringify(profile(readTable(file), { source: basename(file) }), null, 2));
    return 0;
  }
  if (command !== 'check' || !values.history) return console.error(USAGE), 2;
  const failOn = values['fail-on'];
  if (failOn !== 'none' && !SEVERITIES.includes(failOn)) return console.error(`--fail-on must be ${SEVERITIES.join(', ')} or none`), 2;

  const result = check(file, { history: values.history, name: values.name, asOf: values['as-of'], dryRun: values['dry-run'] });
  process.stdout.write(result.report);
  if (values.out) writeFileSync(values.out, result.report);
  const limit = SEVERITIES.indexOf(failOn);
  return failOn !== 'none' && result.findings.some((f) => SEVERITIES.indexOf(f.severity) <= limit) ? 1 : 0;
}

if (process.argv[1] && import.meta.filename === process.argv[1]) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (e) {
    console.error(e.message);
    process.exitCode = 2;
  }
}
