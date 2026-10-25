-- Do new customers come back? For each month's new customers, how many ordered
-- again within 90 days of their first order?
WITH customer_orders AS (
  SELECT
    o.customer_id,
    o.ordered_on,
    row_number() OVER (PARTITION BY o.customer_id ORDER BY o.ordered_on, o.order_id) AS n,
    lead(o.ordered_on) OVER (PARTITION BY o.customer_id ORDER BY o.ordered_on, o.order_id) AS next_on
  FROM orders o
  JOIN customers c ON c.customer_id = o.customer_id
  WHERE c.joined_on >= '2024-01-01'
),
firsts AS (
  SELECT customer_id, ordered_on AS first_on, next_on
  FROM customer_orders
  WHERE n = 1
)
SELECT
  substr(first_on, 1, 7)                                                 AS cohort,
  count(*)                                                               AS new_customers,
  count(*) FILTER (WHERE julianday(next_on) - julianday(first_on) <= 90) AS came_back,
  round(100.0 * count(*) FILTER (WHERE julianday(next_on) - julianday(first_on) <= 90) / count(*), 1) AS came_back_pct
FROM firsts
-- Only whole months whose customers have all had 90 days to come back.
WHERE substr(first_on, 1, 7) < substr(date((SELECT max(ordered_on) FROM orders), '-90 days'), 1, 7)
GROUP BY cohort
ORDER BY cohort;
