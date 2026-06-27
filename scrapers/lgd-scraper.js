#!/usr/bin/env node
/**
 * LGD Scraper — Local Government Directory (lgdirectory.gov.in)
 * ══════════════════════════════════════════════════════════════════════
 * Source: lgdirectory.gov.in (Ministry of Panchayati Raj, Govt. of India)
 * Data:   State → District → Mandal/Block → Panchayat → Village hierarchy
 *         with LGD codes, names in English and local language
 *
 * Usage:
 *   node scrapers/lgd-scraper.js --state=TS        # Single state
 *   node scrapers/lgd-scraper.js --all              # All states
 *   node scrapers/lgd-scraper.js --state=TS --force # Re-scrape (ignore resume)
 */

const cheerio = require('cheerio');
const { STATES, HIERARCHY_OUTPUT_DIR } = require('./config');
const { httpGet, sleep, ensureDir, writeJSON, readJSON, progressLog } = require('./utils');
const path = require('path');
const fs = require('fs');

// ── CLI args ───────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const stateFilter = args.find(a => a.startsWith('--state='))?.split('=')[1];
const scrapeAll = args.includes('--all');
const forceRescrape = args.includes('--force');

const OUTPUT_BASE = HIERARCHY_OUTPUT_DIR;
const LGD_DELAY_MS = 500; // 500ms rate limit between LGD requests

// ── LGD State Code Mapping ────────────────────────────────────────────
/** Maps our internal state codes to LGD's numeric state codes */
const LGD_STATE_CODES = {
  AP: '28', AR: '12', AS: '18', BR: '10', CG: '22', DL: '07',
  GA: '30', GJ: '24', HR: '06', HP: '02', JK: '01', JH: '20',
  KA: '29', KL: '32', MP: '23', MH: '27', MN: '14', ML: '17',
  MZ: '15', NL: '13', OD: '21', PY: '34', PB: '03', RJ: '08',
  SK: '11', TN: '33', TS: '36', TR: '16', UP: '09', UK: '05',
  WB: '19',
};

// ── LGD API Endpoints ─────────────────────────────────────────────────
const LGD_BASE = 'https://lgdirectory.gov.in';

/**
 * Build the LGD API URL for fetching entities by parent code.
 * @param {'district'|'block'|'panchayat'|'village'} entityType - Type to fetch
 * @param {string} parentCode - Parent entity LGD code
 * @returns {string} Full API URL
 */
function lgdApiUrl(entityType, parentCode) {
  const endpoints = {
    district: `${LGD_BASE}/globalviewaliasaliasaliasaliasNewAction-getLocalBodyJsonDataByStateCode.do?stateCode=${parentCode}`,
    block: `${LGD_BASE}/globalviewaliasaliasaliasaliasNewAction-getLocalBodyJsonDataByDistrictCode.do?districtCode=${parentCode}`,
    panchayat: `${LGD_BASE}/globalviewaliasaliasaliasaliasNewAction-getLocalBodyJsonDataByBlockCode.do?blockCode=${parentCode}`,
    village: `${LGD_BASE}/globalviewaliasaliasaliasaliasNewAction-getLocalBodyJsonDataByGPCode.do?gpCode=${parentCode}`,
  };
  return endpoints[entityType] || '';
}

// ── HTML Fallback URLs (scrape the web interface) ──────────────────────
/**
 * Build the LGD HTML page URL for fallback scraping.
 * @param {'district'|'block'|'panchayat'|'village'} entityType
 * @param {string} parentCode
 * @returns {string} HTML page URL
 */
function lgdHtmlUrl(entityType, parentCode) {
  const pages = {
    district: `${LGD_BASE}/viewDistrict.do?stateCode=${parentCode}`,
    block: `${LGD_BASE}/viewBlock.do?districtCode=${parentCode}`,
    panchayat: `${LGD_BASE}/viewPanchayat.do?blockCode=${parentCode}`,
    village: `${LGD_BASE}/viewVillage.do?gpCode=${parentCode}`,
  };
  return pages[entityType] || '';
}

