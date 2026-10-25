import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { openDatabase, runAll } from '../scripts/db.js';
import { makeAnswers } from '../scripts/answers.js';
import { makeSample } from '../scripts/make-sample.js';

const db = openDatabase();
const results = runAll(db);

test('Every question runs, returns rows and starts with the question it answers', () => {
  const keys = Object.keys(results);
  assert.ok(keys.length >= 10 && keys.length <= 15, `${keys.length} questions`);
  for (const [key, q] of Object.entries(results)) {
    assert.ok(q.rows.length > 0, key);
    assert.match(q.question, /\?/, `${key} needs its question in the opening comment`);
  }
});

test('docs/ANSWERS.md is what the SQL gives today', () => {
  const committed = readFileSync(new URL('../docs/ANSWERS.md', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  assert.equal(committed, makeAnswers(results), 'run npm run answers');
});

// Two independent answers: the generator tracks stock day by day in JavaScript,
// and SQL rebuilds it from the opening stock, deliveries and shipments.
test('Stock on hand in SQL matches the stock the generator ended with', () => {
  const { closingStock } = makeSample();
  const rows = db.prepare('SELECT warehouse_id, product_id, on_hand FROM stock_on_hand').all();
  assert.equal(rows.length, Object.keys(closingStock).length);
  for (const r of rows) assert.equal(r.on_hand, closingStock[`${r.warehouse_id}|${r.product_id}`], `${r.warehouse_id} ${r.product_id}`);
});

test('A running stock ledger in SQL never dips below zero', () => {
  const { lowest } = db.prepare(`
    SELECT min(balance) AS lowest FROM (
      SELECT sum(quantity) OVER (PARTITION BY warehouse_id, product_id ORDER BY day, kind
                                 ROWS UNBOUNDED PRECEDING) AS balance
      FROM stock_movements)`).get();
  assert.equal(lowest, 0);
});

test('The yearly headline and the months add up to the same revenue', () => {
  const byYear = Object.fromEntries(results.headline.rows.map((r) => [r.year, r.revenue]));
  for (const year of ['2024', '2025']) {
    const months = results.monthly_revenue.rows.filter((r) => r.month.startsWith(year));
    assert.equal(months.length, 12);
    assert.ok(Math.abs(months.at(-1).year_to_date - byYear[year]) < 0.01, year);
  }
  const deciles = results.revenue_concentration.rows.reduce((s, r) => s + r.revenue, 0);
  assert.ok(Math.abs(deciles - byYear['2025']) < 1);
});

// The planted patterns from docs/DATA.md. If these fail, the analysis no longer
// finds what was put into the data, or finds something that was not.
test('S04 starts delivering late in March 2025, and no other supplier does', () => {
  const late = (s, q) => results.supplier_lead_times.rows.find((r) => r.supplier_id === s && r.quarter === q).late_pct;
  for (const q of ['2025-Q2', '2025-Q3', '2025-Q4']) assert.ok(late('S04', q) > 90, q);
  for (const s of ['S01', 'S02', 'S03', 'S05', 'S06']) {
    for (const q of ['2025-Q2', '2025-Q3', '2025-Q4']) assert.ok(late(s, q) < 20, `${s} ${q}`);
  }
});

test('The late deliveries show up as stockouts on S04 products', () => {
  const fill = (s, q) => results.fill_rate_by_supplier.rows.find((r) => r.supplier_id === s && r.quarter === q).fill_rate_pct;
  assert.ok(fill('S04', '2024-Q4') > 95);
  assert.ok(fill('S04', '2025-Q3') < 88);
  for (const s of ['S01', 'S02', 'S03', 'S05', 'S06']) assert.ok(fill(s, '2025-Q3') > 95, s);
  const worst = results.worst_stockouts.rows;
  assert.deepEqual(worst.slice(0, 4).map((r) => r.supplier_id), ['S04', 'S04', 'S04', 'S04']);
  // S04 supplies fasteners and plumbing, so the cause only shows once products are joined to suppliers.
  assert.deepEqual(new Set(worst.filter((r) => r.supplier_id === 'S04').map((r) => r.category)), new Set(['Fasteners', 'Plumbing']));
});

test('The Black Friday cohort is the biggest and the least likely to come back', () => {
  const cohorts = results.customer_cohorts.rows;
  const nov = cohorts.find((r) => r.cohort === '2024-11');
  const others = cohorts.filter((r) => r !== nov).map((r) => r.came_back_pct).sort((a, b) => a - b);
  assert.equal(Math.max(...cohorts.map((r) => r.new_customers)), nov.new_customers);
  assert.ok(nov.came_back_pct < others[Math.floor(others.length / 2)] / 2);
  assert.ok(others[0] > 60, 'no other cohort should look like the promotion');
});

test('Paint and the roller kit are the pairs with the highest lift, and nothing else comes close', () => {
  const pairs = results.basket_lift.rows;
  const roller = pairs.filter((r) => r.second_product === 'Paint roller kit 230 mm' || r.first_product === 'Paint roller kit 230 mm');
  assert.ok(roller.length >= 4);
  assert.deepEqual(pairs.slice(0, roller.length), roller);
  const best = pairs.find((r) => !roller.includes(r));
  assert.ok(roller.at(-1).lift > 1.5 * best.lift);
});
