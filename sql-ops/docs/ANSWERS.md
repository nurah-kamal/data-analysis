# Answers

Every question in [sql/questions](../sql/questions), run on the synthetic sample. Money is in rand, excluding VAT. `npm run answers` remakes this file, and a test fails if it is out of date.

## 01_headline.sql

**How did the business do each year? Orders, customers who ordered, units shipped, revenue, gross margin, and the share of ordered units that actually shipped.**

[Open the SQL](../sql/questions/01_headline.sql)

| year | orders | customers | units_shipped | revenue | gross_profit | margin_pct | revenue_per_order | fill_rate_pct |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 2024 | 5547 | 674 | 185020 | 115620291.07 | 26544993.68 | 23 | 20843.75 | 98.4 |
| 2025 | 7918 | 635 | 266154 | 169891847.3 | 39886644.47 | 23.5 | 21456.41 | 97.8 |

## 02_monthly_revenue.sql

**Month by month, how much revenue came in, how did it compare with the month before and the same month a year earlier, and where did the year to date stand?**

[Open the SQL](../sql/questions/02_monthly_revenue.sql)

| month | revenue | vs_last_month_pct | vs_last_year_pct | year_to_date |
| --- | ---: | ---: | ---: | ---: |
| 2024-01 | 6014040.13 |  |  | 6014040.13 |
| 2024-02 | 7727784.33 | 28.5 |  | 13741824.46 |
| 2024-03 | 7333523.15 | -5.1 |  | 21075347.61 |
| 2024-04 | 8595176.93 | 17.2 |  | 29670524.54 |
| 2024-05 | 9547901.71 | 11.1 |  | 39218426.25 |
| 2024-06 | 9037670.9 | -5.3 |  | 48256097.15 |
| 2024-07 | 9242105.57 | 2.3 |  | 57498202.72 |
| 2024-08 | 10192301.39 | 10.3 |  | 67690504.11 |
| 2024-09 | 12171988.54 | 19.4 |  | 79862492.65 |
| 2024-10 | 12987976.26 | 6.7 |  | 92850468.91 |
| 2024-11 | 12743830.78 | -1.9 |  | 105594299.69 |
| 2024-12 | 10025991.38 | -21.3 |  | 115620291.07 |
| 2025-01 | 12435758.26 | 24 | 106.8 | 12435758.26 |
| 2025-02 | 11423317.62 | -8.1 | 47.8 | 23859075.88 |
| 2025-03 | 13188399.43 | 15.5 | 79.8 | 37047475.31 |
| 2025-04 | 13529410.83 | 2.6 | 57.4 | 50576886.14 |

…and 8 more rows. Run the file to see them all.

## 03_product_pareto.sql

**Which products bring in most of the 2025 revenue? Ranked, with the running share, and classed A (the first 80%), B (the next 15%) or C (the rest).**

[Open the SQL](../sql/questions/03_product_pareto.sql)

| revenue_rank | product_id | description | category | revenue | running_share_pct | class |
| ---: | --- | --- | --- | ---: | ---: | --- |
| 1 | P18 | Angle grinder 115 mm | Power tools | 30470280.82 | 17.9 | A |
| 2 | P30 | Wood varnish 1 L | Paint | 21925295.69 | 30.8 | A |
| 3 | P42 | LED bulb 9 W (pack of 4) | Electrical | 19600840.45 | 42.4 | A |
| 4 | P47 | Insulation tape (pack of 10) | Electrical | 11864606.42 | 49.4 | A |
| 5 | P46 | Circuit breaker 20 A | Electrical | 10555946.33 | 55.6 | A |
| 6 | P28 | Primer 5 L | Paint | 7624804.6 | 60.1 | A |
| 7 | P16 | Pliers set (3 piece) | Hand tools | 7577263.25 | 64.5 | A |
| 8 | P43 | Twin and earth cable 2.5 mm x 100 m | Electrical | 4466039.65 | 67.2 | A |
| 9 | P25 | Interior PVA white 20 L | Paint | 4264697.75 | 69.7 | A |
| 10 | P22 | Circular saw 1400 W | Power tools | 3853640.2 | 71.9 | A |
| 11 | P26 | Interior PVA white 5 L | Paint | 3847196.58 | 74.2 | A |
| 12 | P35 | Copper elbow 15 mm (pack of 10) | Plumbing | 3753228.93 | 76.4 | A |
| 13 | P44 | Double wall socket | Electrical | 3714935.02 | 78.6 | A |
| 14 | P24 | Drill bit set (19 piece) | Power tools | 3291955.74 | 80.5 | A |
| 15 | P19 | Jigsaw 650 W | Power tools | 2572058.37 | 82 | B |
| 16 | P27 | Exterior acrylic 20 L | Paint | 2504486.57 | 83.5 | B |

