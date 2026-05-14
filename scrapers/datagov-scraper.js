#!/usr/bin/env node
/**
 * data.gov.in Scraper — Open Government Data Platform
 * ══════════════════════════════════════════════════════════════════════
 * Source: data.gov.in (OGD India)
 * Data:   Election statistics, voter data, constituency-level datasets
 *
 * Usage:
 *   node scrapers/datagov-scraper.js
 */

const { httpGet, sleep, ensureDir, writeJSON } = require('./utils');
const path = require('path');

const OUTPUT_BASE = path.resolve(__dirname, 'output', 'datagov');

// ── Known downloadable datasets ────────────────────────────────────────
const DATASETS = [
  {
    id: 'lok-sabha-2024-results',
    label: 'Lok Sabha 2024 Statistical Reports',
    url: 'https://www.data.gov.in/catalog/general-election-lok-sabha-2024-statistical-reports-data',
    directUrls: [],
  },
  {
    id: 'election-keywords',
    label: 'Election-related datasets',
    url: 'https://www.data.gov.in/keywords/Election',
    directUrls: [],
  },
];

// ── Search for datasets via API ────────────────────────────────────────
async function searchDatasets(keyword) {
  // data.gov.in has a CKAN-style API
  const url = `https://www.data.gov.in/api/1/datastore/search.json?q=${encodeURIComponent(keyword)}&limit=20`;
  const json = await httpGet(url);
  if (!json) return [];

  try {
    const data = JSON.parse(json);
    return data?.result?.records || [];
  } catch {}

  // Try alternate API format
  const url2 = `https://www.data.gov.in/ogpl/api/13/resource/download/${keyword}/json`;
  const json2 = await httpGet(url2);
  if (json2) {
    try { return JSON.parse(json2); } catch {}
  }

  return [];
}

// ── Try to get catalog pages ───────────────────────────────────────────
async function getCatalogLinks(catalogUrl) {
  const html = await httpGet(catalogUrl);
  if (!html) return [];

  // Extract download links (CSV, JSON, XLS)
  const links = [...html.matchAll(/href=['"]([^'"]+\.(?:csv|json|xlsx?))['"]|data-url=['"]([^'"]+)['"]/gi)];
  return links.map(m => m[1] || m[2]).filter(Boolean);
}

// ── Download a resource ────────────────────────────────────────────────
async function downloadResource(url, filename) {
  const data = await httpGet(url);
  if (!data) return false;

  const filePath = path.join(OUTPUT_BASE, filename);
  require('fs').writeFileSync(filePath, data);
  console.log(`   💾 Downloaded: ${filename} (${Math.round(data.length / 1024)}KB)`);
  return true;
}

// ── Main ───────────────────────────────────────────────────────────────
async function main() {
  console.log('📦 data.gov.in Open Data Scraper');
  console.log('═'.repeat(60));

  ensureDir(OUTPUT_BASE);

  // Search for election-related datasets
  const keywords = ['MLA', 'election results', 'legislative assembly', 'constituency'];
  const allResults = {};

  for (const kw of keywords) {
    console.log(`\n🔍 Searching: "${kw}"`);
    const results = await searchDatasets(kw);
    console.log(`   Found ${results.length} records`);
    if (results.length > 0) {
      allResults[kw] = results;
    }
    await sleep(500);
  }

  writeJSON(path.join(OUTPUT_BASE, 'search-results.json'), allResults);

  // Try to get downloadable resources from known catalogs
  for (const ds of DATASETS) {
    console.log(`\n📋 Checking catalog: ${ds.label}`);
    const links = await getCatalogLinks(ds.url);
    console.log(`   Found ${links.length} download links`);

    for (const link of links.slice(0, 5)) {
      const filename = `${ds.id}-${path.basename(link)}`;
      await downloadResource(link, filename);
      await sleep(500);
    }
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log('✨ data.gov.in Scraping Complete');
  console.log(`   Output: ${OUTPUT_BASE}`);
}

main().catch(err => { console.error('\n❌ Fatal:', err); process.exit(1); });
