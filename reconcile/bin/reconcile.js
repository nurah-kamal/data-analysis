// node bin/reconcile.js <config.json> [--out report.md | report.html]
//
// The config names the sources (CSV files, relative to the config), the key
// to match on, an optional name fallback, and the fields to compare. See
// examples/countries/reconcile.json.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { parseCsv } from '../src/csv.js';
import { reconcile } from '../src/reconcile.js';
import { toHtml, toMarkdown } from '../src/report.js';

const { values: opts, positionals } = parseArgs({ allowPositionals: true, options: { out: { type: 'string' } } });
if (!positionals[0]) {
  console.error('usage: node bin/reconcile.js <config.json> [--out report.md | report.html]');
  process.exit(2);
}

const configPath = resolve(positionals[0]);
const config = JSON.parse(readFileSync(configPath, 'utf8'));
if (!config.sources?.length || config.sources.length < 2) throw new Error('A config needs at least two sources.');
if (!config.key || !config.compare?.length) throw new Error('A config needs a key and at least one field to compare.');

const sources = config.sources.map((s) => ({ name: s.name, rows: parseCsv(readFileSync(resolve(dirname(configPath), s.file), 'utf8')) }));
const result = reconcile({ sources, key: config.key, fallback: config.fallback, compare: config.compare });

const report = opts.out?.endsWith('.html') ? toHtml(config, result) : toMarkdown(config, result);
if (opts.out) writeFileSync(opts.out, report);
else process.stdout.write(report);
console.error(`${result.entities} entities, ${result.inAll} in every source, ${result.conflicts.length} conflicts${opts.out ? `. Written: ${opts.out}` : ''}`);
