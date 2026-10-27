// Makes examples/orders/: twelve monthly order exports from a made-up online
// hardware shop, January to December 2025. There is no person in them, not even
// a made-up one. The same seed always gives the same files. Each change below is
// planted in a named month and stays from then on, the way a real export
// changes; the other months only have ordinary noise.

import { mkdirSync, writeFileSync } from 'node:fs';
import { toCsv } from '../src/read.js';

const SEED = 20261027;
export const MONTHS = Array.from({ length: 12 }, (_, i) => `2025-${String(i + 1).padStart(2, '0')}`);

// What was planted, and what the check should report for that month.
export const PLANTED = [
  { month: '2025-03', kind: 'new-value', column: 'channel', what: 'A mobile app launches: orders now also come in as channel App (about 10%)' },
  { month: '2025-05', kind: 'rename', column: 'region → province', what: 'region is renamed province, with exactly the same values' },
  { month: '2025-06', kind: 'date-format', column: 'order_date', what: 'order_date switches from 2025-06-14 to 14/06/2025' },
  { month: '2025-07', kind: 'unit', column: 'amount', what: 'amount is sent in cents instead of rands' },
  { month: '2025-08', kind: 'nulls', column: 'discount_pct', what: 'a feed fault leaves discount_pct blank on about 35% of rows' },
  { month: '2025-09', kind: 'type', column: 'unit_price', what: 'unit_price arrives as text with a currency sign (R 129.90)' },
  { month: '2025-10', kind: 'removed', column: 'courier', what: 'courier is dropped, and an unrelated column, warehouse, is added' },
  { month: '2025-10', kind: 'added', column: 'warehouse', what: '(same change: this must not be mistaken for a rename)' },
  { month: '2025-11', kind: 'vanished-value', column: 'status', what: 'returns move to a separate export, so status Returned stops appearing' },
  { month: '2025-12', kind: 'distribution', column: 'quantity', what: 'a wholesale buyer joins, and most orders are now for 10 to 40 units' },
];

// Other findings the plants cause, which the check is right to report.
export const KNOCK_ON = [
  { month: '2025-11', kind: 'nulls', column: 'delivered_on', why: 'returned orders had no delivery date, so with them gone there are fewer blanks' },
  { month: '2025-12', kind: 'distribution', column: 'amount', why: 'amount is quantity times price, so it moves with quantity' },
];

const CHANNELS = [['Web', 50], ['Phone', 20], ['Store', 30]];
const REGIONS = [['Western Cape', 30, 'Cape Town'], ['Gauteng', 35, 'Johannesburg'], ['KwaZulu-Natal', 20, 'Durban'],
  ['Eastern Cape', 10, 'Cape Town'], ['Free State', 5, 'Johannesburg']];
const CATEGORIES = [['Hardware', 30, 20, 400], ['Paint', 20, 90, 1400], ['Garden', 15, 40, 900],
  ['Electrical', 15, 30, 1800], ['Plumbing', 10, 60, 900], ['Tools', 10, 150, 3200]];
const STATUSES = [['Delivered', 89.6], ['Returned', 6], ['Cancelled', 4], ['Lost', 0.4]];
const COURIERS = [['Road', 70], ['Air', 10]];
const QUANTITY = [[1, 25], [2, 25], [3, 20], [4, 12], [5, 10], [6, 8]];
const DISCOUNT = [[0, 55], [5, 20], [10, 15], [15, 7], [20, 3]];
const SEASON = [0.85, 0.9, 1, 1, 1, 0.95, 0.95, 1, 1.05, 1.1, 1.3, 1.2];

