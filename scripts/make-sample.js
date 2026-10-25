// Makes data/sample/*.csv: two years of orders and stock at a made-up hardware
// wholesaler with three warehouses. Everything is invented and there is no person
// in it, not even a made-up one: customers are an ID, a segment and a region.
// The same seed always gives the same files. The patterns planted here are listed
// in docs/DATA.md, so the analysis can be checked against them.

import { mkdirSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const START = '2024-01-01';
const END = '2025-12-31';
const SEED = 20261025;

// Planted: from 1 March 2025 supplier S04 starts delivering 6 to 12 days late.
const SLIP_SUPPLIER = 'S04';
const SLIP_FROM = '2025-03-01';

// Planted: a Black Friday promotion brings in a wave of one-off bargain hunters.
const PROMO_FROM = '2024-11-25';
const PROMO_TO = '2024-11-30';

// Planted: a paint order often picks up the roller kit too.
const ROLLER = 'Paint roller kit 230 mm';
const NEEDS_ROLLER = /PVA|acrylic|Primer|Roof paint/;

export const COLUMNS = {
  warehouses: ['warehouse_id', 'city', 'region'],
  suppliers: ['supplier_id', 'origin', 'promised_lead_days', 'min_order_qty'],
  products: ['product_id', 'description', 'category', 'supplier_id', 'unit_cost', 'list_price'],
  customers: ['customer_id', 'segment', 'region', 'joined_on'],
  orders: ['order_id', 'customer_id', 'warehouse_id', 'ordered_on'],
  order_lines: ['order_id', 'line_no', 'product_id', 'quantity', 'quantity_shipped', 'unit_price', 'discount_pct'],
  purchase_orders: ['po_id', 'supplier_id', 'warehouse_id', 'product_id', 'quantity', 'ordered_on', 'received_on'],
  opening_stock: ['warehouse_id', 'product_id', 'as_of', 'quantity'],
};

const WAREHOUSES = [
  { warehouse_id: 'W1', city: 'Cape Town', region: 'Western Cape', weight: 40 },
  { warehouse_id: 'W2', city: 'Johannesburg', region: 'Gauteng', weight: 35 },
  { warehouse_id: 'W3', city: 'Durban', region: 'KwaZulu-Natal', weight: 25 },
];

const SUPPLIERS = [
  { supplier_id: 'S01', origin: 'Local', promised_lead_days: 7, min_order_qty: 40 },
  { supplier_id: 'S02', origin: 'Local', promised_lead_days: 10, min_order_qty: 10 },
  { supplier_id: 'S03', origin: 'Local', promised_lead_days: 14, min_order_qty: 12 },
  { supplier_id: 'S04', origin: 'Local', promised_lead_days: 7, min_order_qty: 20 },
  { supplier_id: 'S05', origin: 'Imported', promised_lead_days: 21, min_order_qty: 24 },
  { supplier_id: 'S06', origin: 'Local', promised_lead_days: 10, min_order_qty: 20 },
];

// Each category's first four products come from one supplier, the last four from
// another, so a supplier problem cuts across categories.
const CATEGORIES = [
  {
    name: 'Fasteners', suppliers: ['S01', 'S04'], price: [40, 180], margin: 0.45,
    items: ['Wood screws 4x40 (box of 200)', 'Drywall screws 3.5x35 (box of 500)', 'Coach bolts M10x100 (pack of 10)',
      'Wall plugs 6 mm (pack of 100)', 'Hex nuts M8 (pack of 100)', 'Washers M10 (pack of 100)', 'Wire nails 75 mm (1 kg)',
      'Pop rivets 4 mm (pack of 50)'],
  },
  {
    name: 'Hand tools', suppliers: ['S02', 'S01'], price: [120, 450], margin: 0.38,
    items: ['Claw hammer 450 g', 'Tape measure 8 m', 'Spirit level 600 mm', 'Screwdriver set (6 piece)', 'Utility knife',
      'Hacksaw 300 mm', 'Adjustable spanner 250 mm', 'Pliers set (3 piece)'],
  },
  {
    name: 'Power tools', suppliers: ['S05', 'S05'], price: [900, 3200], margin: 0.24,
    items: ['Cordless drill 18 V', 'Angle grinder 115 mm', 'Jigsaw 650 W', 'Orbital sander', 'Impact driver 18 V',
      'Circular saw 1400 W', 'Battery pack 18 V 4 Ah', 'Drill bit set (19 piece)'],
  },
  {
    name: 'Paint', suppliers: ['S03', 'S06'], price: [150, 1400], margin: 0.32,
    items: ['Interior PVA white 20 L', 'Interior PVA white 5 L', 'Exterior acrylic 20 L', 'Primer 5 L', 'Enamel gloss 1 L',
      'Wood varnish 1 L', 'Roof paint 20 L', ROLLER],
  },
  {
    name: 'Plumbing', suppliers: ['S04', 'S02'], price: [60, 900], margin: 0.35,
    items: ['PVC pipe 50 mm x 6 m', 'Ball valve 15 mm', 'Copper elbow 15 mm (pack of 10)', 'Basin mixer tap',
      'Toilet cistern kit', 'Thread seal tape (pack of 10)', 'Flexible hose 300 mm', 'Pipe clamp 50 mm (pack of 10)'],
  },
  {
    name: 'Electrical', suppliers: ['S06', 'S03'], price: [40, 1800], margin: 0.30,
    items: ['Extension lead 5 m', 'LED bulb 9 W (pack of 4)', 'Twin and earth cable 2.5 mm x 100 m', 'Double wall socket',
      'Light switch 1 lever', 'Circuit breaker 20 A', 'Insulation tape (pack of 10)', 'Distribution board 12 way'],
  },
];

// rate is orders per 30 days for a typical customer in the segment.
const SEGMENTS = [
  { name: 'Retail store', weight: 25, rate: 3.2, lines: [2, 7], qty: [4, 30], discount: 10,
    affinity: { Paint: 1.5, Electrical: 1.5 } },
  { name: 'Contractor', weight: 35, rate: 1.8, lines: [1, 5], qty: [1, 12], discount: 5,
    affinity: { 'Power tools': 2, Fasteners: 2, Plumbing: 1.5 } },
  { name: 'Online', weight: 40, rate: 0.8, lines: [1, 3], qty: [1, 3], discount: 0,
    affinity: { 'Hand tools': 1.6, 'Power tools': 1.3 } },
];

const DOW_FACTOR = [0.25, 1, 1, 1, 1, 1, 0.6];
const MONTH_FACTOR = [0.9, 1, 1, 1, 0.95, 0.9, 0.9, 1, 1.15, 1.15, 1.05, 0.8];
const EXISTING_CUSTOMERS = 220;
const NEW_PER_DAY = 0.6;
const PROMO_NEW_PER_DAY = 35;
const MONTHLY_CHURN = 0.022;

function mulberry32(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function poisson(rand, mean) {
  const limit = Math.exp(-mean);
  let k = 0;
  for (let p = rand(); p > limit; p *= rand()) k += 1;
  return k;
}

function pick(rand, items, weight = (x) => x.weight) {
  const total = items.reduce((s, x) => s + weight(x), 0);
  let r = rand() * total;
  for (const x of items) {
    r -= weight(x);
    if (r < 0) return x;
  }
  return items.at(-1);
}

const between = (rand, [lo, hi]) => lo + Math.floor(rand() * (hi - lo + 1));
const money = (x) => Math.round(x * 100) / 100;

function addDays(day, n) {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const weekday = (day) => new Date(`${day}T00:00:00Z`).getUTCDay();

function makeProducts(rand) {
  const products = [];
  for (const c of CATEGORIES) {
    c.items.forEach((description, i) => {
      const list = Math.round(c.price[0] + rand() * (c.price[1] - c.price[0])) - 0.1;
      const margin = c.margin - 0.04 + rand() * 0.08;
      products.push({
        product_id: `P${String(products.length + 1).padStart(2, '0')}`,
        description,
        category: c.name,
        supplier_id: c.suppliers[i < 4 ? 0 : 1],
        unit_cost: money(list * (1 - margin)),
        list_price: money(list),
      });
    });
  }
  // A few products sell far more than the rest, as they do in any catalogue.
  const order = products.map((p) => ({ p, k: rand() })).sort((a, b) => a.k - b.k);
  order.forEach(({ p }, rank) => {
    p.popularity = 1 / (rank + 1) ** 0.9;
    if (p.description === ROLLER) p.popularity *= 0.3;
  });
  return products;
}

export function makeSample(seed = SEED) {
  const rand = mulberry32(seed); // demand: customers and what they order
  const supplyRand = mulberry32(seed + 1); // supplier lead times
  const products = makeProducts(mulberry32(seed + 2));
  const days = [];
  for (let d = START; d <= END; d = addDays(d, 1)) days.push(d);

  // Customers already trading before the period starts.
  const customers = [];
  const newCustomer = (joined_on, bargain = false) => {
    const segment = bargain && rand() < 0.7 ? SEGMENTS[2] : pick(rand, SEGMENTS);
    const region = pick(rand, WAREHOUSES);
    return {
      segment, region, joined_on, bargain,
      rate: bargain ? 0.04 : segment.rate * (0.5 + rand()),
      firstOn: null, started: false, churned: false,
    };
  };
  for (let i = 0; i < EXISTING_CUSTOMERS; i++) {
    const c = newCustomer(addDays('2022-01-01', Math.floor(rand() * 730)));
    c.started = true;
    customers.push(c);
  }
  customers.sort((a, b) => a.joined_on.localeCompare(b.joined_on));

  const orders = [];
  const lines = [];
  const placeOrder = (c, day, dayIndex) => {
    const seg = c.segment;
    const order_id = `O${String(orders.length + 1).padStart(6, '0')}`;
    orders.push({ order_id, customer: c, warehouse_id: c.region.warehouse_id, ordered_on: day });
    const promo = day >= PROMO_FROM && day <= PROMO_TO;
    const discount = seg.discount + (promo ? 15 : 0);
    const chosen = [];
    const n = between(rand, seg.lines);
    while (chosen.length < n) {
      const pool = products.filter((p) => !chosen.includes(p));
      chosen.push(pick(rand, pool, (p) => p.popularity * (seg.affinity[p.category] ?? 1)));
    }
    const roller = products.find((p) => p.description === ROLLER);
    if (!chosen.includes(roller) && chosen.some((p) => NEEDS_ROLLER.test(p.description)) && rand() < 0.45) {
      chosen.push(roller);
    }
    chosen.forEach((p, i) => {
      let quantity = between(rand, seg.qty);
      if (p.category === 'Power tools' && seg.name !== 'Online') quantity = Math.ceil(quantity / 5);
      lines.push({
        order_id, line_no: i + 1, product_id: p.product_id, quantity, quantity_shipped: 0,
        unit_price: money(p.list_price * (1 - discount / 100)), discount_pct: discount,
        dayIndex, warehouse_id: c.region.warehouse_id,
      });
    });
  };

  days.forEach((day, dayIndex) => {
    const promo = day >= PROMO_FROM && day <= PROMO_TO;
    for (let k = poisson(rand, NEW_PER_DAY); k > 0; k--) {
      const c = newCustomer(day);
      c.firstOn = addDays(day, Math.floor(rand() * 10));
      customers.push(c);
    }
    if (promo) {
      for (let k = poisson(rand, PROMO_NEW_PER_DAY); k > 0; k--) {
        const c = newCustomer(day, rand() < 0.85);
        c.firstOn = day;
        customers.push(c);
      }
    }
    const factor = DOW_FACTOR[weekday(day)] * MONTH_FACTOR[+day.slice(5, 7) - 1];
    for (const c of customers) {
      if (c.churned || c.joined_on > day) continue;
      if (!c.started) {
        if (c.firstOn === day) {
          c.started = true;
          placeOrder(c, day, dayIndex);
        }
        continue;
      }
      if (rand() < MONTHLY_CHURN / 30) {
        c.churned = true;
        continue;
      }
      if (rand() < (c.rate / 30) * factor) placeOrder(c, day, dayIndex);
    }
  });

  customers.forEach((c, i) => { c.customer_id = `C${String(i + 1).padStart(4, '0')}`; });

  // Stock. Each warehouse resets every product's reorder point at the start of
  // each month from the last 90 days of demand (enough for the promised lead time
  // plus five days, and the largest single line seen as a buffer), and orders when
  // stock plus what is already on order falls to it. Demand was drawn above with its own random
  // stream, so running out never changes what customers asked for.
  const keys = WAREHOUSES.flatMap((w) => products.map((p) => `${w.warehouse_id}|${p.product_id}`));
  const demand = new Map(keys.map((k) => [k, new Float64Array(days.length)]));
  const biggestLine = new Map(keys.map((k) => [k, new Float64Array(days.length)]));
  const linesByDay = days.map(() => []);
  for (const l of lines) {
    const k = `${l.warehouse_id}|${l.product_id}`;
    demand.get(k)[l.dayIndex] += l.quantity;
    biggestLine.get(k)[l.dayIndex] = Math.max(biggestLine.get(k)[l.dayIndex], l.quantity);
    linesByDay[l.dayIndex].push(l);
  }
  const supplierOf = new Map(products.map((p) => [p.product_id, SUPPLIERS.find((s) => s.supplier_id === p.supplier_id)]));
  const plan = new Map();
  const replan = (dayIndex) => {
    const from = Math.max(0, dayIndex - 90);
    for (const k of keys) {
      const perDay = demand.get(k).slice(from, from + 90).reduce((s, x) => s + x, 0) / 90;
      const buffer = Math.max(...biggestLine.get(k).slice(from, from + 90));
      const s = supplierOf.get(k.split('|')[1]);
      plan.set(k, {
        perDay,
        reorderAt: Math.ceil(perDay * (s.promised_lead_days + 5) + buffer),
        orderQty: Math.max(Math.ceil(perDay * 28), s.min_order_qty),
      });
    }
  };

  replan(0);
  const stock = new Map();
  const onOrder = new Map(keys.map((k) => [k, 0]));
  const opening_stock = keys.map((k) => {
    const { reorderAt, orderQty } = plan.get(k);
    const quantity = reorderAt + Math.ceil(orderQty / 2);
    stock.set(k, quantity);
    const [warehouse_id, product_id] = k.split('|');
    return { warehouse_id, product_id, as_of: START, quantity };
  });

  const purchase_orders = [];
  const arriving = days.map(() => []);
  days.forEach((day, dayIndex) => {
    if (day.endsWith('-01')) replan(dayIndex);
    for (const po of arriving[dayIndex]) {
      const k = `${po.warehouse_id}|${po.product_id}`;
      stock.set(k, stock.get(k) + po.quantity);
      onOrder.set(k, onOrder.get(k) - po.quantity);
    }
    for (const l of linesByDay[dayIndex]) {
      const k = `${l.warehouse_id}|${l.product_id}`;
      l.quantity_shipped = Math.min(l.quantity, stock.get(k));
      stock.set(k, stock.get(k) - l.quantity_shipped);
    }
    for (const k of keys) {
      const p = plan.get(k);
      if (p.perDay === 0 || stock.get(k) + onOrder.get(k) > p.reorderAt) continue;
      const [warehouse_id, product_id] = k.split('|');
      const s = supplierOf.get(product_id);
      // Usually on time or early; now and then a few days late.
      let lead = s.promised_lead_days - 3 + Math.floor(supplyRand() * 4);
      if (supplyRand() < 0.08) lead += 3 + Math.floor(supplyRand() * 4);
      if (s.supplier_id === SLIP_SUPPLIER && day >= SLIP_FROM) lead += 6 + Math.floor(supplyRand() * 7);
      const arrives = dayIndex + lead;
      const po = {
        po_id: `PO${String(purchase_orders.length + 1).padStart(5, '0')}`,
        supplier_id: s.supplier_id, warehouse_id, product_id, quantity: p.orderQty,
        ordered_on: day, received_on: arrives < days.length ? days[arrives] : '',
      };
      purchase_orders.push(po);
      onOrder.set(k, onOrder.get(k) + p.orderQty);
      if (arrives < days.length) arriving[arrives].push(po);
    }
  });

  return {
    warehouses: WAREHOUSES,
    suppliers: SUPPLIERS,
    products,
    customers: customers.map((c) => ({
      customer_id: c.customer_id, segment: c.segment.name, region: c.region.region, joined_on: c.joined_on,
    })),
    orders: orders.map((o) => ({ ...o, customer_id: o.customer.customer_id })),
    order_lines: lines,
    purchase_orders,
    opening_stock,
    closingStock: Object.fromEntries(stock),
  };
}

export function toCsv(table, rows) {
  const cols = COLUMNS[table];
  const cell = (v) => {
    const s = String(v ?? '');
    if (/[,"\n]/.test(s)) throw new Error(`${table}: "${s}" would need quoting`);
    return s;
  };
  return [cols.join(','), ...rows.map((r) => cols.map((c) => cell(r[c])).join(','))].join('\n') + '\n';
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const sample = makeSample();
  const dir = new URL('../data/sample/', import.meta.url);
  mkdirSync(dir, { recursive: true });
  for (const table of Object.keys(COLUMNS)) {
    writeFileSync(new URL(`${table}.csv`, dir), toCsv(table, sample[table]));
    console.log(`${table}: ${sample[table].length} rows`);
  }
}
