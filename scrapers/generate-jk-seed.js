/**
 * Direct J&K seed generator — uses JammuKashmir2024.json
 * Run: node scrapers/generate-jk-seed.js
 */
const fs = require('fs');
const path = require('path');

const winners = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, 'output/myneta/JammuKashmir2024.json'), 'utf8')
);
console.log('J&K 2024 winners:', winners.length);

const SEED_DIR = path.resolve(__dirname, '../data/seed');

const PARTY_MAP = {
  'INDIAN NATIONAL CONGRESS': 'INC', 'CONGRESS': 'INC',
  'BHARATIYA JANATA PARTY': 'BJP', 'NATIONAL CONFERENCE': 'NC',
  'PEOPLES DEMOCRATIC PARTY': 'PDP', 'COMMUNIST PARTY OF INDIA (MARXIST)': 'CPIM',
  'INDEPENDENT': 'IND',
};

function sp(full) {
  if (!full) return 'IND';
  const upper = full.toUpperCase().trim();
  for (const [k, v] of Object.entries(PARTY_MAP)) {
    if (upper === k || upper.startsWith(k.substring(0, Math.min(k.length, 15)))) return v;
  }
  const words = full.split(/\s+/).filter(w => w.length > 2);
  if (words.length >= 2) return words.map(w => w[0]).join('').toUpperCase().substring(0, 6);
  return full.substring(0, 6).toUpperCase();
}

function san(str) { if (!str) return ''; return str.replace(/'/g, "\\'").replace(/\\/g, '\\\\').trim(); }
function tc(str) { if (!str) return ''; return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase()); }
function mapEdu(cat) {
  if (!cat) return undefined;
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
 * Jammu & Kashmir Assembly Constituencies — ${winners.length} seats (2024)
 * AUTO-GENERATED from MyNeta.info J&K 2024 election data.
 */

export interface JKConstituencySeed {
  acNo: number; name: string; district: string; type: 'GEN' | 'SC' | 'ST';
  winner2024: string; winnerName2024: string; winnerVotes2024: number;
  runnerUp2024: string; margin2024: number; currentParty: string;
}

export const JK_CONSTITUENCIES: JKConstituencySeed[] = [
${winners.map((w, i) => `  { acNo: ${i+1}, name: '${san(tc(w.constituency||''))}', district: '${san(tc(w.district||''))}', type: 'GEN', winner2024: '${sp(w.partyFull||w.party)}', winnerName2024: '${san(tc(w.name||''))}', winnerVotes2024: 0, runnerUp2024: '', margin2024: 0, currentParty: '${sp(w.partyFull||w.party)}' },`).join('\n')}
];

export function getJKConstituency(acNo: number) { return JK_CONSTITUENCIES.find(c => c.acNo === acNo); }
`;

const profilesFile = `/**
 * Jammu & Kashmir MLA Profiles — ${winners.length} MLAs (2024-)
 * AUTO-GENERATED from MyNeta.info J&K 2024 election data.
 */

export interface MLAProfile {
  acNo: number; name: string; party: string; age?: number; dob?: string;
  dobEstimated?: boolean; gender: 'M' | 'F'; education?: string; profession?: string;
  terms: number; criminalCases?: number; totalAssets?: number; totalLiabilities?: number;
  maritalStatus?: 'Single'|'Married'|'Widowed'|'Divorced'; photoUrl?: string;
  constituencyName?: string; district?: string; sourceUrl?: string;
}

export const JK_MLA_PROFILES: MLAProfile[] = [
${winners.map((w, i) => {
  const party = sp(w.partyFull||w.party);
  const name = san(tc(w.name||''));
  const constit = san(tc(w.constituency||''));
  const district = san(tc(w.district||''));
  const age = w.age || null;
  const edu = mapEdu(w.educationCategory);
  const prof = san(w.selfProfession||'');
  const assets = w.totalAssets||0;
  const liabilities = w.totalLiabilities||0;
  const criminal = w.criminalCases||0;
  const photo = w.photoUrl ? `'${w.photoUrl}'` : 'undefined';
  const source = w.sourceUrl ? `'${w.sourceUrl}'` : 'undefined';
  return `  { acNo: ${i+1}, name: '${name}', party: '${party}', age: ${age||'undefined'}, dob: ${age?`'${2024-age}-01-01'`:'undefined'}, dobEstimated: ${age?'true':'undefined'}, gender: 'M', education: ${edu?`'${edu}'`:'undefined'}, profession: ${prof?`'${prof}'`:'undefined'}, terms: 1, criminalCases: ${criminal}, totalAssets: ${assets}, totalLiabilities: ${liabilities||'undefined'}, photoUrl: ${photo}, constituencyName: '${constit}', district: '${district}', sourceUrl: ${source} },`;
}).join('\n')}
];

export function getJKMLAProfile(acNo: number) { return JK_MLA_PROFILES.find(p => p.acNo === acNo); }
export function getJKMLAsByParty(party: string) { return JK_MLA_PROFILES.filter(p => p.party === party); }
`;

fs.writeFileSync(path.join(SEED_DIR, 'jammu-kashmir-constituencies.ts'), constitFile, 'utf8');
fs.writeFileSync(path.join(SEED_DIR, 'jammu-kashmir-mla-profiles.ts'), profilesFile, 'utf8');
console.log('J&K seed files written!');
console.log('  data/seed/jammu-kashmir-constituencies.ts');
console.log('  data/seed/jammu-kashmir-mla-profiles.ts');
