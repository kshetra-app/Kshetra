/**
 * Rebuild a "short" constituency seed to full official strength using authoritative
 * TCPD "Lok Dhaba" (Ashoka University) ECI-sourced results — for states whose CURRENT
 * election year is present in the TCPD public dump.
 *
 * Strategy (zero fabrication):
 *  - Preserve existing curated fields where present (name, localName, winner party code,
 *    winnerName, currentParty) matched by acNo.
 *  - Fill REAL values from TCPD: district (fixes 'Sc'/'St' corruption), type, winnerVotes,
 *    margin, runnerUp (party + name), turnout, electors.
 *  - Add any MISSING constituencies entirely from TCPD.
 *  - Strict validation; only writes when valid.
 *
 * Usage: node scripts/rebuild-short-seed.mjs GJ            (inspect)
 *        node scripts/rebuild-short-seed.mjs GJ --write    (write)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import zlib from 'node:zlib';

const CFG = {
  GJ: { tcpd: 'Gujarat',       year: 2022, total: 182, iface: 'GJConstituencySeed', konst: 'GJ_CONSTITUENCIES', fn: 'getGJConstituency', label: 'Gujarat' },
  PB: { tcpd: 'Punjab',        year: 2022, total: 117, iface: 'PBConstituencySeed', konst: 'PB_CONSTITUENCIES', fn: 'getPBConstituency', label: 'Punjab' },
  UP: { tcpd: 'Uttar_Pradesh', year: 2022, total: 403, iface: 'UPConstituencySeed', konst: 'UP_CONSTITUENCIES', fn: 'getUPConstituency', label: 'Uttar Pradesh' },
  BR: { tcpd: 'Bihar',         year: 2020, total: 243, iface: 'BRConstituencySeed', konst: 'BR_CONSTITUENCIES', fn: 'getBRConstituency', label: 'Bihar' },
  GA: { tcpd: 'Goa',           year: 2022, total: 40,  iface: 'GAConstituencySeed', konst: 'GA_CONSTITUENCIES', fn: 'getGAConstituency', label: 'Goa' },
};

const code = process.argv[2];
const WRITE = process.argv.includes('--write');
const cfg = CFG[code];
if (!cfg) { console.error('Unknown code. Use:', Object.keys(CFG).join(', ')); process.exit(1); }

const SEED_PATH = `data/seed/${cfg.tcpd.toLowerCase().replace(/_/g, '-')}-constituencies.ts`;
const GZ_PATH = `scripts/${cfg.tcpd}_AE.csv.gz`;
const Y = cfg.year;

// ── CSV parse ──
const split = (l) => { const c = []; let q = false, cur = ''; for (const ch of l) { if (ch === '"') q = !q; else if (ch === ',' && !q) { c.push(cur); cur = ''; } else cur += ch; } c.push(cur); return c; };
const text = zlib.gunzipSync(readFileSync(GZ_PATH)).toString('utf8');
const lines = text.split(/\r?\n/).filter(Boolean);
const H = split(lines[0]); const ci = (n) => H.indexOf(n);
const rows = lines.slice(1).map(split);
const COL = { year: ci('Year'), pos: ci('Position'), cno: ci('Constituency_No'), cname: ci('Constituency_Name'),
  ctype: ci('Constituency_Type'), dist: ci('District_Name'), cand: ci('Candidate'), party: ci('Party'),
  votes: ci('Votes'), margin: ci('Margin'), turnout: ci('Turnout_Percentage'), electors: ci('Electors') };

const titleCase = (s) => String(s).trim().toLowerCase()
  .replace(/([a-z])/g, (m, ch, i, str) => (i === 0 || /[^a-z]/.test(str[i - 1]) ? ch.toUpperCase() : ch))
  .replace(/\b(Of|And|The)\b/g, (m) => m.toLowerCase()).replace(/\s+/g, ' ').trim();
const num = (s) => Number(String(s).replace(/[^\d.-]/g, '')) || 0;
const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');

// ── party full-string -> app code ──
const PARTY_MAP = {
  'AAAP': 'AAP', 'BJP': 'BJP', 'INC': 'INC', 'IND': 'IND', 'NCP': 'NCP', 'SP': 'SP',
  'AITC': 'AITC', 'GFP': 'GFP', 'MAG': 'MGP', 'RGP': 'RGP', 'BSP': 'BSP', 'PLC': 'PLC',
  'SAD': 'SAD', 'SAD(S)': 'SADS', 'Shiromani Akali Dal (Amritsar)(Simranjit Singh Mann)': 'SADA',
  'ADS': 'ADAL', 'Apna Dal (Kamerawadi)': 'ADK', 'JD(U)': 'JDU', 'JDL': 'JDL',
  'NINSHAD': 'NISHAD', 'RLD': 'RLD', 'SBSP': 'SBSP', 'AIMIM': 'AIMIM', 'CPI': 'CPI',
  'CPI(ML)(L)': 'CPIML', 'CPIM': 'CPIM', 'CPM': 'CPIM', 'HAMS': 'HAM', 'JTVP': 'JTVP',
  'LJP': 'LJP', 'RJD': 'RJD', 'VSIP': 'VIP', 'AGP': 'AGP', 'AIUDF': 'AIUDF', 'AJP': 'AJP',
  'BOPF': 'BPF', 'UPPL': 'UPPL',
};
const partyCode = (full) => { const f = String(full).trim(); if (!f) return ''; if (PARTY_MAP[f]) return PARTY_MAP[f]; return f.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'OTH'; };

// ── load existing curated records (preserve name/localName/winner code/winnerName) ──
function loadExisting() {
  const m = new Map();
  try {
    const txt = readFileSync(SEED_PATH, 'utf8');
    const re = /\{\s*acNo:\s*(\d+)[^}]*\}/g; let x;
    while ((x = re.exec(txt))) {
      const body = x[0]; const acNo = +x[1];
      const g = (k) => { const mm = body.match(new RegExp(`${k}:\\s*'([^']*)'`)); return mm ? mm[1] : undefined; };
      m.set(acNo, {
        name: g('name'), localName: g('localName'),
        winner: g(`winner${Y}`), winnerName: g(`winnerName${Y}`), currentParty: g('currentParty'),
      });
    }
  } catch { /* none */ }
  return m;
}
const existing = loadExisting();

