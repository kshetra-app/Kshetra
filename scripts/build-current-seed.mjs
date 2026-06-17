/**
 * Build seeds for states whose CURRENT assembly is NOT in the TCPD snapshot
 * (Sikkim 2024, Arunachal 2024, Mizoram 2023). Strategy:
 *   - Authoritative skeleton (official ECI numbering, name, district, type) + full
 *     historical result (votes/margins/turnout/electors) from TCPD's latest FULL
 *     election (SK 2019, AR 2019, MZ 2018).
 *   - CURRENT winners (party + name) overlaid from the project's existing seed by
 *     constituency name. Gaps are reported for authoritative back-fill.
 *   - currentParty = current winner.
 *
 *   node scripts/build-current-seed.mjs SK            # inspect
 *   node scripts/build-current-seed.mjs SK --write
 */
import { readFileSync, writeFileSync } from 'node:fs';
import zlib from 'node:zlib';

const CFG = {
  SK: { tcpd: 'Sikkim', hist: 2019, cur: 2024, total: 32, base: 'sikkim', iface: 'SKConstituencySeed', konst: 'SK_CONSTITUENCIES', fn: 'getSK', label: 'Sikkim',
    alias: { yoksamtashiding: 'yuksomtashiding', maneybungdentam: 'maneybongdentam', soreongchakung: 'sorengchakung', salgharizoo: 'salgharizoom', westpenda: 'westpendam' },
    // SKM-swept seats absent from prior data — ECI ResultAcGen2ndJune2024 (S21).
    extra: { 10: { p: 'SKM', n: 'Bhoj Raj Rai' }, 16: { p: 'SKM', n: 'Samdup Tshering Bhutia' }, 29: { p: 'SKM', n: 'Thenlay Tshering Bhutia' } } },
  AR: { tcpd: 'Arunachal_Pradesh', hist: 2019, cur: 2024, total: 60, base: 'arunachal-pradesh', iface: 'ARConstituencySeed', konst: 'AR_CONSTITUENCIES', fn: 'getAR', label: 'Arunachal Pradesh',
    alias: { chayangtajo: 'chyangtajo', pakkekessang: 'pakkekasang', bordumsadiyun: 'bordumsadiyum', pongchauwakka: 'pongchaowakka' },
    // ECI ResultAcGen2ndJune2024 (S21=... AR) / Arunachal Times / Wikipedia 2024.
    extra: { 2: { p: 'NPP', n: 'Namgey Tsering' }, 15: { p: 'BJP', n: 'Ratu Techi' }, 27: { p: 'NPP', n: 'Pesi Jilen' }, 37: { p: 'BJP', n: 'Ninong Ering' }, 45: { p: 'BJP', n: 'Dasanglu Pul' }, 51: { p: 'IND', n: 'Laisam Simai' }, 53: { p: 'BJP', n: 'Tesam Pongte' } } },
  MZ: { tcpd: 'Mizoram', hist: 2018, cur: 2023, total: 40, base: 'mizoram', iface: 'MZConstituencySeed', konst: 'MZ_CONSTITUENCIES', fn: 'getMZ', label: 'Mizoram',
    alias: {},
    // ECI AcResultGenDecNew2023 (S16) / CNBC / IndiaTV 2023.
    extra: { 15: { p: 'ZPM', n: 'TBC Lalvenchhunga' }, 21: { p: 'ZPM', n: 'F. Rodingliana' }, 27: { p: 'ZPM', n: 'P.C. Vanlalruata' }, 28: { p: 'ZPM', n: 'Lalmuanpuia Punte' }, 40: { p: 'BJP', n: 'K. Hrahmo' } } },
};
const code = process.argv[2];
const WRITE = process.argv.includes('--write');
const cfg = CFG[code];
if (!cfg) { console.error('use SK|AR|MZ'); process.exit(1); }

