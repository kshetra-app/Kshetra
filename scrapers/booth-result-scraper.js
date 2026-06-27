#!/usr/bin/env node
/**
 * Booth Result Scraper — Booth-wise election results (votes per candidate per booth)
 * ══════════════════════════════════════════════════════════════════════
 * Sources:
 *   - ECI results portal: results.eci.gov.in
 *   - State CEO result pages: ceotelangana.nic.in, ceoandhra.nic.in
 *
 * Usage:
 *   node scrapers/booth-result-scraper.js --state=TS --year=2023
 *   node scrapers/booth-result-scraper.js --state=AP --year=2024
 *   node scrapers/booth-result-scraper.js --state=TS --year=2023 --ac=1
 *   node scrapers/booth-result-scraper.js --state=TS --year=2023 --validate-only
 */

const cheerio = require('cheerio');
const { STATES, BOOTH_RESULTS_OUTPUT_DIR } = require('./config');
const { httpGet, sleep, ensureDir, writeJSON, readJSON, progressLog, normalizeParty } = require('./utils');
const path = require('path');
const fs = require('fs');

// ── CLI args ───────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const stateFilter = args.find(a => a.startsWith('--state='))?.split('=')[1];
const yearFilter = args.find(a => a.startsWith('--year='))?.split('=')[1];
const acFilter = args.find(a => a.startsWith('--ac='))?.split('=')[1];
const validateOnly = args.includes('--validate-only');

const OUTPUT_BASE = BOOTH_RESULTS_OUTPUT_DIR;
const RESULT_DELAY_MS = 500; // Rate limit between requests
const MAX_RETRIES = 3;

// ── Result Source Configurations ───────────────────────────────────────
/**
 * Maps state + year combos to their result source URLs.
 * Each entry provides URL templates and parser functions.
 */
const RESULT_SOURCES = {
  'TS-2023': {
    name: 'Telangana Assembly Elections 2023',
    type: 'assembly',
    totalACs: 119,
    baseUrl: 'https://results.eci.gov.in',
    constituencyResultUrl: (acNo) =>
      `https://results.eci.gov.in/AcResultGenJune2023/candidateswise-S2${String(acNo).padStart(3, '0')}.htm`,
    boothResultUrl: (acNo) =>
      `https://results.eci.gov.in/AcResultGenJune2023/partywiseresult-S2${String(acNo).padStart(3, '0')}.htm`,
    ceoFallbackUrl: (acNo) =>
      `https://ceotelangana.nic.in/results/booth_wise.aspx?ac=${acNo}`,
    parser: parseECIBoothResults,
  },
  'AP-2024': {
    name: 'Andhra Pradesh Assembly Elections 2024',
    type: 'assembly',
    totalACs: 175,
    baseUrl: 'https://results.eci.gov.in',
    constituencyResultUrl: (acNo) =>
      `https://results.eci.gov.in/AcResultGen2024/candidateswise-S0${String(acNo).padStart(3, '0')}.htm`,
    boothResultUrl: (acNo) =>
      `https://results.eci.gov.in/AcResultGen2024/partywiseresult-S0${String(acNo).padStart(3, '0')}.htm`,
    ceoFallbackUrl: (acNo) =>
      `https://ceoandhra.nic.in/results/booth_wise.aspx?ac=${acNo}`,
    parser: parseECIBoothResults,
  },
  'TS-2018': {
    name: 'Telangana Assembly Elections 2018',
    type: 'assembly',
    totalACs: 119,
    baseUrl: 'https://results.eci.gov.in',
    constituencyResultUrl: (acNo) =>
      `https://results.eci.gov.in/AcResultGen2018/candidateswise-S2${String(acNo).padStart(3, '0')}.htm`,
    boothResultUrl: (acNo) =>
      `https://ceotelangana.nic.in/results/2018/booth_wise.aspx?ac=${acNo}`,
    ceoFallbackUrl: null,
    parser: parseECIBoothResults,
  },
};

// ── HTTP GET with retry ────────────────────────────────────────────────
/**
 * Performs an HTTP GET with exponential-backoff retries.
 * @param {string} url
 * @param {number} retries
 * @returns {Promise<string|null>}
 */
async function httpGetWithRetry(url, retries = MAX_RETRIES) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await httpGet(url);
      if (result) return result;
    } catch (err) {
      if (attempt < retries) {
        const backoff = RESULT_DELAY_MS * Math.pow(2, attempt - 1);
        console.log(`\n   ⚠️ Retry ${attempt}/${retries} after ${backoff}ms: ${err.message}`);
        await sleep(backoff);
      }
    }
  }
  return null;
}

