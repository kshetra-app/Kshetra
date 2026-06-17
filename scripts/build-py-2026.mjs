/**
 * Build the Puducherry seed for the CURRENT (2026) assembly while preserving the
 * 2021 result as history.
 *   - Structure (official ECI numbering, name, district, type) + winner2021 fields
 *     come from the TCPD-built seed (data/seed/puducherry-constituencies.ts as last
 *     written from TCPD 2021).
 *   - winner2026 fields come from the project's prior 2026 data (git HEAD), with
 *     party-code bugs fixed (AITC->AINRC, 'LJK('->LJK) and Tamil localNames kept.
 *   - 3 seats absent from the old data (Thirubhuvanai, Nellithope, Karaikal South)
 *     are added from authoritative ECI/press 2026 results.
 *   - currentParty = 2026 winner.
 *
 * Sources: TCPD Lok Dhaba (2021); ECI ResultAcGenMay2026 / CEO Puducherry Form-21C;
 *          Indian Express & News18 constituency-wise 2026 winners list.
 *
 *   node scripts/build-py-2026.mjs [--write]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const WRITE = process.argv.includes('--write');
const norm = (s) => String(s).toLowerCase().replace(/\([^)]*\)/g, '').replace(/[^a-z0-9]/g, '');
const fixParty = (p) => { const c = String(p).replace(/[^A-Za-z]/g, '').toUpperCase(); return c === 'AITC' ? 'AINRC' : c; };

// ── current TCPD-built seed: official numbering + 2021 fields ──
const curTxt = readFileSync('C:/K/data/seed/puducherry-constituencies.ts', 'utf8');
const cur = [...curTxt.matchAll(/\{ acNo: (\d+), name: '([^']+)',([^}]*)\}/g)].map((m) => {
  const body = m[3];
  const g = (k) => (body.match(new RegExp(k + ": '([^']*)'")) || [])[1] ?? '';
  const n = (k) => Number((body.match(new RegExp(k + ': (\\d+)')) || [])[1] || 0);
  return {
    acNo: +m[1], name: m[2],
    district: g('district'), type: g('type'),
    w21: g('winner2021'), wn21: g('winnerName2021'), wv21: n('winnerVotes2021'), ru21: g('runnerUp2021'), mg21: n('margin2021'),
  };
});

// ── old 2026 seed (git HEAD): winner2026 + localName, keyed by name ──
let oldTxt;
try { oldTxt = execSync('git -C C:/K show HEAD:data/seed/puducherry-constituencies.ts', { encoding: 'utf8', maxBuffer: 1 << 24 }); }
catch { oldTxt = ''; }
const old2026 = new Map();
for (const m of oldTxt.matchAll(/\{ acNo: \d+, name: '([^']+)',([^}]*)\}/g)) {
  const body = m[2];
  const g = (k) => (body.match(new RegExp(k + ": '([^']*)'")) || [])[1] ?? '';
  const n = (k) => Number((body.match(new RegExp(k + ': (\\d+)')) || [])[1] || 0);
  const local = g('localName');
  old2026.set(norm(m[1]), {
    w26: fixParty(g('winner2026')), wn26: g('winnerName2026'), wv26: n('winnerVotes2026'),
    ru26: fixParty(g('runnerUp2026')) || '', mg26: n('margin2026'),
    localName: /\uFFFD/.test(local) ? '' : local,
  });
}

// ── 3 seats absent from old data — authoritative 2026 results ──
const EXTRA26 = {
  thirubhuvanai: { w26: 'TVK', wn26: 'AK Sai J Saravanan Kumar', wv26: 0, ru26: '', mg26: 0 },
  nellithope: { w26: 'DMK', wn26: 'V. Cartigueyane', wv26: 0, ru26: '', mg26: 850 },
  karaikalsouth: { w26: 'DMK', wn26: 'A.M.H. Nazeem', wv26: 0, ru26: '', mg26: 5862 },
};

const rows = []; const misses = [];
for (const c of cur) {
  const key = norm(c.name);
  const e = old2026.get(key) || EXTRA26[key];
  if (!e) { misses.push(`${c.acNo}:${c.name}`); continue; }
  rows.push({ ...c, ...e, localName: e.localName || '' });
}

const tally = {}; for (const r of rows) tally[r.w26] = (tally[r.w26] || 0) + 1;
console.log('rows', rows.length, '/ 30 | misses', misses.join(', ') || 'none');
console.log('2026 tally', JSON.stringify(tally));
const TARGET = { AINRC: 12, BJP: 4, DMK: 5, TVK: 2, INC: 1, LJK: 1, AIADMK: 1, NMK: 1, IND: 3 };
const tallyOk = Object.keys({ ...tally, ...TARGET }).every((k) => (tally[k] || 0) === (TARGET[k] || 0));
console.log('tally matches authoritative =', tallyOk);

if (WRITE && rows.length === 30 && !misses.length && tallyOk) {
  const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const line = (r) => `  { acNo: ${r.acNo}, name: '${esc(r.name)}', ${r.localName ? `localName: '${esc(r.localName)}', ` : ''}district: '${esc(r.district)}', type: '${r.type}', ` +
    `winner2021: '${esc(r.w21)}', winnerName2021: '${esc(r.wn21)}', winnerVotes2021: ${r.wv21}, runnerUp2021: '${esc(r.ru21)}', margin2021: ${r.mg21}, ` +
    `winner2026: '${esc(r.w26)}', winnerName2026: '${esc(r.wn26)}', winnerVotes2026: ${r.wv26}, runnerUp2026: '${esc(r.ru26)}', margin2026: ${r.mg26}, ` +
    `currentParty: '${esc(r.w26)}' },`;
  const tallyStr = Object.entries(TARGET).map(([k, v]) => `${k} ${v}`).join(' | ');
  const out = `/**
 * Puducherry Assembly Constituencies — CURRENT 7th Assembly (2026 General Election, 30 seats)
 *
 * SOURCES:
 *   2026 result (current): ECI ResultAcGenMay2026 / CEO Puducherry Form-21C (04-05-2026),
 *     cross-checked with Indian Express & News18 constituency-wise winners lists.
 *   2021 result (history): TCPD "Lok Dhaba" (ECI-sourced). Official ECI AC numbering (1-30).
 *   localName (Tamil) and most 2026 candidate names retained from the project's prior data.
 *   Auto-generated by scripts/build-py-2026.mjs — do not hand-edit.
 *
 * 2026 PARTY TALLY: ${tallyStr} = 30   (NDA: AINRC+BJP+AIADMK+LJK = 18)
 */

export interface PYConstituencySeed {
  acNo: number;
  name: string;
  /** Constituency name in Tamil script */
  localName?: string;
  district: string;
  type: 'GEN' | 'SC' | 'ST';
  winner2021: string;
  winnerName2021: string;
  winnerVotes2021: number;
  runnerUp2021: string;
  margin2021: number;
  winner2026: string;
  winnerName2026: string;
  winnerVotes2026: number;
  runnerUp2026: string;
  margin2026: number;
  currentParty: string;
}

export const PY_CONSTITUENCIES: PYConstituencySeed[] = [
${rows.sort((a, b) => a.acNo - b.acNo).map(line).join('\n')}
];

export function getPYConstituency(acNo: number): PYConstituencySeed | undefined {
  return PY_CONSTITUENCIES.find((c) => c.acNo === acNo);
}
`;
  writeFileSync('C:/K/data/seed/puducherry-constituencies.ts', out, 'utf8');
  console.log('WROTE puducherry-constituencies.ts');
} else if (WRITE) {
  console.log('NOT WRITING — validation failed.');
}
