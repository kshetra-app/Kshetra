/**
 * Build full per-AC historical (prior-election) results from authoritative TCPD
 * "Lok Dhaba" data, replacing the short stub historical-results seeds.
 * Preserves the existing interface/const/getter names so consumers don't break;
 * enriches with constituency `name`.
 *
 * Usage: node scripts/build-historical-results.mjs KL          (inspect)
 *        node scripts/build-historical-results.mjs KL --write
 */
import { readFileSync, writeFileSync } from 'node:fs';
import zlib from 'node:zlib';

const CFG = {
  KL: { tcpd: 'Kerala',        year: 2016, total: 140, iface: 'KLHistoricalResult', arr: 'KL_2016_RESULTS', map: 'kl2016Map', getter: 'getKL2016Result', label: 'Kerala',      blurb: 'LDF won 91/140, UDF 47, BJP 1, IND 1.' },
  WB: { tcpd: 'West_Bengal',   year: 2016, total: 294, iface: 'WBHistoricalResult', arr: 'WB_2016_RESULTS', map: 'wb2016Map', getter: 'getWB2016Result', label: 'West Bengal', blurb: 'AITC won 211/294, INC 44, CPM 26, BJP 3.' },
  UP: { tcpd: 'Uttar_Pradesh', year: 2017, total: 403, iface: 'UPHistoricalResult', arr: 'UP_2017_RESULTS', map: 'up2017Map', getter: 'getUP2017Result', label: 'Uttar Pradesh', blurb: 'BJP won 312/403, SP 47, BSP 19, INC 7.' },
  TN: { tcpd: 'Tamil_Nadu',    year: 2016, total: 234, iface: 'TNHistoricalResult', arr: 'TN_2016_RESULTS', map: 'tn2016Map', getter: 'getTN2016Result', label: 'Tamil Nadu', blurb: 'AIADMK won 136/234, DMK 89, INC 8, IUML 1.' },
};

const code = process.argv[2];
const WRITE = process.argv.includes('--write');
const cfg = CFG[code];
if (!cfg) { console.error('Use one of:', Object.keys(CFG).join(', ')); process.exit(1); }

const SEED_PATH = `data/seed/${cfg.tcpd.toLowerCase().replace(/_/g, '-')}-historical-results.ts`;
const GZ_PATH = `scripts/${cfg.tcpd}_AE.csv.gz`;
const Y = cfg.year;

const split = (l) => { const c = []; let q = false, cur = ''; for (const ch of l) { if (ch === '"') q = !q; else if (ch === ',' && !q) { c.push(cur); cur = ''; } else cur += ch; } c.push(cur); return c; };
const text = zlib.gunzipSync(readFileSync(GZ_PATH)).toString('utf8');
const lines = text.split(/\r?\n/).filter(Boolean);
const H = split(lines[0]); const ci = (n) => H.indexOf(n);
const rows = lines.slice(1).map(split);
const COL = { year: ci('Year'), pos: ci('Position'), cno: ci('Constituency_No'), cname: ci('Constituency_Name'), cand: ci('Candidate'), party: ci('Party') };

const titleCase = (s) => String(s).trim().toLowerCase()
  .replace(/([a-z])/g, (m, ch, i, str) => (i === 0 || /[^a-z]/.test(str[i - 1]) ? ch.toUpperCase() : ch))
  .replace(/\b(Of|And|The)\b/g, (m) => m.toLowerCase()).replace(/\s+/g, ' ').trim();

