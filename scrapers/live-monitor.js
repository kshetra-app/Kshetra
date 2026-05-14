#!/usr/bin/env node
/**
 * Live Monitor — Detects defections, deaths, appointments, resignations
 * ══════════════════════════════════════════════════════════════════════
 * Methods:
 *   1. Wikipedia Recent Changes API — detect edits to politician articles
 *   2. Wikipedia category checks — detect additions to "Deaths in YYYY"
 *   3. Cross-election party comparison — detect historical defections
 *
 * Usage:
 *   node scrapers/live-monitor.js                    # Full check
 *   node scrapers/live-monitor.js --state=TS         # Single state
 *   node scrapers/live-monitor.js --check-deaths     # Only check deaths
 *   node scrapers/live-monitor.js --check-defections # Only check defections
 */

const { httpGet, sleep, ensureDir, writeJSON, readJSON, normalizeName, nameSimilarity } = require('./utils');
const { STATES } = require('./config');
const path = require('path');
const fs = require('fs');

const args = process.argv.slice(2);
const stateFilter = args.find(a => a.startsWith('--state='))?.split('=')[1];
const checkDeaths = args.includes('--check-deaths') || !args.find(a => a.startsWith('--check-'));
const checkDefections = args.includes('--check-defections') || !args.find(a => a.startsWith('--check-'));

const OUTPUT_BASE = path.resolve(__dirname, 'output', 'events');

// ── Detect party changes across elections ──────────────────────────────
function detectDefections(allRecords) {
  // Group by normalized name
  const byName = {};
  for (const r of allRecords) {
    const key = normalizeName(r.mynetaName || r.name || '');
    if (!key) continue;
    if (!byName[key]) byName[key] = [];
    byName[key].push(r);
  }

  const defections = [];
  for (const [key, records] of Object.entries(byName)) {
    if (records.length < 2) continue;
    const sorted = records.sort((a, b) => (a.electionYear || 0) - (b.electionYear || 0));
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      if (prev.party && curr.party && prev.party !== curr.party && prev.party !== 'IND' && curr.party !== 'IND') {
        defections.push({
          name: curr.mynetaName || curr.name,
          fromParty: prev.party,
          toParty: curr.party,
          fromYear: prev.electionYear,
          toYear: curr.electionYear,
          constituency: curr.constituency,
          type: 'defection',
          detectedBy: 'cross_election_comparison',
        });
      }
    }
  }
  return defections;
}

// ── Check Wikipedia for recent politician deaths ───────────────────────
async function checkRecentDeaths(names) {
  const events = [];
  const currentYear = new Date().getFullYear();

  for (const name of names.slice(0, 50)) { // Limit to avoid rate limiting
    const url = `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(name)}&prop=wikitext&section=0&format=json`;
    const json = await httpGet(url);
    if (!json) continue;

    try {
      const data = JSON.parse(json);
      const wt = data?.parse?.wikitext?.['*'] || '';
      if (/death[_ ]date/i.test(wt)) {
        const deathM = wt.match(/death[_ ]date(?:[_ ]and[_ ]age)?\s*\|\s*(\d{4})\s*\|\s*(\d{1,2})\s*\|\s*(\d{1,2})/i);
        if (deathM) {
          const deathYear = parseInt(deathM[1]);
          if (deathYear >= currentYear - 1) {
            events.push({
              name,
              eventType: 'death',
              eventDate: `${deathM[1]}-${deathM[2].padStart(2, '0')}-${deathM[3].padStart(2, '0')}`,
              detectedBy: 'wikipedia_infobox',
            });
          }
        }
      }
    } catch {}

    await sleep(100);
  }

  return events;
}

