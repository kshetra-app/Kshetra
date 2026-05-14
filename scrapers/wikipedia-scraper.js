#!/usr/bin/env node
/**
 * Wikipedia Scraper — DOB + Biographical Data for notable politicians
 * ══════════════════════════════════════════════════════════════════════
 * Source: Wikipedia (via MediaWiki API)
 * Data:   DOB, biographical info, photos
 *
 * Approach:
 *   1. For each state, look up the Wikipedia election results page
 *   2. Extract linked politician names → article titles
 *   3. Fetch each article's infobox for DOB
 *   4. Falls back to text parsing for DOB if infobox is missing
 *
 * Usage:
 *   node scrapers/wikipedia-scraper.js                # All states
 *   node scrapers/wikipedia-scraper.js --state=TS     # Single state
 */

const { STATES } = require('./config');
const { httpGet, sleep, ensureDir, writeJSON, readJSON } = require('./utils');
const path = require('path');

const args = process.argv.slice(2);
const stateFilter = args.find(a => a.startsWith('--state='))?.split('=')[1];

const OUTPUT_BASE = path.resolve(__dirname, 'output', 'wikipedia');
const MONTHS = { january:'01', february:'02', march:'03', april:'04', may:'05', june:'06', july:'07', august:'08', september:'09', october:'10', november:'11', december:'12' };

// ── Wikipedia Election Page Mappings ───────────────────────────────────
const ELECTION_PAGES = {
  'TS': ['2023_Telangana_Legislative_Assembly_election', '2018_Telangana_Legislative_Assembly_election', '2014_Telangana_Legislative_Assembly_election'],
  'AP': ['2024_Andhra_Pradesh_Legislative_Assembly_election', '2019_Andhra_Pradesh_Legislative_Assembly_election', '2014_Andhra_Pradesh_Legislative_Assembly_election'],
  'KA': ['2023_Karnataka_Legislative_Assembly_election', '2018_Karnataka_Legislative_Assembly_election', '2013_Karnataka_Legislative_Assembly_election'],
  'KL': ['2021_Kerala_Legislative_Assembly_election', '2016_Kerala_Legislative_Assembly_election', '2011_Kerala_Legislative_Assembly_election'],
  'TN': ['2021_Tamil_Nadu_Legislative_Assembly_election', '2016_Tamil_Nadu_Legislative_Assembly_election', '2011_Tamil_Nadu_Legislative_Assembly_election'],
  'MH': ['2024_Maharashtra_Legislative_Assembly_election', '2019_Maharashtra_Legislative_Assembly_election', '2014_Maharashtra_Legislative_Assembly_election'],
  'UP': ['2022_Uttar_Pradesh_Legislative_Assembly_election', '2017_Uttar_Pradesh_Legislative_Assembly_election', '2012_Uttar_Pradesh_Legislative_Assembly_election'],
  'WB': ['2021_West_Bengal_Legislative_Assembly_election', '2016_West_Bengal_Legislative_Assembly_election', '2011_West_Bengal_Legislative_Assembly_election'],
  'RJ': ['2023_Rajasthan_Legislative_Assembly_election', '2018_Rajasthan_Legislative_Assembly_election', '2013_Rajasthan_Legislative_Assembly_election'],
  'BR': ['2020_Bihar_Legislative_Assembly_election', '2015_Bihar_Legislative_Assembly_election'],
  'GJ': ['2022_Gujarat_Legislative_Assembly_election', '2017_Gujarat_Legislative_Assembly_election', '2012_Gujarat_Legislative_Assembly_election'],
  'MP': ['2023_Madhya_Pradesh_Legislative_Assembly_election', '2018_Madhya_Pradesh_Legislative_Assembly_election'],
  'DL': ['2020_Delhi_Legislative_Assembly_election', '2015_Delhi_Legislative_Assembly_election'],
  'PB': ['2022_Punjab_Legislative_Assembly_election', '2017_Punjab_Legislative_Assembly_election', '2012_Punjab_Legislative_Assembly_election'],
  'HR': ['2024_Haryana_Legislative_Assembly_election', '2019_Haryana_Legislative_Assembly_election', '2014_Haryana_Legislative_Assembly_election'],
  'JH': ['2024_Jharkhand_Legislative_Assembly_election', '2019_Jharkhand_Legislative_Assembly_election'],
  'AS': ['2021_Assam_Legislative_Assembly_election', '2016_Assam_Legislative_Assembly_election', '2011_Assam_Legislative_Assembly_election'],
  'OD': ['2024_Odisha_Legislative_Assembly_election', '2019_Odisha_Legislative_Assembly_election', '2014_Odisha_Legislative_Assembly_election'],
  'CG': ['2023_Chhattisgarh_Legislative_Assembly_election', '2018_Chhattisgarh_Legislative_Assembly_election'],
  'HP': ['2022_Himachal_Pradesh_Legislative_Assembly_election', '2017_Himachal_Pradesh_Legislative_Assembly_election'],
  'UK': ['2022_Uttarakhand_Legislative_Assembly_election', '2017_Uttarakhand_Legislative_Assembly_election'],
  'GA': ['2022_Goa_Legislative_Assembly_election', '2017_Goa_Legislative_Assembly_election'],
  'TR': ['2023_Tripura_Legislative_Assembly_election', '2018_Tripura_Legislative_Assembly_election'],
  'SK': ['2024_Sikkim_Legislative_Assembly_election', '2019_Sikkim_Legislative_Assembly_election'],
  'MN': ['2022_Manipur_Legislative_Assembly_election', '2017_Manipur_Legislative_Assembly_election'],
  'ML': ['2023_Meghalaya_Legislative_Assembly_election', '2018_Meghalaya_Legislative_Assembly_election'],
  'NL': ['2023_Nagaland_Legislative_Assembly_election', '2018_Nagaland_Legislative_Assembly_election'],
  'MZ': ['2023_Mizoram_Legislative_Assembly_election', '2018_Mizoram_Legislative_Assembly_election'],
  'AR': ['2024_Arunachal_Pradesh_Legislative_Assembly_election', '2019_Arunachal_Pradesh_Legislative_Assembly_election'],
  'PY': ['2021_Puducherry_Legislative_Assembly_election', '2016_Puducherry_Legislative_Assembly_election'],
  'JK': ['2024_Jammu_and_Kashmir_Legislative_Assembly_election'],
};

