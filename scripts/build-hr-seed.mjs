import { readFileSync, writeFileSync } from 'node:fs';
import zlib from 'node:zlib';

const HINDI_EXTRA = {
  kalka: 'कालका',
  panchkula: 'पंचकूला',
  yamunanagar: 'यमुनानगर',
  gharaunda: 'घरौंडा',
  israna: 'इसराना',
  rai: 'राई',
  dabwali: 'डबवाली',
  sirsa: 'सिरसा',
  nalwa: 'नलवा',
  badshahpur: 'बादशाहपुर',
  ballabgarh: 'बल्लभगढ़',
};

const titleCase = (s) => String(s).trim().toLowerCase()
  .replace(/([a-z])/g, (m, ch, i, str) => (i === 0 || /[^a-z]/.test(str[i - 1]) ? ch.toUpperCase() : ch))
  .replace(/\b(Of|And|The)\b/g, (m) => m.toLowerCase()).replace(/\s+/g, ' ').trim();

const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');

// Load existing Devanagari names
const oldTxt = readFileSync('data/seed/haryana-constituencies.ts', 'utf8');
const oldMatches = [...oldTxt.matchAll(/name:\s*'([^']+)',\s*localName:\s*'([^']+)'/g)];
const devanagariMap = new Map();
oldMatches.forEach(m => {
  devanagariMap.set(norm(m[1]), m[2]);
});
for (const [k, v] of Object.entries(HINDI_EXTRA)) {
  devanagariMap.set(norm(k), v);
}

// Load TCPD 2019 for official districts & types
const text = zlib.gunzipSync(readFileSync('scripts/Haryana_AE.csv.gz')).toString('utf8');
const lines = text.split(/\r?\n/).filter(Boolean);
const H = lines[0].split(',');
const cnoIdx = H.indexOf('Constituency_No');
const distIdx = H.indexOf('District_Name');
const typeIdx = H.indexOf('Constituency_Type');
const yrIdx = H.indexOf('Year');
const y2019 = lines.slice(1).filter(l => l.split(',')[yrIdx] === '2019');

const meta = new Map();
y2019.forEach(l => {
  const p = l.split(',');
  const cno = +p[cnoIdx];
  if (!meta.has(cno)) {
    meta.set(cno, {
      district: titleCase(p[distIdx]),
      type: (p[typeIdx] || 'GEN').toUpperCase() === 'SC' ? 'SC' : 'GEN',
    });
  }
});

// Load 2024 ECI Results
const hrJson = JSON.parse(readFileSync('scripts/india-votes-data/results/2024Assembly-HR.json', 'utf8'));

const PARTY_MAP = {
  'Bharatiya Janata Party': 'BJP',
  'Indian National Congress': 'INC',
  'Indian National Lok Dal': 'INLD',
  'Independent': 'IND',
  'Bahujan Samaj Party': 'BSP',
  'Jannayak Janta Party': 'JJP',
  'Aam Aadmi Party': 'AAP',
  'Haryana Lokhit Party': 'HLP',
  'Communist Party of India (Marxist)': 'CPIM',
};
const partyCode = (p) => PARTY_MAP[p] || p;

const seats = [];

for (const c of hrJson.constituencywise_results) {
  const acNo = Number(c.voting_data.constituency_no);
  const rawName = c.voting_data.constituency;
  let name = titleCase(rawName);
  if (name === 'Ambala Cantt.') name = 'Ambala Cantt';
  if (name === 'Garhi Sampla-kiloi') name = 'Garhi Sampla-Kiloi';
  if (name === 'Faridabad Nit') name = 'Faridabad NIT';

  const m = meta.get(acNo) || { district: 'Haryana', type: 'GEN' };
  
  const tally = c.voting_data.voting_tally.map(t => ({
    cand: titleCase(t.candidate),
    party: partyCode(t.party),
    votes: (+t.evm_votes || 0) + (+t.postal_votes || 0),
  })).sort((a, b) => b.votes - a.votes);

  const w = tally[0] || { cand: '', party: '', votes: 0 };
  const ru = tally[1] || { cand: '', party: '', votes: 0 };
  const margin = Math.max(0, w.votes - ru.votes);

  const localName = devanagariMap.get(norm(name)) || devanagariMap.get(norm(rawName)) || name;

  seats.push({
    acNo,
    name,
    localName,
    district: m.district,
    type: m.type,
    winner2024: w.party,
    winnerName2024: w.cand,
    winnerVotes2024: w.votes,
    runnerUp2024: ru.party ? `${ru.party} - ${ru.cand}` : '',
    margin2024: margin,
    currentParty: w.party,
  });
}

seats.sort((a, b) => a.acNo - b.acNo);

const out = `/**
 * Haryana Assembly Constituencies — 90 seats (2024)
 *
 * Source: Election Commission of India (ECI) / IndiaVotes
 * General Election to Assembly Constituencies October 2024
 */

export interface HRConstituencySeed {
  acNo: number;
  name: string;
  /** Constituency name in local script */
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

export const HR_CONSTITUENCIES: HRConstituencySeed[] = [
${seats.map(s => `  { acNo: ${s.acNo}, name: '${s.name.replace(/'/g, "\\'")}', localName: '${s.localName.replace(/'/g, "\\'")}', district: '${s.district.replace(/'/g, "\\'")}', type: '${s.type}', winner2024: '${s.winner2024}', winnerName2024: '${s.winnerName2024.replace(/'/g, "\\'")}', winnerVotes2024: ${s.winnerVotes2024}, runnerUp2024: '${s.runnerUp2024.replace(/'/g, "\\'")}', margin2024: ${s.margin2024}, currentParty: '${s.currentParty}' },`).join('\n')}
];

export function getHRConstituency(acNo: number): HRConstituencySeed | undefined {
  return HR_CONSTITUENCIES.find(c => c.acNo === acNo);
}
`;

writeFileSync('data/seed/haryana-constituencies.ts', out, 'utf8');
console.log('Successfully wrote data/seed/haryana-constituencies.ts with', seats.length, 'seats.');
