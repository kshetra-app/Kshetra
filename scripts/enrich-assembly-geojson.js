/**
 * Enrich downloaded assembly GeoJSON files with election data from seed files.
 * Matches by AC_NO (primary) and AC_NAME (fuzzy fallback).
 * Adds WINNER_PARTY, WINNER_NAME, MARGIN, RESERVATION, CURRENT_PARTY etc.
 *
 * Run: node scripts/enrich-assembly-geojson.js
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'apps', 'mobile', 'data');
const SEED_DIR = path.join(__dirname, '..', 'data', 'seed');

// ─── TS file parser ─────────────────────────────────────────────────
function loadTsArray(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const match = content.match(/export const \w+:\s*\w+\[\]\s*=\s*(\[[\s\S]*\]);/);
  if (!match) throw new Error(`Could not parse ${filePath}`);
  let cleaned = match[1]
    .replace(/\/\/[^\n]*/g, '')
    .replace(/,\s*([\]}])/g, '$1');
  cleaned = cleaned.replace(/(\b\w+)\s*:/g, '"$1":');
  cleaned = cleaned.replace(/:\s*'([^']*)'/g, ': "$1"');
  return JSON.parse(cleaned);
}

// ─── State config: seed file, year field suffixes, etc. ─────────────
const STATE_CONFIG = {
  AP: {
    seedFile: 'andhra-pradesh-constituencies.ts',
    year: 2024,
    winnerField: 'winner2024',
    winnerNameField: 'winnerName2024',
    winnerVotesField: 'winnerVotes2024',
    runnerUpField: 'runnerUp2024',
    marginField: 'margin2024',
  },
  KA: {
    seedFile: 'karnataka-constituencies.ts',
    year: 2023,
    winnerField: 'winner2023',
    winnerNameField: 'winnerName2023',
    winnerVotesField: 'winnerVotes2023',
    runnerUpField: 'runnerUp2023',
    marginField: 'margin2023',
  },
  MH: {
    seedFile: 'maharashtra-constituencies.ts',
    year: 2024,
    winnerField: 'winner2024',
    winnerNameField: 'winnerName2024',
    winnerVotesField: 'winnerVotes2024',
    runnerUpField: 'runnerUp2024',
    marginField: 'margin2024',
  },
};

function normalize(name) {
  return name
    .toUpperCase()
    .replace(/\s*\(SC\)\s*/g, '')
    .replace(/\s*\(ST\)\s*/g, '')
    .replace(/\s*\(GEN\)\s*/g, '')
    .replace(/[^A-Z0-9]/g, '')
    .trim();
}

function enrichState(stateCode) {
  const geoFile = path.join(DATA_DIR, `${stateCode.toLowerCase()}-assembly.json`);
  if (!fs.existsSync(geoFile)) {
    console.log(`  ⊘ ${stateCode}: No GeoJSON file`);
    return;
  }

  const config = STATE_CONFIG[stateCode];
  if (!config) {
    // No seed data — just leave as-is (boundaries only, no election data)
    console.log(`  ⊘ ${stateCode}: No seed data config, leaving as boundary-only`);
    return;
  }

  const seedPath = path.join(SEED_DIR, config.seedFile);
  if (!fs.existsSync(seedPath)) {
    console.log(`  ⊘ ${stateCode}: Seed file not found: ${config.seedFile}`);
    return;
  }

  const seed = loadTsArray(seedPath);
  const geojson = JSON.parse(fs.readFileSync(geoFile, 'utf-8'));

  // Build lookup maps
  const byAcNo = new Map();
  const byName = new Map();
  for (const c of seed) {
    byAcNo.set(c.acNo, c);
    byName.set(normalize(c.name), c);
  }

  let matched = 0;
  let unmatched = 0;

  for (const feature of geojson.features) {
    const props = feature.properties;
    
    // Try matching by AC_NO first
    let seedEntry = byAcNo.get(props.AC_NO);
    
    // Fallback: fuzzy name match
    if (!seedEntry && props.AC_NAME) {
      seedEntry = byName.get(normalize(props.AC_NAME));
    }

    if (seedEntry) {
      props.WINNER_PARTY = seedEntry[config.winnerField] || '';
      props.WINNER_NAME = seedEntry[config.winnerNameField] || '';
      props.WINNER_VOTES = seedEntry[config.winnerVotesField] || 0;
      props.RUNNER_UP = seedEntry[config.runnerUpField] || '';
      props.MARGIN = seedEntry[config.marginField] || 0;
      props.RESERVATION = seedEntry.type || 'GEN';
      props.CURRENT_PARTY = seedEntry.currentParty || props.WINNER_PARTY;
      // Update AC_NAME from seed if we have a better version
      if (seedEntry.name) props.AC_NAME = seedEntry.name;
      if (seedEntry.district) props.DIST_NAME = seedEntry.district;
      matched++;
    } else {
      // No match — assign defaults so Mapbox expressions don't break
      props.WINNER_PARTY = 'IND';
      props.WINNER_NAME = '';
      props.WINNER_VOTES = 0;
      props.RUNNER_UP = '';
      props.MARGIN = 0;
      props.RESERVATION = 'GEN';
      props.CURRENT_PARTY = 'IND';
      unmatched++;
    }
  }

  fs.writeFileSync(geoFile, JSON.stringify(geojson));
  console.log(`  ✓ ${stateCode}: ${matched}/${geojson.features.length} matched (${unmatched} unmatched)`);
}

function main() {
  console.log('Enriching assembly GeoJSON with election data...\n');

  // Enrich states that have seed data
  for (const code of Object.keys(STATE_CONFIG)) {
    enrichState(code);
  }

  // List states without seed data
  const allGeoFiles = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('-assembly.json'));
  for (const f of allGeoFiles) {
    const code = f.replace('-assembly.json', '').toUpperCase();
    if (code === 'TELANGANA') continue; // Already enriched
    if (STATE_CONFIG[code]) continue; // Already processed
    console.log(`  ℹ ${code}: Boundaries only (no seed data)`);
  }

  console.log('\nDone!');
}

main();
