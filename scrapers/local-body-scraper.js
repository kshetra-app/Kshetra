#!/usr/bin/env node
/**
 * Local Body Scraper — Panchayat/Municipal election results
 * ══════════════════════════════════════════════════════════════════════
 * Sources:
 *   - Telangana SEC: tsec.gov.in
 *   - Andhra Pradesh SEC: apsec.gov.in
 *
 * Data: Sarpanch, Ward Member, MPTC, ZPTC election results at panchayat level
 *
 * Usage:
 *   node scrapers/local-body-scraper.js --state=TS --year=2019
 *   node scrapers/local-body-scraper.js --state=AP --year=2021
 *   node scrapers/local-body-scraper.js --state=TS --year=2019 --district=Adilabad
 *   node scrapers/local-body-scraper.js --state=TS --year=2019 --type=sarpanch
 */

const cheerio = require('cheerio');
const { STATES, LOCAL_BODY_OUTPUT_DIR, HIERARCHY_OUTPUT_DIR } = require('./config');
const { httpGet, sleep, ensureDir, writeJSON, readJSON, progressLog, normalizeParty } = require('./utils');
const path = require('path');
const fs = require('fs');

// ── CLI args ───────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const stateFilter = args.find(a => a.startsWith('--state='))?.split('=')[1];
const yearFilter = args.find(a => a.startsWith('--year='))?.split('=')[1];
const districtFilter = args.find(a => a.startsWith('--district='))?.split('=')[1];
const typeFilter = args.find(a => a.startsWith('--type='))?.split('=')[1]; // sarpanch, mptc, zptc, ward

const OUTPUT_BASE = LOCAL_BODY_OUTPUT_DIR;
const SEC_DELAY_MS = 500; // Rate limit between SEC portal requests
const MAX_RETRIES = 3;

// ── SEC Portal Configurations ──────────────────────────────────────────
/**
 * State Election Commission portal configurations.
 * Each state has its own URL patterns and result page layouts.
 */
const SEC_CONFIGS = {
  TS: {
    name: 'Telangana State Election Commission',
    url: 'https://tsec.gov.in',
    electionYears: {
      2019: {
        label: 'Gram Panchayat Elections 2019',
        districtListUrl: 'https://tsec.gov.in/GP2019/districtlist.aspx',
        mandalListUrl: (districtId) =>
          `https://tsec.gov.in/GP2019/mandallist.aspx?did=${districtId}`,
        panchayatListUrl: (districtId, mandalId) =>
          `https://tsec.gov.in/GP2019/panchayatlist.aspx?did=${districtId}&mid=${mandalId}`,
        sarpanchResultUrl: (districtId, mandalId, panchayatId) =>
          `https://tsec.gov.in/GP2019/sarpanchresult.aspx?did=${districtId}&mid=${mandalId}&pid=${panchayatId}`,
        wardResultUrl: (districtId, mandalId, panchayatId) =>
          `https://tsec.gov.in/GP2019/wardresult.aspx?did=${districtId}&mid=${mandalId}&pid=${panchayatId}`,
        mptcResultUrl: (districtId, mandalId) =>
          `https://tsec.gov.in/GP2019/mptcresult.aspx?did=${districtId}&mid=${mandalId}`,
        zptcResultUrl: (districtId) =>
          `https://tsec.gov.in/GP2019/zptcresult.aspx?did=${districtId}`,
      },
      2024: {
        label: 'Gram Panchayat Elections 2024',
        districtListUrl: 'https://tsec.gov.in/GP2024/districtlist.aspx',
        mandalListUrl: (districtId) =>
          `https://tsec.gov.in/GP2024/mandallist.aspx?did=${districtId}`,
        panchayatListUrl: (districtId, mandalId) =>
          `https://tsec.gov.in/GP2024/panchayatlist.aspx?did=${districtId}&mid=${mandalId}`,
        sarpanchResultUrl: (districtId, mandalId, panchayatId) =>
          `https://tsec.gov.in/GP2024/sarpanchresult.aspx?did=${districtId}&mid=${mandalId}&pid=${panchayatId}`,
        wardResultUrl: (districtId, mandalId, panchayatId) =>
          `https://tsec.gov.in/GP2024/wardresult.aspx?did=${districtId}&mid=${mandalId}&pid=${panchayatId}`,
        mptcResultUrl: (districtId, mandalId) =>
          `https://tsec.gov.in/GP2024/mptcresult.aspx?did=${districtId}&mid=${mandalId}`,
        zptcResultUrl: (districtId) =>
          `https://tsec.gov.in/GP2024/zptcresult.aspx?did=${districtId}`,
      },
    },
  },
  AP: {
    name: 'Andhra Pradesh State Election Commission',
    url: 'https://apsec.gov.in',
    electionYears: {
      2021: {
        label: 'Gram Panchayat Elections 2021',
        districtListUrl: 'https://apsec.gov.in/GP2021/districtlist.aspx',
        mandalListUrl: (districtId) =>
          `https://apsec.gov.in/GP2021/mandallist.aspx?did=${districtId}`,
        panchayatListUrl: (districtId, mandalId) =>
          `https://apsec.gov.in/GP2021/panchayatlist.aspx?did=${districtId}&mid=${mandalId}`,
        sarpanchResultUrl: (districtId, mandalId, panchayatId) =>
          `https://apsec.gov.in/GP2021/sarpanchresult.aspx?did=${districtId}&mid=${mandalId}&pid=${panchayatId}`,
        wardResultUrl: (districtId, mandalId, panchayatId) =>
          `https://apsec.gov.in/GP2021/wardresult.aspx?did=${districtId}&mid=${mandalId}&pid=${panchayatId}`,
        mptcResultUrl: (districtId, mandalId) =>
          `https://apsec.gov.in/GP2021/mptcresult.aspx?did=${districtId}&mid=${mandalId}`,
        zptcResultUrl: (districtId) =>
          `https://apsec.gov.in/GP2021/zptcresult.aspx?did=${districtId}`,
      },
    },
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
        const backoff = SEC_DELAY_MS * Math.pow(2, attempt - 1);
        console.log(`\n   ⚠️ Retry ${attempt}/${retries} after ${backoff}ms: ${err.message}`);
        await sleep(backoff);
      }
    }
  }
  return null;
}

