-- When customers order, how much of it can be shipped on the day? The fill rate
-- by supplier and quarter, and the revenue lost to what was short.
SELECT
  supplier_id,
  quarter,
  sum(quantity)                                           AS units_ordered,
  sum(quantity_short)                                     AS units_short,
  round(100.0 * sum(quantity_shipped) / sum(quantity), 1) AS fill_rate_pct,
  round(sum(quantity_short * unit_price), 2)              AS revenue_lost
FROM sales
GROUP BY supplier_id, quarter
ORDER BY supplier_id, quarter;
