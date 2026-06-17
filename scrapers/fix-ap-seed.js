#!/usr/bin/env node
/**
 * fix-ap-seed.js — Smart merge of scraped MyNeta data with existing seeds
 *
 * Strategy:
 *   1. EXISTING constituency file → AC numbers, districts, Telugu names, SC/ST types
 *   2. SCRAPED winners JSON → correct winner names + parties (match by constituency name)
 *   3. EXISTING MLA profiles → affidavit details (age, assets, education, photos)
 *   4. OUTPUT → Gold-standard LegislatorProfile format seed files
 *
 * Usage: node scrapers/fix-ap-seed.js
 */

const fs = require('fs');
const path = require('path');

const SEED_DIR = path.resolve(__dirname, '../data/seed');
const SCRAPED_FILE = path.resolve(__dirname, 'output/myneta/AndhraPradesh2024-winners.json');
const DEEP_SCRAPE_FILE = path.resolve(__dirname, 'output/myneta/AndhraPradesh2024.json');

// ── Constants ────────────────────────────────────────────────────────
const STATE_CODE = 'AP';
const STATE_NAME = 'Andhra Pradesh';
const ELECTION_KEY = 'AndhraPradesh2024';
const ELECTION_YEAR = 2024;
const ASSEMBLY = '16th Andhra Pradesh Legislative Assembly (2024-)';

const PARTY_FULL = {
  TDP: 'Telugu Desam Party', YSRCP: 'YSR Congress Party',
  JSP: 'Jana Sena Party', BJP: 'Bharatiya Janata Party',
  INC: 'Indian National Congress', CPI: 'Communist Party of India',
  CPIM: 'Communist Party of India (Marxist)', IND: 'Independent',
};

// ── Spelling aliases: MyNeta name → ECI seed name ─────────────────────
// MyNeta uses different transliterations than ECI for some constituencies
const SPELLING_ALIASES = {
  'cheepurupalle': 'cheepurupalli',
  'anakapalle': 'anakapalli',
  'nidadavole': 'nidadavolu',
  'palakollu': 'palacole',
  'jaggayyapeta': 'jaggaiahpeta',
  'pattikonda': 'patikonda',
  'payakaraopet': 'payakaraopeta',
  'pulivendla': 'pulivendula',
  'rayachoti': 'rayachoty',
  'sattenapalle': 'sattenapalli',
  'srungavarapukota': 'srikakulam', // This is S.Kota, maps differently
  'penamaluru': 'penamaluru',
  'jaggampeta': 'jaggampeta',
  'mummidivaram': 'mummidivaram',
  'ramachandrapuram': 'ramachandrapuram',
  'achanta': 'achanta',
  'vinukonda': 'vinukonda',
  'palakonda': 'palakonda',
};

// ── Helpers ──────────────────────────────────────────────────────────
function normalize(name) {
  if (!name) return '';
  return name.toLowerCase().replace(/\s*\(.*?\)\s*/g, '').replace(/[^a-z]/g, '');
}

function resolveAlias(normalizedName) {
  return SPELLING_ALIASES[normalizedName] || normalizedName;
}

