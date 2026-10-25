-- In 2025, which categories made the money once cost is taken off, and how much
-- of each category's list price was given away in discounts?
SELECT
  category,
  round(sum(revenue), 2)                                               AS revenue,
  round(100.0 * sum(revenue) / sum(sum(revenue)) OVER (), 1)           AS revenue_share_pct,
  round(sum(revenue) - sum(cost), 2)                                   AS gross_profit,
  round(100.0 * (sum(revenue) - sum(cost)) / sum(revenue), 1)          AS margin_pct,
  round(100.0 * (sum(list_value) - sum(revenue)) / sum(list_value), 1) AS discount_given_pct,
  rank() OVER (ORDER BY sum(revenue) - sum(cost) DESC)                 AS profit_rank
FROM sales
WHERE year = '2025'
GROUP BY category
ORDER BY profit_rank;
