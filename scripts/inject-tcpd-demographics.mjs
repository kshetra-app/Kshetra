/**
 * Inject REAL ECI/TCPD per-constituency turnout % and registered electors into a
 * state's generated demographics file (replacing modeled estimates for those two
 * fields). Population/literacy/urban/SC-ST remain district-Census estimates.
 *   node scripts/inject-tcpd-demographics.mjs TR 2023 --write
 */
import { readFileSync, writeFileSync } from 'node:fs';
import zlib from 'node:zlib';

const CODE = process.argv[2];
const YEAR = +process.argv[3];
const WRITE = process.argv.includes('--write');
const MAP = { TR: 'Tripura', ML: 'Meghalaya', MN: 'Manipur', NL: 'Nagaland', UK: 'Uttarakhand', PY: 'Puducherry' };
const FILE = { TR: 'tripura', ML: 'meghalaya', MN: 'manipur', NL: 'nagaland', UK: 'uttarakhand', PY: 'puducherry' };
const state = MAP[CODE];
if (!state || !YEAR) { console.error('usage: <CODE> <YEAR> [--write]'); process.exit(1); }

const split = (l) => { const c = []; let q = false, cur = ''; for (const ch of l) { if (ch === '"') q = !q; else if (ch === ',' && !q) { c.push(cur); cur = ''; } else cur += ch; } c.push(cur); return c; };
const csv = zlib.gunzipSync(readFileSync(`C:/K/scripts/${state}_AE.csv.gz`)).toString('utf8');
const lines = csv.split(/\r?\n/).filter(Boolean);
const H = split(lines[0]); const ci = (n) => H.indexOf(n);
const num = (s) => Number(String(s).replace(/[^\d.-]/g, '')) || 0;

const real = new Map();
for (const l of lines.slice(1)) {
  const r = split(l);
  if (+r[ci('Year')] !== YEAR) continue;
  const cno = +r[ci('Constituency_No')];
  if (!real.has(cno)) real.set(cno, { turnout: num(r[ci('Turnout_Percentage')]), electors: num(r[ci('Electors')]) });
}

// Manual ECI overrides for seats absent from the TCPD snapshot (e.g. by-polls).
const OVERRIDES = {
  ML: { 23: { turnout: 91.87, electors: 35008 } }, // Sohiong by-poll, 10 May 2023 (ECI)
};
if (OVERRIDES[CODE]) for (const [ac, v] of Object.entries(OVERRIDES[CODE])) real.set(+ac, v);

const path = `C:/K/data/seed/${FILE[CODE]}-demographics.ts`;
let txt = readFileSync(path, 'utf8');
let patched = 0; const misses = [];
txt = txt.replace(/\{ acNo: (\d+), population: (\d+), totalVoters: (\d+), turnout2023: ([\d.]+), maleVoters: (\d+), femaleVoters: (\d+),([^}]*)\}/g,
  (m, ac, pop, tv, to, male, female, rest) => {
    const rd = real.get(+ac);
    if (!rd || !rd.electors) { misses.push(+ac); return m; }
    const electors = rd.electors;
    const turnout = rd.turnout || +to;
    const maleRatio = +male / ((+male + +female) || 1);
    const nmale = Math.round(electors * maleRatio);
    const nfemale = electors - nmale;
    const npop = Math.max(+pop, Math.round(electors / 0.66));
    patched++;
    return `{ acNo: ${ac}, population: ${npop}, totalVoters: ${electors}, turnout2023: ${turnout}, maleVoters: ${nmale}, femaleVoters: ${nfemale},${rest}}`;
  });

const disclaimer = `/**
 * ${state} Constituency Demographics
 *
 * turnout2023 (turnout %) and totalVoters (registered electors) are REAL figures from
 * the ECI ${YEAR} ${state} Assembly election, compiled by TCPD "Lok Dhaba".
 * maleVoters/femaleVoters split the real electorate by the modeled sex ratio.
 * population, literacy, urbanPercent, scPercent, stPercent, areaSqKm are INDICATIVE
 * ESTIMATES from Census 2011 district data (no official per-AC census exists).
 */`;
txt = txt.replace(/^\/\*\*[\s\S]*?\*\//, disclaimer);

console.log(`${CODE} ${YEAR}: patched ${patched} | real ACs ${real.size} | misses ${misses.length}`, misses.join(',') || '');
if (WRITE && !misses.length) { writeFileSync(path, txt, 'utf8'); console.log('WROTE', path); }
else if (WRITE) console.log('NOT WRITING — misses present.');
