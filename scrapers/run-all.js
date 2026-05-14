#!/usr/bin/env node
/**
 * Master Orchestrator — Run all scrapers and merge data
 * ══════════════════════════════════════════════════════════════════════
 *
 * Runs scrapers in priority order, merges output into unified candidate database:
 *   1. MyNeta — affidavit data (authoritative for assets, criminal cases, education)
 *   2. PRS India — photos (100% coverage), age, performance metrics
 *   3. Wikipedia — DOB (for notable politicians)
 *   4. ECI GitHub — election results (vote counts, margins)
 *   5. Sansad.in — MP profiles (Lok Sabha, Rajya Sabha)
 *   6. data.gov.in — supplementary bulk datasets
 *
 * Usage:
 *   node scrapers/run-all.js                          # Full run
 *   node scrapers/run-all.js --state=TS               # Single state
 *   node scrapers/run-all.js --step=merge             # Only merge (skip scraping)
 *   node scrapers/run-all.js --step=myneta            # Only MyNeta
 *   node scrapers/run-all.js --step=prs               # Only PRS
 *   node scrapers/run-all.js --step=wiki              # Only Wikipedia
 *   node scrapers/run-all.js --step=eci               # Only ECI GitHub
 *   node scrapers/run-all.js --step=sansad            # Only Sansad.in
 */

const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { STATES, extractYear } = require('./config');
const { ensureDir, writeJSON, readJSON, findBestMatch, normalizeName } = require('./utils');

const args = process.argv.slice(2);
const stateFilter = args.find(a => a.startsWith('--state='))?.split('=')[1] || '';
const stepFilter = args.find(a => a.startsWith('--step='))?.split('=')[1] || '';

const OUTPUT_BASE = path.resolve(__dirname, 'output');
const MERGED_OUTPUT = path.resolve(OUTPUT_BASE, 'merged');

// ── Run a scraper as child process ─────────────────────────────────────
function runScraper(scriptName, extraArgs = []) {
  return new Promise((resolve, reject) => {
    const script = path.resolve(__dirname, scriptName);
    const allArgs = [script, ...extraArgs];
    if (stateFilter) allArgs.push(`--state=${stateFilter}`);

    console.log(`\n${'█'.repeat(60)}`);
    console.log(`▶ Running: node ${scriptName} ${extraArgs.join(' ')} ${stateFilter ? '--state=' + stateFilter : ''}`);
    console.log(`${'█'.repeat(60)}\n`);

    const child = spawn('node', allArgs, {
      cwd: path.resolve(__dirname),
      stdio: 'inherit',
      env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=4096' },
    });

    child.on('close', code => {
      if (code === 0) resolve();
      else reject(new Error(`${scriptName} exited with code ${code}`));
    });
    child.on('error', reject);
  });
}

