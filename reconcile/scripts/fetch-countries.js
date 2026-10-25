// Rebuilds examples/countries/ from the two public sources:
//   node scripts/fetch-countries.js
//
// World Bank: country list (aggregates such as "Sub-Saharan Africa" left out)
// and total population for 2023. Licence CC BY 4.0.
// Wikidata: every current sovereign state with its ISO code, English name,
// capital(s) and best-ranked population figure. Licence CC0.
//
// Both are written as they come. Wikidata's duplicate rows and several
// capitals per country are kept on purpose: they are what reconcile is for.

import { writeFileSync } from 'node:fs';

const out = (name) => new URL(`../examples/countries/${name}`, import.meta.url);
const UA = { 'User-Agent': 'reconcile-example/1.0 (https://github.com/nurah-kamal/data-analysis)' };

const csvCell = (v) => (v == null ? '' : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
const toCsv = (header, rows) => [header.join(','), ...rows.map((r) => header.map((h) => csvCell(r[h])).join(','))].join('\n') + '\n';

async function worldBank() {
  const get = async (url) => (await (await fetch(url, { headers: UA })).json())[1];
  const countries = (await get('https://api.worldbank.org/v2/country?format=json&per_page=400'))
    .filter((c) => c.region.value !== 'Aggregates');
  const pop = new Map((await get('https://api.worldbank.org/v2/country/all/indicator/SP.POP.TOTL?date=2023&format=json&per_page=400'))
    .map((r) => [r.countryiso3code, r.value]));
  const rows = countries.map((c) => ({ iso3: c.id, name: c.name, capital: c.capitalCity || null, population: pop.get(c.id) ?? null, population_year: pop.get(c.id) != null ? 2023 : null }));
  rows.sort((a, b) => a.iso3.localeCompare(b.iso3));
  writeFileSync(out('world-bank.csv'), toCsv(['iso3', 'name', 'capital', 'population', 'population_year'], rows));
  return rows.length;
}

const SPARQL = `
SELECT ?country ?iso3 ?name ?capitalLabel ?population ?popDate WHERE {
  ?country wdt:P31 wd:Q3624078 .
  FILTER NOT EXISTS { ?country wdt:P576 ?ended }
  OPTIONAL { ?country wdt:P298 ?iso3 }
  ?country rdfs:label ?name . FILTER(LANG(?name) = "en")
  OPTIONAL { ?country wdt:P36 ?capital . ?capital rdfs:label ?capitalLabel . FILTER(LANG(?capitalLabel) = "en") }
  OPTIONAL { ?country p:P1082 ?ps . ?ps a wikibase:BestRank ; ps:P1082 ?population . OPTIONAL { ?ps pq:P585 ?popDate } }
}`;

async function wikidata() {
  const res = await fetch(`https://query.wikidata.org/sparql?query=${encodeURIComponent(SPARQL)}`, { headers: { ...UA, Accept: 'application/sparql-results+json' } });
  const { results } = await res.json();
  const rows = results.bindings.map((b) => ({
    wikidata_id: b.country.value.split('/').pop(),
    iso3: b.iso3?.value ?? null,
    name: b.name.value,
    capital: b.capitalLabel?.value ?? null,
    population: b.population ? Math.round(Number(b.population.value)) : null,
    population_date: b.popDate?.value.slice(0, 10) ?? null,
  }));
  const key = (r) => [r.iso3 ?? '~', r.name, r.capital ?? '', r.population ?? '', r.population_date ?? ''].join('|');
  rows.sort((a, b) => key(a).localeCompare(key(b)));
  writeFileSync(out('wikidata.csv'), toCsv(['wikidata_id', 'iso3', 'name', 'capital', 'population', 'population_date'], rows));
  return rows.length;
}

console.log(`World Bank: ${await worldBank()} countries`);
console.log(`Wikidata: ${await wikidata()} rows`);
