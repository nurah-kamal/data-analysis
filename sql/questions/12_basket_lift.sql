-- Which products are bought together more often than chance would suggest?
-- Pairs that share at least 30 orders, ranked by lift.
WITH baskets AS (
  SELECT DISTINCT order_id, product_id FROM order_lines
),
total AS (
  SELECT count(DISTINCT order_id) AS orders FROM baskets
),
singles AS (
  SELECT product_id, count(*) AS orders FROM baskets GROUP BY product_id
),
pairs AS (
  SELECT a.product_id AS first_id, b.product_id AS second_id, count(*) AS together
  FROM baskets a
  JOIN baskets b ON b.order_id = a.order_id AND b.product_id > a.product_id
  GROUP BY a.product_id, b.product_id
  HAVING count(*) >= 30
)
SELECT
  pa.description                                                   AS first_product,
  pb.description                                                   AS second_product,
  pr.together                                                      AS orders_together,
  round(100.0 * pr.together / sa.orders, 1)                        AS pct_of_first,
  round(100.0 * pr.together / sb.orders, 1)                        AS pct_of_second,
  round(1.0 * pr.together * t.orders / (sa.orders * sb.orders), 2) AS lift
FROM pairs pr
CROSS JOIN total t
JOIN singles sa  ON sa.product_id = pr.first_id
JOIN singles sb  ON sb.product_id = pr.second_id
JOIN products pa ON pa.product_id = pr.first_id
JOIN products pb ON pb.product_id = pr.second_id
ORDER BY lift DESC, orders_together DESC
LIMIT 10;