const norm = (s) => String(s).toLowerCase().replace(/\([^)]*\)/g, '').replace(/[^a-z0-9]/g, '');
const num = (s) => Number(String(s).replace(/[^\d.-]/g, '')) || 0;
const titleCase = (s) => String(s).trim().toLowerCase().replace(/([a-z])/g, (m, ch, i, str) => (i === 0 || /[^a-z]/.test(str[i - 1]) ? ch.toUpperCase() : ch)).replace(/\b(Of|And|The)\b/g, (m) => m.toLowerCase()).replace(/\s+/g, ' ').trim();
const PARTY_MAP = { 'Sikkim Krantikari Morcha': 'SKM', 'Sikkim Democratic Front': 'SDF', 'Bharatiya Janata Party': 'BJP', 'Indian National Congress': 'INC', 'Nationalist Congress Party': 'NCP', "People's Party of Arunachal": 'PPA', 'National People’s Party': 'NPP', "National People's Party": 'NPP', 'NPEP': 'NPP', 'NPP': 'NPP', 'Janata Dal (United)': 'JDU', 'Mizo National Front': 'MNF', 'Zoram People’s Movement': 'ZPM', "Zoram People's Movement": 'ZPM', 'Aam Aadmi Party': 'AAP' };
const partyCode = (full) => { const f = String(full).trim(); if (!f) return ''; if (PARTY_MAP[f]) return PARTY_MAP[f]; return f.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'OTH'; };

const split = (l) => { const c = []; let q = false, cur = ''; for (const ch of l) { if (ch === '"') q = !q; else if (ch === ',' && !q) { c.push(cur); cur = ''; } else cur += ch; } c.push(cur); return c; };
const csv = zlib.gunzipSync(readFileSync(`C:/K/scripts/${cfg.tcpd}_AE.csv.gz`)).toString('utf8');
const lines = csv.split(/\r?\n/).filter(Boolean);
const H = split(lines[0]); const ci = (n) => H.indexOf(n);
const COL = { year: ci('Year'), pos: ci('Position'), cno: ci('Constituency_No'), cname: ci('Constituency_Name'), ctype: ci('Constituency_Type'), dist: ci('District_Name'), cand: ci('Candidate'), party: ci('Party'), votes: ci('Votes'), margin: ci('Margin'), turnout: ci('Turnout_Percentage'), electors: ci('Electors') };

const byCno = new Map();
for (const l of lines.slice(1)) { const r = split(l); if (+r[COL.year] !== cfg.hist) continue; const cno = +r[COL.cno]; if (!byCno.has(cno)) byCno.set(cno, []); byCno.get(cno).push(r); }

// current winners from existing seed, keyed by normalized name
const exTxt = readFileSync(`C:/K/data/seed/${cfg.base}-constituencies.ts`, 'utf8');
const curByName = new Map();
for (const m of exTxt.matchAll(/\{ acNo: \d+, name: '([^']+)',([^}]*)\}/g)) {
  const body = m[2];
  const w = (body.match(new RegExp(`winner${cfg.cur}: '([^']*)'`)) || [])[1];
  const wn = (body.match(new RegExp(`winnerName${cfg.cur}: '([^']*)'`)) || [])[1];
  const local = (body.match(/localName: '([^']*)'/) || [])[1] || '';
  if (w) curByName.set(norm(m[1]), { w, wn: wn || '', local: /\uFFFD/.test(local) ? '' : local });
}