…and 32 more rows. Run the file to see them all.

## 04_category_margin.sql

**In 2025, which categories made the money once cost is taken off, and how much of each category's list price was given away in discounts?**

[Open the SQL](../sql/questions/04_category_margin.sql)

| category | revenue | revenue_share_pct | gross_profit | margin_pct | discount_given_pct | profit_rank |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Electrical | 53502662.81 | 31.5 | 11850585.32 | 22.1 | 9.3 | 1 |
| Paint | 45603865.81 | 26.8 | 11730237.17 | 25.7 | 9.3 | 2 |
| Power tools | 45897471.81 | 27 | 8129781.75 | 17.7 | 7.6 | 3 |
| Hand tools | 13421169 | 7.9 | 4525176.36 | 33.7 | 8.9 | 4 |
| Plumbing | 8602858.71 | 5.1 | 2460502.27 | 28.6 | 8.8 | 5 |
| Fasteners | 2863819.16 | 1.7 | 1190361.6 | 41.6 | 8.5 | 6 |

## 05_supplier_lead_times.sql

**Do suppliers deliver within the lead time they promise? Quarter by quarter, for the purchase orders that have arrived.**

[Open the SQL](../sql/questions/05_supplier_lead_times.sql)

| supplier_id | quarter | received | promised_lead_days | avg_lead_days | longest_lead_days | late_pct |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| S01 | 2024-Q1 | 65 | 7 | 5.8 | 11 | 3.1 |
| S01 | 2024-Q2 | 83 | 7 | 5.7 | 12 | 7.2 |
| S01 | 2024-Q3 | 87 | 7 | 5.9 | 13 | 6.9 |
| S01 | 2024-Q4 | 84 | 7 | 5.8 | 12 | 7.1 |
| S01 | 2025-Q1 | 75 | 7 | 6 | 10 | 4 |
| S01 | 2025-Q2 | 82 | 7 | 6.1 | 13 | 8.5 |
| S01 | 2025-Q3 | 88 | 7 | 6 | 11 | 9.1 |
| S01 | 2025-Q4 | 74 | 7 | 6 | 11 | 6.8 |
| S02 | 2024-Q1 | 73 | 10 | 8.9 | 15 | 8.2 |
| S02 | 2024-Q2 | 114 | 10 | 8.9 | 16 | 7 |
| S02 | 2024-Q3 | 92 | 10 | 8.6 | 13 | 5.4 |
| S02 | 2024-Q4 | 79 | 10 | 8.7 | 15 | 3.8 |
| S02 | 2025-Q1 | 89 | 10 | 8.7 | 16 | 6.7 |
| S02 | 2025-Q2 | 92 | 10 | 8.8 | 16 | 6.5 |
| S02 | 2025-Q3 | 82 | 10 | 8.6 | 14 | 4.9 |
| S02 | 2025-Q4 | 85 | 10 | 8.8 | 16 | 8.2 |

…and 32 more rows. Run the file to see them all.

## 06_fill_rate_by_supplier.sql