// ── build from TCPD ──
const yr = rows.filter((r) => +r[COL.year] === Y);
const byCno = new Map();
for (const r of yr) { const c = +r[COL.cno]; if (!byCno.has(c)) byCno.set(c, []); byCno.get(c).push(r); }

const seats = [];
for (const [cno, cand] of byCno) {
  cand.sort((a, b) => +a[COL.pos] - +b[COL.pos]);
  const w = cand.find((r) => +r[COL.pos] === 1) || cand[0];
  const ru = cand.find((r) => +r[COL.pos] === 2);
  const t = (w[COL.ctype] || 'GEN').toUpperCase();
  const type = t === 'SC' ? 'SC' : t === 'ST' ? 'ST' : 'GEN';
  const ex = existing.get(cno) || {};
  const tcpdWinnerCode = partyCode(w[COL.party]);
  seats.push({
    acNo: cno,
    name: ex.name || titleCase(w[COL.cname]),
    localName: ex.localName || '',
    district: titleCase(w[COL.dist]),
    type,
    winner: tcpdWinnerCode,
    winnerName: titleCase(w[COL.cand]),
    winnerVotes: num(w[COL.votes]),
    runnerUp: ru ? partyCode(ru[COL.party]) : '',
    runnerUpName: ru ? titleCase(ru[COL.cand]) : '',
    margin: num(w[COL.margin]),
    turnout: num(w[COL.turnout]),
    electors: num(w[COL.electors]),
    currentParty: tcpdWinnerCode,
  });
}
seats.sort((a, b) => a.acNo - b.acNo);

