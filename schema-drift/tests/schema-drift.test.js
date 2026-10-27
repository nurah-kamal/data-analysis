import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { compare, renameScore } from '../src/compare.js';
import { defaultName } from '../src/history.js';
import { fromJson, parseCsv, toCsv } from '../src/read.js';
import { profile } from '../src/shape.js';
import { KNOCK_ON, MONTHS, PLANTED, makeMonth, makeYear } from '../scripts/make-demo.js';
import { demoReport, runDemo } from '../scripts/run-demo.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const tmp = () => mkdtempSync(join(tmpdir(), 'schema-drift-'));

// A table from columns and rows of plain values.
const table = (columns, rows) => ({ columns, rows: rows.map((r) => r.map((v) => (v === null ? null : String(v)))) });
const shapeOf = (columns, rows) => profile(table(columns, rows), { asOf: 'test' });
const kinds = (findings) => findings.map((f) => `${f.kind}:${f.column}`).sort();
const many = (n, fn) => Array.from({ length: n }, (_, i) => fn(i));

const runs = runDemo(join(tmp(), 'snapshots'));
const byMonth = Object.fromEntries(runs.map((r) => [r.month, r]));

test('Every planted drift is found in the month it was planted', () => {
  for (const p of PLANTED) {
    const found = byMonth[p.month].findings.map((f) => `${f.kind}:${f.column}`);
    assert.ok(found.includes(`${p.kind}:${p.column}`), `${p.month}: expected ${p.kind} on ${p.column}, found ${found.join('; ') || 'nothing'}`);
  }
});

test('Nothing else is reported: only the plants and the changes they cause', () => {
  for (const { month, findings } of runs) {
    const expected = [...PLANTED, ...KNOCK_ON].filter((p) => p.month === month).map((p) => `${p.kind}:${p.column}`).sort();
    assert.deepEqual(kinds(findings), expected, month);
  }
  for (const month of ['2025-02', '2025-04']) assert.equal(byMonth[month].findings.length, 0, `${month} is clean`);
});

test('The tricky pair in October is a removal and an addition, not a rename', () => {
  assert.equal(byMonth['2025-10'].findings.filter((f) => f.kind === 'rename').length, 0);
});

test('No false alarms on noise: forty years of clean months report nothing', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const shapes = makeYear({ seed, planted: false }).map((m) => profile(m, { asOf: m.month }));
    for (let i = 1; i < shapes.length; i++) {
      const found = compare(shapes[i - 1], shapes[i], shapes.slice(0, i));
      assert.deepEqual(found, [], `seed ${seed}, ${MONTHS[i]}: ${found.map((f) => f.what).join('; ')}`);
    }
  }
});

test('The committed examples and results are what the scripts make', () => {
  for (const m of makeYear()) {
    const committed = readFileSync(join(root, 'examples/orders', m.file), 'utf8').replace(/\r\n/g, '\n');
    assert.equal(committed, toCsv(m.columns, m.rows), `${m.file}: run npm run demo`);
  }
  const committed = readFileSync(join(root, 'results/demo.md'), 'utf8').replace(/\r\n/g, '\n');
  assert.equal(committed, demoReport(runs), 'results/demo.md: run npm run demo');
  assert.equal(readdirSync(join(root, 'results/snapshots')).length, 12);
});

test('A rename that keeps the values is caught for text, numbers and dates', () => {
  const rows = many(200, (i) => [`A${i % 4}`, 100 + (i % 37), `2025-01-${String(1 + (i % 28)).padStart(2, '0')}`]);
  const before = shapeOf(['kind', 'total', 'day'], rows);
  const after = shapeOf(['type', 'amount', 'date'], rows);
  assert.deepEqual(kinds(compare(before, after)), ['rename:day → date', 'rename:kind → type', 'rename:total → amount']);
});

test('A rename can come with another change, and both are reported', () => {
  const before = shapeOf(['id', 'price'], many(300, (i) => [i, 10 + (i % 50)]));
  const after = shapeOf(['id', 'price_cents'], many(300, (i) => [i, 100 * (10 + (i % 50))]));
  // Different values, so it can't be matched as a rename: it is reported as gone and added.
  assert.deepEqual(kinds(compare(before, after)), ['added:price_cents', 'removed:price']);
  const renamed = shapeOf(['id', 'cost'], many(300, (i) => [i, 10 + (i % 50)]));
  assert.ok(renameScore(before.columns[1], renamed.columns[1]) >= 0.8);
});

test('Two columns swapping places is an order change, not a rename', () => {
  const rows = many(100, (i) => [i, `x${i % 3}`]);
  const found = compare(shapeOf(['n', 's'], rows), shapeOf(['s', 'n'], rows.map(([a, b]) => [b, a])));
  assert.deepEqual(kinds(found), ['order:']);
});

test('Units: rands to cents and back, and ×1000, but not an ordinary rise', () => {
  const amounts = many(500, (i) => 50 + ((i * 37) % 900));
  const base = shapeOf(['amount'], amounts.map((x) => [x]));
  const scaled = (f) => compare(base, shapeOf(['amount'], amounts.map((x) => [f < 1 ? x * f : Math.round(x * f)])));
  assert.deepEqual(kinds(scaled(100)), ['unit:amount']);
  assert.deepEqual(kinds(scaled(1000)), ['unit:amount']);
  assert.match(scaled(0.01)[0].what, /100 times smaller/);
  assert.deepEqual(kinds(scaled(1.05)), [], 'a 5% rise is not a change of shape');
  assert.deepEqual(kinds(scaled(3)), ['distribution:amount']);
});

