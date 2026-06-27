#!/usr/bin/env node
/**
 * CEO Booth Scraper — Polling booth data from Chief Electoral Officer portals
 * ══════════════════════════════════════════════════════════════════════
 * Source: State CEO portals (ceotelangana.nic.in, ceoandhra.nic.in, etc.)
 * Data:   Polling booth number, name, location, voter counts (total/male/female/third gender)
 *
 * Usage:
 *   node scrapers/ceo-booth-scraper.js --state=TS      # Single state
 *   node scrapers/ceo-booth-scraper.js --state=AP      # Andhra Pradesh
 *   node scrapers/ceo-booth-scraper.js --all            # All configured states
 *   node scrapers/ceo-booth-scraper.js --state=TS --ac=1  # Single constituency
 */

const cheerio = require('cheerio');
const { STATES, HIERARCHY_OUTPUT_DIR } = require('./config');
const { httpGet, sleep, ensureDir, writeJSON, readJSON, progressLog } = require('./utils');
const path = require('path');
const fs = require('fs');

// ── CLI args ───────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const stateFilter = args.find(a => a.startsWith('--state='))?.split('=')[1];
const acFilter = args.find(a => a.startsWith('--ac='))?.split('=')[1];
const scrapeAll = args.includes('--all');

const OUTPUT_BASE = HIERARCHY_OUTPUT_DIR;
const CEO_DELAY_MS = 400; // Rate limit between CEO portal requests
const MAX_RETRIES = 3;

// ── State CEO Portal Configurations ────────────────────────────────────
/**
 * State-specific CEO portal URLs and parser functions.
 * Extensible: add new states by implementing a parser function.
 */
const STATE_CEO_PARSERS = {
  TS: {
    name: 'Telangana',
    url: 'https://ceotelangana.nic.in',
    totalACs: 119,
    constituencyListUrl: 'https://ceotelangana.nic.in/CEO_Telangana/Aboroll/ACSummary.aspx',
    boothListUrl: (acNo) => `https://ceotelangana.nic.in/CEO_Telangana/Electoralroll/boothlist.aspx?ac=${acNo}`,
    parser: parseTelangana,
  },
  AP: {
    name: 'Andhra Pradesh',
    url: 'https://ceoandhra.nic.in',
    totalACs: 175,
    constituencyListUrl: 'https://ceoandhra.nic.in/ceoap_new/ceo/rolls/ACSummary.aspx',
    boothListUrl: (acNo) => `https://ceoandhra.nic.in/ceoap_new/ceo/rolls/boothlist.aspx?ac=${acNo}`,
    parser: parseAP,
  },
  KA: {
    name: 'Karnataka',
    url: 'https://ceokarnataka.kar.nic.in',
    totalACs: 224,
    constituencyListUrl: 'https://ceokarnataka.kar.nic.in/rolls/ACSummary.aspx',
    boothListUrl: (acNo) => `https://ceokarnataka.kar.nic.in/rolls/boothlist.aspx?ac=${acNo}`,
    parser: parseGenericCEO,
  },
  MH: {
    name: 'Maharashtra',
    url: 'https://ceo.maharashtra.gov.in',
    totalACs: 288,
    constituencyListUrl: 'https://ceo.maharashtra.gov.in/rolls/ACSummary.aspx',
    boothListUrl: (acNo) => `https://ceo.maharashtra.gov.in/rolls/boothlist.aspx?ac=${acNo}`,
    parser: parseGenericCEO,
  },
};

// ── HTTP GET with retry ────────────────────────────────────────────────
/**
 * Performs an HTTP GET with exponential-backoff retries.
 * @param {string} url - URL to fetch
 * @param {number} retries - Max retry attempts
 * @returns {Promise<string|null>} Response body or null
 */
async function httpGetWithRetry(url, retries = MAX_RETRIES) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await httpGet(url);
      if (result) return result;
    } catch (err) {
      if (attempt < retries) {
        const backoff = CEO_DELAY_MS * Math.pow(2, attempt - 1);
        console.log(`\n   ⚠️ Retry ${attempt}/${retries} after ${backoff}ms: ${err.message}`);
        await sleep(backoff);
      }
    }
  }
  return null;
}