const PARTY_MAP = {
  'BJP': 'BJP', 'INC': 'INC', 'IND': 'IND', 'CPI': 'CPI', 'NCP': 'NCP', 'RSP': 'RSP', 'BSP': 'BSP',
  'RLD': 'RLD', 'SBSP': 'SBSP', 'SP': 'SP', 'PMK': 'PMK', 'DMK': 'DMK', 'IUML': 'IUML',
  'CPM': 'CPIM', 'CPI(Marxist)': 'CPIM', 'AITC': 'AITC', 'AIFB': 'AIFB', 'ADMK': 'AIADMK',
  'ADAL': 'ADAL', 'NINSHAD': 'NISHAD', 'JD(S)': 'JDS', 'JD(U)': 'JDU',
  'KEC(M)': 'KECM', 'KEC(B)': 'KECB', 'KEC(J)': 'KECJ', 'C(S)': 'CS', 'CMPKSC': 'CMP',
  'INL': 'INL', 'NSC': 'NSC', 'KCST': 'KCST', 'GOJAM': 'GJM', 'DSP(P)': 'DSP', 'JKP(N)': 'JKP',
  'VCK': 'VCK', 'PT': 'PT', 'MAMAK': 'MAMK',
};
const partyCode = (full) => { const f = String(full).trim(); if (!f) return ''; if (PARTY_MAP[f]) return PARTY_MAP[f]; return f.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'OTH'; };

const yr = rows.filter((r) => +r[COL.year] === Y && +r[COL.pos] === 1);
// De-duplicate by acNo (TCPD may carry a re-poll row for the same seat/year);
// keep the first occurrence, which is the main general-election result.
const seen = new Set();
const recs = yr.map((w) => ({ acNo: +w[COL.cno], name: titleCase(w[COL.cname]), winner: titleCase(w[COL.cand]), party: partyCode(w[COL.party]) }))
  .filter((r) => (seen.has(r.acNo) ? false : seen.add(r.acNo)))
  .sort((a, b) => a.acNo - b.acNo);

const acNos = recs.map((r) => r.acNo);
const dupes = [...new Set(acNos.filter((a, i) => acNos.indexOf(a) !== i))];
const missing = []; for (let i = 1; i <= cfg.total; i++) if (!acNos.includes(i)) missing.push(i);
const tally = {}; for (const r of recs) tally[r.party] = (tally[r.party] || 0) + 1;

console.log(`\n=== ${cfg.label} ${Y} historical ===`);
console.log('records', recs.length, '/', cfg.total, '| unique', new Set(acNos).size);
console.log('missing', missing.join(',') || 'none', '| dupes', dupes.join(',') || 'none');
console.log('tally', Object.entries(tally).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}:${v}`).join(' '));
const valid = recs.length >= cfg.total - 3 && !dupes.length; // tolerate a few postponed/adjourned seats
console.log('VALID =', valid, missing.length ? `(missing ${missing.length}: ${missing.join(',')})` : '');

if (WRITE && valid) {
  const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const tallyStr = Object.entries(tally).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(', ');
  const recLine = (r) => `  { acNo: ${r.acNo}, name: '${esc(r.name)}', winner: '${esc(r.winner)}', party: '${esc(r.party)}' },`;
  const out = `/**
 * ${cfg.label} — Previous Election Results (${Y})
 *
 * SOURCE: TCPD "Lok Dhaba" (Trivedi Centre for Political Data, Ashoka University),
 *         ${cfg.tcpd}_AE dataset — ECI-sourced, official AC numbering 1-${cfg.total}.
 *         ${cfg.blurb}
 *         Full per-constituency winner + party. Auto-generated by
 *         scripts/build-historical-results.mjs — do not hand-edit.
 */

export interface ${cfg.iface} {
  acNo: number;
  name: string;
  winner: string;
  party: string;
}

const ${cfg.arr}: ${cfg.iface}[] = [
${recs.map(recLine).join('\n')}
];

const ${cfg.map} = new Map(${cfg.arr}.map((r) => [r.acNo, r]));

export function ${cfg.getter}(acNo: number): ${cfg.iface} | undefined {
  return ${cfg.map}.get(acNo);
}
`;
  writeFileSync(SEED_PATH, out, 'utf8');
  console.log('WROTE', SEED_PATH);
} else if (WRITE) {
  console.log('NOT WRITING — validation failed.');
}
