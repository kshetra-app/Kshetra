/**
 * Generic TCPD "Lok Dhaba" -> constituency seed builder for the empty-map states
 * whose latest election IS present in TCPD (Option A: real votes/margins/turnout).
 *
 * Source: https://lokdhaba.ashoka.edu.in/downloads/<State>/<State>_AE.csv.gz
 * Usage:
 *   node scripts/build-tcpd-seed.mjs TR --inspect   # show parsed summary, no write
 *   node scripts/build-tcpd-seed.mjs TR --write      # write the seed .ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import zlib from 'node:zlib';

const CFG = {
  TR: { tcpd: 'Tripura', year: 2023, total: 60, iface: 'TRConstituencySeed', konst: 'TR_CONSTITUENCIES', fn: 'getTR', label: 'Tripura' },
  ML: { tcpd: 'Meghalaya', year: 2023, total: 60, iface: 'MLConstituencySeed', konst: 'ML_CONSTITUENCIES', fn: 'getML', label: 'Meghalaya',
    // Sohiong (AC 23) was adjourned in the Feb-2023 general poll (UDP candidate's
    // death) and decided by a by-poll on 10 May 2023. Source: ECI ConstituencywiseS1523 ac=23.
    extra: [{ acNo: 23, name: 'Sohiong', localName: '', district: 'East Khasi Hills', type: 'ST',
      winnerParty: 'UDP', winnerName: 'Synshar Kupar Roy Lyngdoh Thabah', winnerVotes: 16679,
      runnerUpParty: 'NPP', margin: 3422, turnout: 91.87, electors: 35008 }] },
  MN: { tcpd: 'Manipur', year: 2022, total: 60, iface: 'MNConstituencySeed', konst: 'MN_CONSTITUENCIES', fn: 'getMN', label: 'Manipur' },
  NL: { tcpd: 'Nagaland', year: 2023, total: 60, iface: 'NLConstituencySeed', konst: 'NL_CONSTITUENCIES', fn: 'getNL', label: 'Nagaland' },
  UK: { tcpd: 'Uttarakhand', year: 2022, total: 70, iface: 'UKConstituencySeed', konst: 'UK_CONSTITUENCIES', fn: 'getUK', label: 'Uttarakhand' },
  PY: { tcpd: 'Puducherry', year: 2021, total: 30, iface: 'PYConstituencySeed', konst: 'PY_CONSTITUENCIES', fn: 'getPY', label: 'Puducherry' },
};

const code = process.argv[2];
const WRITE = process.argv.includes('--write');
const cfg = CFG[code];
if (!cfg) { console.error('Unknown state code. Use one of:', Object.keys(CFG).join(', ')); process.exit(1); }

const SEED_PATH = `C:/K/data/seed/${cfg.tcpd.toLowerCase()}-constituencies.ts`;
const GZ_PATH = `C:/K/scripts/${cfg.tcpd}_AE.csv.gz`;

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  const split = (l) => { const c = []; let q = false, cur = ''; for (const ch of l) { if (ch === '"') q = !q; else if (ch === ',' && !q) { c.push(cur); cur = ''; } else cur += ch; } c.push(cur); return c; };
  const H = split(lines[0]);
  const ci = (n) => H.indexOf(n);
  return { rows: lines.slice(1).map(split), ci };
}

// Title-case a TCPD ALL-CAPS string, preserving common particles.
const titleCase = (s) => String(s).trim().toLowerCase()
  .replace(/([a-z])/g, (m, ch, i, str) => (i === 0 || /[^a-z]/.test(str[i - 1]) ? ch.toUpperCase() : ch))
  .replace(/\b(Of|And|The)\b/g, (m) => m.toLowerCase())
  .replace(/\s+/g, ' ').trim();

// TCPD full party name -> app short code. Unknown names fall back to a cleaned token.
const PARTY_MAP = {
  'BJP': 'BJP', 'INC': 'INC', 'NPP': 'NPP', 'NDPP': 'NDPP', 'IND': 'IND', 'NPF': 'NPF',
  'AITC': 'AITC', 'AINRC': 'AINRC', 'NCP': 'NCP', 'DMK': 'DMK', 'BSP': 'BSP', 'CPI': 'CPI',
  'RJD': 'RJD', 'RSP': 'RSP', 'AIFB': 'AIFB', 'KPA': 'KPA',
  'Communist Party of India(Marxist)': 'CPIM',
  'Tipra Motha Party': 'TMP',
  'United Democratic Party': 'UDP',
  'JD(U)': 'JDU', 'Janata Dal(United)': 'JDU',
  'Lok Janshakti Party(Ram Vilas)': 'LJPRV',
  'RPI(A)': 'RPIA',
  'Voice of the People Party': 'VPP',
  "Hill State People's Democratic Party": 'HSPDP',
  'ADMK': 'AIADMK',
  "Indigenous People's Front of Tripura": 'IPFT',
  "People's Democratic Front": 'PDF',
  'Garo National Council': 'GNC',
  'UKKD': 'UKD',
  'Uttarakhand Janekta Party': 'UJP',
};
const partyCode = (full) => {
  const f = String(full).trim();
  if (!f) return '';
  if (PARTY_MAP[f]) return PARTY_MAP[f];
  return f.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'OTH';
};
const num = (s) => Number(String(s).replace(/[^\d.-]/g, '')) || 0;
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

function loadLocalNames() {
  try {
    const txt = readFileSync(SEED_PATH, 'utf8');
    const re = /name:\s*'([^']+)'(?:,\s*localName:\s*'([^']*)')?/g;
    const m = new Map(); let x; while ((x = re.exec(txt))) if (x[2]) m.set(norm(x[1]), x[2]);
    return m;
  } catch { return new Map(); }
}

const { rows, ci } = parseCSV(zlib.gunzipSync(readFileSync(GZ_PATH)).toString('utf8'));
const COL = {
  year: ci('Year'), pos: ci('Position'), cno: ci('Constituency_No'), cname: ci('Constituency_Name'),
  ctype: ci('Constituency_Type'), dist: ci('District_Name'), cand: ci('Candidate'), party: ci('Party'),
  votes: ci('Votes'), margin: ci('Margin'), turnout: ci('Turnout_Percentage'), electors: ci('Electors'),
};

const yr = rows.filter((r) => +r[COL.year] === cfg.year);
// group by constituency number
const byCno = new Map();
for (const r of yr) {
  const cno = +r[COL.cno];
  if (!byCno.has(cno)) byCno.set(cno, []);
  byCno.get(cno).push(r);
}

const local = loadLocalNames();
const seats = [];
for (const [cno, cand] of byCno) {
  cand.sort((a, b) => +a[COL.pos] - +b[COL.pos]);
  const w = cand.find((r) => +r[COL.pos] === 1) || cand[0];
  const ru = cand.find((r) => +r[COL.pos] === 2);
  const t = (w[COL.ctype] || 'GEN').toUpperCase();
  const type = t === 'SC' ? 'SC' : t === 'ST' ? 'ST' : 'GEN';
  const name = titleCase(w[COL.cname]);
  seats.push({
    acNo: cno,
    name,
    localName: local.get(norm(name)) || local.get(norm(w[COL.cname])) || '',
    district: titleCase(w[COL.dist]),
    type,
    winnerParty: partyCode(w[COL.party]),
    winnerName: titleCase(w[COL.cand]),
    winnerVotes: num(w[COL.votes]),
    runnerUpParty: ru ? partyCode(ru[COL.party]) : '',
    margin: num(w[COL.margin]),
    turnout: num(w[COL.turnout]),
    electors: num(w[COL.electors]),
  });
}
if (Array.isArray(cfg.extra)) for (const e of cfg.extra) { if (!byCno.has(e.acNo)) seats.push({ ...e }); }
seats.sort((a, b) => a.acNo - b.acNo);

// ── validation ──
const acNos = seats.map((s) => s.acNo);
const missing = []; for (let i = 1; i <= cfg.total; i++) if (!acNos.includes(i)) missing.push(i);
const dupes = [...new Set(acNos.filter((a, i) => acNos.indexOf(a) !== i))];
// Zero winner-votes is legitimate ONLY for unopposed seats (a single candidate).
const unopposed = new Set([...byCno].filter(([, c]) => c.length === 1).map(([cno]) => cno));
const zero = seats.filter((s) => s.winnerVotes === 0 && !unopposed.has(s.acNo));
const unopposedZero = seats.filter((s) => s.winnerVotes === 0 && unopposed.has(s.acNo));
const badD = seats.filter((s) => !s.district || /^(sc|st|bl|gen)$/i.test(s.district));
const tally = {}; for (const s of seats) tally[s.winnerParty] = (tally[s.winnerParty] || 0) + 1;

console.log(`\n=== ${cfg.label} ${cfg.year} (TCPD) ===`);
console.log('seats', seats.length, '/', cfg.total, '| cno', acNos[0], '..', acNos[acNos.length - 1], '| unique', new Set(acNos).size);
console.log('missing', missing.join(',') || 'none', '| dupes', dupes.join(',') || 'none');
console.log('type: GEN', seats.filter(s=>s.type==='GEN').length, 'SC', seats.filter(s=>s.type==='SC').length, 'ST', seats.filter(s=>s.type==='ST').length);
console.log('zeroVotes(bad)', zero.length, '| unopposed', unopposedZero.length, unopposedZero.map((s) => `${s.acNo}:${s.name}`).join(',') || '', '| badDistrict', badD.length);
console.log('tally', JSON.stringify(tally));
console.log('districts', [...new Set(seats.map(s=>s.district))].join(', '));
console.log('first', JSON.stringify(seats[0]));
console.log('last ', JSON.stringify(seats[seats.length - 1]));

const valid = seats.length === cfg.total && !missing.length && !dupes.length && !zero.length && !badD.length;
console.log('VALID =', valid);

if (WRITE && valid) {
  const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const Y = cfg.year;
  const lines = seats.map((s) => {
    const local = s.localName ? `localName: '${esc(s.localName)}', ` : '';
    return `  { acNo: ${s.acNo}, name: '${esc(s.name)}', ${local}district: '${esc(s.district)}', type: '${s.type}', winner${Y}: '${esc(s.winnerParty)}', winnerName${Y}: '${esc(s.winnerName)}', winnerVotes${Y}: ${s.winnerVotes}, runnerUp${Y}: '${esc(s.runnerUpParty)}', margin${Y}: ${s.margin}, currentParty: '${esc(s.winnerParty)}' },`;
  });
  const tallyStr = Object.entries(tally).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(' | ');
  const header = `/**
 * ${cfg.label} Assembly Constituencies — ${Y} General Election (${cfg.total} seats)
 *
 * SOURCE: TCPD "Lok Dhaba" (Trivedi Centre for Political Data, Ashoka University),
 *         ${cfg.label}_AE dataset — ECI-sourced constituency results. Uses the
 *         official ECI AC numbering (1-${cfg.total}). Winner/runner-up parties,
 *         vote counts, and margins are the ECI ${Y} results as compiled by TCPD.
 *         Reservation (GEN/SC/ST) and district are from the same dataset.
 *         Auto-generated by scripts/build-tcpd-seed.mjs — do not hand-edit.
 *
 * PARTY TALLY ${Y}: ${tallyStr} = ${cfg.total}
 */

export interface ${cfg.iface} {
  acNo: number;
  name: string;
  /** Constituency name in local script */
  localName?: string;
  district: string;
  type: 'GEN' | 'SC' | 'ST';
  winner${Y}: string;
  winnerName${Y}: string;
  winnerVotes${Y}: number;
  runnerUp${Y}: string;
  margin${Y}: number;
  currentParty: string;
}

export const ${cfg.konst}: ${cfg.iface}[] = [
`;
  const footer = `];

export function ${cfg.fn}Constituency(acNo: number): ${cfg.iface} | undefined {
  return ${cfg.konst}.find((c) => c.acNo === acNo);
}
`;
  writeFileSync(SEED_PATH, header + lines.join('\n') + '\n' + footer, 'utf8');
  console.log('\nWROTE', SEED_PATH);
} else if (WRITE) {
  console.log('\nNOT WRITING — validation failed.');
}
