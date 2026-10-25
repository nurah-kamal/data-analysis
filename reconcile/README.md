# reconcile

**Matches records across two or more datasets and reports what matches, what is missing from each, and every field where they disagree, with each source's value side by side. It never decides which source is right. The example compares the World Bank's country list with Wikidata's: 195 countries are in both, and 127 of those disagree on a name, a capital or a population.**

From [results/countries.md](results/countries.md) (also as [HTML](results/countries.html)):

| Key | How they differ | World Bank | Wikidata |
| --- | --- | --- | --- |
| BDI | disagree | Bujumbura | Gitega |
| UKR | disagree | Kiev | Kyiv |
| ZAF | partly agree | Pretoria | Bloemfontein / Cape Town / Pretoria |
| ALB | disagree | 2 411 658 (2023) | 2 811 655 (2023-01-01) |

## What it shows

| Finding | On the example |
| --- | --- |
| **In every source** | 195 of 219 countries. |
| **Only in one source** | 22 only in the World Bank (territories such as Aruba, Greenland and Hong Kong, which it lists separately and Wikidata's list of sovereign states doesn't), and 2 only in Wikidata (Taiwan and Vatican City). |
| **Several rows for one key** | 7 countries have more than one row in Wikidata: six because they have more than one capital (South Africa has three), and Taiwan because it has two population figures. |
| **Matched by name, not key** | 2: Kosovo, which is XKX at the World Bank and XKS in Wikidata, and Denmark, which matches Wikidata's "Kingdom of Denmark", a row with no ISO code. Both are listed for a person to check. |
| **Conflicts** | 12 capitals, 103 populations (beyond a 2% tolerance) and 31 names. 68 countries agree on all three. |

## What the disagreements turn out to be

- **Most population gaps are about when, not what.** The World Bank figure is for 2023. Wikidata's best figure is for whichever year it was last updated, and the report shows each year next to its value. Only 8 of the 103 gaps compare the same year. One is Albania, where the two 2023 figures are 400,000 apart.
- **Some capitals are out of date.** Burundi moved its capital to Gitega, Palau's is Ngerulmud, and "Kiev" is the older spelling of Kyiv. In each case one source has caught up and the other hasn't.
- **Some are one-to-many, not wrong.** South Africa, Bolivia, Sri Lanka and Eswatini have more than one capital. One source lists one and the other lists them all. The report calls these "partly agree": the values overlap but the sets differ.
- **Some are only spelling.** Tirane or Tirana, Saint George's or St. George's. The `loose` option already sets aside punctuation and spacing, which is why Port-of-Spain and Port of Spain don't appear. These are left for a person: a tool that decided Tirane and Tirana were the same would also decide other things that aren't.
- **A name match needs checking.** "Kingdom of Denmark" includes Greenland and the Faroe Islands, which the World Bank lists separately. They are two different things with the same core name. Their populations happen to land within 2% of each other, so nothing else flags it, and that is why name matches are listed on their own.

## The part worth copying

- **Never resolve, always show both.** Every conflict lists each source's value, with context such as the year. Which one is right is a decision for someone who knows why they differ.
- **Name matching is a fallback, and it reports itself.** Records are matched on the key first. Only records left unmatched are compared by name, a pair is joined only when each is the other's best match above the threshold, and ties are left unmatched. Every name match is listed separately.
- **Duplicates are counted, not dropped.** Rows that repeat exactly are counted. Rows that differ under one key give that key several values, and the comparison works on the sets.
- **Real data, kept as it comes.** The example files are exactly what the two sources returned, including the awkward rows. `npm run fetch` rebuilds them.

## How it is built

| | |
| --- | --- |
| **Config** | A JSON file naming the sources (CSV files), the key, an optional name fallback with a minimum score, and the fields to compare, each with an optional numeric `tolerance`, `loose` text matching, and `context` columns to show beside the value. See [examples/countries/reconcile.json](examples/countries/reconcile.json). |
| **Matching** | `src/reconcile.js`. Keys are trimmed and compared case-insensitively. The name fallback scores the meaningful words two names share (Dice similarity), ignoring order, punctuation, accents and filler such as "Republic of" or "Rep.". |
| **Comparing** | Per field, the set of values each source has for an entity. Equal sets agree; overlapping sets "partly agree"; otherwise they "disagree". A blank on one side isn't a conflict. |
| **Reports** | `src/report.js` writes Markdown or one self-contained HTML page with light and dark styles. All data is escaped. |
| **Sources** | Any number. The first is the anchor for the name fallback. |
| **Tests** | 13 tests: in both, only in one, case and spacing in keys, repeats and one-to-many, tolerance and loose matching, the name fallback (including ties and records already matched by key), three sources, HTML escaping, and the example's reports matching the committed files. |
| **CI** | `.github/workflows/reconcile.yml` in the repository root runs the tests whenever this folder changes. Actions are pinned to exact commits. |

## Try it on your own machine

Node 22.13 or later. Nothing to install.

```bash
cd reconcile
npm test
npm run example            # rebuilds results/countries.md and .html
npm run fetch              # downloads both sources again
```

For your own data, copy the example config, point it at your CSV files, and run `node bin/reconcile.js your-config.json --out report.html`.

## The data

| Source | What | Licence | Retrieved |
| --- | --- | --- | --- |
| World Bank Open Data | The country list (aggregates such as "Sub-Saharan Africa" left out) and total population for 2023, indicator SP.POP.TOTL, from api.worldbank.org | [CC BY 4.0](https://datacatalog.worldbank.org/public-licenses) | 25 October 2026 |
| Wikidata | Every current sovereign state with its ISO 3166 alpha-3 code, English name, capitals and best-ranked population, from query.wikidata.org | [CC0](https://www.wikidata.org/wiki/Wikidata:Copyright) | 25 October 2026 |

No person is in either file.

## Things worth knowing

**The figures are for the files in this folder.** Both sources update. Running `npm run fetch` will give slightly different numbers on a different day, which is why the files are committed.

**The 2% population tolerance is a choice.** It treats estimates from the same period as agreeing. With no tolerance, nearly every population would conflict; with a wider one, real differences such as Albania's would disappear.

**Name matching is tuned for names of things, not people.** It removes words like "Republic" and "Kingdom", which suits countries and organisations. For other kinds of record, the filler words in `src/reconcile.js` would need changing.

**The idea comes from reconciling exports at work.** It was rebuilt from scratch on open data, and no work code or data is in this folder.

## Folders

```
bin/reconcile.js               the command line
src/reconcile.js               grouping, matching and comparing
src/report.js                  Markdown and HTML reports
src/csv.js                     a CSV reader for quoted fields and line breaks
scripts/fetch-countries.js     downloads both example sources
examples/countries/            the two source files and the config
results/                       the example's reports
tests/                         13 tests
```

## Licence

MIT, in the [repository root](../LICENSE). The example data keeps its own licence: CC BY 4.0 for the World Bank file, CC0 for the Wikidata file.
