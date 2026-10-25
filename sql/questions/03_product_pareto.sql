-- Which products bring in most of the 2025 revenue? Ranked, with the running
-- share, and classed A (the first 80%), B (the next 15%) or C (the rest).
WITH product_revenue AS (
  SELECT product_id, sum(revenue) AS revenue
  FROM sales
  WHERE year = '2025'
  GROUP BY product_id
),
running AS (
  SELECT
    product_id,
    revenue,
    rank() OVER (ORDER BY revenue DESC)                                            AS revenue_rank,
    sum(revenue) OVER (ORDER BY revenue DESC, product_id ROWS UNBOUNDED PRECEDING) AS running_revenue,
    sum(revenue) OVER ()                                                           AS total_revenue
  FROM product_revenue
)
SELECT
  r.revenue_rank,
  r.product_id,
  p.description,
  p.category,
  round(r.revenue, 2)                                   AS revenue,
  round(100.0 * r.running_revenue / r.total_revenue, 1) AS running_share_pct,
  CASE
    WHEN r.running_revenue - r.revenue < 0.80 * r.total_revenue THEN 'A'
    WHEN r.running_revenue - r.revenue < 0.95 * r.total_revenue THEN 'B'
    ELSE 'C'
  END                                                   AS class
FROM running r
JOIN products p ON p.product_id = r.product_id
ORDER BY r.revenue_rank;