// ── Fetch entities via JSON API ────────────────────────────────────────
/**
 * Fetches child entities from the LGD JSON API.
 * Returns parsed array or null on failure.
 * @param {'district'|'block'|'panchayat'|'village'} entityType
 * @param {string} parentCode
 * @returns {Promise<Array<{name: string, code: number, nameLocal?: string}>|null>}
 */
async function fetchEntitiesApi(entityType, parentCode) {
  const url = lgdApiUrl(entityType, parentCode);
  if (!url) return null;

  try {
    const raw = await httpGet(url, { headers: { 'Accept': 'application/json' } });
    if (!raw) return null;

    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return null;

    return data.map(item => ({
      name: (item.entityNameEnglish || item.name || item.entityName || '').trim(),
      code: parseInt(item.entityCode || item.code || item.lgdCode || 0),
      nameLocal: (item.entityNameLocal || item.localName || '').trim() || undefined,
    })).filter(e => e.name && e.code);
  } catch {
    return null;
  }
}

// ── Fetch entities via HTML scraping (fallback) ────────────────────────
/**
 * Scrapes child entities from the LGD HTML web interface.
 * Used as fallback when the JSON API is unavailable.
 * @param {'district'|'block'|'panchayat'|'village'} entityType
 * @param {string} parentCode
 * @returns {Promise<Array<{name: string, code: number, nameLocal?: string}>|null>}
 */
async function fetchEntitiesHtml(entityType, parentCode) {
  const url = lgdHtmlUrl(entityType, parentCode);
  if (!url) return null;

  try {
    const html = await httpGet(url);
    if (!html) return null;

    const $ = cheerio.load(html);
    const entities = [];

    // LGD tables typically have entity name and code in columns
    $('table.table tbody tr, table#tblEntity tbody tr').each((_, row) => {
      const cells = $(row).find('td');
      if (cells.length < 2) return;

      // Common patterns: [S.No, Code, Name, NameLocal, ...]
      // or [S.No, Name, Code, ...]
      let code = 0, name = '', nameLocal = '';

      cells.each((i, cell) => {
        const text = $(cell).text().trim();
        if (i === 1 && /^\d+$/.test(text)) {
          code = parseInt(text);
        } else if (i === 1 && !/^\d+$/.test(text)) {
          name = text;
        } else if (i === 2 && /^\d+$/.test(text)) {
          code = parseInt(text);
        } else if (i === 2 && !/^\d+$/.test(text)) {
          name = name || text;
        } else if (i === 3) {
          nameLocal = text;
        }
      });

      // Fallback: try to extract code from links
      if (!code) {
        const link = $(row).find('a[href]').attr('href') || '';
        const codeMatch = link.match(/Code=(\d+)/i);
        if (codeMatch) code = parseInt(codeMatch[1]);
      }

      if (name && code) {
        entities.push({ name, code, nameLocal: nameLocal || undefined });
      }
    });

    return entities.length > 0 ? entities : null;
  } catch {
    return null;
  }
}

// ── Fetch with API-first, HTML-fallback strategy ───────────────────────
/**
 * Attempts to fetch entities via API first, falls back to HTML scraping.
 * @param {'district'|'block'|'panchayat'|'village'} entityType
 * @param {string} parentCode
 * @returns {Promise<Array<{name: string, code: number, nameLocal?: string}>>}
 */
async function fetchEntities(entityType, parentCode) {
  // Try JSON API first
  let entities = await fetchEntitiesApi(entityType, parentCode);
  if (entities && entities.length > 0) return entities;

  // Fallback to HTML scraping
  await sleep(LGD_DELAY_MS);
  entities = await fetchEntitiesHtml(entityType, parentCode);
  return entities || [];
}

// ── Resume: Load partial progress ──────────────────────────────────────
/**
 * Loads partially-scraped hierarchy from the output file.
 * Used for resume capability after interruption.
 * @param {string} stateCode
 * @returns {Object|null} Previously scraped hierarchy or null
 */
