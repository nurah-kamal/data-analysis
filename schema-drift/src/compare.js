// Compares a new snapshot with the last one and lists what changed, by severity.
// The thresholds are set so ordinary month-to-month noise reports nothing; the
// tests check that on many clean months.

export const SEVERITIES = ['high', 'medium', 'low'];

const NUMERIC = new Set(['integer', 'decimal']);
const UNIT_FACTORS = [100, 1000];

const finding = (severity, kind, column, what, before = '', after = '') => ({ severity, kind, column, what, before, after });
const pct = (x) => `${(100 * x).toFixed(1)}%`;
const num = (x) => (Number.isInteger(x) ? String(x) : x.toFixed(2));
const list = (xs) => xs.join(', ');

const nonNull = (snapRows, col) => snapRows - col.nulls;

function jaccard(a, b) {
  const A = new Set(a);
  const B = new Set(b);
  const both = [...A].filter((x) => B.has(x)).length;
  return both / (A.size + B.size - both || 1);
}

const near = (a, b, tolerance) => (a === 0 && b === 0) || (a !== 0 && Math.abs(b / a - 1) <= tolerance);

// How alike a removed column and an added column are, from 0 to 1. Above 0.8
// they are treated as one column under a new name.
export function renameScore(b, a) {
  const numeric = NUMERIC.has(b.type) && NUMERIC.has(a.type);
  if (b.type !== a.type && !numeric) return 0;
  let score = 0;
  if (b.categories && a.categories) score = jaccard(Object.keys(b.categories), Object.keys(a.categories));
  else if (numeric) {
    const [x, y] = [b.numbers, a.numbers];
    score = near(x.median, y.median, 0.1) && near(x.p25, y.p25, 0.15) && near(x.p75, y.p75, 0.15) ? 0.9 : 0;
  } else if (b.formats && a.formats) score = b.formats.some((f) => a.formats.includes(f)) ? 0.85 : 0;
  else if (b.text && a.text && !b.categories && !a.categories) score = b.text.pattern === a.text.pattern ? 0.85 : 0;
  if (Math.abs(b.nullRate - a.nullRate) > 0.05) score *= 0.5;
  return score;
}

function matchRenames(removed, added) {
  const pairs = removed.flatMap((b) => added.map((a) => ({ b, a, score: renameScore(b, a) })))
    .filter((p) => p.score >= 0.8)
    .sort((p, q) => q.score - p.score);
  const used = new Set();
  const out = [];
  for (const p of pairs) {
    if (used.has(p.b) || used.has(p.a)) continue;
    used.add(p.b);
    used.add(p.a);
    out.push(p);
  }
  return out;
}

// Two-proportion z score, so a null rate that moves by chance is not reported.
function nullShift(b, a, rowsB, rowsA) {
  const p = (b.nulls + a.nulls) / (rowsB + rowsA);
  const se = Math.sqrt(p * (1 - p) * (1 / rowsB + 1 / rowsA));
  const diff = a.nullRate - b.nullRate;
  return { diff, z: se ? diff / se : diff ? Infinity : 0 };
}