// ── Telangana CEO Parser ───────────────────────────────────────────────
/**
 * Parses booth data from Telangana CEO portal HTML.
 * @param {string} html - HTML content of booth list page
 * @param {number} acNo - Assembly constituency number
 * @returns {Array<Object>} Array of booth objects
 */
function parseTelangana(html, acNo) {
  const $ = cheerio.load(html);
  const booths = [];

  // Telangana CEO portal uses ASP.NET GridView tables
  $('table.gridview tr, table#GridView1 tr, table.table tbody tr').each((i, row) => {
    if (i === 0) return; // Skip header row
    const cells = $(row).find('td');
    if (cells.length < 4) return;

    const boothNumber = parseInt($(cells[0]).text().trim());
    if (isNaN(boothNumber)) return;

    const boothName = $(cells[1]).text().trim();
    const location = $(cells[2]).text().trim();

    // Voter counts — may be in columns 3-6
    const totalVoters = parseInt($(cells[3]).text().trim().replace(/,/g, '')) || 0;
    const maleVoters = cells.length > 4 ? parseInt($(cells[4]).text().trim().replace(/,/g, '')) || 0 : 0;
    const femaleVoters = cells.length > 5 ? parseInt($(cells[5]).text().trim().replace(/,/g, '')) || 0 : 0;
    const thirdGenderVoters = cells.length > 6 ? parseInt($(cells[6]).text().trim().replace(/,/g, '')) || 0 : 0;

    booths.push({
      boothNumber,
      boothName: boothName || `Booth ${boothNumber}`,
      location: location || null,
      acNumber: acNo,
      totalVoters,
      maleVoters,
      femaleVoters,
      thirdGenderVoters,
    });
  });

  return booths;
}

// ── Andhra Pradesh CEO Parser ──────────────────────────────────────────
/**
 * Parses booth data from AP CEO portal HTML.
 * @param {string} html - HTML content of booth list page
 * @param {number} acNo - Assembly constituency number
 * @returns {Array<Object>} Array of booth objects
 */
function parseAP(html, acNo) {
  const $ = cheerio.load(html);
  const booths = [];

  $('table.table tbody tr, table#grdBoothList tr').each((i, row) => {
    if (i === 0) return;
    const cells = $(row).find('td');
    if (cells.length < 3) return;

    const boothNumber = parseInt($(cells[0]).text().trim());
    if (isNaN(boothNumber)) return;

    const boothName = $(cells[1]).text().trim();

    // AP portal may have separate male/female/third gender columns
    let totalVoters = 0, maleVoters = 0, femaleVoters = 0, thirdGenderVoters = 0;

    if (cells.length >= 6) {
      maleVoters = parseInt($(cells[2]).text().trim().replace(/,/g, '')) || 0;
      femaleVoters = parseInt($(cells[3]).text().trim().replace(/,/g, '')) || 0;
      thirdGenderVoters = parseInt($(cells[4]).text().trim().replace(/,/g, '')) || 0;
      totalVoters = parseInt($(cells[5]).text().trim().replace(/,/g, '')) || 0;
    } else if (cells.length >= 3) {
      totalVoters = parseInt($(cells[2]).text().trim().replace(/,/g, '')) || 0;
    }

    // If total not explicitly given, compute from breakdowns
    if (!totalVoters && (maleVoters || femaleVoters)) {
      totalVoters = maleVoters + femaleVoters + thirdGenderVoters;
    }

    booths.push({
      boothNumber,
      boothName: boothName || `Booth ${boothNumber}`,
      location: null,
      acNumber: acNo,
      totalVoters,
      maleVoters,
      femaleVoters,
      thirdGenderVoters,
    });
  });

  return booths;
}

// ── Generic CEO Parser (for states with standard ASP.NET layout) ──────
/**
 * Generic parser for CEO portals that follow standard ASP.NET GridView layouts.
 * Works as a best-effort parser for unconfigured states.
 * @param {string} html - HTML content
 * @param {number} acNo - Assembly constituency number
 * @returns {Array<Object>} Array of booth objects
 */
