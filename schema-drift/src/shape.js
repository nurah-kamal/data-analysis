// Profiles a table into a snapshot of its shape: per column, the inferred type,
// the null rate, the values of a short list, numeric spread and date format.

const NULLS = new Set(['', 'null', 'NULL', 'Null', 'NA', 'N/A', 'n/a', 'None', 'none']);
const SHORT_LIST = 20;
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

const isNull = (v) => v === null || NULLS.has(v.trim());

// A number with a leading zero (007, 0821) is a code, not a quantity.
const INTEGER = /^-?(0|[1-9]\d*)$/;
const DECIMAL = /^-?(0|[1-9]\d*)?\.\d+$|^-?(0|[1-9]\d*)\.$/;
const BOOLEAN = /^(true|false|yes|no)$/i;

const validDay = (y, m, d) => m >= 1 && m <= 12 && d >= 1 && d <= new Date(Date.UTC(y, m, 0)).getUTCDate();

// Each format turns a value into [y, m, d], or null if it doesn't fit.
export const DATE_FORMATS = {
  'YYYY-MM-DD': (v) => v.match(/^(\d{4})-(\d{2})-(\d{2})$/)?.slice(1, 4).map(Number),
  'YYYY-MM-DD hh:mm': (v) => v.match(/^(\d{4})-(\d{2})-(\d{2})[T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/)?.slice(1, 4).map(Number),
  'YYYY/MM/DD': (v) => v.match(/^(\d{4})\/(\d{2})\/(\d{2})$/)?.slice(1, 4).map(Number),
  'DD/MM/YYYY': (v) => { const m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); return m && [+m[3], +m[2], +m[1]]; },
  'MM/DD/YYYY': (v) => { const m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); return m && [+m[3], +m[1], +m[2]]; },
  'DD-MM-YYYY': (v) => { const m = v.match(/^(\d{2})-(\d{2})-(\d{4})$/); return m && [+m[3], +m[2], +m[1]]; },
  'D Mon YYYY': (v) => {
    const m = v.match(/^(\d{1,2}) ([A-Za-z]{3})[a-z]* (\d{4})$/);
    return m && MONTHS.includes(m[2].toLowerCase()) ? [+m[3], MONTHS.indexOf(m[2].toLowerCase()) + 1, +m[1]] : null;
  },
};

const iso = ([y, m, d]) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

// Every format all the values fit. A column of 03/04/2025-style dates with no
// day above 12 fits two formats, and both are kept.
function dateFormats(values) {
  return Object.entries(DATE_FORMATS)
    .filter(([, parse]) => values.every((v) => { const p = parse(v); return p && validDay(...p); }))
    .map(([name]) => name);
}

function inferType(values) {
  if (!values.length) return { type: 'empty' };
  if (values.every((v) => BOOLEAN.test(v))) return { type: 'boolean' };
  if (values.every((v) => INTEGER.test(v))) return { type: 'integer' };
  if (values.every((v) => INTEGER.test(v) || DECIMAL.test(v))) return { type: 'decimal' };
  const formats = dateFormats(values);
  if (formats.length) return { type: formats.includes('YYYY-MM-DD hh:mm') ? 'datetime' : 'date', formats };
  return { type: 'text' };
}

function quantile(sorted, q) {
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  return sorted[lo] + (sorted[Math.ceil(pos)] - sorted[lo]) * (pos - lo);
}

const round = (x) => Math.round(x * 10000) / 10000;

function numbers(values) {
  const xs = values.map(Number).sort((a, b) => a - b);
  const mean = xs.reduce((s, x) => s + x, 0) / xs.length;
  const sd = Math.sqrt(xs.reduce((s, x) => s + (x - mean) ** 2, 0) / xs.length);
  return {
    min: xs[0], p25: round(quantile(xs, 0.25)), median: round(quantile(xs, 0.5)),
    p75: round(quantile(xs, 0.75)), max: xs.at(-1), mean: round(mean), sd: round(sd),
  };
}

// The shape of a value: digits become 9 and letters A, so O004211 is A999999.
const pattern = (v) => v.replace(/[0-9]/g, '9').replace(/[A-Za-z]/g, 'A');

function mostCommon(items) {
  const counts = new Map();
  for (const x of items) counts.set(x, (counts.get(x) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1])[0];
}

export function profileColumn(name, position, raw) {
  const values = raw.filter((v) => !isNull(v)).map((v) => v.trim());
  const nulls = raw.length - values.length;
  const distinct = new Set(values);
  const col = {
    name,
    position,
    ...inferType(values),
    nulls,
    nullRate: raw.length ? round(nulls / raw.length) : 0,
    distinct: distinct.size,
    examples: [...distinct].slice(0, 3),
  };
  if (col.type === 'integer' || col.type === 'decimal') col.numbers = numbers(values);
  if (col.formats) {
    const days = values.map((v) => iso(DATE_FORMATS[col.formats[0]](v))).sort();
    col.dates = { min: days[0], max: days.at(-1) };
  }
  if ((col.type === 'text' || col.type === 'boolean') && distinct.size <= SHORT_LIST) {
    col.categories = Object.fromEntries([...distinct].sort().map((v) => [v, values.filter((x) => x === v).length]));
  }
  if (col.type === 'text' && values.length) {
    const [common, count] = mostCommon(values.map(pattern));
    col.text = {
      pattern: common,
      patternShare: round(count / values.length),
      minLength: Math.min(...values.map((v) => v.length)),
      maxLength: Math.max(...values.map((v) => v.length)),
    };
  }
  return col;
}

export function profile({ columns, rows }, { name = 'export', asOf = new Date().toISOString(), source = null } = {}) {
  return {
    tool: 'schema-drift',
    version: 1,
    name,
    asOf,
    source,
    rows: rows.length,
    columns: columns.map((c, i) => profileColumn(c, i, rows.map((r) => r[i]))),
  };
}