// ── Merge all scraped data ─────────────────────────────────────────────
function mergeAllData() {
  console.log(`\n${'█'.repeat(60)}`);
  console.log('▶ MERGING ALL SCRAPED DATA');
  console.log(`${'█'.repeat(60)}\n`);

  ensureDir(MERGED_OUTPUT);

  const mynetaDir = path.join(OUTPUT_BASE, 'myneta');
  const prsDir = path.join(OUTPUT_BASE, 'prs');
  const wikiDir = path.join(OUTPUT_BASE, 'wikipedia');
  const eciDir = path.join(OUTPUT_BASE, 'eci');
  const sansadDir = path.join(OUTPUT_BASE, 'sansad');

  // ── Load all data ────────────────────────────────────────────────────
  const allCandidates = {}; // key: normalized name → merged record
  const photoMap = {};
  const dobMap = {};

  // 1. Load MyNeta data (primary source for affidavits)
  if (fs.existsSync(mynetaDir)) {
    const files = fs.readdirSync(mynetaDir).filter(f => f.endsWith('.json') && !f.startsWith('_'));
    console.log(`   📋 MyNeta: ${files.length} election files`);
    for (const file of files) {
      const records = readJSON(path.join(mynetaDir, file)) || [];
      for (const r of records) {
        if (!r.name) continue;
        const key = normalizeName(r.name);
        if (!allCandidates[key]) allCandidates[key] = { names: [], elections: [] };
        allCandidates[key].names.push(r.name);
        allCandidates[key].elections.push({
          source: 'myneta',
          electionKey: r.electionKey,
          year: r.electionYear,
          isWinner: r.isWinner,
          party: r.party,
          constituency: r.constituency,
          district: r.district,
          age: r.age,
          education: r.educationLevel,
          educationDetail: r.educationCategory,
          totalAssets: r.totalAssets,
          totalLiabilities: r.totalLiabilities,
          criminalCases: r.criminalCases,
          seriousCriminalCases: r.seriousCriminalCases,
          profession: r.selfProfession,
          sourceUrl: r.sourceUrl,
        });
        if (r.photoUrl) photoMap[r.name] = r.photoUrl;
      }
    }
  }

  // 2. Load PRS data (primary source for photos)
  if (fs.existsSync(prsDir)) {
    const files = fs.readdirSync(prsDir).filter(f => f.endsWith('.json'));
    console.log(`   📋 PRS India: ${files.length} files`);
    for (const file of files) {
      const records = readJSON(path.join(prsDir, file)) || [];
      for (const r of records) {
        if (!r.name) continue;
        const key = normalizeName(r.name);
        if (!allCandidates[key]) allCandidates[key] = { names: [], elections: [] };
        allCandidates[key].names.push(r.name);
        allCandidates[key].prsData = {
          age: r.age,
          gender: r.gender,
          party: r.party,
          constituency: r.constituency,
          education: r.education,
          questionsAsked: r.questionsAsked,
          debates: r.debates,
          attendance: r.attendance,
          privateBills: r.privateBills,
          profileUrl: r.profileUrl,
        };
        // PRS photos as fallback (don't overwrite MyNeta photos)
        if (r.photoUrl && !photoMap[r.name]) photoMap[r.name] = r.photoUrl;
      }
    }
  }

  // 3. Load Wikipedia DOBs
  const allDobs = readJSON(path.join(wikiDir, '_all-dobs.json')) || {};
  console.log(`   📋 Wikipedia: ${Object.keys(allDobs).length} DOBs`);
  for (const [name, data] of Object.entries(allDobs)) {
    dobMap[name] = data.dob;
    if (data.photoUrl) {
      // Wikipedia photos as last resort
      const key = normalizeName(name);
      if (allCandidates[key] && !photoMap[name]) {
        photoMap[name] = data.photoUrl;
      }
    }
  }

  // 4. Load Sansad.in data
  const lsMembers = readJSON(path.join(sansadDir, 'lok-sabha-members.json')) || [];
  const rsMembers = readJSON(path.join(sansadDir, 'rajya-sabha-members.json')) || [];
  console.log(`   📋 Sansad.in: ${lsMembers.length} LS + ${rsMembers.length} RS MPs`);
  for (const mp of [...lsMembers, ...rsMembers]) {
    if (!mp.name) continue;
    if (mp.photoUrl) photoMap[mp.name] = mp.photoUrl;
  }

  // ── Build merged candidate records ───────────────────────────────────
  const mergedCandidates = {};
  let totalWithPhoto = 0;
  let totalWithDOB = 0;

  for (const [key, data] of Object.entries(allCandidates)) {
    // Pick the most common name variant
    const nameCounts = {};
    data.names.forEach(n => { nameCounts[n] = (nameCounts[n] || 0) + 1; });
    const primaryName = Object.entries(nameCounts).sort((a, b) => b[1] - a[1])[0][0];

    // Calculate current age
    const dob = dobMap[primaryName] || null;
    let currentAge = null;
    let ageAtElection = null;
    if (dob) {
      const dobDate = new Date(dob);
      const now = new Date();
      currentAge = Math.floor((now - dobDate) / (365.25 * 24 * 60 * 60 * 1000));
      totalWithDOB++;
    }
    // Get age from latest election data
    const latestElection = data.elections.sort((a, b) => (b.year || 0) - (a.year || 0))[0];
    if (latestElection?.age) ageAtElection = latestElection.age;

    const photo = photoMap[primaryName] || null;
    if (photo) totalWithPhoto++;

    mergedCandidates[primaryName] = {
      name: primaryName,
      allNames: [...new Set(data.names)],
      dob,
      currentAge,
      ageAtElection,
      photo,
      elections: data.elections,
      prsData: data.prsData || null,
    };
  }

  // ── Write outputs ────────────────────────────────────────────────────
  writeJSON(path.join(MERGED_OUTPUT, 'all-candidates.json'), mergedCandidates);
  writeJSON(path.join(MERGED_OUTPUT, 'photo-map.json'), photoMap);
  writeJSON(path.join(MERGED_OUTPUT, 'dob-map.json'), dobMap);

  // Also update the app's photo map
  writeJSON(path.resolve(__dirname, '../apps/mobile/data/candidate-photo-map.json'), photoMap);

  // Summary by state
  const summary = {};
  for (const [name, data] of Object.entries(mergedCandidates)) {
    for (const e of data.elections) {
      const stateCode = STATES.find(s => s.mynetaKeys.some(k => k === e.electionKey))?.code || 'UNK';
      if (!summary[stateCode]) summary[stateCode] = { candidates: 0, winners: 0, photos: 0, dobs: 0 };
      summary[stateCode].candidates++;
      if (e.isWinner) summary[stateCode].winners++;
    }
    if (data.photo) {
      // Attribute photo to first election's state
      const firstState = STATES.find(s => s.mynetaKeys.some(k => k === data.elections[0]?.electionKey))?.code;
      if (firstState && summary[firstState]) summary[firstState].photos++;
    }
    if (data.dob) {
      const firstState = STATES.find(s => s.mynetaKeys.some(k => k === data.elections[0]?.electionKey))?.code;
      if (firstState && summary[firstState]) summary[firstState].dobs++;
    }
  }
  writeJSON(path.join(MERGED_OUTPUT, 'summary.json'), summary);

  console.log(`\n${'═'.repeat(60)}`);
  console.log('📊 MERGE SUMMARY');
  console.log(`${'═'.repeat(60)}`);
  console.log(`   Total unique candidates: ${Object.keys(mergedCandidates).length}`);
  console.log(`   With photos:            ${totalWithPhoto}`);
  console.log(`   With DOBs:              ${totalWithDOB}`);
  console.log(`   Photo map entries:      ${Object.keys(photoMap).length}`);
  console.log(`\n   Output: ${MERGED_OUTPUT}`);

  return summary;
}