**When customers order, how much of it can be shipped on the day? The fill rate by supplier and quarter, and the revenue lost to what was short.**

[Open the SQL](../sql/questions/06_fill_rate_by_supplier.sql)

| supplier_id | quarter | units_ordered | units_short | fill_rate_pct | revenue_lost |
| --- | --- | ---: | ---: | ---: | ---: |
| S01 | 2024-Q1 | 7328 | 2 | 100 | 246.42 |
| S01 | 2024-Q2 | 8630 | 29 | 99.7 | 2597.47 |
| S01 | 2024-Q3 | 10472 | 222 | 97.9 | 48379.1 |
| S01 | 2024-Q4 | 12460 | 176 | 98.6 | 45703.29 |
| S01 | 2025-Q1 | 12007 | 5 | 100 | 616.05 |
| S01 | 2025-Q2 | 12883 | 40 | 99.7 | 4586.4 |
| S01 | 2025-Q3 | 14528 | 82 | 99.4 | 7313.06 |
| S01 | 2025-Q4 | 15223 | 61 | 99.6 | 6238.91 |
| S02 | 2024-Q1 | 3021 | 39 | 98.7 | 2985.56 |
| S02 | 2024-Q2 | 4575 | 263 | 94.3 | 73867.77 |
| S02 | 2024-Q3 | 4980 | 127 | 97.4 | 21552.05 |
| S02 | 2024-Q4 | 5135 | 104 | 98 | 16624.68 |
| S02 | 2025-Q1 | 5440 | 169 | 96.9 | 52070.85 |
| S02 | 2025-Q2 | 6164 | 156 | 97.5 | 23889.13 |
| S02 | 2025-Q3 | 6819 | 152 | 97.8 | 50663.47 |
| S02 | 2025-Q4 | 7756 | 198 | 97.4 | 33728.25 |

…and 32 more rows. Run the file to see them all.

## 07_worst_stockouts.sql

**In 2025, which products most often ran out, so that customers got less than they ordered? The ten with the most short order lines, and who supplies them.**

[Open the SQL](../sql/questions/07_worst_stockouts.sql)

| product_id | description | category | supplier_id | short_lines | short_line_pct | units_short | revenue_lost |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: |
| P35 | Copper elbow 15 mm (pack of 10) | Plumbing | S04 | 100 | 11.6 | 1134 | 475940.94 |
| P08 | Pop rivets 4 mm (pack of 50) | Fasteners | S04 | 62 | 11.4 | 665 | 103453.68 |
| P05 | Hex nuts M8 (pack of 100) | Fasteners | S04 | 33 | 11.4 | 396 | 43639.28 |
| P33 | PVC pipe 50 mm x 6 m | Plumbing | S04 | 28 | 12.7 | 330 | 249689.19 |
| P21 | Impact driver 18 V | Power tools | S05 | 26 | 7 | 62 | 126767.58 |
| P34 | Ball valve 15 mm | Plumbing | S04 | 24 | 14 | 269 | 20475.99 |
| P36 | Basin mixer tap | Plumbing | S04 | 23 | 9.6 | 269 | 44085.49 |
| P46 | Circuit breaker 20 A | Electrical | S03 | 22 | 1.9 | 241 | 174580.68 |
| P24 | Drill bit set (19 piece) | Power tools | S05 | 21 | 2.5 | 43 | 64959.54 |
| P18 | Angle grinder 115 mm | Power tools | S05 | 20 | 0.5 | 46 | 124545.41 |

## 08_low_cover.sql

**At the end of the data, which products are about to run out in which warehouse? Stock on hand against the last 90 days of demand: under 14 days of cover.**

[Open the SQL](../sql/questions/08_low_cover.sql)

