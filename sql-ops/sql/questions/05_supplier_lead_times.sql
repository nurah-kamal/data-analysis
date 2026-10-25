-- Do suppliers deliver within the lead time they promise? Quarter by quarter, for
-- the purchase orders that have arrived.
WITH received AS (
  SELECT
    supplier_id,
    substr(ordered_on, 1, 4) || '-Q' || ((CAST(substr(ordered_on, 6, 2) AS INTEGER) + 2) / 3) AS quarter,
    julianday(received_on) - julianday(ordered_on) AS lead_days
  FROM purchase_orders
  WHERE received_on IS NOT NULL
)
SELECT
  r.supplier_id,
  r.quarter,
  count(*)                                                  AS received,
  s.promised_lead_days,
  round(avg(r.lead_days), 1)                                AS avg_lead_days,
  max(r.lead_days)                                          AS longest_lead_days,
  round(100.0 * avg(r.lead_days > s.promised_lead_days), 1) AS late_pct
FROM received r
JOIN suppliers s ON s.supplier_id = r.supplier_id
GROUP BY r.supplier_id, r.quarter
ORDER BY r.supplier_id, r.quarter;
