import { readFileSync, writeFileSync } from 'node:fs';
import zlib from 'node:zlib';

const HINDI_MAP = {
  1: 'नरेला',
  2: 'बुराड़ी',
  3: 'तिमारपुर',
  4: 'आदर्श नगर',
  5: 'बादली',
  6: 'रिठाला',
  7: 'बवाना',
  8: 'मुंडका',
  9: 'किरारी',
  10: 'सुल्तानपुर माजरा',
  11: 'नांगलोई जाट',
  12: 'मंगोल पुरी',
  13: 'रोहिणी',
  14: 'शालीमार बाग',
  15: 'शकूर बस्ती',
  16: 'त्रिनगर',
  17: 'वज़ीरपुर',
  18: 'मॉडल टाउन',
  19: 'सदर बाज़ार',
  20: 'चाँदनी चौक',
  21: 'मटिया महल',
  22: 'बल्लीमारान',
  23: 'करोल बाग',
  24: 'पटेल नगर',
  25: 'मोती नगर',
  26: 'मादीपुर',
  27: 'राजौरी गार्डन',
  28: 'हरि नगर',
  29: 'तिलक नगर',
  30: 'जनकपुरी',
  31: 'विकासपुरी',
  32: 'उत्तम नगर',
  33: 'द्वारका',
  34: 'मटियाला',
  35: 'नजफगढ़',
  36: 'बिजवासन',
  37: 'पालम',
  38: 'दिल्ली छावनी',
  39: 'राजेंद्र नगर',
  40: 'नई दिल्ली',
  41: 'जंगपुरा',
  42: 'कस्तूरबा नगर',
  43: 'मालवीय नगर',
  44: 'आर के पुरम',
  45: 'महरौली',
  46: 'छतरपुर',
  47: 'देवली',
  48: 'अम्बेडकर नगर',
  49: 'संगम विहार',
  50: 'ग्रेटर कैलाश',
  51: 'कालकाजी',
  52: 'तुगलकाबाद',
  53: 'बदरपुर',
  54: 'ओखला',
  55: 'त्रिलोकपुरी',
  56: 'कोंडली',
  57: 'पटपड़गंज',
  58: 'लक्ष्मी नगर',
  59: 'विश्वास नगर',
  60: 'कृष्णा नगर',
  61: 'गांधी नगर',
  62: 'शाहदरा',
  63: 'सीमापुरी',
  64: 'रोहतास नगर',
  65: 'सीलमपुर',
  66: 'घोंडा',
  67: 'बाबरपुर',
  68: 'गोकलपुर',
  69: 'मुस्तफाबाद',
  70: 'करावल नगर',
};

const titleCase = (s) => String(s).trim().toLowerCase()
  .replace(/([a-z])/g, (m, ch, i, str) => (i === 0 || /[^a-z]/.test(str[i - 1]) ? ch.toUpperCase() : ch))
  .replace(/\b(Of|And|The)\b/g, (m) => m.toLowerCase()).replace(/\s+/g, ' ').trim();

// Load TCPD 2020 for districts & type
const text = zlib.gunzipSync(readFileSync('scripts/Delhi_AE.csv.gz')).toString('utf8');
const lines = text.split(/\r?\n/).filter(Boolean);
const H = lines[0].split(',');
const cnoIdx = H.indexOf('Constituency_No');
const distIdx = H.indexOf('District_Name');
const typeIdx = H.indexOf('Constituency_Type');
const yrIdx = H.indexOf('Year');
const y2020 = lines.slice(1).filter(l => l.split(',')[yrIdx] === '2020');

const meta = new Map();
y2020.forEach(l => {
  const p = l.split(',');
  const cno = +p[cnoIdx];
  if (!meta.has(cno)) {
    meta.set(cno, {
      district: titleCase(p[distIdx]),
      type: (p[typeIdx] || 'GEN').toUpperCase() === 'SC' ? 'SC' : 'GEN',
    });
  }
});

// Load 2025 ECI Results
const dlJson = JSON.parse(readFileSync('scripts/india-votes-data/results/2025Assembly-DL.json', 'utf8'));