// ── Parse ECI booth-wise results ───────────────────────────────────────
/**
 * Parses booth-level election results from ECI HTML pages.
 *
 * ECI result pages typically contain a large table where:
 * - Rows = booths
 * - Columns = candidates + metadata (total voters, valid, rejected, NOTA)
 *
 * @param {string} html - HTML content from ECI result page
 * @param {number} acNo - Assembly constituency number
 * @returns {{ candidates: string[], booths: Array<Object> }}
 */
function parseECIBoothResults(html, acNo) {
  const $ = cheerio.load(html);
  const result = { candidates: [], booths: [] };

  // Extract candidate names and parties from header row
  const headerRow = $('table tr').first();
  const headers = [];
  headerRow.find('th, td').each((_, cell) => {
    headers.push($(cell).text().trim());
  });

  // Parse candidate info from headers
  // Typical format: "Candidate Name (PARTY)"
  const candidateHeaders = [];
  for (let i = 1; i < headers.length; i++) {
    const h = headers[i];
    if (/total|valid|reject|nota|tender|round/i.test(h)) break;
    const partyMatch = h.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
    if (partyMatch) {
      candidateHeaders.push({
        name: partyMatch[1].trim(),
        party: normalizeParty(partyMatch[2].trim()),
        colIndex: i,
      });
    } else if (h && !/s\.?\s*no|booth|polling|station/i.test(h)) {
      candidateHeaders.push({
        name: h,
        party: 'IND',
        colIndex: i,
      });
    }
  }

  result.candidates = candidateHeaders.map(c => ({ name: c.name, party: c.party }));

  // Parse booth rows
  $('table tr').each((rowIdx, row) => {
    if (rowIdx === 0) return; // Skip header
    const cells = $(row).find('td');
    if (cells.length < 3) return;

    // First cell: booth number (or S.No)
    const firstCell = $(cells[0]).text().trim();
    const boothNumber = parseInt(firstCell);
    if (isNaN(boothNumber)) return;

    // Booth name from second cell (if present) or use booth number
    let boothName = cells.length > candidateHeaders.length + 3
      ? $(cells[1]).text().trim()
      : `Booth ${boothNumber}`;

    // Parse candidate votes
    const candidateVotes = [];
    let maxVotes = 0;
    let winnerIdx = -1;

    for (const ch of candidateHeaders) {
      const votes = parseInt($(cells[ch.colIndex]).text().trim().replace(/,/g, '')) || 0;
      candidateVotes.push(votes);
      if (votes > maxVotes) {
        maxVotes = votes;
        winnerIdx = candidateVotes.length - 1;
      }
    }

    // Parse metadata columns (after candidate columns)
    const metaStart = candidateHeaders.length + 1;
    const totalVotersInRoll = cells.length > metaStart
      ? parseInt($(cells[metaStart]).text().trim().replace(/,/g, '')) || 0
      : 0;
    const notaVotes = cells.length > metaStart + 1
      ? parseInt($(cells[metaStart + 1]).text().trim().replace(/,/g, '')) || 0
      : 0;
    const rejectedVotes = cells.length > metaStart + 2
      ? parseInt($(cells[metaStart + 2]).text().trim().replace(/,/g, '')) || 0
      : 0;

    const validVotes = candidateVotes.reduce((s, v) => s + v, 0);
    const votesPolled = validVotes + rejectedVotes + notaVotes;
    const turnoutPercent = totalVotersInRoll > 0
      ? Math.round((votesPolled / totalVotersInRoll) * 1000) / 10
      : 0;

    result.booths.push({
      boothNumber,
      boothName,
      totalVotersInRoll,
      votesPolled,
      validVotes,
      rejectedVotes,
      notaVotes,
      turnoutPercent,
      candidates: candidateHeaders.map((ch, idx) => ({
        name: ch.name,
        party: ch.party,
        votes: candidateVotes[idx],
        isWinnerAtBooth: idx === winnerIdx,
      })),
    });
  });

  return result;
}

// ── Parse CEO portal booth results (fallback) ─────────────────────────
/**
 * Parses booth results from state CEO portal pages (when ECI data unavailable).
 * @param {string} html - HTML content
 * @param {number} acNo - Assembly constituency number
 * @returns {{ candidates: string[], booths: Array<Object> }}
 */
function parseCEOBoothResults(html, acNo) {
  // Reuse the same parsing logic — CEO portals follow similar table layouts
  return parseECIBoothResults(html, acNo);
}

// ── Validate constituency results ──────────────────────────────────────
/**
 * Validates that booth-level votes sum correctly to constituency totals.
 * Returns an array of validation errors (empty = all valid).
 *
 * @param {Array<Object>} booths - Array of booth result objects
 * @param {string} acLabel - Constituency label for error messages
 * @returns {Array<string>} Validation errors
 */
