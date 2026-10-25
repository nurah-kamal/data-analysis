-- A made-up hardware wholesaler: three warehouses, six suppliers, 48 products.
-- Customers are an ID, a segment and a region. There is no person in the data.

CREATE TABLE warehouses (
  warehouse_id TEXT PRIMARY KEY,
  city         TEXT NOT NULL,
  region       TEXT NOT NULL
);

CREATE TABLE suppliers (
  supplier_id        TEXT PRIMARY KEY,
  origin             TEXT NOT NULL,      -- Local or Imported
  promised_lead_days INTEGER NOT NULL,   -- calendar days from order to delivery
  min_order_qty      INTEGER NOT NULL
);

CREATE TABLE products (
  product_id  TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  category    TEXT NOT NULL,
  supplier_id TEXT NOT NULL REFERENCES suppliers(supplier_id),
  unit_cost   REAL NOT NULL,             -- rand, excluding VAT
  list_price  REAL NOT NULL
);

CREATE TABLE customers (
  customer_id TEXT PRIMARY KEY,
  segment     TEXT NOT NULL,             -- Retail store, Contractor or Online
  region      TEXT NOT NULL,
  joined_on   TEXT NOT NULL              -- 'YYYY-MM-DD'
);

CREATE TABLE orders (
  order_id     TEXT PRIMARY KEY,
  customer_id  TEXT NOT NULL REFERENCES customers(customer_id),
  warehouse_id TEXT NOT NULL REFERENCES warehouses(warehouse_id),
  ordered_on   TEXT NOT NULL
);

-- What was short on the day is cancelled, not back-ordered, so
-- quantity - quantity_shipped is what the customer did not get.
CREATE TABLE order_lines (
  order_id         TEXT NOT NULL REFERENCES orders(order_id),
  line_no          INTEGER NOT NULL,
  product_id       TEXT NOT NULL REFERENCES products(product_id),
  quantity         INTEGER NOT NULL,
  quantity_shipped INTEGER NOT NULL,
  unit_price       REAL NOT NULL,        -- after discount
  discount_pct     INTEGER NOT NULL,
  PRIMARY KEY (order_id, line_no)
);

CREATE TABLE purchase_orders (
  po_id        TEXT PRIMARY KEY,
  supplier_id  TEXT NOT NULL REFERENCES suppliers(supplier_id),
  warehouse_id TEXT NOT NULL REFERENCES warehouses(warehouse_id),
  product_id   TEXT NOT NULL REFERENCES products(product_id),
  quantity     INTEGER NOT NULL,
  ordered_on   TEXT NOT NULL,
  received_on  TEXT                      -- NULL while still on its way
);

CREATE TABLE opening_stock (
  warehouse_id TEXT NOT NULL REFERENCES warehouses(warehouse_id),
  product_id   TEXT NOT NULL REFERENCES products(product_id),
  as_of        TEXT NOT NULL,
  quantity     INTEGER NOT NULL,
  PRIMARY KEY (warehouse_id, product_id)
);

CREATE INDEX order_lines_product ON order_lines(product_id);
CREATE INDEX orders_customer ON orders(customer_id, ordered_on);

-- One row per order line with everything most questions need beside it.
CREATE VIEW sales AS
SELECT
  l.order_id,
  l.line_no,
  o.ordered_on,
  substr(o.ordered_on, 1, 4)                                                  AS year,
  substr(o.ordered_on, 1, 7)                                                  AS month,
  substr(o.ordered_on, 1, 4) || '-Q' || ((CAST(substr(o.ordered_on, 6, 2) AS INTEGER) + 2) / 3) AS quarter,
  o.customer_id,
  c.segment,
  o.warehouse_id,
  l.product_id,
  p.category,
  p.supplier_id,
  l.quantity,
  l.quantity_shipped,
  l.quantity - l.quantity_shipped                                             AS quantity_short,
  l.unit_price,
  l.discount_pct,
  l.quantity_shipped * l.unit_price                                           AS revenue,
  l.quantity_shipped * p.unit_cost                                            AS cost,
  l.quantity_shipped * p.list_price                                           AS list_value
FROM order_lines l
JOIN orders o    ON o.order_id = l.order_id
JOIN customers c ON c.customer_id = o.customer_id
JOIN products p  ON p.product_id = l.product_id;

-- Every change to stock, signed. Within a day, deliveries arrive before orders
-- ship, and the kinds sort that way ('opening' < 'received' < 'shipped').
CREATE VIEW stock_movements AS
SELECT warehouse_id, product_id, as_of AS day, 'opening' AS kind, quantity
FROM opening_stock
UNION ALL
SELECT warehouse_id, product_id, received_on, 'received', quantity
FROM purchase_orders
WHERE received_on IS NOT NULL
UNION ALL
SELECT o.warehouse_id, l.product_id, o.ordered_on, 'shipped', -l.quantity_shipped
FROM order_lines l
JOIN orders o ON o.order_id = l.order_id
WHERE l.quantity_shipped > 0;

CREATE VIEW stock_on_hand AS
SELECT warehouse_id, product_id, sum(quantity) AS on_hand
FROM stock_movements
GROUP BY warehouse_id, product_id;