| city | product_id | description | supplier_id | on_hand | demand_per_day | days_of_cover | orders_on_the_way |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: |
| Durban | P29 | Enamel gloss 1 L | S06 | 3 | 1.8 | 1.6 | 2 |
| Johannesburg | P06 | Washers M10 (pack of 100) | S04 | 30 | 3.6 | 8.4 | 1 |
| Johannesburg | P12 | Screwdriver set (6 piece) | S02 | 33 | 3.6 | 9.1 | 1 |
| Johannesburg | P35 | Copper elbow 15 mm (pack of 10) | S04 | 110 | 11.5 | 9.5 | 1 |
| Cape Town | P05 | Hex nuts M8 (pack of 100) | S04 | 42 | 4 | 10.5 | 1 |
| Cape Town | P06 | Washers M10 (pack of 100) | S04 | 37 | 3.3 | 11.1 | 1 |
| Cape Town | P42 | LED bulb 9 W (pack of 4) | S06 | 233 | 20.9 | 11.2 | 1 |
| Durban | P33 | PVC pipe 50 mm x 6 m | S04 | 32 | 2.8 | 11.6 | 1 |
| Cape Town | P02 | Drywall screws 3.5x35 (box of 500) | S01 | 49 | 3.6 | 13.7 | 1 |

## 09_slow_stock.sql

**Where is cash tied up in stock that will take more than two months to sell? Valued at cost, with the supplier's minimum order quantity beside it.**

[Open the SQL](../sql/questions/09_slow_stock.sql)

| city | product_id | description | supplier_id | min_order_qty | on_hand | demand_per_day | days_of_cover | stock_value |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: |
| Johannesburg | P31 | Roof paint 20 L | S06 | 20 | 196 | 3.19 | 61 | 124902.96 |
| Durban | P44 | Double wall socket | S06 | 20 | 115 | 1.45 | 79 | 116761.8 |
| Durban | P21 | Impact driver 18 V | S05 | 24 | 63 | 0.82 | 77 | 109315.71 |
| Cape Town | P17 | Cordless drill 18 V | S05 | 24 | 68 | 0.94 | 72 | 77493.48 |
| Johannesburg | P23 | Battery pack 18 V 4 Ah | S05 | 24 | 42 | 0.58 | 72 | 54105.24 |
| Durban | P41 | Extension lead 5 m | S06 | 20 | 242 | 4.02 | 60 | 42925.96 |
| Durban | P17 | Cordless drill 18 V | S05 | 24 | 37 | 0.48 | 77 | 42165.57 |
| Durban | P23 | Battery pack 18 V 4 Ah | S05 | 24 | 27 | 0.41 | 67 | 34781.94 |
| Cape Town | P11 | Spirit level 600 mm | S02 | 10 | 169 | 2.79 | 60 | 24876.8 |
| Durban | P36 | Basin mixer tap | S04 | 20 | 141 | 2.01 | 70 | 15813.15 |
| Johannesburg | P38 | Thread seal tape (pack of 10) | S02 | 10 | 241 | 3.96 | 61 | 9415.87 |
| Durban | P34 | Ball valve 15 mm | S04 | 20 | 54 | 0.89 | 60 | 2767.5 |
| Durban | P06 | Washers M10 (pack of 100) | S04 | 20 | 38 | 0.5 | 76 | 1496.06 |

## 10_customer_cohorts.sql

**Do new customers come back? For each month's new customers, how many ordered again within 90 days of their first order?**

[Open the SQL](../sql/questions/10_customer_cohorts.sql)

| cohort | new_customers | came_back | came_back_pct |
| --- | ---: | ---: | ---: |
| 2024-01 | 13 | 10 | 76.9 |
| 2024-02 | 17 | 16 | 94.1 |
| 2024-03 | 25 | 22 | 88 |
| 2024-04 | 21 | 19 | 90.5 |
| 2024-05 | 23 | 20 | 87 |
| 2024-06 | 26 | 24 | 92.3 |
| 2024-07 | 16 | 13 | 81.3 |
| 2024-08 | 13 | 12 | 92.3 |
| 2024-09 | 27 | 25 | 92.6 |
| 2024-10 | 20 | 19 | 95 |
| 2024-11 | 235 | 44 | 18.7 |
| 2024-12 | 25 | 21 | 84 |
| 2025-01 | 16 | 16 | 100 |
| 2025-02 | 17 | 15 | 88.2 |
| 2025-03 | 24 | 22 | 91.7 |
| 2025-04 | 14 | 13 | 92.9 |

