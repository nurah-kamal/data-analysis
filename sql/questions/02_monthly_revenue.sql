-- Month by month, how much revenue came in, how did it compare with the month
-- before and the same month a year earlier, and where did the year to date stand?
WITH monthly AS (
  SELECT year, month, sum(revenue) AS revenue
  FROM sales
  GROUP BY year, month
)
SELECT
  month,
  round(revenue, 2)                                                               AS revenue,
  round(100.0 * (revenue - lag(revenue) OVER w) / lag(revenue) OVER w, 1)         AS vs_last_month_pct,
  round(100.0 * (revenue - lag(revenue, 12) OVER w) / lag(revenue, 12) OVER w, 1) AS vs_last_year_pct,
  round(sum(revenue) OVER (PARTITION BY year ORDER BY month), 2)                  AS year_to_date
FROM monthly
WINDOW w AS (ORDER BY month)
ORDER BY month;
