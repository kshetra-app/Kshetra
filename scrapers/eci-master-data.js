#!/usr/bin/env node
/**
 * ECI Master Data — Constituency numbers, types (SC/ST/GEN), electors
 * ══════════════════════════════════════════════════════════════════════
 * Source: MyNeta constituency pages (derived from ECI delimitation)
 * Data:   Constituency number, reservation type, total electors
 *
 * Usage:
 *   node scrapers/eci-master-data.js --state=TS
 *   node scrapers/eci-master-data.js              # All states
 */

const cheerio = require('cheerio');
const { STATES, extractYear } = require('./config');
const { httpGet, sleep, ensureDir, writeJSON, readJSON, progressLog } = require('./utils');
const path = require('path');

const args = process.argv.slice(2);
const stateFilter = args.find(a => a.startsWith('--state='))?.split('=')[1];

const OUTPUT_BASE = path.resolve(__dirname, 'output', 'eci-master');

// ── Get constituency list with numbers from MyNeta ─────────────────────
async function getConstituencyMaster(electionKey) {
  const url = `https://www.myneta.info/${electionKey}/index.php?action=show_constituencies&state_id=0`;
  const html = await httpGet(url);
  if (!html) return [];

  const $ = cheerio.load(html);
  const constituencies = [];

  // MyNeta lists constituencies with numbers and reservation status
  $('a[href*="show_candidates"]').each((_, el) => {
    const href = $(el).attr('href');
    const text = $(el).text().trim();
    const idMatch = href?.match(/constituency_id=(\d+)/);
    if (!idMatch || !text) return;

    // Try to extract number and name
    // Format: "1. ADILABAD (ST)" or "ADILABAD (ST)"
    const numMatch = text.match(/^(\d+)\.\s*(.*)/);
    let name = text, number = parseInt(idMatch[1]);
    if (numMatch) {
      number = parseInt(numMatch[1]);
      name = numMatch[2];
    }

    // Extract reservation type from parentheses
    const resMatch = name.match(/\((SC|ST|GEN)\)/i);
    let reservationType = 'general';
    if (resMatch) {
      reservationType = resMatch[1].toLowerCase();
      name = name.replace(/\s*\((?:SC|ST|GEN)\)\s*/i, '').trim();
    }

    constituencies.push({
      constituencyId: parseInt(idMatch[1]),
      number,
      name: name.trim(),
      reservationType,
    });
  });

  return constituencies;
}

// ── Try to get electors count from MyNeta constituency page ────────────
async function getElectorsForConstituency(electionKey, constId) {
  const url = `https://www.myneta.info/${electionKey}/index.php?action=show_candidates&constituency_id=${constId}`;
  const html = await httpGet(url);
  if (!html) return null;

  // Look for "Total Electors" or "Total Voters"
  const electorsM = html.match(/Total\s+(?:Electors|Voters)[\s:]*\s*([\d,]+)/i);
  if (electorsM) return parseInt(electorsM[1].replace(/,/g, ''));

  // Alternate: "Registered Voters"
  const regM = html.match(/Registered\s+Voters[\s:]*\s*([\d,]+)/i);
  if (regM) return parseInt(regM[1].replace(/,/g, ''));

  return null;
}

// ── Main ───────────────────────────────────────────────────────────────
async function main() {
  console.log('🗳️  ECI Master Data — Constituency Numbers & Types');
  console.log('═'.repeat(60));

  ensureDir(OUTPUT_BASE);

  const filteredStates = stateFilter
    ? STATES.filter(s => s.code === stateFilter.toUpperCase())
    : STATES;

  for (const state of filteredStates) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`📋 ${state.name} (${state.code})`);
    console.log(`${'─'.repeat(60)}`);

    const latestKey = state.mynetaKeys[0];
    if (!latestKey) { console.log('   ⚠️ No election key'); continue; }

    const constituencies = await getConstituencyMaster(latestKey);
    console.log(`   Found ${constituencies.length} constituencies from ${latestKey}`);

    if (constituencies.length === 0) continue;

    // Try to get electors for a sample (first 5) to verify
    let electorsCount = 0;
    for (let i = 0; i < Math.min(3, constituencies.length); i++) {
      const c = constituencies[i];
      progressLog(i + 1, 3, `Electors for ${c.name}`);
      const electors = await getElectorsForConstituency(latestKey, c.constituencyId);
      if (electors) {
        constituencies[i].totalElectors = electors;
        electorsCount++;
      }
      await sleep(200);
    }

    // Build master map
    const master = {
      stateCode: state.code,
      stateName: state.name,
      totalSeats: constituencies.length,
      electionKey: latestKey,
      scSeats: constituencies.filter(c => c.reservationType === 'sc').length,
      stSeats: constituencies.filter(c => c.reservationType === 'st').length,
      genSeats: constituencies.filter(c => c.reservationType === 'general').length,
      constituencies: constituencies.map(c => ({
        id: `${state.code}-AC-${c.number}`,
        number: c.number,
        name: c.name,
        reservationType: c.reservationType,
        totalElectors: c.totalElectors || null,
      })),
    };

    writeJSON(path.join(OUTPUT_BASE, `${state.code}-master.json`), master);
    console.log(`\n   ✅ ${master.totalSeats} constituencies (${master.scSeats} SC, ${master.stSeats} ST, ${master.genSeats} GEN)`);
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log('✨ ECI Master Data complete');
}

main().catch(err => { console.error('\n❌ Fatal:', err); process.exit(1); });
