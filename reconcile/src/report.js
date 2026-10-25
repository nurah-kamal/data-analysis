// The same findings as Markdown or as one self-contained HTML page.

const fmt = (v) => (/^-?\d{4,}$/.test(String(v)) ? Number(v).toLocaleString('en-ZA') : String(v));
const valuesText = (v) => (v.values.length ? v.values.map(fmt).join(' / ') : '(blank)') + (v.context.length ? ` (${v.context.join(', ')})` : '');

function model(config, r) {
  const names = config.sources.map((s) => s.name);
  const fields = config.compare.map((c) => c.field);
  return {
    title: config.title,
    summary: [
      ['Source', 'Rows', 'Keys', 'Rows with no key', 'Exact repeats', 'Keys with several different rows'],
      ...r.sources.map((s) => [s.name, s.rows, s.keys, s.noKey, s.repeats, s.manyRows.length ? s.manyRows.map((m) => `${m.key} (${m.rows})`).join(', ') : 'none']),
    ],
    counts: [
      `${r.entities} entities across ${names.length} sources: ${r.inAll} in every source, ${r.onlyIn.map((o, i) => `${o.length} only in ${names[i]}`).join(', ')}.`,
      `${r.agreeing} of the entities in more than one source agree on every compared field. The rest disagree on at least one.`,
      `Conflicts by field: ${fields.map((f) => `${f} ${r.conflicts.filter((c) => c.field === f).length}`).join(', ')}.`,
    ],
    fuzzy: [['Matched by name, not key', ...r.fuzzy[0]?.sources ?? names.slice(0, 2), 'Score'], ...r.fuzzy.map((f) => [`${f.keys[0] ?? '(no key)'} and ${f.keys[1] ?? '(no key)'}`, f.names[0], f.names[1], f.score.toFixed(2)])],
    conflicts: fields.map((f) => ({
      field: f,
      rows: [['Key', 'How they differ', ...names], ...r.conflicts.filter((c) => c.field === f).map((c) => [
        `${c.entity}${c.how === 'name' ? ' (name match)' : ''}`, c.kind,
        ...names.map((n) => { const v = c.values.find((x) => x.source === n); return v ? valuesText(v) : '(not in this source)'; }),
      ])],
    })),
    only: r.onlyIn.map((list, i) => ({ source: names[i], items: list.map((o) => (o.key ? `${o.key} ${o.name ?? ''}`.trim() : o.name)) })),
  };
}

const mdCell = (s) => String(s).replace(/\|/g, '\\|');
const mdTable = (rows) => [rows[0], rows[0].map(() => '---'), ...rows.slice(1)].map((r) => `| ${r.map(mdCell).join(' | ')} |`);

export function toMarkdown(config, r) {
  const m = model(config, r);
  const out = [`# ${m.title}`, '', ...m.counts.flatMap((c) => [c, '']), '## The sources', '', ...mdTable(m.summary), ''];
  if (m.fuzzy.length > 1) out.push('## Matched by name, to check by hand', '', 'These had no key in common. Their names were the closest match for each other, so their fields are compared, but a person should confirm they are the same thing.', '', ...mdTable(m.fuzzy), '');
  for (const c of m.conflicts) {
    out.push(`## Where they disagree: ${c.field}`, '');
    out.push(...(c.rows.length > 1 ? mdTable(c.rows) : ['No conflicts.']), '');
  }
  for (const o of m.only) out.push(`## Only in ${o.source} (${o.items.length})`, '', o.items.length ? o.items.join(', ') : 'None.', '');
  return out.join('\n');
}

const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
const htmlTable = (rows) => `<table><thead><tr>${rows[0].map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.slice(1).map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;

export function toHtml(config, r) {
  const m = model(config, r);
  const parts = [`<h1>${esc(m.title)}</h1>`, ...m.counts.map((c) => `<p>${esc(c)}</p>`), '<h2>The sources</h2>', htmlTable(m.summary)];
  if (m.fuzzy.length > 1) parts.push('<h2>Matched by name, to check by hand</h2>', '<p>These had no key in common. Their names were the closest match for each other, so their fields are compared, but a person should confirm they are the same thing.</p>', htmlTable(m.fuzzy));
  for (const c of m.conflicts) parts.push(`<h2>Where they disagree: ${esc(c.field)}</h2>`, c.rows.length > 1 ? htmlTable(c.rows) : '<p>No conflicts.</p>');
  for (const o of m.only) parts.push(`<h2>Only in ${esc(o.source)} (${o.items.length})</h2>`, `<p>${o.items.length ? o.items.map(esc).join(', ') : 'None.'}</p>`);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(m.title)}</title>
<style>
  :root { color-scheme: light dark; --ink: #1d1d1f; --muted: #5f6368; --line: #d9d9de; --bg: #ffffff; --head: #f4f4f6; }
  @media (prefers-color-scheme: dark) { :root { --ink: #ececf1; --muted: #a3a3ad; --line: #3a3a42; --bg: #18181b; --head: #232328; } }
  body { margin: 0 auto; max-width: 72rem; padding: 2rem 1rem 4rem; font: 15px/1.5 system-ui, sans-serif; color: var(--ink); background: var(--bg); }
  h1 { font-size: 1.6rem; margin: 0 0 1rem; } h2 { font-size: 1.15rem; margin: 2rem 0 .5rem; }
  p { max-width: 65ch; color: var(--muted); }
  table { border-collapse: collapse; width: 100%; display: block; overflow-x: auto; font-variant-numeric: tabular-nums; }
  th, td { text-align: left; padding: .35rem .6rem; border-bottom: 1px solid var(--line); vertical-align: top; }
  th { background: var(--head); font-weight: 600; white-space: nowrap; }
</style>
</head>
<body>
${parts.join('\n')}
</body>
</html>
`;
}
