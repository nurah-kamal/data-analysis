-- At the end of the data, which products are about to run out in which warehouse?
-- Stock on hand against the last 90 days of demand: under 14 days of cover.
WITH last_day AS (
  SELECT max(ordered_on) AS day FROM orders
),
demand AS (
  -- Demand is what was ordered, not what shipped, or a stockout would hide itself.
  SELECT warehouse_id, product_id, sum(quantity) / 90.0 AS per_day
  FROM sales, last_day
  WHERE ordered_on > date(last_day.day, '-90 days')
  GROUP BY warehouse_id, product_id
)
SELECT
  w.city,
  h.product_id,
  p.description,
  p.supplier_id,
  h.on_hand,
  round(d.per_day, 1)             AS demand_per_day,
  round(h.on_hand / d.per_day, 1) AS days_of_cover,
  (SELECT count(*) FROM purchase_orders po
    WHERE po.warehouse_id = h.warehouse_id AND po.product_id = h.product_id
      AND po.received_on IS NULL) AS orders_on_the_way
FROM stock_on_hand h
JOIN demand d     ON d.warehouse_id = h.warehouse_id AND d.product_id = h.product_id
JOIN products p   ON p.product_id = h.product_id
JOIN warehouses w ON w.warehouse_id = h.warehouse_id
WHERE h.on_hand / d.per_day < 14
ORDER BY days_of_cover, w.city, h.product_id;