// ── Main ───────────────────────────────────────────────────────────────
async function main() {
  console.log('🚀 KSHETRA — Master Data Scraper Orchestrator');
  console.log('═'.repeat(60));
  console.log(`   State filter: ${stateFilter || 'ALL'}`);
  console.log(`   Step filter:  ${stepFilter || 'ALL'}`);
  console.log('');

  const steps = {
    // Phase 1: Deep MyNeta (fills ~70% of all fields)
    'myneta-deep': () => runScraper('myneta-deep-scraper.js'),
    myneta:        () => runScraper('myneta-scraper.js', ['--winners-only']),
    // Phase 2: Enrichment (fills to ~85%)
    'eci-master':  () => runScraper('eci-master-data.js'),
    prs:           () => runScraper('prs-scraper.js'),
    'wiki-enrich': () => runScraper('wikipedia-enricher.js'),
    wiki:          () => runScraper('wikipedia-scraper.js'),
    // Phase 3: Supplementary
    eci:           () => runScraper('eci-github-scraper.js'),
    sansad:        () => runScraper('sansad-scraper.js'),
    datagov:       () => runScraper('datagov-scraper.js'),
    // Phase 4: Merge + Build + Monitor
    merge:         () => Promise.resolve(mergeAllData()),
    profiles:      () => runScraper('build-profiles.js'),
    monitor:       () => runScraper('live-monitor.js'),
  };

  if (stepFilter) {
    if (stepFilter === 'merge') {
      mergeAllData();
    } else if (steps[stepFilter]) {
      await steps[stepFilter]();
    } else {
      console.error(`Unknown step: ${stepFilter}. Available: ${Object.keys(steps).join(', ')}`);
      process.exit(1);
    }
  } else {
    // Run all in order
    for (const [name, fn] of Object.entries(steps)) {
      try {
        console.log(`\n>>> Starting step: ${name.toUpperCase()}`);
        await fn();
        console.log(`>>> Completed: ${name.toUpperCase()}\n`);
      } catch (err) {
        console.error(`\n⚠️ Step ${name} failed: ${err.message}`);
        console.log('   Continuing with next step...\n');
      }
    }
  }

  console.log('\n🎉 All done!');
}

main().catch(err => { console.error('\n❌ Fatal:', err); process.exit(1); });