// ── Fetch district list from SEC portal ────────────────────────────────
/**
 * Scrapes the list of districts from an SEC portal page.
 * @param {string} url - District list URL
 * @returns {Promise<Array<{id: string, name: string}>>}
 */
async function fetchDistrictList(url) {
  const html = await httpGetWithRetry(url);
  if (!html) return [];

  const $ = cheerio.load(html);
  const districts = [];

  // SEC portals typically use <select> dropdowns or <a> links
  $('select#ddlDistrict option, a[href*="did="], table tr td a').each((_, el) => {
    const tag = $(el).prop('tagName').toLowerCase();
    if (tag === 'option') {
      const val = $(el).attr('value');
      const text = $(el).text().trim();
      if (val && val !== '0' && val !== '' && text) {
        districts.push({ id: val, name: text });
      }
    } else {
      const href = $(el).attr('href') || '';
      const didMatch = href.match(/did=(\d+)/i);
      const text = $(el).text().trim();
      if (didMatch && text) {
        districts.push({ id: didMatch[1], name: text });
      }
    }
  });

  // Deduplicate by id
  const seen = new Set();
  return districts.filter(d => {
    if (seen.has(d.id)) return false;
    seen.add(d.id);
    return true;
  });
}

// ── Fetch mandal list for a district ───────────────────────────────────
/**
 * Scrapes the list of mandals from an SEC portal page.
 * @param {string} url - Mandal list URL
 * @returns {Promise<Array<{id: string, name: string}>>}
 */
async function fetchMandalList(url) {
  const html = await httpGetWithRetry(url);
  if (!html) return [];

  const $ = cheerio.load(html);
  const mandals = [];

  $('select#ddlMandal option, a[href*="mid="], table tr td a').each((_, el) => {
    const tag = $(el).prop('tagName').toLowerCase();
    if (tag === 'option') {
      const val = $(el).attr('value');
      const text = $(el).text().trim();
      if (val && val !== '0' && val !== '' && text) {
        mandals.push({ id: val, name: text });
      }
    } else {
      const href = $(el).attr('href') || '';
      const midMatch = href.match(/mid=(\d+)/i);
      const text = $(el).text().trim();
      if (midMatch && text) {
        mandals.push({ id: midMatch[1], name: text });
      }
    }
  });

  const seen = new Set();
  return mandals.filter(m => {
    if (seen.has(m.id)) return false;
    seen.add(m.id);
    return true;
  });
}