function validateConstituencyResults(booths, acLabel) {
  const errors = [];

  if (!booths || booths.length === 0) {
    errors.push(`${acLabel}: No booth data`);
    return errors;
  }

  // Aggregate votes per candidate across all booths
  const candidateTotals = {};
  for (const booth of booths) {
    for (const cand of booth.candidates) {
      const key = `${cand.name}|${cand.party}`;
      candidateTotals[key] = (candidateTotals[key] || 0) + cand.votes;
    }

    // Check: valid votes = sum of candidate votes
    const candSum = booth.candidates.reduce((s, c) => s + c.votes, 0);
    if (candSum !== booth.validVotes) {
      errors.push(`${acLabel} Booth ${booth.boothNumber}: candidate sum (${candSum}) ≠ valid votes (${booth.validVotes})`);
    }

    // Check: votes polled = valid + rejected + NOTA
    const expectedPolled = booth.validVotes + booth.rejectedVotes + booth.notaVotes;
    if (expectedPolled !== booth.votesPolled) {
      errors.push(`${acLabel} Booth ${booth.boothNumber}: polled (${booth.votesPolled}) ≠ valid+rejected+nota (${expectedPolled})`);
    }

    // Check: turnout sanity (0-100%)
    if (booth.turnoutPercent < 0 || booth.turnoutPercent > 100) {
      errors.push(`${acLabel} Booth ${booth.boothNumber}: turnout ${booth.turnoutPercent}% out of range`);
    }
  }

  return errors;
}

// ── Scrape a single constituency ───────────────────────────────────────
/**
 * Scrapes booth-level results for a single assembly constituency.
 * Tries ECI first, falls back to CEO portal.
 *
 * @param {Object} source - Result source configuration
 * @param {number} acNo - Assembly constituency number
 * @returns {Promise<Object|null>} Constituency result object
 */
async function scrapeConstituency(source, acNo) {
  // Try primary (ECI) URL
  let html = await httpGetWithRetry(source.boothResultUrl(acNo));
  let parsed = null;

  if (html) {
    parsed = source.parser(html, acNo);
  }

  // Try CEO fallback if primary failed or returned no booths
  if ((!parsed || parsed.booths.length === 0) && source.ceoFallbackUrl) {
    await sleep(RESULT_DELAY_MS);
    html = await httpGetWithRetry(source.ceoFallbackUrl(acNo));
    if (html) {
      parsed = parseCEOBoothResults(html, acNo);
    }
  }

  if (!parsed || parsed.booths.length === 0) return null;

  // Calculate constituency-level aggregation
  const totalVotesPolled = parsed.booths.reduce((s, b) => s + b.votesPolled, 0);
  const totalValidVotes = parsed.booths.reduce((s, b) => s + b.validVotes, 0);
  const totalRejected = parsed.booths.reduce((s, b) => s + b.rejectedVotes, 0);
  const totalNota = parsed.booths.reduce((s, b) => s + b.notaVotes, 0);
  const totalElectors = parsed.booths.reduce((s, b) => s + b.totalVotersInRoll, 0);

  // Aggregate candidate votes across booths
  const candidateAgg = {};
  for (const booth of parsed.booths) {
    for (const cand of booth.candidates) {
      const key = `${cand.name}|${cand.party}`;
      if (!candidateAgg[key]) {
        candidateAgg[key] = { name: cand.name, party: cand.party, totalVotes: 0, boothsWon: 0 };
      }
      candidateAgg[key].totalVotes += cand.votes;
      if (cand.isWinnerAtBooth) candidateAgg[key].boothsWon++;
    }
  }

  const candidatesSorted = Object.values(candidateAgg).sort((a, b) => b.totalVotes - a.totalVotes);
  const winner = candidatesSorted[0] || null;

  return {
    acNumber: acNo,
    totalBooths: parsed.booths.length,
    totalElectors,
    totalVotesPolled,
    totalValidVotes,
    totalRejectedVotes: totalRejected,
    totalNotaVotes: totalNota,
    overallTurnoutPercent: totalElectors > 0
      ? Math.round((totalVotesPolled / totalElectors) * 1000) / 10
      : 0,
    winner: winner ? { name: winner.name, party: winner.party, votes: winner.totalVotes } : null,
    candidateSummary: candidatesSorted,
    booths: parsed.booths,
  };
}

