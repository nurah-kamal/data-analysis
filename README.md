# Data Analysis

**Data analysis projects: business questions answered in SQL, and data made to practise on.** Each project lives in its own folder with its own README and tests.

| Project | What it is | Built with |
| --- | --- | --- |
| [sql-ops](sql-ops/) | Business questions about a made-up wholesaler's orders and stock, answered in plain SQL on a seeded synthetic database, with tests for every answer. | SQL, SQLite, Node |
| [hr-data-generator](hr-data-generator/) | Makes an invented South African workforce of 8,950 employees for practising HR analytics, with a fixed seed so the output repeats. | Python |

More projects join as they ship, starting with reconcile, a tool that reports where two datasets disagree.

## How this repo is organised

- **One folder per project,** each runnable on its own.
- **Each project has its own checks** in `.github/workflows/<project>.yml`, running only when that folder changes. `secrets.yml` scans the whole history.
- **History came with the projects.** Each one was moved in from its own repo with its commits kept.

## Data

All data here is invented or public. No person is in it, not even made-up names.

## Licence

MIT.