// ── Fetch panchayat list for a mandal ──────────────────────────────────
/**
 * Scrapes the list of panchayats from an SEC portal page.
 * @param {string} url - Panchayat list URL
 * @returns {Promise<Array<{id: string, name: string}>>}
 */
async function fetchPanchayatList(url) {
  const html = await httpGetWithRetry(url);
  if (!html) return [];

  const $ = cheerio.load(html);
  const panchayats = [];

  $('select#ddlPanchayat option, a[href*="pid="], table tr td a').each((_, el) => {
    const tag = $(el).prop('tagName').toLowerCase();
    if (tag === 'option') {
      const val = $(el).attr('value');
      const text = $(el).text().trim();
      if (val && val !== '0' && val !== '' && text) {
        panchayats.push({ id: val, name: text });
      }
    } else {
      const href = $(el).attr('href') || '';
      const pidMatch = href.match(/pid=(\d+)/i);
      const text = $(el).text().trim();
      if (pidMatch && text) {
        panchayats.push({ id: pidMatch[1], name: text });
      }
    }
  });

  const seen = new Set();
  return panchayats.filter(p => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });
}

// ── Parse Sarpanch election results ────────────────────────────────────
/**
 * Parses Sarpanch election results from an SEC result page.
 * @param {string} html - HTML content
 * @returns {Object|null} Sarpanch result object
 */
function parseSarpanchResult(html) {
  if (!html) return null;
  const $ = cheerio.load(html);
  const candidates = [];

  $('table tr, table.table tbody tr').each((i, row) => {
    if (i === 0) return; // Skip header
    const cells = $(row).find('td');
    if (cells.length < 3) return;

    const name = $(cells[0]).text().trim() || $(cells[1]).text().trim();
    const party = $(cells[1]).text().trim() || $(cells[2]).text().trim();
    const votes = parseInt($(cells[cells.length - 1]).text().trim().replace(/,/g, '')) || 0;

    if (name && name.length > 1) {
      candidates.push({
        name,
        party: normalizeParty(party),
        votes,
      });
    }
  });

  if (candidates.length === 0) return null;

  // Sort by votes and determine winner
  candidates.sort((a, b) => b.votes - a.votes);
  const winner = candidates[0];
  const totalVotes = candidates.reduce((s, c) => s + c.votes, 0);

  return {
    type: 'sarpanch',
    totalCandidates: candidates.length,
    totalVotes,
    winner: { name: winner.name, party: winner.party, votes: winner.votes },
    margin: candidates.length > 1 ? winner.votes - candidates[1].votes : winner.votes,
    candidates,
  };
}

// ── Parse Ward Member results ──────────────────────────────────────────
/**
 * Parses ward-wise member election results from an SEC result page.
 * @param {string} html - HTML content
 * @returns {Array<Object>} Array of ward result objects
 */
function parseWardResults(html) {
  if (!html) return [];
  const $ = cheerio.load(html);
  const wards = [];
  let currentWard = null;

  $('table tr, table.table tbody tr').each((i, row) => {
    const cells = $(row).find('td');
    if (cells.length < 2) return;

    const firstCell = $(cells[0]).text().trim();

    // Detect ward header rows
    const wardMatch = firstCell.match(/ward\s*(?:no\.?\s*)?(\d+)/i);
    if (wardMatch) {
      if (currentWard && currentWard.candidates.length > 0) {
        wards.push(currentWard);
      }
      currentWard = {
        wardNumber: parseInt(wardMatch[1]),
        candidates: [],
        winner: null,
        totalVotes: 0,
      };
      return;
    }

    // Candidate rows
    if (!currentWard) return;
    const name = firstCell || $(cells[1]).text().trim();
    const votes = parseInt($(cells[cells.length - 1]).text().trim().replace(/,/g, '')) || 0;
    const party = cells.length > 2 ? normalizeParty($(cells[1]).text().trim()) : 'IND';

    if (name && name.length > 1 && !/total|ward|s\.?\s*no/i.test(name)) {
      currentWard.candidates.push({ name, party, votes });
    }
  });

  // Push last ward
  if (currentWard && currentWard.candidates.length > 0) {
    wards.push(currentWard);
  }

  // Determine winners per ward
  for (const ward of wards) {
    ward.candidates.sort((a, b) => b.votes - a.votes);
    ward.totalVotes = ward.candidates.reduce((s, c) => s + c.votes, 0);
    ward.winner = ward.candidates[0] || null;
  }

  return wards;
}