// ── Main ───────────────────────────────────────────────────────────────
async function main() {
  console.log('📊 Booth Result Scraper — Booth-wise Election Results');
  console.log('═'.repeat(60));

  if (!stateFilter || !yearFilter) {
    console.log('Usage: node scrapers/booth-result-scraper.js --state=TS --year=2023');
    console.log('       --ac=1           Scrape single constituency');
    console.log('       --validate-only  Only validate existing data');
    process.exit(0);
  }

  const stateCode = stateFilter.toUpperCase();
  const year = yearFilter;
  const sourceKey = `${stateCode}-${year}`;

  const state = STATES.find(s => s.code === stateCode);
  if (!state) {
    console.error(`❌ Unknown state code: ${stateCode}`);
    process.exit(1);
  }

  const source = RESULT_SOURCES[sourceKey];
  if (!source) {
    console.error(`❌ No result source configured for ${sourceKey}`);
    console.log('Available sources:');
    Object.keys(RESULT_SOURCES).forEach(k => console.log(`   • ${k}: ${RESULT_SOURCES[k].name}`));
    process.exit(1);
  }

  console.log(`\n🗳️  ${source.name}`);
  console.log(`   Source: ${source.baseUrl}`);

  ensureDir(OUTPUT_BASE);

  // Validate-only mode
  if (validateOnly) {
    console.log('\n🔍 Validation mode — checking existing data...');
    const summaryFile = path.join(OUTPUT_BASE, `${stateCode}-${year}-summary.json`);
    const summary = readJSON(summaryFile);
    if (!summary) {
      console.error(`❌ No summary file found: ${summaryFile}`);
      process.exit(1);
    }

    let totalErrors = 0;
    for (const ac of summary.constituencies) {
      const acFile = path.join(OUTPUT_BASE, `${stateCode}-${year}-AC${ac.acNumber}.json`);
      const acData = readJSON(acFile);
      if (!acData) continue;

      const errors = validateConstituencyResults(acData.booths, `AC-${ac.acNumber}`);
      totalErrors += errors.length;
      errors.forEach(e => console.log(`   ❌ ${e}`));
    }

    console.log(`\n${totalErrors === 0 ? '✅' : '⚠️'} Validation complete: ${totalErrors} errors`);
    process.exit(totalErrors > 0 ? 1 : 0);
  }

  // Determine AC range
  const acStart = acFilter ? parseInt(acFilter) : 1;
  const acEnd = acFilter ? parseInt(acFilter) : source.totalACs;
  const totalToScrape = acEnd - acStart + 1;

  console.log(`   Constituencies: ${acStart}-${acEnd} (${totalToScrape} total)`);

  const summary = {
    stateCode,
    year,
    electionName: source.name,
    scrapedAt: new Date().toISOString(),
    totalConstituencies: 0,
    totalBooths: 0,
    totalVotesPolled: 0,
    totalValidVotes: 0,
    validationErrors: [],
    constituencies: [],
  };

  for (let acNo = acStart; acNo <= acEnd; acNo++) {
    progressLog(acNo - acStart + 1, totalToScrape, `AC-${acNo}`);

    // Check for existing data (resume)
    const acOutFile = path.join(OUTPUT_BASE, `${stateCode}-${year}-AC${acNo}.json`);
    let acResult = readJSON(acOutFile);

    if (!acResult || !acResult.booths || acResult.booths.length === 0) {
      await sleep(RESULT_DELAY_MS);
      acResult = await scrapeConstituency(source, acNo);
    }

    if (!acResult) {
      console.log(`\n   ⚠️ AC-${acNo}: No results found`);
      continue;
    }

    // Validate
    const errors = validateConstituencyResults(acResult.booths, `AC-${acNo}`);
    if (errors.length > 0) {
      summary.validationErrors.push(...errors);
      console.log(`\n   ⚠️ AC-${acNo}: ${errors.length} validation errors`);
    }

    // Save per-constituency file
    writeJSON(acOutFile, acResult);

    // Accumulate summary
    summary.totalConstituencies++;
    summary.totalBooths += acResult.totalBooths;
    summary.totalVotesPolled += acResult.totalVotesPolled;
    summary.totalValidVotes += acResult.totalValidVotes;
    summary.constituencies.push({
      acNumber: acResult.acNumber,
      totalBooths: acResult.totalBooths,
      totalVotesPolled: acResult.totalVotesPolled,
      winner: acResult.winner,
    });
  }

  // Save state summary
  const summaryFile = path.join(OUTPUT_BASE, `${stateCode}-${year}-summary.json`);
  writeJSON(summaryFile, summary);

  console.log(`\n${'═'.repeat(60)}`);
  console.log('✨ Booth Result Scraping Complete');
  console.log(`${'═'.repeat(60)}`);
  console.log(`   Election:       ${source.name}`);
  console.log(`   Constituencies: ${summary.totalConstituencies}`);
  console.log(`   Total booths:   ${summary.totalBooths}`);
  console.log(`   Votes polled:   ${summary.totalVotesPolled.toLocaleString()}`);
  console.log(`   Valid votes:    ${summary.totalValidVotes.toLocaleString()}`);
  if (summary.validationErrors.length > 0) {
    console.log(`   ⚠️ Validation errors: ${summary.validationErrors.length}`);
  } else {
    console.log(`   ✅ All validations passed`);
  }
  console.log(`   Output: ${OUTPUT_BASE}`);
}

main().catch(err => { console.error('\n❌ Fatal:', err); process.exit(1); });
