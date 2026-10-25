# The sample data

The CSVs in [data/sample](../data/sample) are made by [scripts/make-sample.js](../scripts/make-sample.js). Everything in them is invented: a made-up hardware wholesaler with three warehouses, six suppliers and 48 products, trading from 1 January 2024 to 31 December 2025. There is no person in the data, not a real one and not a made-up one. A customer is an ID, a segment, a region and the date the account was opened. The only free text in any column is a product description or a city.

The same seed always gives the same files. A test fails if the committed CSVs ever drift from what the generator makes.

## Tables

| File | Rows | What a row is |
|---|---:|---|
| `warehouses.csv` | 3 | A warehouse: Cape Town, Johannesburg or Durban, and the region it serves |
| `suppliers.csv` | 6 | A supplier: local or imported, the lead time it promises, its minimum order quantity |
| `products.csv` | 48 | A product: description, category, supplier, unit cost and list price in rand |
| `customers.csv` | 880 | A trade account: segment (Retail store, Contractor or Online), region, date opened |
| `orders.csv` | 13,465 | An order: customer, warehouse, date |
| `order_lines.csv` | 47,385 | A line on an order: product, quantity ordered, quantity shipped, price after discount |
| `purchase_orders.csv` | 3,951 | A replenishment order to a supplier: quantity, date ordered, date received (empty if still on its way) |
| `opening_stock.csv` | 144 | Stock of each product in each warehouse on 1 January 2024 |

The column types and the views built on them are in [sql/schema.sql](../sql/schema.sql).

## How it is generated

- **Customers.** 220 accounts are already trading at the start. About 0.6 new accounts open a day, and each places its first order within ten days. An account has a 2.2% chance a month of going quiet for good. Retail stores order most often and in the biggest quantities, contractors less, online buyers least.
- **Orders.** Each trading account orders on a given day with a probability set by its segment, the day of the week (Sundays are quiet) and the month (September and October are busy, December is quiet). Products are picked by a skewed popularity, so a few sell far more than the rest, and each segment leans towards some categories (contractors towards power tools and fasteners, for example).
- **Customers order from their region's warehouse.** If there is not enough stock on the day, what is short is cancelled and never sent later. `quantity - quantity_shipped` is what the customer did not get.
- **Stock.** At the start of each month every warehouse resets each product's reorder point from the last 90 days of demand: enough for the supplier's promised lead time plus five days, plus the largest single line seen as a buffer. When stock plus what is already on order falls to that point, it orders 28 days of demand or the supplier's minimum, whichever is more.
- **Suppliers.** A delivery usually arrives on time or up to three days early. About 8% arrive three to six days later than that.
- **Demand does not depend on stock.** What customers ask for is drawn from its own random stream, so running out never changes what was ordered. Lead times have a separate stream too.

## What was planted

| Planted | Expected in the analysis | Found |
|---|---|---|
| From 1 March 2025, supplier S04 delivers 6 to 12 days later than usual. The stock plan keeps assuming its promised 7 days. | S04's late deliveries jump from 2025 Q1; its products run short; nobody else's do | S04 late on 3–12% of deliveries in 2024, then 44% in 2025 Q1 and 100% from Q2. Its fill rate falls from 98–99% to 83–85%; every other supplier stays above 96.5% all through 2025. The four products that ran short most often in 2025 are all S04's, across two categories. Checked by `tests/sql.test.js`. |
| A Black Friday promotion (25–30 November 2024) brings in about 35 new accounts a day, 85% of them one-off bargain hunters, with 15 points off every order that week | November 2024 is the biggest cohort and the worst at coming back | 235 new customers in November 2024, of whom 18.7% ordered again within 90 days. Every other month is between 76.9% and 100%. Checked by `tests/sql.test.js`. |
| When an order has wall, roof or primer paint, 45% of the time it picks up the roller kit too | Paint and roller pairs top the lift table | The five pairs with the highest lift are all a paint with the roller kit (lift 3.46–3.92). The best other pair is 1.69. Checked by `tests/sql.test.js`. |

**Not planted:** the slow stock in [09_slow_stock.sql](../sql/questions/09_slow_stock.sql). Nothing in the generator makes it. It comes from the import supplier's minimum order of 24 units, which is about what some warehouses sell of a power tool in two months, so each delivery sits on the shelf for two to three months.

To be sure the tests are doing their job, the plants were switched off in a copy of the generator and the tests run again. The four tests for planted patterns failed and the other nine passed.
