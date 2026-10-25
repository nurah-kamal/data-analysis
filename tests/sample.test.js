import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { COLUMNS, makeSample, toCsv } from '../scripts/make-sample.js';

const sample = makeSample();
const dir = new URL('../data/sample/', import.meta.url);

test('The committed sample is exactly what the generator makes', () => {
  for (const table of Object.keys(COLUMNS)) {
    const committed = readFileSync(new URL(`${table}.csv`, dir), 'utf8').replace(/\r\n/g, '\n');
    assert.equal(committed, toCsv(table, sample[table]), `${table}.csv has drifted; run npm run sample`);
  }
});

test('The same seed gives the same data, and another seed does not', () => {
  assert.deepEqual(makeSample().order_lines.slice(0, 50), sample.order_lines.slice(0, 50));
  assert.notDeepEqual(makeSample(1).order_lines.slice(0, 50), sample.order_lines.slice(0, 50));
});

test('No person is in the data: customers are an ID, a segment, a region and a date', () => {
  assert.deepEqual(COLUMNS.customers, ['customer_id', 'segment', 'region', 'joined_on']);
  for (const c of sample.customers) {
    assert.match(c.customer_id, /^C\d{4}$/);
    assert.ok(['Retail store', 'Contractor', 'Online'].includes(c.segment));
  }
  // The only free text anywhere is a product description or a city.
  const text = Object.entries(COLUMNS).flatMap(([t, cols]) => cols.map((c) => `${t}.${c}`))
    .filter((c) => !/_id$|_on$|quantity|price|cost|_pct|_qty|_days|line_no|as_of|segment|region|origin|category/.test(c));
  assert.deepEqual(text, ['warehouses.city', 'products.description']);
});

test('Stock never goes below zero and nothing ships that was not ordered', () => {
  for (const l of sample.order_lines) {
    assert.ok(l.quantity_shipped >= 0 && l.quantity_shipped <= l.quantity, l.order_id);
  }
  for (const [key, units] of Object.entries(sample.closingStock)) assert.ok(units >= 0, key);
});