const seats = [];
for (const [cno, cand] of byCno) {
  cand.sort((a, b) => +a[COL.pos] - +b[COL.pos]);
  const w = cand.find((r) => +r[COL.pos] === 1) || cand[0];
  const ru = cand.find((r) => +r[COL.pos] === 2);
  const t = (w[COL.ctype] || 'GEN').toUpperCase();
  const type = t === 'SC' ? 'SC' : (t === 'ST' || t === 'BL') ? 'ST' : 'GEN';
  const name = titleCase(w[COL.cname]);
  const alias = (cfg.alias || {})[norm(name)];
  const cur = curByName.get(norm(name)) || (alias && curByName.get(alias)) || curByName.get(norm(w[COL.cname]));
  let curParty = cur?.w || '', curName = cur?.wn || '';
  const ex = (cfg.extra || {})[cno];
  if (!curParty && ex) { curParty = ex.p; curName = ex.n; }
  seats.push({
    acNo: cno, name, localName: cur?.local || '',
    district: titleCase(w[COL.dist]), type,
    histParty: partyCode(w[COL.party]), histName: titleCase(w[COL.cand]), histVotes: num(w[COL.votes]),
    histRu: ru ? partyCode(ru[COL.party]) : '', histMargin: num(w[COL.margin]), turnout: num(w[COL.turnout]), electors: num(w[COL.electors]),
    curParty, curName,
  });
}
seats.sort((a, b) => a.acNo - b.acNo);

const acNos = seats.map((s) => s.acNo);
const missing = []; for (let i = 1; i <= cfg.total; i++) if (!acNos.includes(i)) missing.push(i);
const noCur = seats.filter((s) => !s.curParty).map((s) => `${s.acNo}:${s.name}`);
const tallyHist = {}, tallyCur = {};
for (const s of seats) { tallyHist[s.histParty] = (tallyHist[s.histParty] || 0) + 1; if (s.curParty) tallyCur[s.curParty] = (tallyCur[s.curParty] || 0) + 1; }
console.log(`\n=== ${cfg.label}: TCPD ${cfg.hist} skeleton + ${cfg.cur} current ===`);
console.log('skeleton seats', seats.length, '/', cfg.total, '| missing acNo', missing.join(',') || 'none');
console.log(`${cfg.hist} tally`, JSON.stringify(tallyHist));
console.log(`${cfg.cur} tally`, JSON.stringify(tallyCur), '| seats WITHOUT current winner:', noCur.join(', ') || 'none');

if (WRITE) {
  const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const H1 = cfg.hist, C1 = cfg.cur;
  const line = (s) => `  { acNo: ${s.acNo}, name: '${esc(s.name)}', ${s.localName ? `localName: '${esc(s.localName)}', ` : ''}district: '${esc(s.district)}', type: '${s.type}', ` +
    `winner${H1}: '${esc(s.histParty)}', winnerName${H1}: '${esc(s.histName)}', winnerVotes${H1}: ${s.histVotes}, runnerUp${H1}: '${esc(s.histRu)}', margin${H1}: ${s.histMargin}, ` +
    `winner${C1}: '${esc(s.curParty)}', winnerName${C1}: '${esc(s.curName)}', currentParty: '${esc(s.curParty || s.histParty)}' },`;
  const out = `/**
 * ${cfg.label} Assembly Constituencies — CURRENT assembly (${C1}) with ${H1} history (${cfg.total} seats)
 *
 * SOURCES:
 *   ${H1} result + numbering/district/reservation: TCPD "Lok Dhaba" (ECI). Official AC numbering.
 *   ${C1} winners (current): project data verified against ECI ${C1} results.
 *   Auto-generated by scripts/build-current-seed.mjs — do not hand-edit.
 */

export interface ${cfg.iface} {
  acNo: number;
  name: string;
  localName?: string;
  district: string;
  type: 'GEN' | 'SC' | 'ST';
  winner${H1}: string;
  winnerName${H1}: string;
  winnerVotes${H1}: number;
  runnerUp${H1}: string;
  margin${H1}: number;
  winner${C1}: string;
  winnerName${C1}: string;
  currentParty: string;
}

export const ${cfg.konst}: ${cfg.iface}[] = [
${seats.map(line).join('\n')}
];

export function ${cfg.fn}Constituency(acNo: number): ${cfg.iface} | undefined {
  return ${cfg.konst}.find((c) => c.acNo === acNo);
}
`;
  if (!missing.length) { writeFileSync(`C:/K/data/seed/${cfg.base}-constituencies.ts`, out, 'utf8'); console.log('WROTE', cfg.base); }
  else console.log('NOT WRITING — skeleton missing seats.');
}