// ── Parse MPTC/ZPTC results ───────────────────────────────────────────
/**
 * Parses MPTC (Mandal Parishad Territorial Constituency) or
 * ZPTC (Zilla Parishad Territorial Constituency) results.
 * @param {string} html - HTML content
 * @param {'mptc'|'zptc'} type - Election type
 * @returns {Array<Object>} Array of result objects
 */
function parseTerritorialResults(html, type) {
  if (!html) return [];
  const $ = cheerio.load(html);
  const results = [];
  let currentSeat = null;

  $('table tr, table.table tbody tr').each((i, row) => {
    const cells = $(row).find('td');
    if (cells.length < 2) return;

    const firstCell = $(cells[0]).text().trim();

    // Detect seat/constituency header rows
    const seatMatch = firstCell.match(/(?:mptc|zptc|constituency)\s*(?:no\.?\s*)?(\d+)/i);
    if (seatMatch || (cells.length === 1 && firstCell.length > 3)) {
      if (currentSeat && currentSeat.candidates.length > 0) {
        results.push(currentSeat);
      }
      currentSeat = {
        type,
        seatNumber: seatMatch ? parseInt(seatMatch[1]) : results.length + 1,
        seatName: firstCell,
        candidates: [],
        winner: null,
        totalVotes: 0,
      };
      return;
    }

    if (!currentSeat) return;
    const name = firstCell;
    const party = cells.length > 2 ? normalizeParty($(cells[1]).text().trim()) : 'IND';
    const votes = parseInt($(cells[cells.length - 1]).text().trim().replace(/,/g, '')) || 0;

    if (name && name.length > 1 && !/total|s\.?\s*no|header/i.test(name)) {
      currentSeat.candidates.push({ name, party, votes });
    }
  });

  if (currentSeat && currentSeat.candidates.length > 0) {
    results.push(currentSeat);
  }

  for (const seat of results) {
    seat.candidates.sort((a, b) => b.votes - a.votes);
    seat.totalVotes = seat.candidates.reduce((s, c) => s + c.votes, 0);
    seat.winner = seat.candidates[0] || null;
  }

  return results;
}

// ── Load LGD hierarchy for cross-referencing ───────────────────────────
/**
 * Loads the LGD hierarchy JSON for mapping panchayat names to LGD codes.
 * @param {string} stateCode
 * @returns {Object|null} LGD hierarchy or null
 */
function loadLGDHierarchy(stateCode) {
  const filePath = path.join(HIERARCHY_OUTPUT_DIR, `${stateCode}-lgd-hierarchy.json`);
  return readJSON(filePath);
}

/**
 * Attempts to match a panchayat name to an LGD code using the hierarchy.
 * @param {Object|null} lgd - LGD hierarchy object
 * @param {string} districtName - District name
 * @param {string} mandalName - Mandal name
 * @param {string} panchayatName - Panchayat name
 * @returns {number|null} LGD code or null
 */
function findPanchayatLGDCode(lgd, districtName, mandalName, panchayatName) {
  if (!lgd || !lgd.districts) return null;

  const normalize = (s) => s.toLowerCase().replace(/[^a-z]/g, '');
  const distNorm = normalize(districtName);
  const mandNorm = normalize(mandalName);
  const panchNorm = normalize(panchayatName);

  for (const dist of lgd.districts) {
    if (normalize(dist.name) !== distNorm) continue;
    for (const mandal of dist.mandals || []) {
      if (normalize(mandal.name) !== mandNorm) continue;
      for (const panch of mandal.panchayats || []) {
        if (normalize(panch.name) === panchNorm) return panch.lgdCode;
      }
    }
  }
  return null;
}

// ── Party-wise aggregation ─────────────────────────────────────────────
/**
 * Aggregates results by party at mandal and district levels.
 * @param {Array<Object>} panchayatResults - All panchayat-level results
 * @returns {{ byDistrict: Object, byMandal: Object }}
 */