// ── Check Wikipedia for office changes ─────────────────────────────────
async function checkOfficeChanges(profiles) {
  const events = [];

  for (const p of profiles.slice(0, 30)) {
    const name = p.personal?.fullName || p.name;
    if (!name) continue;

    const url = `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(name)}&prop=wikitext&section=0&format=json`;
    const json = await httpGet(url);
    if (!json) continue;

    try {
      const data = JSON.parse(json);
      const wt = data?.parse?.wikitext?.['*'] || '';

      // Check current office
      const officeM = wt.match(/\|\s*office\s*=\s*([^\n|{]+)/i);
      if (officeM) {
        const currentOffice = officeM[1].replace(/\[|\]/g, '').trim();
        const existingOffice = p.career?.ministerialPortfolio || '';

        if (currentOffice !== existingOffice && /minister|chief minister|speaker|governor/i.test(currentOffice)) {
          events.push({
            name,
            eventType: 'appointment',
            description: `Detected office: ${currentOffice}`,
            oldValue: existingOffice || 'none',
            newValue: currentOffice,
            detectedBy: 'wikipedia_office_check',
          });
        }
      }

      // Check party change
      const partyM = wt.match(/\|\s*party\s*=\s*([^\n|{]+)/i);
      if (partyM) {
        const wikiParty = partyM[1].replace(/\[|\]/g, '').trim();
        const currentParty = p.career?.currentPartyFull || p.career?.currentParty || '';
        if (currentParty && wikiParty && !wikiParty.toLowerCase().includes(currentParty.toLowerCase()) && wikiParty.length > 2) {
          events.push({
            name,
            eventType: 'possible_party_change',
            description: `Wikipedia says "${wikiParty}" but profile has "${currentParty}"`,
            oldValue: currentParty,
            newValue: wikiParty,
            detectedBy: 'wikipedia_party_check',
          });
        }
      }
    } catch {}

    await sleep(150);
  }

  return events;
}

// ── Main ───────────────────────────────────────────────────────────────
async function main() {
  console.log('🔔 Live Monitor — Event Detection');
  console.log('═'.repeat(60));

  ensureDir(OUTPUT_BASE);

  const allEvents = [];

  // 1. Detect historical defections from MyNeta data
  if (checkDefections) {
    console.log('\n📋 Checking for defections (cross-election comparison)...');
    const mynetaDir = path.join(__dirname, 'output', 'myneta-deep');
    const fallbackDir = path.join(__dirname, 'output', 'myneta');
    const dir = fs.existsSync(mynetaDir) ? mynetaDir : fallbackDir;

    if (fs.existsSync(dir)) {
      const allRecords = [];
      const files = fs.readdirSync(dir).filter(f => f.endsWith('.json') && !f.startsWith('_'));

      const filteredFiles = stateFilter
        ? files.filter(f => {
          const state = STATES.find(s => s.code === stateFilter.toUpperCase());
          return state?.mynetaKeys.some(k => f.toLowerCase().includes(k.toLowerCase()));
        })
        : files;

      for (const f of filteredFiles) {
        const data = readJSON(path.join(dir, f)) || [];
        allRecords.push(...data);
      }

      const defections = detectDefections(allRecords);
      console.log(`   Found ${defections.length} historical party changes`);
      allEvents.push(...defections);
    }
  }

  // 2. Check Wikipedia for deaths
  if (checkDeaths) {
    console.log('\n📋 Checking Wikipedia for recent deaths...');
    const profilesDir = path.join(__dirname, 'output', 'profiles');
    if (fs.existsSync(profilesDir)) {
      const files = fs.readdirSync(profilesDir).filter(f => f.endsWith('.json') && !f.startsWith('_'));
      const names = [];
      for (const f of files) {
        const profiles = readJSON(path.join(profilesDir, f)) || [];
        for (const p of profiles) {
          const name = p.personal?.fullName || p.name;
          if (name) names.push(name);
        }
      }
      const deaths = await checkRecentDeaths([...new Set(names)]);
      console.log(`   Found ${deaths.length} recent deaths`);
      allEvents.push(...deaths);
    }
  }

  // 3. Check office changes
  console.log('\n📋 Checking Wikipedia for office changes...');
  const profilesDir = path.join(__dirname, 'output', 'profiles');
  if (fs.existsSync(profilesDir)) {
    const files = fs.readdirSync(profilesDir).filter(f => f.endsWith('.json') && !f.startsWith('_'));
    const allProfiles = [];
    for (const f of files) {
      const profiles = readJSON(path.join(profilesDir, f)) || [];
      allProfiles.push(...profiles.filter(p => p.career?.isCurrentMember));
    }
    const officeEvents = await checkOfficeChanges(allProfiles);
    console.log(`   Found ${officeEvents.length} office changes`);
    allEvents.push(...officeEvents);
  }

  // Save all events
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
  writeJSON(path.join(OUTPUT_BASE, `events-${timestamp}.json`), allEvents);

  // Also maintain a cumulative events file
  const cumFile = path.join(OUTPUT_BASE, 'all-events.json');
  const existing = readJSON(cumFile) || [];
  const merged = [...existing, ...allEvents];
  writeJSON(cumFile, merged);

  console.log(`\n${'═'.repeat(60)}`);
  console.log('📊 MONITOR SUMMARY');
  console.log(`${'═'.repeat(60)}`);
  console.log(`   Total events detected: ${allEvents.length}`);
  const byType = {};
  allEvents.forEach(e => { byType[e.eventType || e.type] = (byType[e.eventType || e.type] || 0) + 1; });
  Object.entries(byType).forEach(([type, count]) => console.log(`   ${type}: ${count}`));
  console.log(`   Events file: events-${timestamp}.json`);
}

main().catch(err => { console.error('\n❌ Fatal:', err); process.exit(1); });