// ── Fetch DOB from Wikipedia article ───────────────────────────────────
async function fetchDOB(articleTitle) {
  const url = `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(articleTitle)}&prop=wikitext&section=0&format=json`;
  const json = await httpGet(url);
  if (!json) return null;

  try {
    const data = JSON.parse(json);
    const wt = data?.parse?.wikitext?.['*'] || '';

    // Pattern 1: {{birth date and age|YYYY|MM|DD}}
    const m1 = wt.match(/birth[_ ]date(?:[_ ]and[_ ]age)?\s*\|\s*(\d{4})\s*\|\s*(\d{1,2})\s*\|\s*(\d{1,2})/i);
    if (m1) return `${m1[1]}-${m1[2].padStart(2, '0')}-${m1[3].padStart(2, '0')}`;

    // Pattern 2: DD Month YYYY in text
    const m2 = wt.match(/(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i);
    if (m2) return `${m2[3]}-${MONTHS[m2[2].toLowerCase()]}-${m2[1].padStart(2, '0')}`;

    // Pattern 3: birth_year
    const m3 = wt.match(/birth_year\s*=\s*(\d{4})/i);
    if (m3) return `${m3[1]}-01-01`; // Approximate
  } catch {}

  return null;
}

// ── Get Wikipedia photo URL ────────────────────────────────────────────
async function fetchWikiPhoto(articleTitle) {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(articleTitle)}`;
  const json = await httpGet(url, { headers: { 'Api-User-Agent': 'KshetraApp/1.0 (contact@kshetra.app)' } });
  if (!json) return null;

  try {
    const data = JSON.parse(json);
    return data?.thumbnail?.source || data?.originalimage?.source || null;
  } catch {}
  return null;
}

// ── Extract linked politician names from election results page ─────────
async function getLinkedPoliticians(electionPageTitle) {
  const url = `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(electionPageTitle)}&prop=links&format=json`;
  const json = await httpGet(url);
  if (!json) return [];

  try {
    const data = JSON.parse(json);
    const links = data?.parse?.links || [];
    // Filter to main namespace (ns=0) and exclude non-person pages
    const skipPatterns = /election|constituency|district|party|assembly|legislative|pradesh|result|state|india|lok sabha|rajya|government|ministry|cabinet/i;
    return links
      .filter(l => l.ns === 0 && !skipPatterns.test(l['*']))
      .map(l => l['*']);
  } catch {}
  return [];
}

// ── Scrape DOBs for a state ────────────────────────────────────────────
async function scrapeState(stateCode) {
  const state = STATES.find(s => s.code === stateCode);
  const pages = ELECTION_PAGES[stateCode] || [];

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`📋 ${state?.name || stateCode} — Wikipedia DOB Lookup`);
  console.log(`${'─'.repeat(60)}`);

  if (pages.length === 0) {
    console.log('   ⚠️ No Wikipedia election pages configured');
    return {};
  }

  // Collect all linked politician names
  const allNames = new Set();
  for (const page of pages) {
    console.log(`   Scanning: ${page}`);
    const names = await getLinkedPoliticians(page);
    names.forEach(n => allNames.add(n));
    await sleep(200);
  }

  console.log(`   Found ${allNames.size} linked Wikipedia articles`);

  const results = {};
  let found = 0;
  const namesList = [...allNames];

  for (let i = 0; i < namesList.length; i++) {
    const name = namesList[i];
    process.stdout.write(`\r   [${i + 1}/${namesList.length}] ${name.substring(0, 40).padEnd(40)}`);

    try {
      const dob = await fetchDOB(name);
      if (dob) {
        results[name] = { dob, articleTitle: name };
        found++;

        // Also try to get photo
        const photo = await fetchWikiPhoto(name);
        if (photo) results[name].photoUrl = photo;
      }
    } catch {}

    await sleep(100); // Wikipedia is generous with rate limits
  }

  console.log(`\n   ✅ Found ${found} DOBs out of ${namesList.length} articles`);
  return results;
}

// ── Main ───────────────────────────────────────────────────────────────
async function main() {
  console.log('📖 Wikipedia DOB Scraper');
  console.log('═'.repeat(60));

  ensureDir(OUTPUT_BASE);

  const stateCodes = stateFilter
    ? [stateFilter.toUpperCase()]
    : Object.keys(ELECTION_PAGES);

  const allDOBs = {};

  for (const code of stateCodes) {
    const results = await scrapeState(code);
    writeJSON(path.join(OUTPUT_BASE, `${code}-dobs.json`), results);

    // Merge
    Object.assign(allDOBs, results);
  }

  // Write consolidated DOB file
  writeJSON(path.join(OUTPUT_BASE, '_all-dobs.json'), allDOBs);

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`✨ Wikipedia DOB Scraping Complete`);
  console.log(`   Total DOBs found: ${Object.keys(allDOBs).length}`);
}

main().catch(err => { console.error('\n❌ Fatal:', err); process.exit(1); });
