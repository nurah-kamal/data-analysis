// Matches records across two or more sources and reports where they agree
// and where they don't. It never picks a winner: every conflict keeps every
// source's value.

const STOP = new Set(['the', 'of', 'and', 'rep', 'republic', 'kingdom', 'state', 'states', 'federal', 'democratic', 'peoples', 'islamic', 'arab', 'plurinational', 'bolivarian', 'united']);

export const normKey = (v) => (v == null ? '' : String(v).trim().toUpperCase());
const normText = (v) => String(v ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

export function nameTokens(v) {
  return new Set(normText(v).replace(/[^a-z0-9 ]/g, ' ').split(' ').filter((t) => t && !STOP.has(t)));
}

// Dice similarity of the meaningful words in two names: "Egypt, Arab Rep."
// and "Egypt" both come down to {egypt}.
export function nameScore(a, b) {
  const x = nameTokens(a);
  const y = nameTokens(b);
  if (!x.size || !y.size) return 0;
  let common = 0;
  for (const t of x) if (y.has(t)) common++;
  return (2 * common) / (x.size + y.size);
}

// One group per key in a source. Several rows with one key are kept: rows that
// repeat exactly are counted, rows that differ give the key several values.
export function groupSource(rows, keyField) {
  const groups = new Map();
  const noKey = [];
  for (const row of rows) {
    const k = normKey(row[keyField]);
    if (!k) { noKey.push({ key: null, rows: [row], repeats: 0 }); continue; }
    const g = groups.get(k) ?? { key: k, rows: [], repeats: 0 };
    const sig = JSON.stringify(row);
    if (g.rows.some((r) => JSON.stringify(r) === sig)) g.repeats++;
    else g.rows.push(row);
    groups.set(k, g);
  }
  return { groups, noKey };
}

const isNumber = (v) => v !== '' && v != null && !Number.isNaN(Number(v));

// Two sets of values agree when they hold the same values: the same text
// ignoring case and spacing, or numbers within the relative tolerance. Loose
// text also ignores punctuation, so "Port-of-Spain" is "Port of Spain".
export function sameValues(a, b, { tolerance = 0, loose = false } = {}) {
  if (a.length !== b.length) return false;
  const close = (x, y) => {
    if (isNumber(x) && isNumber(y)) {
      const nx = Number(x);
      const ny = Number(y);
      return nx === ny || Math.abs(nx - ny) <= tolerance * Math.max(Math.abs(nx), Math.abs(ny));
    }
    const text = (v) => (loose ? normText(v).replace(/[^a-z0-9]+/g, ' ').trim() : normText(v));
    return text(x) === text(y);
  };
  return a.every((x) => b.some((y) => close(x, y))) && b.every((y) => a.some((x) => close(x, y)));
}

const distinct = (rows, field) => [...new Set(rows.map((r) => r[field]).filter((v) => v !== '' && v != null))];

export function reconcile({ sources, key, fallback, compare }) {
  const grouped = sources.map((s) => ({ ...s, ...groupSource(s.rows, key) }));

  // Entities by key, with the group each source has for it.
  const entities = new Map();
  grouped.forEach((s, i) => {
    for (const [k, g] of s.groups) {
      const e = entities.get(k) ?? { key: k, groups: new Array(sources.length).fill(null), how: 'key' };
      e.groups[i] = g;
      entities.set(k, e);
    }
  });
  let list = [...entities.values()];
  for (const [i, s] of grouped.entries()) {
    for (const g of s.noKey) {
      const groups = new Array(sources.length).fill(null);
      groups[i] = g;
      list.push({ key: null, groups, how: 'key' });
    }
  }

  // Fallback: an entity only the first source has is paired with one only
  // another source has, when their names are the closest match for each other
  // and above the threshold. Ties are left unmatched rather than guessed.
  const fuzzy = [];
  if (fallback) {
    for (let j = 1; j < sources.length; j++) {
      const anchorOnly = list.filter((e) => e.groups[0] && e.groups.filter(Boolean).length === 1);
      const otherOnly = list.filter((e) => e.groups[j] && e.groups.filter(Boolean).length === 1);
      const name = (e, i) => e.groups[i].rows[0][fallback.field];
      const scores = anchorOnly.flatMap((a) => otherOnly.map((b) => ({ a, b, score: nameScore(name(a, 0), name(b, j)) })))
        .filter((p) => p.score >= fallback.minScore);
      const best = (pick, other) => (x) => {
        const mine = scores.filter((p) => p[pick] === x).sort((p, q) => q.score - p.score);
        return mine.length && (mine.length === 1 || mine[0].score > mine[1].score) ? mine[0][other] : null;
      };
      const bestForA = best('a', 'b');
      const bestForB = best('b', 'a');
      for (const a of anchorOnly) {
        const b = bestForA(a);
        if (b && bestForB(b) === a) {
          const score = scores.find((p) => p.a === a && p.b === b).score;
          a.groups[j] = b.groups[j];
          a.how = 'name';
          fuzzy.push({ keys: [a.key, b.key], names: [name(a, 0), b.groups[j].rows[0][fallback.field]], score, sources: [sources[0].name, sources[j].name] });
          list = list.filter((e) => e !== b);
        }
      }
    }
  }

  // Compare the fields of every entity two or more sources have.
  const conflicts = [];
  for (const e of list) {
    const present = e.groups.map((g, i) => (g ? i : -1)).filter((i) => i >= 0);
    if (present.length < 2) continue;
    for (const c of compare) {
      const values = present.map((i) => ({ source: sources[i].name, values: distinct(e.groups[i].rows, c.field), context: c.context?.[sources[i].name] ? distinct(e.groups[i].rows, c.context[sources[i].name]) : [] }));
      const filled = values.filter((v) => v.values.length);
      if (filled.length < 2) continue;
      const agree = filled.every((v) => sameValues(v.values, filled[0].values, c));
      if (!agree) {
        const overlap = filled.every((v) => v.values.some((x) => filled[0].values.some((y) => sameValues([x], [y], c))));
        conflicts.push({ entity: e.key ?? e.groups[present[0]].rows[0][fallback?.field], how: e.how, field: c.field, kind: overlap ? 'partly agree' : 'disagree', values });
      }
    }
  }

  return {
    sources: sources.map((s, i) => ({
      name: s.name,
      rows: s.rows.length,
      keys: grouped[i].groups.size,
      noKey: grouped[i].noKey.length,
      repeats: [...grouped[i].groups.values()].reduce((n, g) => n + g.repeats, 0),
      manyRows: [...grouped[i].groups.values()].filter((g) => g.rows.length > 1).map((g) => ({ key: g.key, rows: g.rows.length })),
    })),
    entities: list.length,
    inAll: list.filter((e) => e.groups.every(Boolean)).length,
    onlyIn: sources.map((s, i) => list.filter((e) => e.groups[i] && e.groups.filter(Boolean).length === 1)
      .map((e) => ({ key: e.key, name: fallback ? e.groups[i].rows[0][fallback.field] : null })).sort((a, b) => String(a.key ?? a.name).localeCompare(String(b.key ?? b.name)))),
    fuzzy,
    conflicts: conflicts.sort((a, b) => a.field.localeCompare(b.field) || String(a.entity).localeCompare(String(b.entity))),
    agreeing: list.filter((e) => e.groups.filter(Boolean).length > 1).length - new Set(conflicts.map((c) => c.entity)).size,

  };
}
