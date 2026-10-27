// Reads an export into columns and rows of strings (or null).
// CSV with quoted fields and line breaks, or JSON: an array of objects, or an
// object holding one such array (the usual API envelope, such as {"data": [...]}).

import { readFileSync } from 'node:fs';
import { extname } from 'node:path';

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  text = text.replace(/^﻿/, '');
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch !== '"') field += ch;
      else if (text[i + 1] === '"') { field += '"'; i++; }
      else quoted = false;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += ch;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => !(r.length === 1 && r[0] === ''));
}

export function toCsv(columns, rows) {
  const cell = (v) => {
    const s = v ?? '';
    return /[",\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
  };
  return [columns, ...rows].map((r) => r.map(cell).join(',')).join('\n') + '\n';
}

function fromCsv(text) {
  const [columns, ...rows] = parseCsv(text);
  if (!columns) throw new Error('The file is empty.');
  return { columns, rows: rows.map((r) => columns.map((_, i) => r[i] ?? null)) };
}

// Nested objects become dotted names (customer.region); arrays are kept as JSON
// text. A key missing from one object is a null in that row.
function flatten(obj, prefix = '', out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const name = prefix + k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, `${name}.`, out);
    else out[name] = v === null || v === undefined ? null : Array.isArray(v) ? JSON.stringify(v) : String(v);
  }
  return out;
}

export function fromJson(text) {
  let data = JSON.parse(text);
  if (!Array.isArray(data) && data && typeof data === 'object') {
    const arrays = Object.values(data).filter(Array.isArray);
    if (arrays.length !== 1) throw new Error('Expected an array of records, or an object holding exactly one array.');
    data = arrays[0];
  }
  if (!Array.isArray(data)) throw new Error('Expected an array of records.');
  const flat = data.map((r) => flatten(r ?? {}));
  const columns = [...new Set(flat.flatMap(Object.keys))];
  return { columns, rows: flat.map((r) => columns.map((c) => r[c] ?? null)) };
}

export function readTable(path) {
  const text = readFileSync(path, 'utf8');
  return extname(path).toLowerCase() === '.json' ? fromJson(text) : fromCsv(text);
}
