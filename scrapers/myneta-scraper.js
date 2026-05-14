#!/usr/bin/env node
/**
 * MyNeta Scraper — Affidavit data + Photos for ALL candidates
 * ══════════════════════════════════════════════════════════════════════
 * Source: myneta.info (Association for Democratic Reforms)
 * Data:   Age, education, profession, assets, liabilities, criminal cases, photos
 *
 * Usage:
 *   node scrapers/myneta-scraper.js                     # All states, latest election
 *   node scrapers/myneta-scraper.js --state=TS          # Single state
 *   node scrapers/myneta-scraper.js --all-years          # All elections 2008+
 *   node scrapers/myneta-scraper.js --state=TS --all-years
 *   node scrapers/myneta-scraper.js --key=Telangana2023  # Specific election key
 *   node scrapers/myneta-scraper.js --winners-only       # Only winners (faster)
 */

const { STATES, extractYear } = require('./config');
const { httpGet, httpHead, sleep, parseINR, normalizeParty, mapEducation, ensureDir, writeJSON, readJSON, progressLog } = require('./utils');
const path = require('path');

// ── CLI args ───────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const stateFilter = args.find(a => a.startsWith('--state='))?.split('=')[1];
const keyFilter = args.find(a => a.startsWith('--key='))?.split('=')[1];
const allYears = args.includes('--all-years');
const winnersOnly = args.includes('--winners-only');
const MIN_YEAR = 2008; // Only scrape elections from 2008+

const OUTPUT_BASE = path.resolve(__dirname, 'output', 'myneta');

// ── Get candidate list from MyNeta ─────────────────────────────────────
async function getCandidates(electionKey, type = 'all') {
  const action = type === 'winners' ? 'show_winners' : 'show_constituencies';
  const url = `https://www.myneta.info/${electionKey}/index.php?action=${action}&sort=default`;
  const html = await httpGet(url);
  if (!html) return [];

  const links = [...html.matchAll(/candidate\.php\?candidate_id=(\d+)[^>]*>([^<]+)/gi)];
  const skip = new Set(['Candidate', 'Constituency', 'Party', 'Criminal Cases', 'Education', 'Total Assets', 'Liabilities', 'winner', 'Winner', 'All Candidates']);
  const seen = new Set();
  const candidates = [];

  for (const m of links) {
    const id = m[1], name = m[2].trim();
    if (skip.has(name) || seen.has(id) || name.length < 2) continue;
    seen.add(id);
    candidates.push({ id, name });
  }
  return candidates;
}

// ── Get all candidates for a constituency ──────────────────────────────
async function getConstituencyCandidates(electionKey, stateId, constId) {
  const url = `https://www.myneta.info/${electionKey}/index.php?action=show_candidates&constituency_id=${constId}`;
  const html = await httpGet(url);
  if (!html) return [];

  const links = [...html.matchAll(/candidate\.php\?candidate_id=(\d+)[^>]*>([^<]+)/gi)];
  const skip = new Set(['Candidate', 'Constituency', 'Party', 'Criminal Cases', 'Education', 'Total Assets', 'Liabilities']);
  const seen = new Set();
  const candidates = [];

  for (const m of links) {
    const id = m[1], name = m[2].trim();
    if (skip.has(name) || seen.has(id) || name.length < 2) continue;
    seen.add(id);
    candidates.push({ id, name });
  }
  return candidates;
}