function aggregateByParty(panchayatResults) {
  const byDistrict = {};
  const byMandal = {};

  for (const p of panchayatResults) {
    const distKey = p.districtName || 'Unknown';
    const mandKey = `${distKey}|${p.mandalName || 'Unknown'}`;

    // Initialize
    if (!byDistrict[distKey]) byDistrict[distKey] = { total: 0, parties: {} };
    if (!byMandal[mandKey]) byMandal[mandKey] = { district: distKey, mandal: p.mandalName, total: 0, parties: {} };

    // Count sarpanch winners by party
    if (p.sarpanchResult && p.sarpanchResult.winner) {
      const party = p.sarpanchResult.winner.party;
      byDistrict[distKey].total++;
      byDistrict[distKey].parties[party] = (byDistrict[distKey].parties[party] || 0) + 1;
      byMandal[mandKey].total++;
      byMandal[mandKey].parties[party] = (byMandal[mandKey].parties[party] || 0) + 1;
    }
  }

  return { byDistrict, byMandal };
}

// ── Main scraping logic ────────────────────────────────────────────────
/**
 * Scrapes local body election data for a state and year.
 * @param {Object} state - State config from STATES array
 * @param {string} year - Election year
 * @returns {Promise<Object>} Complete local body results
 */
async function scrapeLocalBodyElections(state, year) {
  const secConfig = SEC_CONFIGS[state.code];
  if (!secConfig) {
    console.log(`   ⚠️ No SEC config for ${state.code}`);
    return null;
  }

  const yearConfig = secConfig.electionYears[year];
  if (!yearConfig) {
    console.log(`   ⚠️ No election data for ${state.code} year ${year}`);
    console.log('   Available years:', Object.keys(secConfig.electionYears).join(', '));
    return null;
  }

  console.log(`   🏛️  ${yearConfig.label}`);
  console.log(`   🌐 Source: ${secConfig.url}`);

  // Load LGD hierarchy for cross-referencing
  const lgd = loadLGDHierarchy(state.code);
  if (lgd) {
    console.log(`   📂 LGD hierarchy loaded for panchayat ID matching`);
  } else {
    console.log(`   ⚠️ No LGD hierarchy found — panchayat IDs will be null`);
  }

  // Fetch district list
  const districts = await fetchDistrictList(yearConfig.districtListUrl);
  console.log(`   Found ${districts.length} districts`);

  if (districts.length === 0) return null;

  // Filter by district if specified
  const toScrape = districtFilter
    ? districts.filter(d => d.name.toLowerCase().includes(districtFilter.toLowerCase()))
    : districts;

  const allResults = [];
  let totalPanchayats = 0;
  let totalMandals = 0;

  for (let di = 0; di < toScrape.length; di++) {
    const district = toScrape[di];
    console.log(`\n   📍 District: ${district.name} (${di + 1}/${toScrape.length})`);

    // Fetch mandals
    await sleep(SEC_DELAY_MS);
    const mandals = await fetchMandalList(yearConfig.mandalListUrl(district.id));
    console.log(`      Mandals: ${mandals.length}`);
    totalMandals += mandals.length;

    // Scrape ZPTC results for district (if not filtered by type)
    let zptcResults = [];
    if (!typeFilter || typeFilter === 'zptc') {
      await sleep(SEC_DELAY_MS);
      const zptcHtml = await httpGetWithRetry(yearConfig.zptcResultUrl(district.id));
      zptcResults = parseTerritorialResults(zptcHtml, 'zptc');
    }

    for (let mi = 0; mi < mandals.length; mi++) {
      const mandal = mandals[mi];
      progressLog(mi + 1, mandals.length, `${district.name} → ${mandal.name}`);

      // Scrape MPTC results for mandal
      let mptcResults = [];
      if (!typeFilter || typeFilter === 'mptc') {
        await sleep(SEC_DELAY_MS);
        const mptcHtml = await httpGetWithRetry(yearConfig.mptcResultUrl(district.id, mandal.id));
        mptcResults = parseTerritorialResults(mptcHtml, 'mptc');
      }

      // Fetch panchayats
      await sleep(SEC_DELAY_MS);
      const panchayats = await fetchPanchayatList(yearConfig.panchayatListUrl(district.id, mandal.id));
      totalPanchayats += panchayats.length;

      for (const panchayat of panchayats) {
        // Scrape sarpanch result
        let sarpanchResult = null;
        if (!typeFilter || typeFilter === 'sarpanch') {
          await sleep(SEC_DELAY_MS);
          const sarpanchHtml = await httpGetWithRetry(
            yearConfig.sarpanchResultUrl(district.id, mandal.id, panchayat.id)
          );
          sarpanchResult = parseSarpanchResult(sarpanchHtml);
        }

        // Scrape ward results
        let wardResults = [];
        if (!typeFilter || typeFilter === 'ward') {
          await sleep(SEC_DELAY_MS);
          const wardHtml = await httpGetWithRetry(
            yearConfig.wardResultUrl(district.id, mandal.id, panchayat.id)
          );
          wardResults = parseWardResults(wardHtml);
        }

        // Cross-reference with LGD hierarchy
        const lgdCode = findPanchayatLGDCode(lgd, district.name, mandal.name, panchayat.name);

        allResults.push({
          districtName: district.name,
          districtId: district.id,
          mandalName: mandal.name,
          mandalId: mandal.id,
          panchayatName: panchayat.name,
          panchayatId: panchayat.id,
          lgdPanchayatCode: lgdCode,
          sarpanchResult,
          wardResults,
          mptcResults: mi === 0 ? mptcResults : [], // Only attach MPTC to first panchayat of mandal
          zptcResults: mi === 0 && panchayats.indexOf(panchayat) === 0 ? zptcResults : [],
        });
      }
    }
  }

  // Party-wise aggregation
  const aggregation = aggregateByParty(allResults);

  return {
    stateCode: state.code,
    stateName: state.name,
    year,
    electionLabel: yearConfig.label,
    scrapedAt: new Date().toISOString(),
    totalDistricts: toScrape.length,
    totalMandals,
    totalPanchayats,
    totalResults: allResults.length,
    partyAggregation: aggregation,
    results: allResults,
  };
}

