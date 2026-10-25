-- How long do customers in each segment wait between one order and the next?
-- The median and 90th percentile gap in days, from every repeat order.
WITH gaps AS (
  SELECT
    c.segment,
    julianday(o.ordered_on)
      - julianday(lag(o.ordered_on) OVER (PARTITION BY o.customer_id ORDER BY o.ordered_on, o.order_id)) AS gap
  FROM orders o
  JOIN customers c ON c.customer_id = o.customer_id
),
ranked AS (
  -- SQLite has no percentile function, so rank the gaps and pick positions.
  SELECT
    segment,
    gap,
    row_number() OVER (PARTITION BY segment ORDER BY gap) AS pos,
    count(*) OVER (PARTITION BY segment)                  AS n
  FROM gaps
  WHERE gap IS NOT NULL
)
SELECT
  segment,
  max(n)                                                    AS repeat_orders,
  round(avg(gap), 1)                                        AS mean_gap_days,
  avg(gap) FILTER (WHERE pos IN ((n + 1) / 2, (n + 2) / 2)) AS median_gap_days,
  min(gap) FILTER (WHERE pos >= 0.9 * n)                    AS p90_gap_days
FROM ranked
GROUP BY segment
ORDER BY median_gap_days;