// ── Parse individual candidate page ────────────────────────────────────
function parseCandidatePage(html, electionKey) {
  const r = {};

  // Winner status
  r.isWinner = /\(Winner\)/i.test(html);

  // Name — try multiple patterns since MyNeta layout varies
  // Pattern 1: <title>Name (Party)</title>
  const titleM = html.match(/<title>\s*([^(<\n]+?)\s*[\(<]/i);
  if (titleM && titleM[1].trim().length > 2 && !/myneta|election/i.test(titleM[1])) {
    r.name = titleM[1].trim();
  }
  // Pattern 2: <h3> or <h4> with candidate name + (Winner)/(Party)
  if (!r.name) {
    const h3M = html.match(/<h[34][^>]*>\s*([^(<\n]+?)(?:\s*\((?:Winner|Party))/i);
    if (h3M) r.name = h3M[1].trim();
  }
  // Pattern 3: first <b> in the profile section
  if (!r.name) {
    const bM = html.match(/candidate_id[\s\S]{0,500}<b>\s*([A-Z][a-zA-Z .]+)/i);
    if (bM) r.name = bM[1].trim();
  }

  // Constituency & District
  const constM = html.match(/<h5[^>]*>\s*([^(]+)\s*\(([^)]+)\)/i);
  if (constM) {
    r.constituency = constM[1].trim();
    r.district = constM[2].trim();
  }

  // Party (full name)
  const partyM = html.match(/Party:<\/b>\s*([^<\n]+)/i);
  if (partyM) r.partyFull = partyM[1].trim();

  // Age at election
  const ageM = html.match(/Age:<\/b>\s*(\d+)/i);
  if (ageM) r.age = parseInt(ageM[1]);

  // Education category + details
  const eduCatM = html.match(/Category:\s*([^\n<]+)/i);
  if (eduCatM) r.educationCategory = eduCatM[1].trim();

  const eduDetailM = html.match(/Category:\s*[^\n<]+<br>\s*([^\n<]+)/i);
  if (eduDetailM) r.educationDetail = eduDetailM[1].trim();

  // Profession
  const selfProfM = html.match(/Self Profession:<\/b>\s*([^<\n]+)/i);
  if (selfProfM) r.selfProfession = selfProfM[1].trim();
  const spouseProfM = html.match(/Spouse Profession:<\/b>\s*([^<\n]+)/i);
  if (spouseProfM) r.spouseProfession = spouseProfM[1].trim();

  // Assets & Liabilities from summary block
  const assetM = html.match(/Assets:\s*<\/td><td>\s*<b>Rs&nbsp;([\d,]+)/i);
  if (assetM) r.totalAssets = parseINR(assetM[1]);

  const liabM = html.match(/Liabilities:\s*<\/td><td[^>]*>\s*<b>Rs&nbsp;([\d,]+)/i);
  if (liabM) r.totalLiabilities = parseINR(liabM[1]);

  // Criminal cases
  const caseBlocks = html.match(/charges related to/gi);
  r.criminalCases = caseBlocks ? caseBlocks.length : 0;

  // Serious criminal cases (IPC sections that are serious)
  const seriousIPC = ['302', '307', '376', '395', '396', '420', '467', '468', '471', '120B', '121', '124A'];
  const ipcAll = [...html.matchAll(/IPC Section[- ]*(\d+[A-Za-z]*)/gi)].map(m => m[1]);
  r.ipcSections = [...new Set(ipcAll)];
  r.seriousCriminalCases = ipcAll.filter(s => seriousIPC.some(si => s.startsWith(si))).length;

  // Photo URL
  const photoM = html.match(/images_candidate\/[^"'\s>]+\.(?:jpg|jpeg|png)/i);
  if (photoM) r.photoUrl = `https://www.myneta.info/${photoM[0]}`;

  // Movable/Immovable asset totals from tables
  const movTotalM = html.match(/id=movable_assets[\s\S]*?<b>\s*total<\/b>[\s\S]*?<td[^>]*>(?:Rs\s*)?([\d,]+)/i);
  if (movTotalM) r.selfMovableAssets = parseINR(movTotalM[1]);

  const immovTotalM = html.match(/id=immovable_assets[\s\S]*?<b>\s*total<\/b>[\s\S]*?<td[^>]*>(?:Rs\s*)?([\d,]+)/i);
  if (immovTotalM) r.selfImmovableAssets = parseINR(immovTotalM[1]);

  // Income
  const incomeM = html.match(/Total Income[^R]*Rs\s*([\d,]+)/i);
  if (incomeM) r.totalIncome = parseINR(incomeM[1]);

  return r;
}

// ── Main scrape loop ───────────────────────────────────────────────────
async function scrapeElection(electionKey) {
  const year = extractYear(electionKey);
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`📋 Scraping: ${electionKey} (year: ${year})`);
  console.log(`${'─'.repeat(60)}`);

  // Get winners first
  const winners = await getCandidates(electionKey, 'winners');
  console.log(`   Found ${winners.length} winners`);

  let candidates = winners;

  // If not winners-only, also get all candidates (for key contestants)
  if (!winnersOnly) {
    const all = await getCandidates(electionKey, 'all');
    if (all.length > winners.length) {
      // Merge: winners first, then remaining
      const winnerIds = new Set(winners.map(w => w.id));
      const others = all.filter(c => !winnerIds.has(c.id));
      candidates = [...winners, ...others];
      console.log(`   Found ${all.length} total candidates (${others.length} non-winners)`);
    }
  }

  if (candidates.length === 0) {
    console.log(`   ⚠️ No candidates found, skipping`);
    return [];
  }

  const results = [];
  let photoCount = 0;

  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    progressLog(i + 1, candidates.length, `${c.name}`);

    try {
      const html = await httpGet(`https://www.myneta.info/${electionKey}/candidate.php?candidate_id=${c.id}`);
      if (!html) { results.push({ candidateId: c.id, name: c.name, error: 'fetch_failed' }); await sleep(); continue; }

      const data = parseCandidatePage(html, electionKey);

      const record = {
        candidateId: parseInt(c.id),
        mynetaName: c.name,
        name: (data.name && !/^\d{4}$/.test(data.name) && !/election/i.test(data.name)) ? data.name : c.name,
        constituency: data.constituency || '',
        district: data.district || '',
        party: normalizeParty(data.partyFull),
        partyFull: data.partyFull || '',
        electionKey,
        electionYear: year,
        isWinner: data.isWinner !== false,
        age: data.age || null,
        educationLevel: mapEducation(data.educationCategory),
        educationCategory: data.educationCategory || '',
        educationDetail: data.educationDetail || '',
        selfProfession: data.selfProfession || '',
        spouseProfession: data.spouseProfession || '',
        totalAssets: data.totalAssets || 0,
        totalLiabilities: data.totalLiabilities || 0,
        selfMovableAssets: data.selfMovableAssets || 0,
        selfImmovableAssets: data.selfImmovableAssets || 0,
        totalIncome: data.totalIncome || 0,
        criminalCases: data.criminalCases || 0,
        seriousCriminalCases: data.seriousCriminalCases || 0,
        ipcSections: data.ipcSections || [],
        photoUrl: data.photoUrl || null,
        sourceUrl: `https://www.myneta.info/${electionKey}/candidate.php?candidate_id=${c.id}`,
      };

      if (data.photoUrl) photoCount++;
      results.push(record);

    } catch (err) {
      results.push({ candidateId: parseInt(c.id), name: c.name, error: err.message });
    }

    await sleep();
  }

  console.log(`\n   ✅ Scraped ${results.length} candidates, ${photoCount} photos`);
  return results;
}

// ── Main ───────────────────────────────────────────────────────────────
async function main() {
  console.log('🏛️  MyNeta Comprehensive Scraper');
  console.log('═'.repeat(60));

  ensureDir(OUTPUT_BASE);

  const electionKeys = [];

  if (keyFilter) {
    electionKeys.push(keyFilter);
  } else {
    const filteredStates = stateFilter
      ? STATES.filter(s => s.code === stateFilter.toUpperCase())
      : STATES;

    for (const state of filteredStates) {
      if (allYears) {
        // All elections from MIN_YEAR onwards
        const keys = state.mynetaKeys.filter(k => extractYear(k) >= MIN_YEAR);
        electionKeys.push(...keys);
      } else {
        // Latest election only
        if (state.mynetaKeys.length > 0) electionKeys.push(state.mynetaKeys[0]);
      }
    }
  }

  console.log(`\n📊 Elections to scrape: ${electionKeys.length}`);
  electionKeys.forEach(k => console.log(`   • ${k}`));

  const allResults = {};
  const photoMap = {};
  let totalCandidates = 0;
  let totalPhotos = 0;

  for (const key of electionKeys) {
    const results = await scrapeElection(key);

    // Save per-election file
    const outFile = path.join(OUTPUT_BASE, `${key}.json`);
    writeJSON(outFile, results);
    console.log(`   💾 Saved: ${outFile}`);

    // Collect photo map (latest election wins for photo)
    for (const r of results) {
      if (r.photoUrl && r.isWinner) {
        photoMap[r.name] = r.photoUrl;
        totalPhotos++;
      }
    }

    allResults[key] = results;
    totalCandidates += results.length;
  }

  // Write consolidated photo map
  const existingPhotos = readJSON(path.resolve(__dirname, '../apps/mobile/data/candidate-photo-map.json')) || {};
  const mergedPhotos = { ...existingPhotos, ...photoMap };
  writeJSON(path.resolve(__dirname, '../apps/mobile/data/candidate-photo-map.json'), mergedPhotos);

  // Write master index
  const index = electionKeys.map(k => ({
    key: k,
    year: extractYear(k),
    candidates: (allResults[k] || []).length,
    winners: (allResults[k] || []).filter(r => r.isWinner).length,
    photos: (allResults[k] || []).filter(r => r.photoUrl).length,
  }));
  writeJSON(path.join(OUTPUT_BASE, '_index.json'), index);

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`✨ MyNeta Scraping Complete`);
  console.log(`${'═'.repeat(60)}`);
  console.log(`   Elections scraped:  ${electionKeys.length}`);
  console.log(`   Total candidates:   ${totalCandidates}`);
  console.log(`   Photos collected:   ${totalPhotos}`);
  console.log(`   Photo map entries:  ${Object.keys(mergedPhotos).length}`);
  console.log(`   Output directory:   ${OUTPUT_BASE}`);
}

main().catch(err => { console.error('\n❌ Fatal:', err); process.exit(1); });
