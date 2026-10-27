// Snapshots live in one folder, one JSON file per run: <name>--0001.json, and so
// on. Nothing is overwritten, so the folder is the whole history.

import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const fileName = (name, seq) => `${name}--${String(seq).padStart(4, '0')}.json`;

export function loadHistory(dir, name) {
  let files;
  try { files = readdirSync(dir); } catch { return []; }
  const re = new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}--(\\d{4,})\\.json$`);
  return files.map((f) => [f, f.match(re)]).filter(([, m]) => m)
    .sort((a, b) => Number(a[1][1]) - Number(b[1][1]))
    .map(([f]) => JSON.parse(readFileSync(join(dir, f), 'utf8')));
}

export function saveSnapshot(dir, snapshot, history) {
  mkdirSync(dir, { recursive: true });
  const path = join(dir, fileName(snapshot.name, history.length + 1));
  writeFileSync(path, JSON.stringify(snapshot, null, 2) + '\n');
  return path;
}

// orders-2025-03.csv → orders, so a monthly file keeps one history.
export const defaultName = (file) =>
  file.split(/[\\/]/).pop().replace(/\.[^.]+$/, '').replace(/[-_ ]?\d{4}([-_]?\d{2}){0,2}$/, '') || 'export';