function mulberry32(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(rand, items) {
  const total = items.reduce((s, x) => s + x[1], 0);
  let r = rand() * total;
  for (const x of items) {
    r -= x[1];
    if (r < 0) return x;
  }
  return items.at(-1);
}

const pad = (n) => String(n).padStart(2, '0');

// One month's export. With planted: false, every month has the January layout
// and only noise, which the tests use to check for false alarms.
export function makeMonth(month, { seed = SEED, planted = true, firstId = 1 } = {}) {
  const at = (m) => planted && month >= m;
  const rand = mulberry32(seed + Number(month.replace('-', '')));
  const [year, mm] = month.split('-').map(Number);
  const daysInMonth = new Date(Date.UTC(year, mm, 0)).getUTCDate();
  const n = Math.round(1800 * SEASON[mm - 1] * (0.93 + 0.14 * rand()));

  const columns = ['order_id', 'order_date', at('2025-05') ? 'province' : 'region', 'channel', 'category',
    'quantity', 'unit_price', 'amount', 'discount_pct', 'status', ...(at('2025-10') ? [] : ['courier']), 'delivered_on',
    ...(at('2025-10') ? ['warehouse'] : [])];
  const channels = at('2025-03') ? [...CHANNELS, ['App', 11]] : CHANNELS;
  const statuses = at('2025-11') ? STATUSES.filter(([s]) => s !== 'Returned') : STATUSES;

  const rows = [];
  for (let i = 0; i < n; i++) {
    const day = 1 + Math.floor(rand() * daysInMonth);
    const [region, , warehouse] = pick(rand, REGIONS);
    const [channel] = pick(rand, channels);
    const [category, , lo, hi] = pick(rand, CATEGORIES);
    let [quantity] = pick(rand, QUANTITY);
    if (at('2025-12') && rand() < 0.6) quantity = 10 + Math.floor(rand() * 31);
    const price = Math.round(lo + rand() * (hi - lo)) - 0.1;
    const amount = quantity * price;
    const discount = rand() < (at('2025-08') ? 0.35 : 0.03) ? '' : String(pick(rand, DISCOUNT)[0]);
    const [status] = pick(rand, statuses);
    const courier = channel === 'Store' ? 'Collect' : pick(rand, COURIERS)[0];
    const lag = 1 + Math.floor(rand() * 5);
    const delivered = status === 'Delivered'
      ? new Date(Date.UTC(year, mm - 1, day + lag)).toISOString().slice(0, 10) : '';

    const row = {
      order_id: `O${String(firstId + i).padStart(6, '0')}`,
      order_date: at('2025-06') ? `${pad(day)}/${pad(mm)}/${year}` : `${year}-${pad(mm)}-${pad(day)}`,
      region, province: region, channel, category, quantity: String(quantity),
      unit_price: at('2025-09') ? `R ${price.toFixed(2)}` : price.toFixed(2),
      amount: at('2025-07') ? String(Math.round(amount * 100)) : amount.toFixed(2),
      discount_pct: discount, status, courier, delivered_on: delivered, warehouse,
    };
    rows.push(columns.map((c) => row[c]));
  }
  // Rows come out in date order, as an export would give them.
  const date = columns.indexOf('order_date');
  const key = (r) => (at('2025-06') ? r[date].split('/').reverse().join('-') : r[date]);
  rows.sort((a, b) => key(a).localeCompare(key(b)));
  rows.forEach((r, i) => { r[0] = `O${String(firstId + i).padStart(6, '0')}`; });
  return { columns, rows };
}

export function makeYear(options = {}) {
  let firstId = 1;
  return MONTHS.map((month) => {
    const table = makeMonth(month, { ...options, firstId });
    firstId += table.rows.length;
    return { month, file: `orders-${month}.csv`, ...table };
  });
}

if (process.argv[1] && import.meta.filename === process.argv[1]) {
  const dir = new URL('../examples/orders/', import.meta.url);
  mkdirSync(dir, { recursive: true });
  for (const m of makeYear()) {
    writeFileSync(new URL(m.file, dir), toCsv(m.columns, m.rows));
    console.log(`${m.file}: ${m.rows.length} rows`);
  }
}