…and 5 more rows. Run the file to see them all.

## 11_reorder_gap.sql

**How long do customers in each segment wait between one order and the next? The median and 90th percentile gap in days, from every repeat order.**

[Open the SQL](../sql/questions/11_reorder_gap.sql)

| segment | repeat_orders | mean_gap_days | median_gap_days | p90_gap_days |
| --- | ---: | ---: | ---: | ---: |
| Retail store | 5558 | 11 | 7 | 25 |
| Contractor | 4452 | 19.3 | 13 | 44 |
| Online | 2585 | 43 | 27 | 98 |

## 12_basket_lift.sql

**Which products are bought together more often than chance would suggest? Pairs that share at least 30 orders, ranked by lift.**

[Open the SQL](../sql/questions/12_basket_lift.sql)

| first_product | second_product | orders_together | pct_of_first | pct_of_second | lift |
| --- | --- | ---: | ---: | ---: | ---: |
| Exterior acrylic 20 L | Paint roller kit 230 mm | 476 | 47 | 29.4 | 3.92 |
| Interior PVA white 20 L | Paint roller kit 230 mm | 419 | 46.1 | 25.9 | 3.84 |
| Primer 5 L | Paint roller kit 230 mm | 364 | 46 | 22.5 | 3.83 |
| Interior PVA white 5 L | Paint roller kit 230 mm | 232 | 44.1 | 14.3 | 3.67 |
| Roof paint 20 L | Paint roller kit 230 mm | 135 | 41.5 | 8.3 | 3.46 |
| Interior PVA white 20 L | Enamel gloss 1 L | 41 | 4.5 | 11.4 | 1.69 |
| Claw hammer 450 g | Pipe clamp 50 mm (pack of 10) | 34 | 3.4 | 11.2 | 1.52 |
| Interior PVA white 20 L | Double wall socket | 34 | 3.7 | 10.1 | 1.5 |
| Exterior acrylic 20 L | Enamel gloss 1 L | 40 | 4 | 11.1 | 1.48 |
| Washers M10 (pack of 100) | Circular saw 1400 W | 38 | 12 | 3.5 | 1.48 |

## 13_revenue_concentration.sql

**How much of 2025 revenue comes from the biggest customers? Customers who ordered in 2025 split into ten equal groups by what they spent.**

[Open the SQL](../sql/questions/13_revenue_concentration.sql)

| decile | customers | revenue | share_pct | running_share_pct | retail_stores | contractors | online |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 64 | 89456789.34 | 52.7 | 52.7 | 64 | 0 | 0 |
| 2 | 64 | 42417530.66 | 25 | 77.6 | 57 | 7 | 0 |
| 3 | 64 | 15457785.79 | 9.1 | 86.7 | 12 | 52 | 0 |
| 4 | 64 | 9479438.89 | 5.6 | 92.3 | 2 | 62 | 0 |
| 5 | 64 | 5390329.03 | 3.2 | 95.5 | 7 | 44 | 13 |
| 6 | 63 | 3255773.83 | 1.9 | 97.4 | 0 | 8 | 55 |
| 7 | 63 | 2094550.99 | 1.2 | 98.6 | 2 | 10 | 51 |
| 8 | 63 | 1409226.09 | 0.8 | 99.5 | 0 | 10 | 53 |
| 9 | 63 | 728300.62 | 0.4 | 99.9 | 0 | 5 | 58 |
| 10 | 63 | 202122.06 | 0.1 | 100 | 0 | 3 | 60 |
