-- In 2025, which products most often ran out, so that customers got less than
-- they ordered? The ten with the most short order lines, and who supplies them.
SELECT
  s.product_id,
  p.description,
  p.category,
  p.supplier_id,
  count(*) FILTER (WHERE s.quantity_short > 0)   AS short_lines,
  round(100.0 * avg(s.quantity_short > 0), 1)    AS short_line_pct,
  sum(s.quantity_short)                          AS units_short,
  round(sum(s.quantity_short * s.unit_price), 2) AS revenue_lost
FROM sales s
JOIN products p ON p.product_id = s.product_id
WHERE s.year = '2025'
GROUP BY s.product_id
ORDER BY short_lines DESC, revenue_lost DESC
LIMIT 10;