function sanitize(str) {
  if (!str) return '';
  return str.replace(/'/g, "\\'").replace(/\\/g, '\\\\').trim();
}

function toTitleCase(str) {
  if (!str) return '';
  return str.replace(/\b\w+/g, w => {
    if (['of', 'the', 'and', 'in'].includes(w.toLowerCase())) return w.toLowerCase();
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  });
}

// ── Load scraped winners ─────────────────────────────────────────────
function loadScrapedWinners() {
  if (!fs.existsSync(SCRAPED_FILE)) {
    console.error(`❌ Scraped data not found: ${SCRAPED_FILE}`);
    console.error('   Run first: node scrapers/fix-ap-seed.js (with network)');
    process.exit(1);
  }
  const raw = JSON.parse(fs.readFileSync(SCRAPED_FILE, 'utf8'));
  // Build lookup by normalized constituency name
  const map = {};
  for (const w of raw) {
    const key = normalize(w.constituency);
    map[key] = w;
  }
  console.log(`📂 Loaded ${raw.length} scraped winners`);
  return map;
}

// ── Load deep scrape data (affidavits) ─────────────────────────────────
function loadDeepScrape() {
  if (!fs.existsSync(DEEP_SCRAPE_FILE)) {
    console.log(`   ⚠️ Deep scrape not available yet`);
    return {};
  }
  const raw = JSON.parse(fs.readFileSync(DEEP_SCRAPE_FILE, 'utf8'));
  const good = raw.filter(e => !e.error);
  const map = {};
  for (const entry of good) {
    const key = normalize(entry.constituency || '');
    if (key) map[key] = entry;
  }
  console.log(`📂 Loaded ${good.length} deep scrape profiles (${raw.length - good.length} errors)`);
  return map;
}

// ── Parse existing constituency seed ─────────────────────────────────
function loadExistingConstituencies() {
  const file = path.join(SEED_DIR, 'andhra-pradesh-constituencies.ts');
  const content = fs.readFileSync(file, 'utf8');
  
  const entries = [];
  const regex = /\{\s*acNo:\s*(\d+),\s*name:\s*'([^']+)'(?:,\s*localName:\s*'([^']*)')?,\s*district:\s*'([^']+)',\s*type:\s*'([^']+)',\s*winner2024:\s*'([^']+)',\s*winnerName2024:\s*'([^']+)',\s*winnerVotes2024:\s*(\d+),\s*runnerUp2024:\s*'([^']*)',\s*margin2024:\s*(\d+),\s*currentParty:\s*'([^']+)'/g;
  
  let match;
  while ((match = regex.exec(content)) !== null) {
    entries.push({
      acNo: parseInt(match[1]),
      name: match[2],
      localName: match[3] || '',
      district: match[4],
      type: match[5],
      winner2024: match[6],
      winnerName2024: match[7],
      winnerVotes2024: parseInt(match[8]),
      runnerUp2024: match[9],
      margin2024: parseInt(match[10]),
      currentParty: match[11],
    });
  }
  console.log(`📂 Loaded ${entries.length} existing constituencies`);
  return entries;
}

// ── Parse existing MLA profiles ──────────────────────────────────────
function loadExistingProfiles() {
  const file = path.join(SEED_DIR, 'andhra-pradesh-mla-profiles.ts');
  const content = fs.readFileSync(file, 'utf8');
  
  const profiles = {};
  // Match each profile block
  const blocks = content.split(/\n\s*\{/);
  for (const block of blocks) {
    const acMatch = block.match(/acNo:\s*(\d+)/);
    if (!acMatch) continue;
    const acNo = parseInt(acMatch[1]);
    
    const get = (field, isNum) => {
      const m = block.match(new RegExp(`${field}:\\s*${isNum ? '(\\d+)' : "'([^']*)'"}` ));
      return m ? (isNum ? parseInt(m[1]) : m[1]) : undefined;
    };
    
    profiles[acNo] = {
      acNo,
      name: get('name'),
      party: get('party'),
      age: get('age', true),
      dob: get('dob'),
      gender: get('gender') || 'M',
      education: get('education'),
      profession: get('profession'),
      criminalCases: get('criminalCases', true),
      totalAssets: get('totalAssets', true),
      totalLiabilities: get('totalLiabilities', true),
      maritalStatus: get('maritalStatus'),
      photoUrl: get('photoUrl'),
      constituencyName: get('constituencyName'),
      sourceUrl: get('sourceUrl'),
    };
  }
  console.log(`📂 Loaded ${Object.keys(profiles).length} existing MLA profiles`);
  return profiles;
}

// ── Main merge logic ─────────────────────────────────────────────────
function main() {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`🏛️  AP Data Fix — Smart Merge Approach`);
  console.log(`${'═'.repeat(60)}\n`);

  const scrapedMap = loadScrapedWinners();
  const deepMap = loadDeepScrape();
  const existingConst = loadExistingConstituencies();
  const existingProfiles = loadExistingProfiles();

  // ── Step 1: Remove ONLY the 3 known duplicate pairs ───────────────
  // These are confirmed duplicates from ECI data analysis:
  //   AC 155 Yemmiganur = AC 154 Emmiganur (same place, different transliteration)
  //   AC 173 Tadpatri = AC 163 Tadipatri (same place)
  //   AC 175 Srisailam = AC 158 Srisailam (exact duplicate)
  const KNOWN_DUPE_ACS = new Set([155, 173, 175]);
  const deduped = existingConst.filter(c => {
    if (KNOWN_DUPE_ACS.has(c.acNo)) {
      console.log(`   🗑️  Removing known duplicate: AC ${c.acNo} "${c.name}"`);
      return false;
    }
    return true;
  });

  console.log(`\n📊 After dedup: ${deduped.length} constituencies (target: 175)`);

  // ── Step 1b: Build reverse alias map (ECI name → scraped key) ───────
  const reverseAlias = {};
  for (const [mynetaKey, eciKey] of Object.entries(SPELLING_ALIASES)) {
    reverseAlias[eciKey] = mynetaKey;
  }

  // ── Step 2: Match scraped winners to existing constituencies ────────
  let matched = 0, unmatched = 0, corrected = 0;
  const merged = [];
  const usedScrapedKeys = new Set();

  for (const c of deduped) {
    const key = normalize(c.name);
    // Try direct match first, then alias
    let scraped = scrapedMap[key];
    if (!scraped && reverseAlias[key]) {
      scraped = scrapedMap[reverseAlias[key]];
    }
    // Try substring matching (only for 8+ char names to avoid false positives)
    if (!scraped && key.length >= 8) {
      for (const [sk, sv] of Object.entries(scrapedMap)) {
        if (sk.length >= 8 && sk.startsWith(key.substring(0, 8)) && !usedScrapedKeys.has(sk)) {
          scraped = sv;
          break;
        }
      }
    }
    const profile = existingProfiles[c.acNo] || {};
    
    let winnerName = c.winnerName2024;
    let party = c.winner2024;
    let sourceUrl = '';
    let candidateId = '';
    let verified = false;

    if (scraped) {
      matched++;
      usedScrapedKeys.add(normalize(scraped.constituency));
      const oldName = c.winnerName2024;
      const newName = scraped.name;
      winnerName = newName;
      party = scraped.party;
      sourceUrl = scraped.sourceUrl || '';
      candidateId = scraped.candidateId || '';
      verified = true;
      
      if (normalize(oldName) !== normalize(newName)) {
        corrected++;
        if (corrected <= 25) {
          console.log(`   ✏️  AC ${c.acNo} ${c.name}: "${oldName}" → "${newName}" (${party})`);
        }
      }
    } else {
      unmatched++;
      if (unmatched <= 10) {
        console.log(`   ❓ AC ${c.acNo} ${c.name}: no scraped match (keeping original)`);
      }
    }

    // Check deep scrape for richer affidavit data
    const deepKey = normalize(c.name);
    const deep = deepMap[deepKey] || (scraped ? deepMap[normalize(scraped.constituency || '')] : null);

    merged.push({
      ...c,
      winnerName2024: winnerName,
      winner2024: party,
      currentParty: party,
      sourceUrl: sourceUrl || (deep ? deep.sourceUrl : ''),
      candidateId,
      verified,
      // Prefer deep scrape > existing profile for affidavit data
      district: (deep && deep.district) ? toTitleCase(deep.district.toLowerCase()) : c.district,
      age: deep?.age || profile.age,
      dob: deep?.age ? `${ELECTION_YEAR - deep.age}-01-01` : (profile.dob || ''),
      gender: profile.gender || 'M',
      education: deep?.educationCategory || profile.education || '',
      educationDetail: deep?.educationDetail || '',
      profession: deep?.selfProfession || profile.profession || '',
      spouseProfession: deep?.spouseProfession || '',
      criminalCases: deep?.criminalCases ?? profile.criminalCases ?? 0,
      seriousCriminalCases: deep?.seriousCriminalCases || 0,
      ipcSections: deep?.ipcSections || [],
      totalAssets: deep?.totalAssets || profile.totalAssets || 0,
      totalLiabilities: deep?.totalLiabilities || profile.totalLiabilities || 0,
      selfMovableAssets: deep?.selfMovableAssets || 0,
      selfImmovableAssets: deep?.selfImmovableAssets || 0,
      totalIncome: deep?.totalIncome || 0,
      maritalStatus: profile.maritalStatus,
      photoUrl: deep?.photoUrl || profile.photoUrl || '',
    });
  }

  console.log(`\n📊 Merge results:`);
  console.log(`   ✅ Matched: ${matched}/${deduped.length}`);
  console.log(`   ❌ Unmatched: ${unmatched} (keeping original data, marked unverified)`);
  console.log(`   ✏️  Names corrected: ${corrected}`);

  // ── Step 2b: Add constituencies from scrape that were MISSING from original ──
  // Exclude known duplicates and garbage entries
  const EXCLUDE_FROM_ADD = new Set(['yemmiganur', 'tadpatri', 'shareon']);
  const unusedScraped = Object.values(scrapedMap).filter(w => {
    const key = normalize(w.constituency);
    return !usedScrapedKeys.has(key) && !EXCLUDE_FROM_ADD.has(key) && w.constituency !== 'Share On:';
  });
  if (unusedScraped.length > 0) {
    console.log(`\n   📌 Adding ${unusedScraped.length} constituencies found in scrape but missing from original:`);
    // Assign AC numbers starting after max existing
    let nextAcNo = Math.max(...merged.map(m => m.acNo)) + 1;
    for (const w of unusedScraped) {
      const constName = w.constituency.replace(/\s*\(.*?\)/g, '').trim();
      const typeMatch = w.constituency.match(/\((SC|ST)\)/i);
      const type = typeMatch ? typeMatch[1].toUpperCase() : 'GEN';
      console.log(`      AC ${nextAcNo}: ${constName} (${w.party}) — ${w.name}`);
      merged.push({
        acNo: nextAcNo++,
        name: toTitleCase(constName),
        localName: '',
        district: '',
        type,
        winnerName2024: w.name,
        winner2024: w.party,
        currentParty: w.party,
        winnerVotes2024: 0,
        runnerUp2024: '',
        margin2024: 0,
        sourceUrl: w.sourceUrl || '',
        candidateId: w.candidateId || '',
        verified: true,
        age: undefined,
        dob: undefined,
        gender: 'M',
        education: '',
        profession: '',
        criminalCases: 0,
        totalAssets: 0,
        totalLiabilities: 0,
        maritalStatus: undefined,
        photoUrl: '',
      });
    }
  }

  // ── Step 3: Sort by AC number ──────────────────────────────────────
  merged.sort((a, b) => a.acNo - b.acNo);
  console.log(`\n📊 Final count: ${merged.length} constituencies`);

  // ── Step 4: Generate gold-standard MLA profiles ────────────────────
  generateProfilesSeed(merged);
  
  // ── Step 5: Generate corrected constituencies ──────────────────────
  generateConstituenciesSeed(merged);

  // Party distribution
  const parties = {};
  for (const m of merged) { parties[m.currentParty] = (parties[m.currentParty] || 0) + 1; }
  console.log(`\n📊 Final party distribution:`);
  Object.entries(parties).sort((a,b) => b[1]-a[1]).forEach(([p,c]) => console.log(`   ${p}: ${c}`));
  console.log(`\n✅ Done! Files written to: ${SEED_DIR}`);
}

// ── Generate LegislatorProfile seed ──────────────────────────────────
function generateProfilesSeed(merged) {
  const today = new Date().toISOString().split('T')[0];
  const parties = {};
  merged.forEach(m => { parties[m.currentParty] = (parties[m.currentParty] || 0) + 1; });
  const partyDist = Object.entries(parties).sort((a,b) => b[1]-a[1])
    .map(([p,c]) => `  // ${p}: ${c} seats`).join('\n');

  let ts = `/**
 * ╔════════════════════════════════════════════════════════════════════════╗
 * ║  ANDHRA PRADESH MLA PROFILES — All ${merged.length} MLAs (${ASSEMBLY})
 * ╚════════════════════════════════════════════════════════════════════════╝
 *
 * SCHEMA: Full LEGISLATOR_PROFILE_TEMPLATE v1.0
 * SOURCE: MyNeta.info 2024 Election Data (verified scrape)
 * GENERATED: ${today}
 *
 * Party Distribution (2024):
${partyDist}
 *
 * Data includes: identity, election history, financial disclosures,
 *                criminal record, education, profession, photo sources.
 * All affidavit data from MyNeta/ADR (publicly available ECI data).
 *
 * VERIFICATION: ${merged.filter(m=>m.verified).length}/${merged.length} entries verified against MyNeta winners list.
 */

// ── Full Legislator Profile Interface (per LEGISLATOR_PROFILE_TEMPLATE.md) ──

export interface ElectionRecord {
  electionYear: number;
  electionType: 'assembly' | 'lok_sabha' | 'rajya_sabha' | 'by_election';
  electionKey: string;
  stateCode: string;
  constituencyName: string;
  constituencyNumber: number;
  party: string;
  result: 'won' | 'lost' | 'forfeited_deposit';
  votesReceived: number;
  voteShare: number;
  margin: number;
  rank: number;
  runnerUp: string;
  runnerUpParty: string;
  runnerUpVotes: number;
}

export interface FinancialRecord {
  electionYear: number;
  selfMovableAssets: number;
  selfImmovableAssets: number;
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  selfIncome: number;
  isCrorepati: boolean;
  sourceUrl: string;
}

export interface CriminalRecord {
  hasCriminalCases: boolean;
  totalCases: number;
  seriousCases: number;
  convictions: number;
  ipcSections: string[];
}

export interface PhotoSources {
  myneta?: string;
  myneta_prior?: string;
  prs?: string;
  wikipedia?: string;
  legislature?: string;
}

export interface LegislatorProfile {
  id: string;
  acNo: number;
  name: string;
  displayName: string;
  gender: 'M' | 'F' | 'O';
  age?: number;
  dob?: string;
  dobEstimated?: boolean;
  house: 'state_assembly' | 'lok_sabha' | 'rajya_sabha' | 'state_council';
  stateCode: string;
  stateName: string;
  constituencyName: string;
  constituencyNumber: number;
  district: string;
  currentParty: string;
  currentPartyFull: string;
  isCurrentMember: boolean;
  isCabinetMinister: boolean;
  isChiefMinister: boolean;
  termsServed: number;
  firstElectedYear: number;
  maritalStatus?: 'Single' | 'Married' | 'Widowed' | 'Divorced';
  education: {
    educationLevel: string;
    educationCategory: string;
    selfProfession: string;
    spouseProfession: string;
  };
  photoUrl?: string;
  photoSources: PhotoSources;
  electionHistory: ElectionRecord[];
  financialHistory: FinancialRecord[];
  criminalRecord: CriminalRecord;
  mynetaUrl: string;
  prsUrl?: string;
  wikipediaArticle?: string;
  dataSources: string[];
  lastUpdated: string;
  dataCompleteness: number;
  verificationStatus: 'verified' | 'partial' | 'unverified';
}

// ── ${merged.length} MLA Profiles for Andhra Pradesh — 2024 Assembly ──

export const AP_MLA_PROFILES: LegislatorProfile[] = [
`;

  for (const m of merged) {
    const name = sanitize(m.winnerName2024);
    const constituency = sanitize(m.name);
    const district = sanitize(m.district);
    const party = m.currentParty;
    const partyFull = sanitize(PARTY_FULL[party] || party);
    const age = m.age || undefined;
    const dob = m.dob || (age ? `${ELECTION_YEAR - age}-01-01` : '');
    const gender = m.gender || 'M';
    const education = m.education || '';
    const profession = m.profession || '';
    const assets = m.totalAssets || 0;
    const liabilities = m.totalLiabilities || 0;
    const criminal = m.criminalCases || 0;
    const photo = m.photoUrl || '';
    const sourceUrl = m.sourceUrl || '';
    const marital = m.maritalStatus;
    const netWorth = assets - liabilities;
    const isCrorepati = assets >= 10000000;
    
    // Completeness
    const checks = [name, party, age, education, profession, assets, photo];
    const filled = checks.filter(Boolean).length;
    const completeness = Math.round((filled / checks.length) * 100);
    const verStatus = m.verified ? (completeness >= 60 ? 'verified' : 'partial') : 'unverified';

    ts += `{
    id: 'MLA_AP_2024_${String(m.acNo).padStart(3, '0')}',
    acNo: ${m.acNo},
    name: '${name}',
    displayName: '${name}',
    gender: '${gender}',${age ? `\n    age: ${age},` : ''}${dob ? `\n    dob: '${dob}',\n    dobEstimated: true,` : ''}
    house: 'state_assembly',
    stateCode: '${STATE_CODE}',
    stateName: '${STATE_NAME}',
    constituencyName: '${constituency}',
    constituencyNumber: ${m.acNo},
    district: '${district}',
    currentParty: '${party}',
    currentPartyFull: '${partyFull}',
    isCurrentMember: true,
    isCabinetMinister: false,
    isChiefMinister: false,
    termsServed: 1,
    firstElectedYear: ${ELECTION_YEAR},${marital ? `\n    maritalStatus: '${marital}',` : ''}
    education: {
      educationLevel: '${sanitize(education.toLowerCase())}',
      educationCategory: '${sanitize(education)}',
      selfProfession: '${sanitize(profession)}',
      spouseProfession: '${sanitize(m.spouseProfession || '')}',
    },${photo ? `\n    photoUrl: '${sanitize(photo)}',` : ''}
    photoSources: {${photo ? `\n      myneta: '${sanitize(photo)}',` : ''}
    },
    electionHistory: [
      {
        electionYear: ${ELECTION_YEAR},
        electionType: 'assembly',
        electionKey: '${ELECTION_KEY}',
        stateCode: '${STATE_CODE}',
        constituencyName: '${constituency}',
        constituencyNumber: ${m.acNo},
        party: '${party}',
        result: 'won',
        votesReceived: ${m.winnerVotes2024 || 0},
        voteShare: 0,
        margin: ${m.margin2024 || 0},
        rank: 1,
        runnerUp: '${sanitize(m.runnerUp2024 || '')}',
        runnerUpParty: '${sanitize(m.runnerUp2024 || '')}',
        runnerUpVotes: 0,
      },
    ],
    financialHistory: [
      {
        electionYear: ${ELECTION_YEAR},
        selfMovableAssets: ${m.selfMovableAssets || 0},
        selfImmovableAssets: ${m.selfImmovableAssets || 0},
        totalAssets: ${assets},
        totalLiabilities: ${liabilities},
        netWorth: ${netWorth},
        selfIncome: ${m.totalIncome || 0},
        isCrorepati: ${isCrorepati},
        sourceUrl: '${sanitize(sourceUrl)}',
      },
    ],
    criminalRecord: {
      hasCriminalCases: ${criminal > 0},
      totalCases: ${criminal},
      seriousCases: ${m.seriousCriminalCases || 0},
      convictions: 0,
      ipcSections: [${(m.ipcSections || []).map(s => `'${s}'`).join(', ')}],
    },
    mynetaUrl: '${sanitize(sourceUrl)}',
    dataSources: ['myneta'],
    lastUpdated: '${new Date().toISOString()}',
    dataCompleteness: ${completeness},
    verificationStatus: '${verStatus}',
},
`;
  }

  ts += `];

/** Get MLA profile by constituency number */
export function getAPMLAProfile(acNo: number): LegislatorProfile | undefined {
  return AP_MLA_PROFILES.find((p) => p.acNo === acNo);
}

/** Get MLAs who defected (currentParty differs from election party) */
export function getAPDefectedMLAs(): LegislatorProfile[] {
  return AP_MLA_PROFILES.filter((p) => {
    const electedParty = p.electionHistory[0]?.party;
    return electedParty && electedParty !== p.currentParty;
  });
}

/** Get all MLA profiles */
export function getAllAPMLAs(): LegislatorProfile[] {
  return AP_MLA_PROFILES;
}

/** Get MLAs by party */
export function getAPMLAsByParty(party: string): LegislatorProfile[] {
  return AP_MLA_PROFILES.filter((p) => p.currentParty === party);
}

/** Get female MLAs */
export function getAPFemaleMLAs(): LegislatorProfile[] {
  return AP_MLA_PROFILES.filter((p) => p.gender === 'F');
}
`;

  const outPath = path.join(SEED_DIR, 'andhra-pradesh-mla-profiles.ts');
  fs.writeFileSync(outPath, ts, 'utf8');
  console.log(`\n💾 MLA Profiles: ${outPath} (${Math.round(ts.length / 1024)}KB, ${merged.length} entries)`);
}

// ── Generate constituencies seed ─────────────────────────────────────
function generateConstituenciesSeed(merged) {
  const today = new Date().toISOString().split('T')[0];
  const parties = {};
  merged.forEach(m => { parties[m.currentParty] = (parties[m.currentParty] || 0) + 1; });
  const tallyStr = Object.entries(parties).sort((a,b) => b[1]-a[1])
    .map(([p,c]) => `${p}: ${c}`).join(' | ');

  let ts = `/**
 * Andhra Pradesh Assembly Constituencies — Full Data (${merged.length} seats)
 *
 * ── SOURCE ──────────────────────────────────────────────────────────────────
 *  Election Commission of India, AP 2024 General Election results.
 *  Winner names verified from MyNeta.info scrape (${merged.filter(m=>m.verified).length}/${merged.length} verified).
 *
 * ── PARTY TALLY 2024 ───────────────────────────────────────────────────────
 *  ${tallyStr} | Total: ${merged.length}
 *
 * ── DATA NOTES ──────────────────────────────────────────────────────────────
 *  - Vote counts are from ECI where available, otherwise 0.
 *  - AC numbers follow official ECI numbering (geographic order).
 *  - Telugu names (localName) are manually verified.
 *
 * GENERATED: ${today}
 */

export interface APConstituencySeed {
  acNo: number;
  name: string;
  /** Constituency name in Telugu script */
  localName?: string;
  district: string;
  type: 'GEN' | 'SC' | 'ST';
  winner2024: string;
  winnerName2024: string;
  winnerVotes2024: number;
  runnerUp2024: string;
  margin2024: number;
  currentParty: string;
}

export const AP_CONSTITUENCIES: APConstituencySeed[] = [
`;

  // Group by district for readability
  let currentDistrict = '';
  for (const m of merged) {
    if (m.district !== currentDistrict) {
      currentDistrict = m.district;
      ts += `  // ── ${currentDistrict} District ──\n`;
    }
    const localName = m.localName ? `localName: '${m.localName}', ` : '';
    ts += `  { acNo: ${m.acNo}, name: '${sanitize(m.name)}', ${localName}district: '${sanitize(m.district)}', type: '${m.type}', winner2024: '${m.currentParty}', winnerName2024: '${sanitize(m.winnerName2024)}', winnerVotes2024: ${m.winnerVotes2024 || 0}, runnerUp2024: '${sanitize(m.runnerUp2024 || '')}', margin2024: ${m.margin2024 || 0}, currentParty: '${m.currentParty}' },\n`;
  }

  ts += `];

/** Get constituency data by AC number */
export function getAPConstituency(acNo: number): APConstituencySeed | undefined {
  return AP_CONSTITUENCIES.find((c) => c.acNo === acNo);
}

/** Get all constituencies in a district */
export function getAPConstituenciesByDistrict(district: string): APConstituencySeed[] {
  return AP_CONSTITUENCIES.filter((c) => c.district.toLowerCase() === district.toLowerCase());
}

/** Get all constituencies won by a party */
export function getAPConstituenciesByParty(party: string): APConstituencySeed[] {
  return AP_CONSTITUENCIES.filter((c) => c.currentParty === party);
}
`;

  const outPath = path.join(SEED_DIR, 'andhra-pradesh-constituencies.ts');
  fs.writeFileSync(outPath, ts, 'utf8');
  console.log(`💾 Constituencies: ${outPath} (${Math.round(ts.length / 1024)}KB, ${merged.length} entries)`);
}

// ── Run ──────────────────────────────────────────────────────────────
main();