function parseGenericCEO(html, acNo) {
  const $ = cheerio.load(html);
  const booths = [];

  // Try common table patterns
  const rows = $('table.gridview tr, table.table tbody tr, table#GridView1 tr');

  rows.each((i, row) => {
    if (i === 0) return;
    const cells = $(row).find('td');
    if (cells.length < 3) return;

    const boothNumber = parseInt($(cells[0]).text().trim());
    if (isNaN(boothNumber)) return;

    const boothName = $(cells[1]).text().trim();
    const totalVoters = parseInt($(cells[cells.length - 1]).text().trim().replace(/,/g, '')) || 0;

    booths.push({
      boothNumber,
      boothName: boothName || `Booth ${boothNumber}`,
      location: null,
      acNumber: acNo,
      totalVoters,
      maleVoters: 0,
      femaleVoters: 0,
      thirdGenderVoters: 0,
    });
  });

  return booths;
}

// ── Fetch constituency list from CEO portal ────────────────────────────
/**
 * Attempts to scrape the constituency list from a CEO portal.
 * Falls back to generating AC numbers sequentially.
 * @param {Object} ceoConfig - State CEO parser config
 * @returns {Promise<Array<{acNo: number, name: string}>>}
 */
async function fetchConstituencyList(ceoConfig) {
  try {
    const html = await httpGetWithRetry(ceoConfig.constituencyListUrl);
    if (!html) throw new Error('Empty response');

    const $ = cheerio.load(html);
    const constituencies = [];

    $('table tr, select#ddlAC option').each((_, el) => {
      const tag = $(el).prop('tagName').toLowerCase();
      if (tag === 'option') {
        const val = $(el).attr('value');
        const text = $(el).text().trim();
        if (val && parseInt(val) > 0) {
          constituencies.push({ acNo: parseInt(val), name: text });
        }
      } else {
        const cells = $(el).find('td');
        if (cells.length >= 2) {
          const num = parseInt($(cells[0]).text().trim());
          const name = $(cells[1]).text().trim();
          if (num && name) constituencies.push({ acNo: num, name });
        }
      }
    });

    if (constituencies.length > 0) return constituencies;
  } catch {
    // Fall through to fallback
  }

  // Fallback: generate sequential AC numbers
  console.log(`   ⚠️ Could not fetch AC list, using sequential numbers 1-${ceoConfig.totalACs}`);
  return Array.from({ length: ceoConfig.totalACs }, (_, i) => ({
    acNo: i + 1,
    name: `AC-${i + 1}`,
  }));
}

// ── Scrape booths for a single constituency ────────────────────────────
/**
 * Fetches and parses booth data for a single assembly constituency.
 * @param {Object} ceoConfig - State CEO parser config
 * @param {number} acNo - Assembly constituency number
 * @returns {Promise<Array<Object>>} Array of booth objects
 */
async function scrapeBoothsForAC(ceoConfig, acNo) {
  const url = ceoConfig.boothListUrl(acNo);
  const html = await httpGetWithRetry(url);
  if (!html) return [];

  return ceoConfig.parser(html, acNo);
}

// ── Scrape all booths for a state ──────────────────────────────────────
/**
 * Scrapes booth data for all constituencies in a state.
 * Saves per-constituency files and a state summary.
 * @param {Object} state - State config from STATES array
 * @returns {Promise<Object>} State-level booth summary
 */