test('Dates: a format change is caught; ambiguous day-month dates are not a change', () => {
  const iso = shapeOf(['d'], many(60, (i) => [`2025-03-${String(1 + (i % 28)).padStart(2, '0')}`]));
  const dmy = shapeOf(['d'], many(60, (i) => [`${String(1 + (i % 28)).padStart(2, '0')}/03/2025`]));
  assert.deepEqual(dmy.columns[0].formats, ['DD/MM/YYYY']);
  assert.deepEqual(kinds(compare(iso, dmy)), ['date-format:d']);
  // With no day above 12, 05/03/2025 fits both orders, which overlaps DD/MM/YYYY.
  const early = shapeOf(['d'], many(60, (i) => [`${String(1 + (i % 12)).padStart(2, '0')}/03/2025`]));
  assert.deepEqual(early.columns[0].formats, ['DD/MM/YYYY', 'MM/DD/YYYY']);
  assert.deepEqual(compare(dmy, early), []);
  assert.equal(shapeOf(['d'], [['2025-02-30']]).columns[0].type, 'text', '30 February is not a date');
});

test('Types: codes with leading zeros stay text, and whole numbers gaining decimals is medium', () => {
  assert.equal(shapeOf(['code'], [['007'], ['0821'], ['12']]).columns[0].type, 'text');
  const found = compare(shapeOf(['q'], many(50, (i) => [1 + (i % 5)])), shapeOf(['q'], many(50, (i) => [1 + (i % 5) + 0.5])));
  assert.equal(found.find((f) => f.kind === 'type').severity, 'medium');
});

test('Categories: a rare value going missing is not reported, a common one is', () => {
  const rows = (rare, common) => many(1000, (i) => [i % 200 === 0 ? (rare ? 'rare' : 'a') : i % 10 === 0 ? (common ? 'common' : 'a') : 'a']);
  const before = shapeOf(['s'], rows(true, true));
  assert.deepEqual(compare(before, shapeOf(['s'], rows(false, true))), [], '5 expected rows: could be chance');
  assert.deepEqual(kinds(compare(before, shapeOf(['s'], rows(true, false)))), ['vanished-value:s']);
});

test('A value seen in any earlier snapshot is not new when it comes back', () => {
  const s = (v) => shapeOf(['s'], many(100, (i) => [i < 3 ? v : 'a']));
  const [jan, feb, mar] = [s('rare'), s('a'), s('rare')];
  assert.deepEqual(compare(feb, mar, [jan, feb]), []);
  assert.deepEqual(kinds(compare(feb, mar, [feb])), ['new-value:s']);
});

test('Null rates: noise is ignored, a jump is reported by size', () => {
  const col = (rate, seed) => shapeOf(['x'], many(2000, (i) => [((i * 7919 + seed) % 1000) / 1000 < rate ? null : 1]));
  assert.deepEqual(compare(col(0.03, 1), col(0.04, 2)), []);
  assert.equal(compare(col(0.03, 1), col(0.10, 2))[0].severity, 'medium');
  assert.equal(compare(col(0.03, 1), col(0.40, 2))[0].severity, 'high');
  assert.equal(compare(col(0.40, 1), col(0.03, 2))[0].severity, 'low');
});

test('JSON: nested fields flatten, a missing key is a null, and the envelope is found', () => {
  const t = fromJson(JSON.stringify({ data: [{ id: 1, customer: { region: 'Gauteng' }, tags: ['a'] }, { id: 2, customer: {} }], page: 1 }));
  assert.deepEqual(t.columns, ['id', 'customer.region', 'tags']);
  assert.deepEqual(t.rows, [['1', 'Gauteng', '["a"]'], ['2', null, null]]);
  assert.throws(() => fromJson('{"a": [], "b": []}'), /exactly one array/);
});

test('CSV: quoted commas, quotes and line breaks survive a round trip', () => {
  const rows = [['a,b', 'say "hi"', 'two\nlines'], ['', 'x', 'y']];
  assert.deepEqual(parseCsv(toCsv(['p', 'q', 'r'], rows)), [['p', 'q', 'r'], ...rows]);
});

test('The command line saves each run, fails on high findings, and names the history from the file', () => {
  assert.equal(defaultName('exports/orders-2025-03.csv'), 'orders');
  assert.equal(defaultName('stock_20250301.json'), 'stock');
  const dir = tmp();
  const history = join(dir, 'snapshots');
  const run = (month, ...extra) => spawnSync(process.execPath,
    [join(root, 'schema-drift.js'), 'check', join(root, `examples/orders/orders-${month}.csv`), '--history', history, '--as-of', month, ...extra],
    { encoding: 'utf8' });
  assert.equal(run('2025-04').status, 0);
  assert.match(run('2025-05', '--dry-run').stdout, /Looks renamed/);
  assert.equal(readdirSync(history).length, 1, 'a dry run saves nothing');
  const may = run('2025-05', '--out', join(dir, 'report.md'));
  assert.equal(may.status, 1, 'a high finding fails the run');
  assert.match(readFileSync(join(dir, 'report.md'), 'utf8'), /region → province/);
  assert.equal(run('2025-06', '--fail-on', 'none').status, 0);
  assert.deepEqual(readdirSync(history), ['orders--0001.json', 'orders--0002.json', 'orders--0003.json']);
  writeFileSync(join(dir, 'bad.csv'), '');
  assert.equal(spawnSync(process.execPath, [join(root, 'schema-drift.js'), 'check', join(dir, 'bad.csv'), '--history', history]).status, 2);
  rmSync(dir, { recursive: true, force: true });
});
