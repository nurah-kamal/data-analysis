# Stock and Orders

[![sql-ops](https://github.com/nurah-kamal/data-analysis/actions/workflows/sql-ops.yml/badge.svg?branch=main&event=push)](https://github.com/nurah-kamal/data-analysis/actions/workflows/sql-ops.yml) 13 tests

**Thirteen business questions about a made-up wholesaler's orders and stock, each answered in one plain SQL file. The tests check the answers, including three patterns planted in the data on purpose and then found.**

The headline finding, from [06_fill_rate_by_supplier.sql](sql/questions/06_fill_rate_by_supplier.sql) and [05_supplier_lead_times.sql](sql/questions/05_supplier_lead_times.sql): one supplier started delivering late in March 2025, and by the second half of the year customers were going without about one in six of the units they ordered from its range.

| Supplier S04, by quarter | 2024 Q4 | 2025 Q1 | 2025 Q2 | 2025 Q3 | 2025 Q4 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Average lead time (promised: 7 days) | 6.0 | 9.6 | 15.3 | 15.0 | 15.5 |
| Deliveries later than promised | 12% | 44% | 100% | 100% | 100% |
| Units ordered that could be shipped | 99.2% | 97.2% | 93.9% | 82.5% | 84.9% |
| Revenue lost to stock that was not there | R23k | R57k | R86k | R420k | R411k |

Every other supplier shipped more than 96.5% of what was ordered in every quarter of 2025. Every result is in [docs/ANSWERS.md](docs/ANSWERS.md), which the tests keep up to date.

## What it shows

| Question | File | What the SQL uses |
| --- | --- | --- |
| How did each year go: orders, revenue, margin, fill rate? | [01_headline](sql/questions/01_headline.sql) | Aggregates over a joined view |
| Month on month and year on year, and the year to date | [02_monthly_revenue](sql/questions/02_monthly_revenue.sql) | `LAG`, a named `WINDOW`, a running `SUM` |
| Which products make 80% of revenue (ABC classes)? | [03_product_pareto](sql/questions/03_product_pareto.sql) | `RANK`, running share with a frame |
| Which categories make the money after cost and discounts? | [04_category_margin](sql/questions/04_category_margin.sql) | A window over an aggregate |
| Do suppliers deliver in the time they promise? | [05_supplier_lead_times](sql/questions/05_supplier_lead_times.sql) | CTE, date arithmetic, join |
| How much of what is ordered actually ships? | [06_fill_rate_by_supplier](sql/questions/06_fill_rate_by_supplier.sql) | Grouped ratios |
| Which products ran out most often, and who supplies them? | [07_worst_stockouts](sql/questions/07_worst_stockouts.sql) | `FILTER`, join to suppliers |
| What is about to run out, warehouse by warehouse? | [08_low_cover](sql/questions/08_low_cover.sql) | Stock rebuilt from movements, correlated subquery |
| Where is cash tied up in slow stock? | [09_slow_stock](sql/questions/09_slow_stock.sql) | `LEFT JOIN` to keep items with no sales |
| Do new customers come back within 90 days? | [10_customer_cohorts](sql/questions/10_customer_cohorts.sql) | `ROW_NUMBER` and `LEAD` per customer |
| How long between one order and the next, by segment? | [11_reorder_gap](sql/questions/11_reorder_gap.sql) | `LAG`, median and 90th percentile by ranking |
| Which products are bought together more than chance? | [12_basket_lift](sql/questions/12_basket_lift.sql) | Self-join, support and lift |
| How much revenue comes from the biggest customers? | [13_revenue_concentration](sql/questions/13_revenue_concentration.sql) | `NTILE(10)`, running share |

What came out, on the synthetic data:

- **Revenue** was R115.6 million in 2024 and R169.9 million in 2025, at a 23% gross margin. 14 of the 48 products made 80% of 2025 revenue.
- **The S04 slip** above cost about R974,000 in lost sales in 2025, against R76,000 in 2024. It cuts across two categories, fasteners and plumbing, so it only shows once products are joined to their supplier.
- **The Black Friday promotion** brought in 235 new customers in November 2024. 18.7% of them ordered again within 90 days. In every other month it was between 77% and 100%.
- **Paint sells the roller kit.** About 45% of orders with wall, roof or primer paint include the roller kit, a lift of 3.5 to 3.9. No other pair that shares at least 30 orders gets above 1.7.
- **The top tenth of customers** brought in 52.6% of 2025 revenue, and every one of them is a retail store.
- **Most of the slow stock by value is imported power tools.** The supplier's minimum order of 24 units is a month or more of sales for most power tools at a single warehouse.

## The part worth copying

- **Every question is one file, and the file says what it asks.** The comment at the top of each `.sql` file is the question. A test fails if a file has no question in it.
- **Two independent answers are made to agree.** The generator tracks stock day by day in JavaScript. SQL rebuilds it from opening stock, deliveries and shipments. The tests compare the two for all 144 products in all three warehouses, and check that a running ledger in SQL never goes below zero.
- **Planted, then found.** The generator plants three things: a supplier that starts delivering late, a promotion that brings in customers who don't come back, and a product pair bought together. The tests check that the SQL finds each one, and that no other supplier, month or pair looks the same. Switch the plants off and those four tests fail, while the other nine still pass.
- **Not everything is planted.** The slow stock comes from the supplier's minimum order quantity and is not planted. The write-up says which findings were planted and which arise on their own.
- **Demand is what was ordered, not what shipped.** Days of cover and lost revenue are worked out from what customers asked for. Measured on shipped units, a stockout would hide itself.
- **No person is in the data.** Not a real one and not a made-up one. A customer is an ID, a segment, a region and a date, and a test checks that no other text column exists.

## How it is built

No dependencies. SQLite and the test runner are built into Node, so there is nothing to install.

| | |
| --- | --- |
| **The data** | `scripts/make-sample.js` simulates two years of trading from a fixed seed: customers ordering, warehouses reordering, suppliers delivering. The CSVs are committed, and a test fails if they drift from the generator. How it works and what was planted is in [docs/DATA.md](docs/DATA.md). |
| **The schema** | Eight tables and three views in [sql/schema.sql](sql/schema.sql). `sales` puts each order line beside its customer, product and cost. `stock_movements` lists every change to stock with a sign, and `stock_on_hand` sums it. |
| **The questions** | One file per question in [sql/questions/](sql/questions/). Plain SQLite SQL: CTEs, joins and window functions. Percentiles are done by ranking, because SQLite has no percentile function. |
| **The answers** | `scripts/answers.js` runs every question and writes [docs/ANSWERS.md](docs/ANSWERS.md). |
| **The tests** | 13 tests: the data matches its seed, no person is in it, SQL stock matches the generator's, the totals add up across questions, the answers file is current, and the three planted patterns are found. |
| **CI** | `checks` runs the doc and parse checks and the tests on every push, plus a secret scan over the whole history. Actions are pinned to exact commits. |

## Try it on your own machine

Node 22.13 or later. Nothing to install.

```bash
npm test
```

To see every answer, open [docs/ANSWERS.md](docs/ANSWERS.md), or rebuild it:

```bash
npm run answers
```

To run one question and see its full result, give its number (with no number, it lists them all):

```bash
npm run ask 07
```

`npm run check` confirms every script parses, the JSON is valid and every link in the docs points at a real file. `npm run sample` remakes the data from its seed.

## Things worth knowing

**Short means cancelled.** Whatever a warehouse cannot ship on the day is cancelled and never sent later. A business that back-orders would measure the delay instead of the lost sale.

**Lead times are in calendar days**, because that is how the suppliers here promise them.

**Money is in rand, excluding VAT.** Prices are fixed for the two years. There is no inflation and no price change in the data.

**Cohorts start in 2024.** Customers who were already trading on 1 January 2024 are left out of the cohort question, because their first order is before the data begins. A month is only shown once all its customers have had 90 days to come back.

**The data is synthetic.** It shows the method and says nothing about any real business. Everything was built from scratch for this repository, and no work code or data is in it.

## Folders

```
sql/schema.sql           the tables and the sales and stock views
sql/questions/           one file per question
scripts/make-sample.js   simulates the synthetic data from a fixed seed
scripts/db.js            loads the CSVs into SQLite and runs the questions
scripts/answers.js       writes every result to docs/ANSWERS.md
scripts/ask.js           runs one question and prints the result
scripts/check.js         parse, JSON and doc-link checks
data/sample/             the synthetic data, one CSV per table
tests/                   the data, the SQL, and the planted patterns
docs/                    every answer, and how the data was made
```

## Licence

MIT. Use it for anything, including at work.