async function scrapeState(state) {
  const ceoConfig = STATE_CEO_PARSERS[state.code];
  if (!ceoConfig) {
    console.log(`   ⚠️ No CEO parser configured for ${state.code}`);
    return null;
  }

  console.log(`   🌐 CEO Portal: ${ceoConfig.url}`);

  // Fetch constituency list
  const constituencies = await fetchConstituencyList(ceoConfig);
  console.log(`   Found ${constituencies.length} constituencies`);

  // Filter by AC if specified
  const toScrape = acFilter
    ? constituencies.filter(c => c.acNo === parseInt(acFilter))
    : constituencies;

  const summary = {
    stateCode: state.code,
    stateName: state.name,
    ceoUrl: ceoConfig.url,
    scrapedAt: new Date().toISOString(),
    totalConstituencies: toScrape.length,
    totalBooths: 0,
    totalVoters: 0,
    totalMale: 0,
    totalFemale: 0,
    totalThirdGender: 0,
    constituencies: [],
  };

  for (let i = 0; i < toScrape.length; i++) {
    const ac = toScrape[i];
    progressLog(i + 1, toScrape.length, `AC-${ac.acNo}: ${ac.name}`);

    // Check if already scraped (resume)
    const acOutFile = path.join(OUTPUT_BASE, `${state.code}-AC${ac.acNo}-booths.json`);
    const existing = readJSON(acOutFile);

    let booths;
    if (existing && existing.booths && existing.booths.length > 0) {
      booths = existing.booths;
    } else {
      await sleep(CEO_DELAY_MS);
      booths = await scrapeBoothsForAC(ceoConfig, ac.acNo);
    }

    // Save per-constituency file
    const acData = {
      stateCode: state.code,
      acNumber: ac.acNo,
      acName: ac.name,
      scrapedAt: new Date().toISOString(),
      totalBooths: booths.length,
      totalVoters: booths.reduce((s, b) => s + b.totalVoters, 0),
      maleVoters: booths.reduce((s, b) => s + b.maleVoters, 0),
      femaleVoters: booths.reduce((s, b) => s + b.femaleVoters, 0),
      thirdGenderVoters: booths.reduce((s, b) => s + b.thirdGenderVoters, 0),
      booths,
    };
    writeJSON(acOutFile, acData);

    // Accumulate summary
    summary.totalBooths += booths.length;
    summary.totalVoters += acData.totalVoters;
    summary.totalMale += acData.maleVoters;
    summary.totalFemale += acData.femaleVoters;
    summary.totalThirdGender += acData.thirdGenderVoters;
    summary.constituencies.push({
      acNumber: ac.acNo,
      acName: ac.name,
      totalBooths: booths.length,
      totalVoters: acData.totalVoters,
    });
  }

  // Save state summary
  const summaryFile = path.join(OUTPUT_BASE, `${state.code}-booth-summary.json`);
  writeJSON(summaryFile, summary);
  console.log(`\n   💾 Summary: ${summaryFile}`);

  return summary;
}

// ── Main ───────────────────────────────────────────────────────────────
async function main() {
  console.log('🗳️  CEO Booth Scraper — Polling Booth Data');
  console.log('═'.repeat(60));

  ensureDir(OUTPUT_BASE);

  let filteredStates;
  if (stateFilter) {
    filteredStates = STATES.filter(s => s.code === stateFilter.toUpperCase());
    if (filteredStates.length === 0) {
      console.error(`❌ Unknown state code: ${stateFilter}`);
      process.exit(1);
    }
  } else if (scrapeAll) {
    // Only scrape states with configured CEO parsers
    filteredStates = STATES.filter(s => STATE_CEO_PARSERS[s.code]);
  } else {
    console.log('Usage: node scrapers/ceo-booth-scraper.js --state=TS | --all');
    console.log('       --ac=1   Scrape single constituency');
    process.exit(0);
  }

  console.log(`\n📊 States to scrape: ${filteredStates.length}`);
  filteredStates.forEach(s => console.log(`   • ${s.name} (${s.code})`));

  const allResults = [];

  for (const state of filteredStates) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`📋 ${state.name} (${state.code})`);
    console.log(`${'─'.repeat(60)}`);

    const result = await scrapeState(state);
    if (result) {
      allResults.push({
        state: state.code,
        totalBooths: result.totalBooths,
        totalVoters: result.totalVoters,
        constituencies: result.totalConstituencies,
      });
    }
  }

  // Write combined index
  if (allResults.length > 0) {
    writeJSON(path.join(OUTPUT_BASE, '_booth-index.json'), {
      scrapedAt: new Date().toISOString(),
      states: allResults,
    });
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log('✨ CEO Booth scraping complete');
  for (const r of allResults) {
    console.log(`   ${r.state}: ${r.totalBooths} booths, ${r.totalVoters.toLocaleString()} voters`);
  }
  console.log(`   Output directory: ${OUTPUT_BASE}`);
}

main().catch(err => { console.error('\n❌ Fatal:', err); process.exit(1); });
