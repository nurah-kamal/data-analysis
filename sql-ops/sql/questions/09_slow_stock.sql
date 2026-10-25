-- Where is cash tied up in stock that will take more than two months to sell?
-- Valued at cost, with the supplier's minimum order quantity beside it.
WITH last_day AS (
  SELECT max(ordered_on) AS day FROM orders
),
demand AS (
  SELECT warehouse_id, product_id, sum(quantity) / 180.0 AS per_day
  FROM sales, last_day
  WHERE ordered_on > date(last_day.day, '-180 days')
  GROUP BY warehouse_id, product_id
),
cover AS (
  SELECT
    h.warehouse_id,
    h.product_id,
    h.on_hand,
    d.per_day,
    h.on_hand / d.per_day AS days_of_cover
  FROM stock_on_hand h
  LEFT JOIN demand d ON d.warehouse_id = h.warehouse_id AND d.product_id = h.product_id
  WHERE h.on_hand > 0
)
SELECT
  w.city,
  c.product_id,
  p.description,
  p.supplier_id,
  s.min_order_qty,
  c.on_hand,
  round(c.per_day, 2)               AS demand_per_day,
  round(c.days_of_cover)            AS days_of_cover,
  round(c.on_hand * p.unit_cost, 2) AS stock_value
FROM cover c
JOIN products p   ON p.product_id = c.product_id
JOIN suppliers s  ON s.supplier_id = p.supplier_id
JOIN warehouses w ON w.warehouse_id = c.warehouse_id
WHERE c.days_of_cover > 60 OR c.per_day IS NULL
ORDER BY stock_value DESC
LIMIT 15;
