import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { parseCsv } from '../src/csv.js';
import { groupSource, nameScore, reconcile, sameValues } from '../src/reconcile.js';
import { toHtml, toMarkdown } from '../src/report.js';

const root = fileURLToPath(new URL('../', import.meta.url));

const A = (rows) => ({ name: 'A', rows });
const B = (rows) => ({ name: 'B', rows });
const run = (a, b, extra = {}) => reconcile({ sources: [A(a), B(b)], key: 'id', compare: [{ field: 'v' }], ...extra });

test('records in both, only in A and only in B', () => {
  const r = run([{ id: '1', v: 'x' }, { id: '2', v: 'y' }], [{ id: '2', v: 'y' }, { id: '3', v: 'z' }]);
  assert.equal(r.entities, 3);
  assert.equal(r.inAll, 1);
  assert.deepEqual(r.onlyIn.map((l) => l.map((o) => o.key)), [['1'], ['3']]);
  assert.equal(r.conflicts.length, 0);
});

test('a conflict keeps both values and picks neither', () => {
  const r = run([{ id: '1', v: 'Kiev' }], [{ id: '1', v: 'Kyiv' }]);
  assert.deepEqual(r.conflicts.map((c) => [c.field, c.kind, c.values.map((v) => [v.source, v.values])]), [
    ['v', 'disagree', [['A', ['Kiev']], ['B', ['Kyiv']]]],
  ]);
});

test('keys are trimmed and case-insensitive', () => {
  assert.equal(run([{ id: ' zaf ', v: 'x' }], [{ id: 'ZAF', v: 'x' }]).inAll, 1);
});

test('exact repeated rows are counted; different rows under one key give it several values', () => {
  const { groups } = groupSource([{ id: '1', v: 'a' }, { id: '1', v: 'a' }, { id: '1', v: 'b' }], 'id');
  assert.equal(groups.get('1').repeats, 1);
  assert.equal(groups.get('1').rows.length, 2);
});

test('one-to-many: an overlap is "partly agree", none is "disagree"', () => {
  const r = run([{ id: 'ZAF', v: 'Pretoria' }, { id: 'X', v: 'a' }],
    [{ id: 'ZAF', v: 'Pretoria' }, { id: 'ZAF', v: 'Cape Town' }, { id: 'ZAF', v: 'Bloemfontein' }, { id: 'X', v: 'b' }, { id: 'X', v: 'c' }]);
  assert.deepEqual(r.conflicts.map((c) => [c.entity, c.kind]), [['X', 'disagree'], ['ZAF', 'partly agree']]);
});

test('numbers agree within a relative tolerance; loose text ignores punctuation', () => {
  assert.equal(sameValues(['1000'], ['1019'], { tolerance: 0.02 }), true);
  assert.equal(sameValues(['1000'], ['1021'], { tolerance: 0.02 }), false);
  assert.equal(sameValues(['Port-of-Spain'], ['Port of Spain']), false);
  assert.equal(sameValues(['Port-of-Spain'], ['Port of Spain'], { loose: true }), true);
  assert.equal(sameValues(['Tirane'], ['Tirana'], { loose: true }), false);
  assert.equal(sameValues(['São Tomé'], ['sao tome']), true);
});

test('a blank on one side is not a conflict', () => {
  assert.equal(run([{ id: '1', v: '' }], [{ id: '1', v: 'x' }]).conflicts.length, 0);
});

test('name scores ignore order, punctuation and filler words', () => {
  assert.equal(nameScore('Egypt, Arab Rep.', 'Egypt'), 1);
  assert.equal(nameScore('Bahamas, The', 'The Bahamas'), 1);
  assert.equal(nameScore('Niger', 'Nigeria'), 0);
});

const fallback = { field: 'name', minScore: 0.6 };
const named = (id, name, v) => ({ id, name, v });

test('the name fallback joins records whose keys differ, and lists them for checking', () => {
  const r = reconcile({ sources: [A([named('XKX', 'Kosovo', '1')]), B([named('XKS', 'Kosovo', '2')])], key: 'id', fallback, compare: [{ field: 'v' }] });
  assert.equal(r.entities, 1);
  assert.deepEqual(r.fuzzy.map((f) => [f.keys, f.score]), [[['XKX', 'XKS'], 1]]);
  assert.equal(r.conflicts[0].how, 'name');
});

test('the fallback never touches records already matched by key, and leaves ties alone', () => {
  const keyed = reconcile({ sources: [A([named('DNK', 'Denmark', '1')]), B([named('DNK', 'Denmark', '1'), named('', 'Kingdom of Denmark', '2')])], key: 'id', fallback, compare: [{ field: 'v' }] });
  assert.equal(keyed.fuzzy.length, 0);
  const tie = reconcile({ sources: [A([named('1', 'Congo', 'a')]), B([named('2', 'Congo', 'b'), named('3', 'Congo', 'c')])], key: 'id', fallback, compare: [{ field: 'v' }] });
  assert.equal(tie.fuzzy.length, 0);
  assert.equal(tie.entities, 3);
});

test('three sources: an entity can be in two of them', () => {
  const r = reconcile({ sources: [A([{ id: '1', v: 'a' }]), B([{ id: '1', v: 'a' }]), { name: 'C', rows: [{ id: '2', v: 'b' }] }], key: 'id', compare: [{ field: 'v' }] });
  assert.equal(r.inAll, 0);
  assert.deepEqual(r.onlyIn.map((l) => l.length), [0, 0, 1]);
});

test('HTML escapes the data it shows', () => {
  const config = { title: 'T', sources: [{ name: 'A' }, { name: 'B' }], compare: [{ field: 'v' }] };
  const html = toHtml(config, run([{ id: '1', v: '<script>x</script>' }], [{ id: '1', v: 'y' }]));
  assert.ok(!html.includes('<script>x'));
  assert.ok(html.includes('&lt;script&gt;x'));
});

test('the countries example: the published figures and reports come out of the committed files', () => {
  const r = spawnSync(process.execPath, ['bin/reconcile.js', 'examples/countries/reconcile.json'], { cwd: root, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout, readFileSync(new URL('../results/countries.md', import.meta.url), 'utf8'));
  assert.match(r.stderr, /^219 entities, 195 in every source, 146 conflicts/);
  const config = JSON.parse(readFileSync(new URL('../examples/countries/reconcile.json', import.meta.url), 'utf8'));
  const load = (f) => parseCsv(readFileSync(new URL(`../examples/countries/${f}`, import.meta.url), 'utf8'));
  const result = reconcile({ sources: config.sources.map((s) => ({ name: s.name, rows: load(s.file) })), key: config.key, fallback: config.fallback, compare: config.compare });
  assert.equal(toHtml(config, result), readFileSync(new URL('../results/countries.html', import.meta.url), 'utf8'));
  assert.equal(toMarkdown(config, result), r.stdout);
  assert.deepEqual(result.fuzzy.map((f) => f.names), [['Denmark', 'Kingdom of Denmark'], ['Kosovo', 'Kosovo']]);
});
