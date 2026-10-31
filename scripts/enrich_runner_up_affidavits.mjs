/**
 * Runner-Up & Podium Candidate Profile Enrichment Engine
 * ══════════════════════════════════════════════════════
 * Cross-references Rank 1 (Winner), Rank 2 (1st Runner Up), and Rank 3 (2nd Runner Up)
 * across all historical Assembly and Parliamentary contests against authoritative
 * affidavit datasets (ADR/MyNeta & ECI).
 *
 * Populates:
 *   - education (standardized + raw)
 *   - profession (self & spouse)
 *   - totalAssets (movable + immovable in ₹)
 *   - totalLiabilities (in ₹)
 *   - criminalCases & seriousCriminalCases
 *   - photoUrl & affidavitUrl (sourceUrl)
 *   - dob & age
 *   - dataStatus ('VERIFIED')
 *
 * Usage: node scripts/enrich_runner_up_affidavits.mjs
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const HISTORICAL_DIR = path.resolve(ROOT, 'data/historical');
const MYNETA_DIR = path.resolve(ROOT, 'scrapers/output/myneta');
const AFFIDAVITS_FILE = path.resolve(ROOT, 'data/archive/mobile-bundled-assets/affidavits/candidate-affidavits.json');

function normalizeName(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/\b(dr|adv|shri|smt|prof|eng|er|advocate|colonel|major|capt|mr|mrs|ms)\b/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

console.log('=== CANDIDATE PROFILE & AFFIDAVIT ENRICHMENT ENGINE ===\n');

// ── 1. BUILD AFFIDAVIT LOOKUP INDEX ──────────────────────────────────────────
console.log('[INDEXING] Building candidate affidavit index...');

const index = new Map();

function addToIndex(key, data) {
  if (!key || !data) return;
  if (!index.has(key)) {
    index.set(key, data);
  } else {
    // Merge if existing has less detail
    const existing = index.get(key);
    if (!existing.totalAssets && data.totalAssets) existing.totalAssets = data.totalAssets;
    if (!existing.education && data.education) existing.education = data.education;
    if (!existing.profession && data.profession) existing.profession = data.profession;
    if (existing.criminalCases === undefined && data.criminalCases !== undefined) {
      existing.criminalCases = data.criminalCases;
    }
  }
}

// 1a. Load candidate-affidavits.json
if (fs.existsSync(AFFIDAVITS_FILE)) {
  const affData = JSON.parse(fs.readFileSync(AFFIDAVITS_FILE, 'utf8'));
  let affCount = 0;
  for (const [rawKey, item] of Object.entries(affData)) {
    const norm = normalizeName(item.candidateName || rawKey);
    const profile = {
      name: item.candidateName || rawKey,
      stateCode: item.stateCode,
      education: item.educationRaw || item.education || null,
      profession: item.selfProfession || null,
      totalAssets: item.totalAssets || 0,
      totalLiabilities: item.totalLiabilities || 0,
      criminalCases: item.criminalCases !== undefined ? item.criminalCases : 0,
      seriousCriminalCases: Array.isArray(item.seriousIpcSections) ? item.seriousIpcSections.length : 0,
      photoUrl: item.photoUrl || null,
      affidavitUrl: item.sourceUrl || null,
      dob: item.dob || null,
      age: item.age || null,
    };

    if (item.stateCode) {
      addToIndex(`${norm}_${item.stateCode.toUpperCase()}`, profile);
      if (item.electionYear) {
        addToIndex(`${norm}_${item.stateCode.toUpperCase()}_${item.electionYear}`, profile);
      }
    }
    addToIndex(norm, profile);
    affCount++;
  }
  console.log(`  ✓ Loaded ${affCount} affidavits from candidate-affidavits.json`);
}

// 1b. Load scrapers/output/myneta/*.json
if (fs.existsSync(MYNETA_DIR)) {
  const files = fs.readdirSync(MYNETA_DIR).filter(f => f.endsWith('.json') && !f.startsWith('_'));
  let mynetaCount = 0;
  for (const file of files) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(MYNETA_DIR, file), 'utf8'));
      if (!Array.isArray(data)) continue;
      for (const item of data) {
        if (item.error) continue;
        const candName = item.mynetaName || item.name;
        if (!candName) continue;
        const norm = normalizeName(candName);
        const stateCode = (item.stateCode || file.replace(/\d+.*$/, '')).slice(0, 2).toUpperCase();
        const profile = {
          name: candName,
          stateCode,
          education: item.educationDetail || item.educationCategory || item.educationLevel || null,
          profession: item.selfProfession || null,
          totalAssets: item.totalAssets || 0,
          totalLiabilities: item.totalLiabilities || 0,
          criminalCases: item.criminalCases !== undefined ? item.criminalCases : 0,
          seriousCriminalCases: item.seriousCriminalCases || (Array.isArray(item.ipcSections) ? item.ipcSections.length : 0),
          photoUrl: item.photoUrl || null,
          affidavitUrl: item.sourceUrl || null,
          dob: item.dob || null,
          age: item.age || null,
        };

        if (stateCode) {
          addToIndex(`${norm}_${stateCode}`, profile);
          if (item.electionYear) {
            addToIndex(`${norm}_${stateCode}_${item.electionYear}`, profile);
          }
        }
        addToIndex(norm, profile);
        mynetaCount++;
      }
    } catch (e) {}
  }
  console.log(`  ✓ Loaded ${mynetaCount} candidate profiles from MyNeta output`);
}

console.log(`  Total unique lookup keys indexed: ${index.size}\n`);

// ── 2. MATCH AND ENRICH CANDIDATES ───────────────────────────────────────────
function findAffidavit(name, stateCode, electionYear) {
  if (!name) return null;
  const norm = normalizeName(name);
  if (!norm) return null;

  if (stateCode && electionYear) {
    const keyYear = `${norm}_${stateCode.toUpperCase()}_${electionYear}`;
    if (index.has(keyYear)) return index.get(keyYear);
  }

  if (stateCode) {
    const keyState = `${norm}_${stateCode.toUpperCase()}`;
    if (index.has(keyState)) return index.get(keyState);
  }

  if (index.has(norm)) return index.get(norm);
  return null;
}

function enrichCandidate(cand, stateCode, electionYear) {
  if (!cand || !cand.name) return false;
  const aff = findAffidavit(cand.name, stateCode, electionYear);
  if (!aff) return false;

  let enriched = false;
  if (!cand.education && aff.education) {
    cand.education = aff.education;
    enriched = true;
  }
  if (!cand.profession && aff.profession) {
    cand.profession = aff.profession;
    enriched = true;
  }
  if (!cand.totalAssets && aff.totalAssets) {
    cand.totalAssets = aff.totalAssets;
    enriched = true;
  }
  if (!cand.totalLiabilities && aff.totalLiabilities) {
    cand.totalLiabilities = aff.totalLiabilities;
    enriched = true;
  }
  if (cand.criminalCases === undefined && aff.criminalCases !== undefined) {
    cand.criminalCases = aff.criminalCases;
    enriched = true;
  }
  if (cand.seriousCriminalCases === undefined && aff.seriousCriminalCases !== undefined) {
    cand.seriousCriminalCases = aff.seriousCriminalCases;
    enriched = true;
  }
  if (!cand.photoUrl && aff.photoUrl) {
    cand.photoUrl = aff.photoUrl;
    enriched = true;
  }
  if (!cand.affidavitUrl && aff.affidavitUrl) {
    cand.affidavitUrl = aff.affidavitUrl;
    enriched = true;
  }
  if (!cand.age && aff.age) {
    cand.age = aff.age;
    enriched = true;
  }
  if (!cand.dob && aff.dob) {
    cand.dob = aff.dob;
    enriched = true;
  }

  if (enriched) {
    cand.dataStatus = 'VERIFIED';
  }
  return enriched;
}

// ── 3. PROCESS ALL HISTORICAL PODIUM RESULTS ─────────────────────────────────
const historicalFiles = fs.readdirSync(HISTORICAL_DIR).filter(f => f.endsWith('-podium-results.json'));

let totalContestsProcessed = 0;
let totalWinnersEnriched = 0;
let totalRunnerUp1Enriched = 0;
let totalRunnerUp2Enriched = 0;

console.log(`[ENRICHING] Scanning ${historicalFiles.length} podium result files...\n`);

for (const file of historicalFiles) {
  const filePath = path.join(HISTORICAL_DIR, file);
  const contests = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  let fileWinners = 0;
  let fileRu1 = 0;
  let fileRu2 = 0;

  for (const c of contests) {
    totalContestsProcessed++;
    if (c.winner && enrichCandidate(c.winner, c.stateCode, c.electionYear)) {
      fileWinners++;
      totalWinnersEnriched++;
    }
    if (c.firstRunnerUp && enrichCandidate(c.firstRunnerUp, c.stateCode, c.electionYear)) {
      fileRu1++;
      totalRunnerUp1Enriched++;
    }
    if (c.secondRunnerUp && enrichCandidate(c.secondRunnerUp, c.stateCode, c.electionYear)) {
      fileRu2++;
      totalRunnerUp2Enriched++;
    }
  }

  fs.writeFileSync(filePath, JSON.stringify(contests, null, 2), 'utf8');

  console.log(
    `  ${file.padEnd(30)} | Contests: ${String(contests.length).padStart(5)} | ` +
    `W: +${String(fileWinners).padStart(3)} | RU1: +${String(fileRu1).padStart(3)} | RU2: +${String(fileRu2).padStart(3)}`
  );
}

console.log('\n═════════════════════════════════════════════════════════════════════════════════');
console.log('                     CANDIDATE ENRICHMENT COMPLETED                              ');
console.log('═════════════════════════════════════════════════════════════════════════════════');
console.log(`Total Historical Contests Processed : ${totalContestsProcessed}`);
console.log(`Winners Enriched with Affidavits    : ${totalWinnersEnriched}`);
console.log(`1st Runner-Ups Enriched             : ${totalRunnerUp1Enriched}`);
console.log(`2nd Runner-Ups Enriched             : ${totalRunnerUp2Enriched}`);
console.log(`Total Podium Candidates Enriched    : ${totalWinnersEnriched + totalRunnerUp1Enriched + totalRunnerUp2Enriched}`);
console.log('═════════════════════════════════════════════════════════════════════════════════\n');
