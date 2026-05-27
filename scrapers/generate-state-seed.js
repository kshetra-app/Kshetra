#!/usr/bin/env node
/**
 * generate-state-seed.js
 * ══════════════════════════════════════════════════════════════════════
 * Takes myneta scrape output for a state and generates all necessary
 * TypeScript seed files:
 *   - {state}-constituencies.ts
 *   - {state}-mla-profiles.ts
 *   - {state}-election-history.ts
 *   - {state}-demographics.ts (stub)
 *   - {state}-political-timeline.ts (stub)
 *   - {state}-trivia.ts (stub)
 *
 * Usage:
 *   node scrapers/generate-state-seed.js --state=RJ
 *   node scrapers/generate-state-seed.js --all
 */

const fs = require('fs');
const path = require('path');
const { STATES } = require('./config');
const { readJSON } = require('./utils');

const args = process.argv.slice(2);
const stateFilter = args.find(a => a.startsWith('--state='))?.split('=')[1];
const doAll = args.includes('--all');

const OUTPUT_BASE = path.resolve(__dirname, 'output');
const SEED_DIR = path.resolve(__dirname, '../data/seed');

// ── Party normalizer ──────────────────────────────────────────────────
const PARTY_SHORT = {
  'INDIAN NATIONAL CONGRESS': 'INC', 'CONGRESS': 'INC',
  'BHARATIYA JANATA PARTY': 'BJP',
  'BAHUJAN SAMAJ PARTY': 'BSP',
  'SAMAJWADI PARTY': 'SP',
  'NATIONALIST CONGRESS PARTY': 'NCP', 'NCP-SP': 'NCP-SP',
  'SHIV SENA': 'SS', 'SHIV SENA (UBT)': 'SS-UBT',
  'YSRCP': 'YSRCP', 'YSR CONGRESS PARTY': 'YSRCP',
  'TELUGU DESAM': 'TDP', 'TELUGU DESAM PARTY': 'TDP',
  'COMMUNIST PARTY OF INDIA  (MARXIST)': 'CPIM', 'CPI(M)': 'CPIM',
  'COMMUNIST PARTY OF INDIA': 'CPI',
  'ALL INDIA TRINAMOOL CONGRESS': 'AITC',
  'BIJU JANATA DAL': 'BJD',
  'JHARKHAND MUKTI MORCHA': 'JMM',
  'AAMAADMI PARTY': 'AAP', 'AAM AADMI PARTY': 'AAP',
  'JANTA DAL (UNITED)': 'JDU', 'JANATA DAL (UNITED)': 'JDU',
  'RASHTRIYA JANATA DAL': 'RJD',
  'SHIROMANI AKALI DAL': 'SAD',
  'DRAVIDA MUNNETRA KAZHAGAM': 'DMK',
  'ALL INDIA ANNA DRAVIDA MUNNETRA KAZHAGAM': 'AIADMK',
  'INDEPENDENT': 'IND',
};

function shortParty(full) {
  if (!full) return 'IND';
  const upper = full.toUpperCase().trim();
  for (const [k, v] of Object.entries(PARTY_SHORT)) {
    if (upper === k || upper.startsWith(k.substring(0, 10))) return v;
  }
  // Extract acronym for unknown parties
  const words = full.split(/\s+/).filter(w => w.length > 2);
  if (words.length >= 2) return words.map(w => w[0]).join('').toUpperCase().substring(0, 6);
  return full.substring(0, 6).toUpperCase();
}

