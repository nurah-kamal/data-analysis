# The demo, month by month

Each month of [examples/orders](../examples/orders) checked against the month before, in order, starting from an empty history. `npm run demo` remakes this file and [snapshots/](snapshots).

| Month | Rows | Found |
| --- | ---: | --- |
| [2025-01](#orders-2025-01csv) | 1,499 | baseline |
| [2025-02](#orders-2025-02csv) | 1,540 | no changes |
| [2025-03](#orders-2025-03csv) | 1,879 | 1 low |
| [2025-04](#orders-2025-04csv) | 1,807 | no changes |
| [2025-05](#orders-2025-05csv) | 1,773 | 1 high |
| [2025-06](#orders-2025-06csv) | 1,709 | 1 high |
| [2025-07](#orders-2025-07csv) | 1,604 | 1 high |
| [2025-08](#orders-2025-08csv) | 1,741 | 1 high |
| [2025-09](#orders-2025-09csv) | 1,972 | 1 high |
| [2025-10](#orders-2025-10csv) | 2,066 | 1 high, 1 low |
| [2025-11](#orders-2025-11csv) | 2,452 | 1 medium, 1 low |
| [2025-12](#orders-2025-12csv) | 2,048 | 2 medium |

## orders-2025-01.csv

1,499 rows, 12 columns. No earlier snapshot, so this one is the baseline for the next run.

## orders-2025-02.csv

1,540 rows, 12 columns. Compared with the snapshot of orders-2025-01.csv (2025-01).

No changes found.

## orders-2025-03.csv

1,879 rows, 12 columns. Compared with the snapshot of orders-2025-02.csv (2025-02).

**1 low**

| Severity | Column | What changed | Before | After |
| --- | --- | --- | --- | --- |
| low | channel | New value never seen before |  | App (9.6%) |

## orders-2025-04.csv

1,807 rows, 12 columns. Compared with the snapshot of orders-2025-03.csv (2025-03).

No changes found.

## orders-2025-05.csv

1,773 rows, 12 columns. Compared with the snapshot of orders-2025-04.csv (2025-04).

**1 high**

| Severity | Column | What changed | Before | After |
| --- | --- | --- | --- | --- |
| high | region → province | Looks renamed: one column went and one arrived with matching values | region | province |

## orders-2025-06.csv

1,709 rows, 12 columns. Compared with the snapshot of orders-2025-05.csv (2025-05).

**1 high**

| Severity | Column | What changed | Before | After |
| --- | --- | --- | --- | --- |
| high | order_date | The date format changed | YYYY-MM-DD | DD/MM/YYYY, e.g. 01/06/2025 |

## orders-2025-07.csv

1,604 rows, 12 columns. Compared with the snapshot of orders-2025-06.csv (2025-06).

**1 high**

| Severity | Column | What changed | Before | After |
| --- | --- | --- | --- | --- |
| high | amount | Values look 100 times bigger, as if rands became cents | median 1039.80 | median 102515 |

## orders-2025-08.csv

1,741 rows, 12 columns. Compared with the snapshot of orders-2025-07.csv (2025-07).

**1 high**

| Severity | Column | What changed | Before | After |
| --- | --- | --- | --- | --- |
| high | discount_pct | More blanks than before | 3.6% | 35.0% |

## orders-2025-09.csv

1,972 rows, 12 columns. Compared with the snapshot of orders-2025-08.csv (2025-08).

**1 high**

| Severity | Column | What changed | Before | After |
| --- | --- | --- | --- | --- |
| high | unit_price | The type changed | decimal, e.g. 2682.90, 290.90, 753.90 | text, e.g. R 101.90, R 36.90, R 1415.90 |

## orders-2025-10.csv

2,066 rows, 12 columns. Compared with the snapshot of orders-2025-09.csv (2025-09).

**1 high, 1 low**

| Severity | Column | What changed | Before | After |
| --- | --- | --- | --- | --- |
| high | courier | Column removed | text |  |
| low | warehouse | Column added |  | text |

## orders-2025-11.csv

2,452 rows, 12 columns. Compared with the snapshot of orders-2025-10.csv (2025-10).

**1 medium, 1 low**

| Severity | Column | What changed | Before | After |
| --- | --- | --- | --- | --- |
| medium | status | Value no longer appearing | Returned (was 5.6%) |  |
| low | delivered_on | Fewer blanks than before | 10.1% | 4.3% |

## orders-2025-12.csv

2,048 rows, 12 columns. Compared with the snapshot of orders-2025-11.csv (2025-11).

**2 medium**

| Severity | Column | What changed | Before | After |
| --- | --- | --- | --- | --- |
| medium | quantity | The typical value moved | median 2 (middle half 1–4) | median 14 (middle half 3–28) |
| medium | amount | The typical value moved | median 99320 (middle half 44737.50–227945) | median 422485 (middle half 125497.50–1219007.50) |
