-- How did the business do each year? Orders, customers who ordered, units shipped,
-- revenue, gross margin, and the share of ordered units that actually shipped.
SELECT
  year,
  count(DISTINCT order_id)                                        AS orders,
  count(DISTINCT customer_id)                                     AS customers,
  sum(quantity_shipped)                                           AS units_shipped,
  round(sum(revenue), 2)                                          AS revenue,
  round(sum(revenue) - sum(cost), 2)                              AS gross_profit,
  round(100.0 * (sum(revenue) - sum(cost)) / sum(revenue), 1)     AS margin_pct,
  round(sum(revenue) / count(DISTINCT order_id), 2)               AS revenue_per_order,
  round(100.0 * sum(quantity_shipped) / sum(quantity), 1)         AS fill_rate_pct
FROM sales
GROUP BY year
ORDER BY year;
