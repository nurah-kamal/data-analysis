# Data Analysis

**Data analysis projects: business questions answered in SQL, and data made to practise on.** Each project lives in its own folder with its own README and tests.

| Project | What it is | Built with |
| --- | --- | --- |
| [Stock and Orders](sql-ops/)<br>[![sql-ops](https://github.com/nurah-kamal/data-analysis/actions/workflows/sql-ops.yml/badge.svg?branch=main&event=push)](https://github.com/nurah-kamal/data-analysis/actions/workflows/sql-ops.yml) 13 tests | Thirteen business questions about a made-up wholesaler's orders and stock, answered in plain SQL on a seeded synthetic database, with tests for every answer. It traces customers' missing units back to one supplier that started delivering late. | SQL, SQLite, Node |
| [HR data generator](hr-data-generator/) | Makes an invented South African workforce of 8,950 employees for practising HR analytics, with a fixed seed so the output repeats. | Python |
| [reconcile](reconcile/)<br>[![reconcile](https://github.com/nurah-kamal/data-analysis/actions/workflows/reconcile.yml/badge.svg?branch=main&event=push)](https://github.com/nurah-kamal/data-analysis/actions/workflows/reconcile.yml) 13 tests | Matches records across two or more datasets and shows every disagreement with both values side by side, never picking a winner. The example compares the World Bank's country list with Wikidata's: 195 countries in both, 127 of them disagreeing on a name, a capital or a population. | Node |
| [rls-proof](rls-proof/)<br>[![rls-proof](https://github.com/nurah-kamal/data-analysis/actions/workflows/rls-proof.yml/badge.svg?branch=main&event=push)](https://github.com/nurah-kamal/data-analysis/actions/workflows/rls-proof.yml) 26 tests | Proves PostgreSQL row-level security keeps two tenants apart: 54 isolation checks across five tables and five policies, run as the application's own role, then 24 planted mistakes (a policy switched off, a wrong `USING` clause, a connection that bypasses security) that the checks catch every time. | PostgreSQL, SQL, Node |

More projects join as they ship.

## How this repo is organised

- **One folder per project,** each runnable on its own.
- **Each project has its own checks** in `.github/workflows/<project>.yml`, running only when that folder changes. `secrets.yml` scans the whole history.
- **History came with the projects.** Each one was moved in from its own repo with its commits kept.

## Data

All data here is invented or public. No person is in it, not even made-up names. reconcile's example is open data from the World Bank (CC BY 4.0) and Wikidata (CC0), with the details in its README.

## Licence

MIT.
