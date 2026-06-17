/**
 * Rebuild a state's per-constituency demographics file so that:
 *   - rows are keyed by OFFICIAL ECI acNo (re-keyed from the old alphabetical
 *     ordering via oldAcNo -> name -> newAcNo using the git-HEAD seed + current seed),
 *   - totalVoters (electorate) and turnout are REAL values from TCPD/ECI,
 *   - maleVoters/femaleVoters are scaled to the real electorate,
 *   - population / literacy / urban% / SC% / ST% / area remain Census-2011-based
 *     ESTIMATES (real per-AC values are not available offline), carried from the
 *     prior file by constituency name, with state-average fallback.
 *
 *   node scripts/build-demographics.mjs <CODE> <base> <Tcpd_Name> <year> [--write]
 *   e.g. node scripts/build-demographics.mjs AR arunachal-pradesh Arunachal_Pradesh 2019
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import zlib from 'node:zlib';

const [CODE, BASE, TCPD, YEAR] = process.argv.slice(2);
const WRITE = process.argv.includes('--write');
if (!CODE || !BASE || !TCPD || !YEAR) { console.error('usage: <CODE> <base> <Tcpd_Name> <year> [--write]'); process.exit(1); }
const norm = (s) => String(s).toLowerCase().replace(/\([^)]*\)/g, '').replace(/[^a-z0-9]/g, '');
const num = (s) => Number(String(s).replace(/[^\d.]/g, '')) || 0;
const round = (n) => Math.round(n);
const file = `C:/K/data/seed/${BASE}-demographics.ts`;

// names from git-HEAD (old, alphabetical) seed and current (official) seed
const parseSeed = (txt) => [...txt.matchAll(/acNo: (\d+), name: '([^']+)'/g)].map((m) => ({ acNo: +m[1], name: m[2] }));
const oldSeed = parseSeed(execSync(`git -C C:/K show HEAD:data/seed/${BASE}-constituencies.ts`, { encoding: 'utf8', maxBuffer: 1 << 24 }));
const newSeed = parseSeed(readFileSync(`C:/K/data/seed/${BASE}-constituencies.ts`, 'utf8'));
const nameByOldAc = new Map(oldSeed.map((s) => [s.acNo, s.name]));

// TCPD real electors + turnout, keyed by normalized constituency name
const split = (l) => { const c = []; let q = false, cur = ''; for (const ch of l) { if (ch === '"') q = !q; else if (ch === ',' && !q) { c.push(cur); cur = ''; } else cur += ch; } c.push(cur); return c; };
const csv = zlib.gunzipSync(readFileSync(`C:/K/scripts/${TCPD}_AE.csv.gz`)).toString('utf8');
const L = csv.split(/\r?\n/).filter(Boolean); const H = split(L[0]); const ci = (n) => H.indexOf(n);
const C = { year: ci('Year'), cname: ci('Constituency_Name'), electors: ci('Electors'), turnout: ci('Turnout_Percentage') };
const tcpd = new Map();
for (const l of L.slice(1)) { const r = split(l); if (+r[C.year] !== +YEAR) continue; const k = norm(r[C.cname]); if (!tcpd.has(k)) tcpd.set(k, { electors: num(r[C.electors]), turnout: num(r[C.turnout]) }); }

// prior demographics estimates, keyed by old acNo
const demoTxt = readFileSync(file, 'utf8');
const oldDemo = new Map();
for (const m of demoTxt.matchAll(/\{ acNo: (\d+),([^}]*)\}/g)) {
  const b = m[2]; const g = (k) => num((b.match(new RegExp(k + ': ([\\d.]+)')) || [])[1]);
  oldDemo.set(+m[1], { population: g('population'), totalVoters: g('totalVoters'), turnout: g('turnout2023'), male: g('maleVoters'), female: g('femaleVoters'), literacy: g('literacy'), urban: g('urbanPercent'), sc: g('scPercent'), st: g('stPercent'), area: g('areaSqKm') });
}
const estByName = new Map(); // name(norm) -> estimate
for (const [oldAc, est] of oldDemo) { const nm = nameByOldAc.get(oldAc); if (nm) estByName.set(norm(nm), est); }
// state averages for fallback
const vals = [...oldDemo.values()];
const avg = (k) => round((vals.reduce((s, v) => s + v[k], 0) / vals.length) * 10) / 10;
const A = { population: round(avg('population')), literacy: avg('literacy'), urban: avg('urban'), sc: avg('sc'), st: avg('st'), area: round(avg('area')) };

const rows = []; const noReal = []; const noEst = [];
for (const s of newSeed) {
  const real = tcpd.get(norm(s.name));
  const est = estByName.get(norm(s.name));
  if (!real) noReal.push(`${s.acNo}:${s.name}`);
  if (!est) noEst.push(`${s.acNo}:${s.name}`);
  const electors = real?.electors || est?.totalVoters || 0;
  const ratio = est && est.totalVoters ? est.male / est.totalVoters : 0.51;
  const male = round(electors * ratio); const female = electors - male;
  rows.push({
    acNo: s.acNo,
    population: est?.population || A.population,
    totalVoters: electors,
    turnout: real?.turnout || est?.turnout || 0,
    male, female,
    literacy: est?.literacy || A.literacy,
    urban: est?.urban ?? A.urban,
    sc: est?.sc ?? A.sc,
    st: est?.st ?? A.st,
    area: est?.area || A.area,
  });
}
rows.sort((a, b) => a.acNo - b.acNo);
console.log(`${CODE}: ${rows.length} rows | no real TCPD turnout: ${noReal.join(', ') || 'none'} | no carried estimate: ${noEst.length}`);

if (WRITE) {
  const CONST = (demoTxt.match(/export const (\w+): ConstituencyDemographics/) || [])[1];
  const GETTER = (demoTxt.match(/export function (\w+)\(acNo/) || [])[1];
  if (!CONST || !GETTER) { console.error('could not detect const/getter name'); process.exit(1); }
  const line = (r) => `  { acNo: ${r.acNo}, population: ${r.population}, totalVoters: ${r.totalVoters}, turnout2023: ${r.turnout}, maleVoters: ${r.male}, femaleVoters: ${r.female}, literacy: ${r.literacy}, urbanPercent: ${r.urban}, scPercent: ${r.sc}, stPercent: ${r.st}, areaSqKm: ${r.area} },`;
  const out = `/**
 * ${CODE} Constituency Demographics — keyed by OFFICIAL ECI acNo.
 *
 * REAL DATA: totalVoters (electorate) and turnout2023 are real ECI/TCPD figures
 *   from the ${YEAR} Assembly election (the latest per-constituency electorate data
 *   available offline). maleVoters/femaleVoters are scaled to the real electorate.
 * ESTIMATES: population, literacy, urbanPercent, scPercent, stPercent, areaSqKm are
 *   Census-2011 district-proportional ESTIMATES (per-AC census not available offline).
 * Auto-generated by scripts/build-demographics.mjs — do not hand-edit.
 */

import type { ConstituencyDemographics } from './telangana-demographics';

export const ${CONST}: ConstituencyDemographics[] = [
${rows.map(line).join('\n')}
];

export function ${GETTER}(acNo: number): ConstituencyDemographics | undefined {
  return ${CONST}.find((d) => d.acNo === acNo);
}
`;
  writeFileSync(file, out, 'utf8');
  console.log('WROTE', file, '| const', CONST, '| getter', GETTER);
}
