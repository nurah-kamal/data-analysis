// Runs every question in sql/questions and writes the results to docs/ANSWERS.md.
// A test fails if the committed file is not what this script makes.

import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { openDatabase, runAll } from './db.js';

const MAX_ROWS = 16;

const cell = (v) => (v === null ? '' : typeof v === 'number' && !Number.isInteger(v) ? v.toFixed(2).replace(/\.?0+$/, '') : String(v));

function table(rows) {
  const cols = Object.keys(rows[0]);
  const shown = rows.slice(0, MAX_ROWS);
  const out = [
    `| ${cols.join(' | ')} |`,
    `| ${cols.map((c) => (rows.some((r) => typeof r[c] === 'number') ? '---:' : '---')).join(' | ')} |`,
    ...shown.map((r) => `| ${cols.map((c) => cell(r[c])).join(' | ')} |`),
  ];
  if (rows.length > shown.length) out.push('', `…and ${rows.length - shown.length} more rows. Run the file to see them all.`);
  return out.join('\n');
}

export function makeAnswers(results = runAll(openDatabase())) {
  const parts = [
    '# Answers',
    '',
    'Every question in [sql/questions](../sql/questions), run on the synthetic sample. Money is in rand, excluding VAT. `npm run answers` remakes this file, and a test fails if it is out of date.',
  ];
  for (const [key, q] of Object.entries(results)) {
    if (!q.rows.length) throw new Error(`${key} returned no rows`);
    parts.push('', `## ${q.file.split('/').pop()}`, '', `**${q.question}**`, '', `[Open the SQL](../${q.file})`, '', table(q.rows));
  }
  return parts.join('\n') + '\n';
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  writeFileSync(new URL('../docs/ANSWERS.md', import.meta.url), makeAnswers());
  console.log('Wrote docs/ANSWERS.md');
}
