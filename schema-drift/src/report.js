// Writes a check as Markdown.

export const count = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const cell = (v) => String(v ?? '').replaceAll('|', '\\|').replace(/\r?\n/g, ' ');

export function summary(findings) {
  if (!findings.length) return 'no changes';
  const counts = ['high', 'medium', 'low'].map((s) => [s, findings.filter((f) => f.severity === s).length]).filter(([, n]) => n);
  return counts.map(([s, n]) => `${n} ${s}`).join(', ');
}

export function toMarkdown({ snapshot, before, findings }) {
  const title = snapshot.source ?? snapshot.name;
  const lines = [`## ${title}`, ''];
  const size = `${count(snapshot.rows)} rows, ${snapshot.columns.length} columns.`;
  if (!before) {
    lines.push(`${size} No earlier snapshot, so this one is the baseline for the next run.`);
    return lines.join('\n') + '\n';
  }
  lines.push(`${size} Compared with the snapshot of ${before.source ?? before.name} (${before.asOf}).`, '');
  if (!findings.length) {
    lines.push('No changes found.');
    return lines.join('\n') + '\n';
  }
  lines.push(`**${summary(findings)}**`, '', '| Severity | Column | What changed | Before | After |', '| --- | --- | --- | --- | --- |');
  for (const f of findings) lines.push(`| ${f.severity} | ${cell(f.column)} | ${cell(f.what)} | ${cell(f.before)} | ${cell(f.after)} |`);
  return lines.join('\n') + '\n';
}