// ── Main ───────────────────────────────────────────────────────────────
async function main() {
  console.log('🏛️  Local Body Scraper — Panchayat/Municipal Election Results');
  console.log('═'.repeat(60));

  if (!stateFilter || !yearFilter) {
    console.log('Usage: node scrapers/local-body-scraper.js --state=TS --year=2019');
    console.log('       --district=Adilabad  Filter by district');
    console.log('       --type=sarpanch      Filter by election type');
    process.exit(0);
  }

  const stateCode = stateFilter.toUpperCase();
  const year = yearFilter;

  const state = STATES.find(s => s.code === stateCode);
  if (!state) {
    console.error(`❌ Unknown state code: ${stateCode}`);
    process.exit(1);
  }

  console.log(`\n🗳️  ${state.name} — Local Body Elections ${year}`);

  ensureDir(OUTPUT_BASE);

  const results = await scrapeLocalBodyElections(state, year);
  if (!results) {
    console.error('❌ No results scraped');
    process.exit(1);
  }

  // Save output
  const outFile = path.join(OUTPUT_BASE, `${stateCode}-${year}-panchayat-results.json`);
  writeJSON(outFile, results);

  console.log(`\n${'═'.repeat(60)}`);
  console.log('✨ Local Body Scraping Complete');
  console.log(`${'═'.repeat(60)}`);
  console.log(`   Election:     ${results.electionLabel}`);
  console.log(`   Districts:    ${results.totalDistricts}`);
  console.log(`   Mandals:      ${results.totalMandals}`);
  console.log(`   Panchayats:   ${results.totalPanchayats}`);
  console.log(`   Results:      ${results.totalResults}`);

  // Print party-wise summary
  const distAgg = results.partyAggregation.byDistrict;
  const totalSarpanchs = Object.values(distAgg).reduce((s, d) => s + d.total, 0);
  const partyTotals = {};
  for (const d of Object.values(distAgg)) {
    for (const [party, count] of Object.entries(d.parties)) {
      partyTotals[party] = (partyTotals[party] || 0) + count;
    }
  }
  const sortedParties = Object.entries(partyTotals).sort((a, b) => b[1] - a[1]);

  if (sortedParties.length > 0) {
    console.log(`\n   Sarpanch Winners by Party (${totalSarpanchs} total):`);
    for (const [party, count] of sortedParties.slice(0, 10)) {
      const pct = ((count / totalSarpanchs) * 100).toFixed(1);
      console.log(`     ${party.padEnd(15)} ${String(count).padStart(6)} (${pct}%)`);
    }
  }

  console.log(`\n   💾 Output: ${outFile}`);
}

main().catch(err => { console.error('\n❌ Fatal:', err); process.exit(1); });