function loadPartialProgress(stateCode) {
  if (forceRescrape) return null;
  const filePath = path.join(OUTPUT_BASE, `${stateCode}-lgd-hierarchy.json`);
  return readJSON(filePath);
}

/**
 * Checks whether a district (by LGD code) was already fully scraped.
 * A district is "complete" if it has mandals, and each mandal has panchayats.
 * @param {Object|null} existing - Previously loaded hierarchy
 * @param {number} districtCode - LGD code of district
 * @returns {boolean}
 */
function isDistrictComplete(existing, districtCode) {
  if (!existing || !existing.districts) return false;
  const dist = existing.districts.find(d => d.lgdCode === districtCode);
  if (!dist || !dist.mandals || dist.mandals.length === 0) return false;
  // Consider complete if at least some mandals have panchayats
  return dist.mandals.some(m => m.panchayats && m.panchayats.length > 0);
}

/**
 * Retrieves a previously-scraped district from the existing hierarchy.
 * @param {Object|null} existing - Previously loaded hierarchy
 * @param {number} districtCode - LGD code of district
 * @returns {Object|null}
 */
function getExistingDistrict(existing, districtCode) {
  if (!existing || !existing.districts) return null;
  return existing.districts.find(d => d.lgdCode === districtCode) || null;
}

// ── Scrape a single state hierarchy ────────────────────────────────────
/**
 * Scrapes the full LGD hierarchy for a single state.
 * State → District → Mandal/Block → Panchayat → Village
 *
 * @param {Object} state - State config from STATES array
 * @returns {Promise<Object>} Complete hierarchy object
 */
async function scrapeStateHierarchy(state) {
  const lgdStateCode = LGD_STATE_CODES[state.code];
  if (!lgdStateCode) {
    console.log(`   ⚠️ No LGD state code mapping for ${state.code}`);
    return null;
  }

  const existing = loadPartialProgress(state.code);
  if (existing) {
    console.log(`   📂 Found partial progress, will resume`);
  }

  // Step 1: Fetch districts
  console.log(`   📍 Fetching districts...`);
  const districts = await fetchEntities('district', lgdStateCode);
  console.log(`   Found ${districts.length} districts`);

  if (districts.length === 0) {
    console.log(`   ⚠️ No districts found, skipping state`);
    return null;
  }

  const hierarchy = {
    stateCode: state.code,
    stateName: state.name,
    lgdStateCode,
    scrapedAt: new Date().toISOString(),
    districts: [],
  };

  // Step 2: For each district, fetch mandals/blocks
  for (let di = 0; di < districts.length; di++) {
    const dist = districts[di];
    progressLog(di + 1, districts.length, `District: ${dist.name}`);

    // Resume: skip if already complete
    if (isDistrictComplete(existing, dist.code)) {
      const existingDist = getExistingDistrict(existing, dist.code);
      if (existingDist) {
        hierarchy.districts.push(existingDist);
        continue;
      }
    }

    await sleep(LGD_DELAY_MS);
    const mandals = await fetchEntities('block', String(dist.code));

    const districtObj = {
      name: dist.name,
      lgdCode: dist.code,
      nameLocal: dist.nameLocal,
      mandals: [],
    };

    // Step 3: For each mandal, fetch panchayats
    for (let mi = 0; mi < mandals.length; mi++) {
      const mandal = mandals[mi];
      if (mi % 5 === 0) {
        progressLog(di + 1, districts.length, `${dist.name} → ${mandal.name} (${mi + 1}/${mandals.length})`);
      }

      await sleep(LGD_DELAY_MS);
      const panchayats = await fetchEntities('panchayat', String(mandal.code));

      // Determine mandal type based on state terminology
      const hierarchyTerms = state.hierarchyTerms || {};
      const mandalType = hierarchyTerms.block || 'block';

      const mandalObj = {
        name: mandal.name,
        lgdCode: mandal.code,
        nameLocal: mandal.nameLocal,
        type: mandalType,
        panchayats: [],
      };

      // Step 4: For each panchayat, fetch villages
      for (let pi = 0; pi < panchayats.length; pi++) {
        const panchayat = panchayats[pi];

        await sleep(LGD_DELAY_MS);
        const villages = await fetchEntities('village', String(panchayat.code));

        mandalObj.panchayats.push({
          name: panchayat.name,
          lgdCode: panchayat.code,
          nameLocal: panchayat.nameLocal,
          type: 'gram_panchayat',
          villages: villages.map(v => ({
            name: v.name,
            lgdCode: v.code,
            nameLocal: v.nameLocal,
            censusCode: null, // Will be cross-referenced later
          })),
        });
      }

      districtObj.mandals.push(mandalObj);
    }

    hierarchy.districts.push(districtObj);

    // Save after each district (incremental save for resume)
    const outFile = path.join(OUTPUT_BASE, `${state.code}-lgd-hierarchy.json`);
    writeJSON(outFile, hierarchy);
  }

  return hierarchy;
}

