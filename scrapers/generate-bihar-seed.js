const fs = require('fs');
const path = require('path');
const { readJSON } = require('./utils');

// Direct generator for Bihar (2020 data)
const winners = readJSON(path.resolve(__dirname, 'output/myneta/Bihar2020.json')) || [];
const filtered = winners.filter(r => r.isWinner !== false);
console.log('Bihar 2020 winners:', filtered.length);

// Reuse the same generator patterns inline
const SEED_DIR = path.resolve(__dirname, '../data/seed');

const PARTY_SHORT = {
  'INDIAN NATIONAL CONGRESS': 'INC', 'CONGRESS': 'INC',
  'BHARATIYA JANATA PARTY': 'BJP',
  'BAHUJAN SAMAJ PARTY': 'BSP', 'RASHTRIYA JANATA DAL': 'RJD',
  'JANTA DAL (UNITED)': 'JDU', 'JANATA DAL (UNITED)': 'JDU',
  'JANATA DAL (U)': 'JDU', 'JANTA DAL (U)': 'JDU',
  'COMMUNIST PARTY OF INDIA  (MARXIST-LENINIST)(LIBERATION)': 'CPI-ML',
  'COMMUNIST PARTY OF INDIA (MARXIST-LENINIST)(LIBERATION)': 'CPI-ML',
  'HINDUSTANI AWAM MORCHA (SECULAR)': 'HAMS',
  'VIKASSHEEL INSAAN PARTY': 'VIP',
  'INDEPENDENT': 'IND',
};

function sp(full) {
  if (!full) return 'IND';
  const upper = full.toUpperCase().trim();
  for (const [k, v] of Object.entries(PARTY_SHORT)) {
    if (upper === k || upper.startsWith(k.substring(0, Math.min(k.length, 15)))) return v;
  }
  const words = full.split(/\s+/).filter(w => w.length > 2);
  if (words.length >= 2) return words.map(w => w[0]).join('').toUpperCase().substring(0, 6);
  return full.substring(0, 6).toUpperCase();
}

function san(str) { if (!str) return ''; return str.replace(/'/g, "\\'").replace(/\\/g, '\\\\').trim(); }
function tc(str) { if (!str) return ''; return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase()); }
function mapEdu(cat) {
  if (!cat) return 'Others';
  const c = cat.toLowerCase();
  if (c.includes('post graduate') || c.includes('phd')) return 'Post Graduate';
  if (c.includes('graduate professional')) return 'Graduate Professional';
  if (c.includes('graduate')) return 'Graduate';
  if (c.includes('12') || c.includes('hsc')) return '12th Pass';
  if (c.includes('10') || c.includes('ssc') || c.includes('matriculate')) return '10th Pass';
  if (c.includes('8')) return '8th Pass';
  if (c.includes('illiterate')) return 'Illiterate';
  return 'Others';
}

const constitFile = `/**
 * Bihar Assembly Constituencies — ${filtered.length} seats (2020)
 * AUTO-GENERATED from MyNeta.info Bihar 2020 election data.
 */

export interface BRConstituencySeed {
  acNo: number; name: string; district: string; type: 'GEN' | 'SC' | 'ST';
  winner2020: string; winnerName2020: string; winnerVotes2020: number;
  runnerUp2020: string; margin2020: number; currentParty: string;
}

export const BR_CONSTITUENCIES: BRConstituencySeed[] = [
${filtered.map((w, i) => `  { acNo: ${i+1}, name: '${san(tc(w.constituency||''))}', district: '${san(tc(w.district||''))}', type: 'GEN', winner2020: '${sp(w.partyFull||w.party)}', winnerName2020: '${san(tc(w.name||''))}', winnerVotes2020: 0, runnerUp2020: '', margin2020: 0, currentParty: '${sp(w.partyFull||w.party)}' },`).join('\n')}
];

export function getBRConstituency(acNo: number) { return BR_CONSTITUENCIES.find(c => c.acNo === acNo); }
`;

const profilesFile = `/**
 * Bihar MLA Profiles — ${filtered.length} MLAs (2020-)
 * AUTO-GENERATED from MyNeta.info Bihar 2020 election data.
 */

export interface MLAProfile {
  acNo: number; name: string; party: string; age?: number; dob?: string;
  dobEstimated?: boolean; gender: 'M' | 'F'; education?: string; profession?: string;
  terms: number; criminalCases?: number; totalAssets?: number; totalLiabilities?: number;
  maritalStatus?: 'Single'|'Married'|'Widowed'|'Divorced'; photoUrl?: string;
  constituencyName?: string; district?: string; sourceUrl?: string;
}

export const BR_MLA_PROFILES: MLAProfile[] = [
${filtered.map((w, i) => {
  const party = sp(w.partyFull||w.party);
  const name = san(tc(w.name||''));
  const constit = san(tc(w.constituency||''));
  const district = san(tc(w.district||''));
  const age = w.age || null;
  const edu = san(mapEdu(w.educationCategory));
  const prof = san(w.selfProfession||'');
  const assets = w.totalAssets||0;
  const liabilities = w.totalLiabilities||0;
  const criminal = w.criminalCases||0;
  const photo = w.photoUrl ? `'${w.photoUrl}'` : 'undefined';
  const source = w.sourceUrl ? `'${w.sourceUrl}'` : 'undefined';
  const female = /\b(housewife|teacher|smt|kumari|devi|bai|behn)\b/i.test((w.spouseProfession||'')+' '+w.name);
  return `  { acNo: ${i+1}, name: '${name}', party: '${party}', age: ${age||'undefined'}, dob: ${age?`'${2020-age}-01-01'`:'undefined'}, dobEstimated: ${age?'true':'undefined'}, gender: '${female?'F':'M'}', education: ${edu?`'${edu}'`:'undefined'}, profession: ${prof?`'${prof}'`:'undefined'}, terms: 1, criminalCases: ${criminal}, totalAssets: ${assets}, totalLiabilities: ${liabilities||'undefined'}, photoUrl: ${photo}, constituencyName: '${constit}', district: '${district}', sourceUrl: ${source} },`;
}).join('\n')}
];

export function getBRMLAProfile(acNo: number) { return BR_MLA_PROFILES.find(p => p.acNo === acNo); }
export function getBRMLAsByParty(party: string) { return BR_MLA_PROFILES.filter(p => p.party === party); }
export function getBRFemaleMLAs() { return BR_MLA_PROFILES.filter(p => p.gender === 'F'); }
`;

fs.writeFileSync(path.join(SEED_DIR, 'bihar-constituencies.ts'), constitFile, 'utf8');
fs.writeFileSync(path.join(SEED_DIR, 'bihar-mla-profiles.ts'), profilesFile, 'utf8');
console.log('Bihar seed files written!');
console.log('  data/seed/bihar-constituencies.ts');
console.log('  data/seed/bihar-mla-profiles.ts');
