-- How much of 2025 revenue comes from the biggest customers? Customers who
-- ordered in 2025 split into ten equal groups by what they spent.
WITH spend AS (
  SELECT customer_id, segment, sum(revenue) AS revenue
  FROM sales
  WHERE year = '2025'
  GROUP BY customer_id, segment
),
deciles AS (
  SELECT *, ntile(10) OVER (ORDER BY revenue DESC) AS decile
  FROM spend
)
SELECT
  decile,
  count(*)                                                                                AS customers,
  round(sum(revenue), 2)                                                                  AS revenue,
  round(100.0 * sum(revenue) / sum(sum(revenue)) OVER (), 1)                              AS share_pct,
  round(100.0 * sum(sum(revenue)) OVER (ORDER BY decile) / sum(sum(revenue)) OVER (), 1) AS running_share_pct,
  count(*) FILTER (WHERE segment = 'Retail store')                                        AS retail_stores,
  count(*) FILTER (WHERE segment = 'Contractor')                                          AS contractors,
  count(*) FILTER (WHERE segment = 'Online')                                              AS online
FROM deciles
GROUP BY decile
ORDER BY decile;