// ── validate ──
const acNos = seats.map((s) => s.acNo);
const missing = []; for (let i = 1; i <= cfg.total; i++) if (!acNos.includes(i)) missing.push(i);
const dupes = [...new Set(acNos.filter((a, i) => acNos.indexOf(a) !== i))];
const unopposed = new Set([...byCno].filter(([, c]) => c.length === 1).map(([cno]) => cno));
const zero = seats.filter((s) => s.winnerVotes === 0 && !unopposed.has(s.acNo));
const badD = seats.filter((s) => !s.district || /^(sc|st|bl|gen)$/i.test(s.district));
const tally = {}; for (const s of seats) tally[s.winner] = (tally[s.winner] || 0) + 1;
const added = seats.filter((s) => !existing.has(s.acNo)).map((s) => s.acNo);

console.log(`\n=== ${cfg.label} ${Y} (TCPD) ===`);
console.log('seats', seats.length, '/', cfg.total, '| unique', new Set(acNos).size, '| existing', existing.size, '| added', added.length, added.join(',') || '');
console.log('missing', missing.join(',') || 'none', '| dupes', dupes.join(',') || 'none');
console.log('type GEN', seats.filter((s) => s.type === 'GEN').length, 'SC', seats.filter((s) => s.type === 'SC').length, 'ST', seats.filter((s) => s.type === 'ST').length);
console.log('zeroVotes(bad)', zero.length, zero.map((s)=>s.acNo).join(',') || '', '| unopposed', [...unopposed].length, '| badDistrict', badD.length);
console.log('tally', Object.entries(tally).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`${k}:${v}`).join(' '));
const valid = seats.length === cfg.total && !missing.length && !dupes.length && !zero.length && !badD.length;
console.log('VALID =', valid);

if (WRITE && valid) {
  const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const tallyStr = Object.entries(tally).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`${k} ${v}`).join(' | ');
  const recLine = (s) => {
    const loc = s.localName ? `localName: '${esc(s.localName)}', ` : '';
    const ruN = s.runnerUpName ? `runnerUpName${Y}: '${esc(s.runnerUpName)}', ` : '';
    return `  { acNo: ${s.acNo}, name: '${esc(s.name)}', ${loc}district: '${esc(s.district)}', type: '${s.type}', winner${Y}: '${esc(s.winner)}', winnerName${Y}: '${esc(s.winnerName)}', winnerVotes${Y}: ${s.winnerVotes}, runnerUp${Y}: '${esc(s.runnerUp)}', ${ruN}margin${Y}: ${s.margin}, turnout${Y}: ${s.turnout}, electors${Y}: ${s.electors}, currentParty: '${esc(s.currentParty)}' },`;
  };
  const header = `/**
 * ${cfg.label} Assembly Constituencies — ${Y} General Election (${cfg.total} seats)
 *
 * SOURCE: TCPD "Lok Dhaba" (Trivedi Centre for Political Data, Ashoka University),
 *         ${cfg.label}_AE dataset — ECI-sourced constituency results, official AC
 *         numbering 1-${cfg.total}. Winner/runner-up parties+names, vote counts, margins,
 *         turnout, electors, district and reservation are the ECI ${Y} results as
 *         compiled by TCPD. Curated names/local-script labels preserved where present.
 *         Rebuilt by scripts/rebuild-short-seed.mjs — do not hand-edit.
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
  runnerUpName${Y}?: string;
  margin${Y}: number;
  turnout${Y}: number;
  electors${Y}: number;
  currentParty: string;
}

export const ${cfg.konst}: ${cfg.iface}[] = [
`;
  const footer = `];

export function ${cfg.fn}(acNo: number): ${cfg.iface} | undefined {
  return ${cfg.konst}.find((c) => c.acNo === acNo);
}
`;
  writeFileSync(SEED_PATH, header + seats.map(recLine).join('\n') + '\n' + footer, 'utf8');
  console.log('WROTE', SEED_PATH);
} else if (WRITE) {
  console.log('NOT WRITING — validation failed.');
}