function sanitize(str) {
  if (!str) return '';
  return str.replace(/'/g, "\\'").replace(/\\/g, '\\\\').trim();
}

function toTitleCase(str) {
  if (!str) return '';
  return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

// ── Load scraped data for a state ──────────────────────────────────────
function loadMyNetaWinners(stateCode) {
  const state = STATES.find(s => s.code === stateCode);
  if (!state) return [];
  
  const basicDir = path.join(OUTPUT_BASE, 'myneta');
  const deepDir = path.join(OUTPUT_BASE, 'myneta-deep');
  const winners = [];
  
  // Only use latest election key
  const key = state.mynetaKeys[0];
  if (!key) return [];
  
  const deepFile = path.join(deepDir, `${key}.json`);
  const basicFile = path.join(basicDir, `${key}.json`);
  const data = readJSON(deepFile) || readJSON(basicFile);
  if (!data) return [];
  
  return data.filter(r => r.isWinner !== false);
}

// ── Convert education level ──────────────────────────────────────────
function mapEdu(cat) {
  if (!cat) return 'Others';
  const c = cat.toLowerCase();
  if (c.includes('post graduate') || c.includes('postgraduate') || c.includes('phd') || c.includes('doctorate')) return 'Post Graduate';
  if (c.includes('graduate professional') || c.includes('professional')) return 'Graduate Professional';
  if (c.includes('graduate')) return 'Graduate';
  if (c.includes('12') || c.includes('hsc') || c.includes('12th')) return '12th Pass';
  if (c.includes('10') || c.includes('ssc') || c.includes('10th') || c.includes('matriculate')) return '10th Pass';
  if (c.includes('8') || c.includes('8th')) return '8th Pass';
  if (c.includes('5') || c.includes('5th') || c.includes('literate')) return '5th Pass';
  if (c.includes('illiterate')) return 'Illiterate';
  return 'Others';
}

// ── Detect gender from profession/name hints ──────────────────────────
function guessGender(r) {
  const female = /\b(housewife|teacher|nurse|doctor|mrs|ms\b|smt|kumari|devi|kumari|mata|bai|ben|devi|kumari|behn)\b/i;
  return female.test(r.spouseProfession + ' ' + r.name) ? 'F' : 'M';
}

// ── Generate state code label for file naming ─────────────────────────
function stateFileName(code, stateName) {
  const nameMap = {
    RJ: 'rajasthan', GJ: 'gujarat', DL: 'delhi', OD: 'odisha', JH: 'jharkhand',
    BR: 'bihar', PB: 'punjab', HR: 'haryana', CG: 'chhattisgarh', MP: 'madhya-pradesh',
    AS: 'assam', GA: 'goa', HP: 'himachal-pradesh', JK: 'jammu-kashmir',
    MN: 'manipur', ML: 'meghalaya', MZ: 'mizoram', NL: 'nagaland', TR: 'tripura',
    UK: 'uttarakhand', AR: 'arunachal-pradesh', SK: 'sikkim', PY: 'puducherry',
  };
  return nameMap[code] || stateName.toLowerCase().replace(/\s+/g, '-');
}

function stateVarPrefix(code) {
  const map = {
    RJ: 'RJ', GJ: 'GJ', DL: 'DL', OD: 'OD', JH: 'JH',
    BR: 'BR', PB: 'PB', HR: 'HR', CG: 'CG', MP: 'MP',
    AS: 'AS', GA: 'GA', HP: 'HP', JK: 'JK',
    MN: 'MN', ML: 'ML', MZ: 'MZ', NL: 'NL', TR: 'TR',
    UK: 'UK', AR: 'AR', SK: 'SK', PY: 'PY',
  };
  return map[code] || code;
}

// ── Generate constituencies TypeScript ────────────────────────────────
function generateConstituenciesFile(stateCode, stateName, winners, electionYear) {
  const prefix = stateVarPrefix(stateCode);
  const yearKey = `winner${electionYear}`;
  
  const records = winners.map((w, i) => {
    const party = shortParty(w.partyFull || w.party);
    const name = sanitize(toTitleCase(w.name || w.mynetaName || ''));
    const constit = sanitize(toTitleCase(w.constituency || ''));
    const district = sanitize(toTitleCase(w.district || ''));
    const acNo = i + 1; // Sequential if no AC number in data
    return `  { acNo: ${acNo}, name: '${constit}', district: '${district}', type: 'GEN', ${yearKey}: '${party}', winnerName${electionYear}: '${name}', winnerVotes${electionYear}: 0, runnerUp${electionYear}: '', margin${electionYear}: 0, currentParty: '${party}' },`;
  });

  return `/**
 * ${stateName} Assembly Constituencies — ${winners.length} seats (${electionYear})
 *
 * AUTO-GENERATED from MyNeta.info scrape data.
 * Date: ${new Date().toISOString().split('T')[0]}
 */

export interface ${prefix}ConstituencySeed {
  acNo: number;
  name: string;
  district: string;
  type: 'GEN' | 'SC' | 'ST';
  ${yearKey}: string;
  winnerName${electionYear}: string;
  winnerVotes${electionYear}: number;
  runnerUp${electionYear}: string;
  margin${electionYear}: number;
  currentParty: string;
}

export const ${prefix}_CONSTITUENCIES: ${prefix}ConstituencySeed[] = [
${records.join('\n')}
];

export function get${prefix}Constituency(acNo: number): ${prefix}ConstituencySeed | undefined {
  return ${prefix}_CONSTITUENCIES.find(c => c.acNo === acNo);
}
`;
}

// ── Generate MLA profiles TypeScript ─────────────────────────────────
function generateMlaProfilesFile(stateCode, stateName, winners, electionYear) {
  const prefix = stateVarPrefix(stateCode);

  const records = winners.map((w, i) => {
    const party = shortParty(w.partyFull || w.party);
    const name = sanitize(toTitleCase(w.name || w.mynetaName || ''));
    const constit = sanitize(toTitleCase(w.constituency || ''));
    const district = sanitize(toTitleCase(w.district || ''));
    const age = w.age || null;
    const dob = age ? `'${electionYear - age}-01-01'` : 'undefined';
    const edu = sanitize(mapEdu(w.educationCategory));
    const prof = sanitize(w.selfProfession || '');
    const assets = w.totalAssets || 0;
    const liabilities = w.totalLiabilities || 0;
    const criminal = w.criminalCases || 0;
    const photo = w.photoUrl ? `'${w.photoUrl}'` : 'undefined';
    const source = w.sourceUrl ? `'${w.sourceUrl}'` : 'undefined';
    const gender = guessGender(w);
    const acNo = i + 1;

    return `  {
    acNo: ${acNo},
    name: '${name}',
    party: '${party}',
    age: ${age || 'undefined'},
    dob: ${dob},
    dobEstimated: ${age ? 'true' : 'undefined'},
    gender: '${gender}',
    education: ${edu ? `'${edu}'` : 'undefined'},
    profession: ${prof ? `'${prof}'` : 'undefined'},
    terms: 1,
    criminalCases: ${criminal},
    totalAssets: ${assets},
    totalLiabilities: ${liabilities || 'undefined'},
    maritalStatus: ${w.spouseProfession ? "'Married'" : 'undefined'},
    photoUrl: ${photo},
    constituencyName: '${constit}',
    district: '${district}',
    sourceUrl: ${source},
  },`;
  });

  return `/**
 * ╔════════════════════════════════════════════════════════════════════════╗
 * ║  ${stateName.toUpperCase()} MLA PROFILES — ${winners.length} MLAs (${electionYear}-)
 * ╚════════════════════════════════════════════════════════════════════════╝
 *
 * AUTO-GENERATED from MyNeta.info scrape data.
 * Date: ${new Date().toISOString().split('T')[0]}
 */

export interface MLAProfile {
  acNo: number;
  name: string;
  party: string;
  electedParty?: string;
  age?: number;
  dob?: string;
  dobEstimated?: boolean;
  gender: 'M' | 'F';
  education?: string;
  profession?: string;
  terms: number;
  criminalCases?: number;
  totalAssets?: number;
  totalLiabilities?: number;
  maritalStatus?: 'Single' | 'Married' | 'Widowed' | 'Divorced';
  photoUrl?: string;
  constituencyName?: string;
  district?: string;
  sourceUrl?: string;
}

export const ${prefix}_MLA_PROFILES: MLAProfile[] = [
${records.join('\n')}
];

export function get${prefix}MLAProfile(acNo: number): MLAProfile | undefined {
  return ${prefix}_MLA_PROFILES.find(p => p.acNo === acNo);
}

export function get${prefix}MLAsByParty(party: string): MLAProfile[] {
  return ${prefix}_MLA_PROFILES.filter(p => p.party === party);
}

export function get${prefix}FemaleMLAs(): MLAProfile[] {
  return ${prefix}_MLA_PROFILES.filter(p => p.gender === 'F');
}
`;
}

// ── Generate stub files (election history, demographics, etc.) ─────────
function generateElectionHistoryStub(stateCode, stateName, winners, electionYear) {
  const prefix = stateVarPrefix(stateCode);
  // Count parties
  const partyCounts = {};
  for (const w of winners) {
    const p = shortParty(w.partyFull || w.party);
    partyCounts[p] = (partyCounts[p] || 0) + 1;
  }
  const sortedParties = Object.entries(partyCounts).sort((a,b) => b[1]-a[1]);

  return `/**
 * ${stateName} — Election History Summary
 * AUTO-GENERATED stub. Enhance with historical data.
 */

export interface ${prefix}ElectionResult {
  year: number;
  partyResults: Record<string, number>;
  totalSeats: number;
  rulingParty: string;
}

export const ${prefix}_ELECTION_HISTORY: ${prefix}ElectionResult[] = [
  {
    year: ${electionYear},
    partyResults: {
${sortedParties.map(([p, c]) => `      '${p}': ${c},`).join('\n')}
    },
    totalSeats: ${winners.length},
    rulingParty: '${sortedParties[0]?.[0] || ''}',
  },
];

export function get${prefix}ElectionByYear(year: number) {
  return ${prefix}_ELECTION_HISTORY.find(e => e.year === year);
}

export function get${prefix}PartyTrend(party: string) {
  return ${prefix}_ELECTION_HISTORY.map(e => ({ year: e.year, seats: e.partyResults[party] || 0 }));
}
`;
}

function generateDemographicsStub(stateCode, stateName, winners) {
  const prefix = stateVarPrefix(stateCode);
  return `/**
 * ${stateName} — Constituency Demographics (Stub)
 * AUTO-GENERATED. Populate with census/ECI data.
 */

export interface ${prefix}Demographics {
  acNo: number;
  constituencyName: string;
  totalElectors?: number;
  maleElectors?: number;
  femaleElectors?: number;
  turnout?: number;
  scPopulation?: number;
  stPopulation?: number;
}

export const ${prefix}_DEMOGRAPHICS: ${prefix}Demographics[] = [
${winners.map((w, i) => `  { acNo: ${i+1}, constituencyName: '${sanitize(toTitleCase(w.constituency || ''))}' },`).join('\n')}
];

export function get${prefix}ConstituencyDemographics(acNo: number): ${prefix}Demographics | undefined {
  return ${prefix}_DEMOGRAPHICS.find(d => d.acNo === acNo);
}
`;
}

function generatePoliticalTimelineStub(stateCode, stateName, winners, electionYear) {
  const prefix = stateVarPrefix(stateCode);
  return `/**
 * ${stateName} — Political Timeline (Stub)
 * AUTO-GENERATED. Populate with defections, by-elections, etc.
 */

export interface ${prefix}PoliticalLedgerEntry {
  acNo: number;
  constituencyName: string;
  date: string;
  event: string;
  fromParty: string;
  toParty: string;
  legislatorName: string;
}

export const ${prefix}_POLITICAL_LEDGER: ${prefix}PoliticalLedgerEntry[] = [];

export function compute${prefix}PartyStrength(): Record<string, number> {
  // Start from election results
  const strength: Record<string, number> = {};
${winners.map((w) => {
    const p = shortParty(w.partyFull || w.party);
    return `  strength['${p}'] = (strength['${p}'] || 0) + 1;`;
  }).join('\n')}
  // Apply ledger entries
  for (const entry of ${prefix}_POLITICAL_LEDGER) {
    if (entry.fromParty) strength[entry.fromParty] = Math.max(0, (strength[entry.fromParty] || 0) - 1);
    if (entry.toParty) strength[entry.toParty] = (strength[entry.toParty] || 0) + 1;
  }
  return strength;
}

export function audit${prefix}Ledger() { return ${prefix}_POLITICAL_LEDGER; }
export function get${prefix}ConstituencyTimeline(acNo: number) { return ${prefix}_POLITICAL_LEDGER.filter(e => e.acNo === acNo); }
export function get${prefix}DefectionSummary() { return ${prefix}_POLITICAL_LEDGER.filter(e => e.event === 'defection'); }
`;
}

function generateTriviaStub(stateCode, stateName) {
  const prefix = stateVarPrefix(stateCode);
  return `/**
 * ${stateName} — Political Trivia (Stub)
 * AUTO-GENERATED. Add compelling facts about constituencies.
 */

export interface ${prefix}TriviaItem {
  id: string;
  type: 'constituency' | 'party' | 'election' | 'mla';
  acNo?: number;
  party?: string;
  year?: number;
  headline: string;
  body: string;
  source?: string;
}

export const ${prefix}_TRIVIA: ${prefix}TriviaItem[] = [];

export function getAll${prefix}Trivia() { return ${prefix}_TRIVIA; }
export function get${prefix}TriviaForConstituency(acNo: number) { return ${prefix}_TRIVIA.filter(t => t.acNo === acNo); }
export function get${prefix}TriviaForParty(party: string) { return ${prefix}_TRIVIA.filter(t => t.party === party); }
export function get${prefix}TriviaForElection(year: number) { return ${prefix}_TRIVIA.filter(t => t.year === year); }
export function get${prefix}RandomTrivia() { return ${prefix}_TRIVIA[Math.floor(Math.random() * ${prefix}_TRIVIA.length)] || null; }
`;
}

// ── Main ───────────────────────────────────────────────────────────────
function processState(stateCode) {
  const state = STATES.find(s => s.code === stateCode);
  if (!state) { console.log(`Unknown state: ${stateCode}`); return; }

  const winners = loadMyNetaWinners(stateCode);
  if (winners.length === 0) {
    console.log(`  ⚠️  No winner data found for ${stateCode}, skipping`);
    return;
  }

  // Determine election year from first key
  const yearMatch = (state.mynetaKeys[0] || '').match(/(\d{4})/);
  const electionYear = yearMatch ? parseInt(yearMatch[1]) : 2023;
  const fileName = stateFileName(stateCode, state.name);

  console.log(`\n[${stateCode}] ${state.name} — ${winners.length} winners, year ${electionYear}`);

  const files = [
    { name: `${fileName}-constituencies.ts`, content: generateConstituenciesFile(stateCode, state.name, winners, electionYear) },
    { name: `${fileName}-mla-profiles.ts`, content: generateMlaProfilesFile(stateCode, state.name, winners, electionYear) },
    { name: `${fileName}-election-history.ts`, content: generateElectionHistoryStub(stateCode, state.name, winners, electionYear) },
    { name: `${fileName}-demographics.ts`, content: generateDemographicsStub(stateCode, state.name, winners) },
    { name: `${fileName}-political-timeline.ts`, content: generatePoliticalTimelineStub(stateCode, state.name, winners, electionYear) },
    { name: `${fileName}-trivia.ts`, content: generateTriviaStub(stateCode, state.name) },
  ];

  for (const f of files) {
    const filePath = path.join(SEED_DIR, f.name);
    fs.writeFileSync(filePath, f.content, 'utf8');
    console.log(`  ✅ ${f.name} (${Math.round(f.content.length/1024)}KB)`);
  }
}

const statesToProcess = doAll
  ? STATES.filter(s => !['TS','AP','KA','MH','TN','KL','WB','UP'].includes(s.code)).map(s => s.code)
  : stateFilter ? [stateFilter.toUpperCase()] : [];

if (statesToProcess.length === 0) {
  console.log('Usage: node generate-state-seed.js --state=RJ   OR   --all');
  console.log('States already seeded: TS, AP, KA, MH, TN, KL, WB, UP');
} else {
  console.log(`\n🏗️  State Seed Generator`);
  console.log(`States to process: ${statesToProcess.join(', ')}`);
  for (const code of statesToProcess) processState(code);
  console.log('\n✅ Done!');
}
