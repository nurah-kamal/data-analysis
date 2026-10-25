// Runs one question and prints its result: npm run ask 07
// With no number, lists the questions.

import { openDatabase, questions } from './db.js';

const wanted = process.argv[2];
const all = questions();
const q = wanted && all.find((x) => x.file.startsWith(wanted.padStart(2, '0')) || x.key === wanted);

if (!q) {
  for (const x of all) console.log(`${x.file.slice(0, 2)}  ${x.question}`);
  process.exit(wanted ? 1 : 0);
}

console.log(`${q.question}\n`);
console.table(openDatabase().prepare(q.sql).all());