const PARTY_MAP = {
  'Bharatiya Janata Party': 'BJP',
  'Aam Aadmi Party': 'AAP',
  'Indian National Congress': 'INC',
  'Bahujan Samaj Party': 'BSP',
  'Independent': 'IND',
};
const partyCode = (p) => PARTY_MAP[p] || p;

const seats = [];

for (const c of dlJson.constituencywise_results) {
  const acNo = Number(c.voting_data.constituency_no);
  const rawName = c.voting_data.constituency;
  let name = titleCase(rawName);
  if (name === 'Nerela') name = 'Narela';
  if (name === 'Seelam Pur') name = 'Seelampur';
  if (name === 'Seema Puri') name = 'Seemapuri';
  const m = meta.get(acNo) || { district: 'Central', type: 'GEN' };
  
  const tally = c.voting_data.voting_tally.map(t => ({
    cand: titleCase(t.candidate),
    party: partyCode(t.party),
    votes: (+t.evm_votes || 0) + (+t.postal_votes || 0),
  })).sort((a, b) => b.votes - a.votes);

  const w = tally[0] || { cand: '', party: '', votes: 0 };
  const ru = tally[1] || { cand: '', party: '', votes: 0 };
  const margin = Math.max(0, w.votes - ru.votes);

  seats.push({
    acNo,
    name,
    localName: HINDI_MAP[acNo] || name,
    district: m.district,
    type: m.type,
    winner2025: w.party,
    winnerName2025: w.cand,
    winnerVotes2025: w.votes,
    runnerUp2025: ru.party ? `${ru.party} - ${ru.cand}` : '',
    margin2025: margin,
    winner2022: w.party,
    winnerName2022: w.cand,
    winnerVotes2022: w.votes,
    runnerUp2022: ru.party ? `${ru.party} - ${ru.cand}` : '',
    margin2022: margin,
    currentParty: w.party,
  });
}

seats.sort((a, b) => a.acNo - b.acNo);

const out = `/**
 * Delhi Assembly Constituencies — 70 seats (2025)
 *
 * Source: Election Commission of India (ECI) / IndiaVotes
 * General Election to Assembly Constituencies February 2025
 */

export interface DLConstituencySeed {
  acNo: number;
  name: string;
  /** Constituency name in local script */
  localName?: string;
  district: string;
  type: 'GEN' | 'SC' | 'ST';
  winner2025: string;
  winnerName2025: string;
  winnerVotes2025: number;
  runnerUp2025: string;
  margin2025: number;
  // Backward compatibility keys
  winner2022?: string;
  winnerName2022?: string;
  winnerVotes2022?: number;
  runnerUp2022?: string;
  margin2022?: number;
  currentParty: string;
}

export const DL_CONSTITUENCIES: DLConstituencySeed[] = [
${seats.map(s => `  { acNo: ${s.acNo}, name: '${s.name.replace(/'/g, "\\'")}', localName: '${s.localName.replace(/'/g, "\\'")}', district: '${s.district.replace(/'/g, "\\'")}', type: '${s.type}', winner2025: '${s.winner2025}', winnerName2025: '${s.winnerName2025.replace(/'/g, "\\'")}', winnerVotes2025: ${s.winnerVotes2025}, runnerUp2025: '${s.runnerUp2025.replace(/'/g, "\\'")}', margin2025: ${s.margin2025}, winner2022: '${s.winner2022}', winnerName2022: '${s.winnerName2022.replace(/'/g, "\\'")}', winnerVotes2022: ${s.winnerVotes2022}, runnerUp2022: '${s.runnerUp2022.replace(/'/g, "\\'")}', margin2022: ${s.margin2022}, currentParty: '${s.currentParty}' },`).join('\n')}
];

export function getDLConstituency(acNo: number): DLConstituencySeed | undefined {
  return DL_CONSTITUENCIES.find(c => c.acNo === acNo);
}
`;

writeFileSync('data/seed/delhi-constituencies.ts', out, 'utf8');
console.log('Successfully wrote data/seed/delhi-constituencies.ts with', seats.length, 'seats.');