function compareColumn(b, a, ctx) {
  const out = [];
  const name = a.name === b.name ? a.name : `${b.name} → ${a.name}`;

  if (b.type !== a.type && b.type !== 'empty' && a.type !== 'empty') {
    if (b.type === 'integer' && a.type === 'decimal') {
      out.push(finding('medium', 'type', name, 'Whole numbers now have decimals', b.type, `${a.type}, e.g. ${list(a.examples)}`));
    } else if (!(b.type === 'decimal' && a.type === 'integer')) {
      out.push(finding('high', 'type', name, 'The type changed', `${b.type}, e.g. ${list(b.examples)}`, `${a.type}, e.g. ${list(a.examples)}`));
    }
  }

  if (b.formats && a.formats && !b.formats.some((f) => a.formats.includes(f))) {
    out.push(finding('high', 'date-format', name, 'The date format changed', b.formats.join(' or '), `${a.formats.join(' or ')}, e.g. ${a.examples[0]}`));
  }

  const { diff, z } = nullShift(b, a, ctx.rowsB, ctx.rowsA);
  if (Math.abs(diff) >= 0.02 && Math.abs(z) >= 4) {
    const severity = diff < 0 ? 'low' : diff >= 0.2 ? 'high' : 'medium';
    out.push(finding(severity, 'nulls', name, diff > 0 ? 'More blanks than before' : 'Fewer blanks than before', pct(b.nullRate), pct(a.nullRate)));
  }

  if (b.categories && a.categories) {
    const seen = new Set([...ctx.history(b.name), ...ctx.history(a.name), ...Object.keys(b.categories)]);
    const fresh = Object.keys(a.categories).filter((v) => !seen.has(v));
    if (fresh.length) {
      const shares = fresh.map((v) => `${v} (${pct(a.categories[v] / nonNull(ctx.rowsA, a))})`);
      out.push(finding('low', 'new-value', name, `New value${fresh.length > 1 ? 's' : ''} never seen before`, '', list(shares)));
    }
    // Only report a value as gone when it would almost certainly have appeared:
    // at least 8 rows expected at its old share.
    const gone = Object.entries(b.categories)
      .filter(([v, n]) => !(v in a.categories) && (n / nonNull(ctx.rowsB, b)) * nonNull(ctx.rowsA, a) >= 8)
      .map(([v, n]) => `${v} (was ${pct(n / nonNull(ctx.rowsB, b))})`);
    if (gone.length) out.push(finding('medium', 'vanished-value', name, `Value${gone.length > 1 ? 's' : ''} no longer appearing`, list(gone), ''));
  } else if (b.categories && !a.categories && a.type === b.type) {
    out.push(finding('medium', 'not-a-short-list', name, 'No longer a short list of values', `${b.distinct} values`, `${a.distinct} values`));
  }

  if (b.numbers && a.numbers) {
    const [x, y] = [b.numbers, a.numbers];
    const factor = UNIT_FACTORS.flatMap((f) => [f, 1 / f])
      .find((f) => x.median && near(x.median * f, y.median, 0.2) && near(x.p25 * f, y.p25, 0.25) && near(x.p75 * f, y.p75, 0.25));
    if (factor) {
      const size = factor > 1 ? factor : 1 / factor;
      const money = size === 100 ? (factor > 1 ? ', as if rands became cents' : ', as if cents became rands') : '';
      const how = `${size} times ${factor > 1 ? 'bigger' : 'smaller'}${money}`;
      out.push(finding('high', 'unit', name, `Values look ${how}`, `median ${num(x.median)}`, `median ${num(y.median)}`));
    } else {
      const spread = x.p75 - x.p25 || Math.abs(x.median) * 0.1 || 1;
      if (Math.abs(y.median - x.median) > spread && Math.abs(y.mean - x.mean) > 0.5 * (x.sd || 1)) {
        out.push(finding('medium', 'distribution', name, 'The typical value moved',
          `median ${num(x.median)} (middle half ${num(x.p25)}–${num(x.p75)})`,
          `median ${num(y.median)} (middle half ${num(y.p25)}–${num(y.p75)})`));
      }
    }
  }
  return out;
}

export function compare(before, after, history = []) {
  const ctx = {
    rowsB: before.rows,
    rowsA: after.rows,
    history: (name) => history.flatMap((s) => Object.keys(s.columns.find((c) => c.name === name)?.categories ?? {})),
  };
  const out = [];

  if (after.rows < before.rows / 2 || after.rows > before.rows * 2) {
    out.push(finding('medium', 'rows', '', 'The number of rows changed sharply', String(before.rows), String(after.rows)));
  }

  const names = (s) => s.columns.map((c) => c.name);
  const removed = before.columns.filter((c) => !names(after).includes(c.name));
  const added = after.columns.filter((c) => !names(before).includes(c.name));
  const renames = matchRenames(removed, added);
  const renamed = new Set(renames.flatMap((p) => [p.b, p.a]));

  for (const { b, a } of renames) {
    out.push(finding('high', 'rename', `${b.name} → ${a.name}`, 'Looks renamed: one column went and one arrived with matching values', b.name, a.name));
  }
  for (const c of removed.filter((c) => !renamed.has(c))) out.push(finding('high', 'removed', c.name, 'Column removed', c.type, ''));
  for (const c of added.filter((c) => !renamed.has(c))) out.push(finding('low', 'added', c.name, 'Column added', '', c.type));

  const common = names(before).filter((n) => names(after).includes(n));
  const order = names(after).filter((n) => common.includes(n));
  if (common.join() !== order.join()) out.push(finding('low', 'order', '', 'The columns are in a different order', list(common), list(order)));

  for (const b of before.columns) {
    const a = after.columns.find((c) => c.name === b.name) ?? renames.find((p) => p.b === b)?.a;
    if (a) out.push(...compareColumn(b, a, ctx));
  }

  return out.sort((p, q) => SEVERITIES.indexOf(p.severity) - SEVERITIES.indexOf(q.severity));
}
