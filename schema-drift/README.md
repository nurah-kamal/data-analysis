# schema-drift

[![schema-drift](https://github.com/nurah-kamal/data-analysis/actions/workflows/schema-drift.yml/badge.svg?branch=main&event=push)](https://github.com/nurah-kamal/data-analysis/actions/workflows/schema-drift.yml) 17 tests

**Watches a recurring export and tells you when its shape or meaning changes, before the report built on it goes wrong. Each run stores a snapshot of the file's shape and compares the new file with the last one. On a year of made-up monthly order exports with ten changes planted in named months, it finds every one, and reports nothing in the clean months.**

From [results/demo.md](results/demo.md):

| Month | What was planted | What the check reported |
| --- | --- | --- |
| Feb, Apr | Nothing | No changes found |
| Mar | A mobile app launches, so orders also come in as channel App | low: new value never seen before, App (9.6%) |
| May | `region` renamed `province`, values unchanged | high: looks renamed, region → province |
| Jun | `order_date` switches from 2025-06-14 to 14/06/2025 | high: date format changed, YYYY-MM-DD to DD/MM/YYYY |
| Jul | `amount` sent in cents instead of rands | high: values look 100 times bigger, median 1039.80 to 102515 |
| Aug | A feed fault blanks `discount_pct` on about 35% of rows | high: more blanks, 3.6% to 35.0% |
| Sep | `unit_price` arrives as text, R 129.90 | high: type changed, decimal to text |
| Oct | `courier` dropped and an unrelated `warehouse` added | high: column removed; low: column added. Not called a rename |
| Nov | Returns move to another export, so status Returned stops appearing | medium: value no longer appearing, Returned (was 5.6%). Also low: fewer blanks in `delivered_on`, because returned orders had none |
| Dec | A wholesale buyer joins: most orders are now for 10 to 40 units | medium: typical value moved, quantity median 2 to 14. Also `amount`, which is quantity times price |

## What it shows

| It reports | How it decides | Severity |
| --- | --- | --- |
| **A column removed** | The name is gone and no new column matches it | high |
| **A likely rename** | A column went and one arrived with the same type and matching values: the same short list of values, the same numeric spread, the same date format, or the same text pattern (O004211 is `A999999`) | high |
| **A type change** | Every value is checked against integer, decimal, true/false, date and date-time. Text that used to be numbers is high; whole numbers gaining decimals is medium; decimals that all happen to be whole are left alone | high or medium |
| **A date-format change** | Every format the dates fit is kept. 05/03/2025 with no day above 12 fits two, and that only counts as a change if none of the old formats still fits | high |
| **A change of unit** | Median and both quartiles all about 100 or 1000 times bigger (or smaller): rands to cents, kilograms to grams | high |
| **More or fewer blanks** | A move of at least 2 points that chance would not explain (a two-proportion z score of 4 or more) | high from 20 points, otherwise medium; fewer blanks is low |
| **A value gone from a short list** | Only when at least 8 rows of it were expected at its old share, so a rare value missing one month is left alone | medium |
| **A new value** | Never seen in any earlier snapshot, so a rare value coming back is not new | low |
| **The typical value moved** | The median moves by more than the old middle half's width, and the mean by more than half a standard deviation | medium |
| **A column added, columns reordered, rows halved or doubled** | Compared directly | low, low, medium |

## The part worth copying

- **Noise is tested.** The generator can make a year with nothing planted. The tests make forty such years from forty seeds and check that all 440 month-to-month comparisons report nothing. Lowering the null-rate threshold to zero makes that test fail at once.
- **Planted, then found, and nothing more.** Each planted change is listed in the generator with its month, and a test checks that each month reports exactly the plants plus the two knock-on changes they cause. Breaking the rename matcher or the unit check in a copy makes those tests fail.
- **The tricky cases have their own tests.** A rename that keeps its values, for text, numbers and dates. A removal and an unrelated addition that must not be called a rename. Two columns swapping places, which is an order change. A rare value missing for one month, and coming back later.
- **Every run is kept.** Each one adds a numbered snapshot, so a value seen once in March is still known in October, and any two months can be compared later.
- **It fails a pipeline on purpose.** The command exits with 1 when it finds anything high (or whatever level `--fail-on` names), so a scheduled job can stop before the report is built.

## How it is built

No dependencies. The test runner is built into Node, so there is nothing to install.

| | |
| --- | --- |
| **Reading** | `src/read.js`. CSV with quoted fields and line breaks. JSON as an array of records, or an object holding one array (an API envelope such as `{"data": [...]}`). Nested fields become dotted names (`customer.region`), and a key missing from a record counts as a blank. |
| **Profiling** | `src/shape.js`. Per column: position, type, blanks, number of distinct values, a few examples, the values and counts of a short list (20 or fewer), median, quartiles, mean and spread of numbers, the date formats and range, and the commonest text pattern. |
| **Comparing** | `src/compare.js`. Renames are matched first, by score, each column used once. Then every column is compared with its old self, under its old name or its new one. |
| **History** | `src/history.js`. One JSON file per run, `orders--0001.json` onwards. A monthly file such as `orders-2025-03.csv` keeps one history called `orders`. |
| **Report** | `src/report.js`. Markdown: rows and columns, which snapshot it was compared with, and a table by severity. |
| **Demo** | `scripts/make-demo.js` makes twelve monthly exports from a fixed seed. `scripts/run-demo.js` checks them in order from an empty history and writes [results/demo.md](results/demo.md) and [results/snapshots/](results/snapshots). |
| **Tests** | 17 tests: every plant found and nothing else, forty clean years with no alarms, renames, reorders, units, date formats and ambiguous dates, types, rare and common values, blanks, JSON, CSV, the command line and its exit codes, and the committed demo matching the scripts. |
| **CI** | `.github/workflows/schema-drift.yml` in the repository root runs the checks and tests whenever this folder changes. Actions are pinned to exact commits. |

## Try it on your own machine

Node 22.13 or later. Nothing to install.

```bash
cd schema-drift
npm test
npm run demo        # remakes the twelve exports and results/
```

On your own export, run it each time a new file arrives:

```bash
node schema-drift.js check exports/orders-2026-01.csv --history snapshots/
```

The first run saves a baseline. Each run after that prints a report and adds a snapshot. Options: `--out report.md` to keep the report, `--fail-on medium` to stop on medium or worse (`none` never stops), `--dry-run` to compare without saving, and `--name` to choose the history. `node schema-drift.js profile <file>` prints one file's shape as JSON.

## Things worth knowing

**It compares with the last run.** It tells you what changed; whether the change is right is for a person to say. If a change is intended, the next run takes it as the new normal.

**New values are only checked on short lists.** A column with more than 20 distinct values, such as an ID, is profiled by its pattern and length instead.

**Numbers are compared by their spread.** A single wrong amount won't be reported. A shift in what's typical will.

**Blanks are blank strings and the usual stand-ins:** `null`, `NA`, `N/A`, `None`.

**The demo data is invented.** It is a made-up online hardware shop with no person in it, not even made-up names. An order has an ID, a date, a region, a channel, a category, amounts and a status.

## Folders

```
schema-drift.js          the command line
src/read.js              CSV and JSON reading
src/shape.js             profiling a file into a snapshot
src/compare.js           comparing two snapshots
src/history.js           saving and loading snapshots
src/report.js            the Markdown report
scripts/make-demo.js     makes the twelve monthly exports, with the plants listed
scripts/run-demo.js      checks the year in order and writes results/
scripts/check.js         parse, JSON and doc-link checks
examples/orders/         the twelve exports
results/                 the demo's report and its snapshots
tests/                   17 tests
```

## Licence

MIT, in the [repository root](../LICENSE).
