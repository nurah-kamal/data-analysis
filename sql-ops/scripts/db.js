// Loads the sample CSVs into an in-memory SQLite database (Node's built-in
// node:sqlite, so there is nothing to install).

import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { COLUMNS } from './make-sample.js';

const root = new URL('../', import.meta.url);

export function openDatabase(dir = new URL('data/sample/', root)) {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('sql/schema.sql', root), 'utf8'));
  db.exec('BEGIN');
  for (const [table, cols] of Object.entries(COLUMNS)) {
    const [header, ...lines] = readFileSync(new URL(`${table}.csv`, dir), 'utf8').trim().split(/\r?\n/);
    if (header !== cols.join(',')) throw new Error(`${table}.csv has unexpected columns: ${header}`);
    // Column types in the schema turn '12' into 12 and '97.9' into 97.9 on insert.
    const insert = db.prepare(`INSERT INTO ${table} (${header}) VALUES (${cols.map(() => '?').join(', ')})`);
    for (const line of lines) insert.run(...line.split(',').map((v) => (v === '' ? null : v)));
  }
  db.exec('COMMIT');
  return db;
}

// Each file in sql/questions is one question; the comment block at the top is
// the question and the file name is its key.
export function questions() {
  const dir = new URL('sql/questions/', root);
  return readdirSync(dir).filter((f) => f.endsWith('.sql')).sort().map((file) => {
    const sql = readFileSync(new URL(file, dir), 'utf8');
    const lines = sql.split(/\r?\n/);
    const head = lines.slice(0, lines.findIndex((l) => !l.startsWith('--')));
    return {
      key: file.replace(/^\d+_|\.sql$/g, ''),
      file,
      question: head.map((l) => l.slice(2).trim()).join(' '),
      sql,
    };
  });
}

export function runAll(db) {
  return Object.fromEntries(questions().map((q) => [q.key, {
    file: `sql/questions/${q.file}`,
    question: q.question,
    rows: db.prepare(q.sql).all().map((r) => ({ ...r })),
  }]));
}