// ── Compute summary statistics ─────────────────────────────────────────
/**
 * Computes summary stats from a scraped hierarchy.
 * @param {Object} hierarchy - Scraped hierarchy object
 * @returns {Object} Summary statistics
 */
function computeStats(hierarchy) {
  let totalMandals = 0, totalPanchayats = 0, totalVillages = 0;

  for (const dist of hierarchy.districts) {
    totalMandals += dist.mandals.length;
    for (const mandal of dist.mandals) {
      totalPanchayats += mandal.panchayats.length;
      for (const panch of mandal.panchayats) {
        totalVillages += panch.villages.length;
      }
    }
  }

  return {
    districts: hierarchy.districts.length,
    mandals: totalMandals,
    panchayats: totalPanchayats,
    villages: totalVillages,
  };
}

// ── Main ───────────────────────────────────────────────────────────────
async function main() {
  console.log('🏛️  LGD Scraper — Local Government Directory Hierarchy');
  console.log('═'.repeat(60));

  ensureDir(OUTPUT_BASE);

  // Determine which states to scrape
  let filteredStates;
  if (stateFilter) {
    filteredStates = STATES.filter(s => s.code === stateFilter.toUpperCase());
    if (filteredStates.length === 0) {
      console.error(`❌ Unknown state code: ${stateFilter}`);
      process.exit(1);
    }
  } else if (scrapeAll) {
    filteredStates = STATES;
  } else {
    console.log('Usage: node scrapers/lgd-scraper.js --state=TS | --all');
    console.log('       --force  Re-scrape ignoring saved progress');
    process.exit(0);
  }

  console.log(`\n📊 States to scrape: ${filteredStates.length}`);
  filteredStates.forEach(s => console.log(`   • ${s.name} (${s.code})`));

  const allStats = [];

  for (const state of filteredStates) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`🗺️  ${state.name} (${state.code})`);
    console.log(`${'─'.repeat(60)}`);

    const hierarchy = await scrapeStateHierarchy(state);
    if (!hierarchy) continue;

    // Final save
    const outFile = path.join(OUTPUT_BASE, `${state.code}-lgd-hierarchy.json`);
    writeJSON(outFile, hierarchy);
    console.log(`\n   💾 Saved: ${outFile}`);

    // Stats
    const stats = computeStats(hierarchy);
    allStats.push({ state: state.code, ...stats });

    console.log(`   ✅ ${stats.districts} districts, ${stats.mandals} mandals/blocks`);
    console.log(`      ${stats.panchayats} panchayats, ${stats.villages} villages`);
  }

  // Summary index
  if (allStats.length > 0) {
    writeJSON(path.join(OUTPUT_BASE, '_lgd-index.json'), {
      scrapedAt: new Date().toISOString(),
      states: allStats,
    });
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log('✨ LGD Hierarchy scraping complete');
  console.log(`   States processed: ${allStats.length}`);
  console.log(`   Output directory: ${OUTPUT_BASE}`);
}

main().catch(err => { console.error('\n❌ Fatal:', err); process.exit(1); });
