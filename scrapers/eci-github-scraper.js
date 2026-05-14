#!/usr/bin/env node
/**
 * ECI GitHub Data Downloader — Election Results from community datasets
 * ══════════════════════════════════════════════════════════════════════
 * Source: github.com/thecont1/india-votes-data (ECI official data)
 * Data:   Constituency-wise results, all candidates, vote counts (EVM + postal)
 *
 * Usage:
 *   node scrapers/eci-github-scraper.js                  # All available
 *   node scrapers/eci-github-scraper.js --state=TS       # Single state
 *   node scrapers/eci-github-scraper.js --year=2024      # Single year
 */

const { STATES, extractYear } = require('./config');
const { httpGet, sleep, ensureDir, writeJSON, readJSON } = require('./utils');
const path = require('path');

const args = process.argv.slice(2);
const stateFilter = args.find(a => a.startsWith('--state='))?.split('=')[1];
const yearFilter = args.find(a => a.startsWith('--year='))?.split('=')[1];

const OUTPUT_BASE = path.resolve(__dirname, 'output', 'eci');

// ── ECI State Code → GitHub state code mapping ────────────────────────
const STATE_CODE_MAP = {
  'AP': 'AP', 'AR': 'AR', 'AS': 'AS', 'BR': 'BR', 'CG': 'CG',
  'DL': 'DL', 'GA': 'GA', 'GJ': 'GJ', 'HR': 'HR', 'HP': 'HP',
  'JK': 'JK', 'JH': 'JH', 'KA': 'KA', 'KL': 'KL', 'MP': 'MP',
  'MH': 'MH', 'MN': 'MN', 'ML': 'ML', 'MZ': 'MZ', 'NL': 'NL',
  'OD': 'OD', 'PY': 'PY', 'PB': 'PB', 'RJ': 'RJ', 'SK': 'SK',
  'TN': 'TN', 'TS': 'TG', 'TR': 'TR', 'UP': 'UP', 'UK': 'UK', 'WB': 'WB',
};

// ── Known election years per state ─────────────────────────────────────
function getElectionYears(stateCode) {
  const state = STATES.find(s => s.code === stateCode);
  if (!state) return [];
  return state.mynetaKeys.map(k => extractYear(k)).filter(y => y >= 2008).sort((a, b) => b - a);
}

// ── Try to download from GitHub ────────────────────────────────────────
async function downloadFromGitHub(year, stateCode) {
  const ghStateCode = STATE_CODE_MAP[stateCode] || stateCode;
  const jsonUrl = `https://raw.githubusercontent.com/thecont1/india-votes-data/main/data/${year}Assembly-${ghStateCode}.json`;
  const csvUrl = `https://raw.githubusercontent.com/thecont1/india-votes-data/main/data/${year}Assembly-${ghStateCode}.csv`;

  // Try JSON first
  let data = await httpGet(jsonUrl);
  if (data) {
    try { return { format: 'json', data: JSON.parse(data) }; } catch {}
  }

  // Try CSV
  data = await httpGet(csvUrl);
  if (data) {
    return { format: 'csv', data: parseCSV(data) };
  }

  return null;
}

// ── Also try datameet repo ─────────────────────────────────────────────
async function downloadFromDatameet(year, stateCode) {
  // datameet uses different naming
  const url = `https://raw.githubusercontent.com/datameet/india-election-data/master/assembly-elections/${year}/${stateCode.toLowerCase()}.csv`;
  const data = await httpGet(url);
  if (data) return { format: 'csv', data: parseCSV(data) };
  return null;
}

// ── Parse CSV data ─────────────────────────────────────────────────────
function parseCSV(csvStr) {
  const lines = csvStr.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  return lines.slice(1).map(line => {
    const values = line.match(/("([^"]*)"|[^,]*)/g)?.map(v => v.replace(/^"|"$/g, '').trim()) || [];
    const row = {};
    headers.forEach((h, i) => { row[h] = values[i] || ''; });
    return row;
  });
}

// ── Scrape election results for a state/year ───────────────────────────
async function scrapeResults(stateCode, year) {
  console.log(`   Trying ${stateCode} ${year}...`);

  // Try multiple sources
  let result = await downloadFromGitHub(year, stateCode);
  if (!result) {
    result = await downloadFromDatameet(year, stateCode);
  }

  if (!result) {
    console.log(`   ❌ No data found for ${stateCode} ${year}`);
    return null;
  }

  console.log(`   ✅ Found ${stateCode} ${year} (${result.format}, ${Array.isArray(result.data) ? result.data.length + ' rows' : 'structured'})`);
  return result.data;
}

// ── Main ───────────────────────────────────────────────────────────────
async function main() {
  console.log('📊 ECI GitHub Election Data Downloader');
  console.log('═'.repeat(60));

  ensureDir(OUTPUT_BASE);

  const filteredStates = stateFilter
    ? STATES.filter(s => s.code === stateFilter.toUpperCase())
    : STATES;

  let totalFiles = 0;

  for (const state of filteredStates) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`📋 ${state.name} (${state.code})`);
    console.log(`${'─'.repeat(60)}`);

    const years = yearFilter ? [parseInt(yearFilter)] : getElectionYears(state.code);

    for (const year of years) {
      const data = await scrapeResults(state.code, year);
      if (data) {
        writeJSON(path.join(OUTPUT_BASE, `${state.code}-${year}.json`), data);
        totalFiles++;
      }
      await sleep(100);
    }
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`✨ ECI Data Download Complete — ${totalFiles} files saved`);
}

main().catch(err => { console.error('\n❌ Fatal:', err); process.exit(1); });
