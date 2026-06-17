import { readFileSync } from 'node:fs';
import zlib from 'node:zlib';
const CFG = { SK: ['Sikkim', 2019, 2024, 'sikkim'], AR: ['Arunachal_Pradesh', 2019, 2024, 'arunachal-pradesh'], MZ: ['Mizoram', 2018, 2023, 'mizoram'] };
const [tcpd, hist, cur, base] = CFG[process.argv[2]];
const norm = (s) => String(s).toLowerCase().replace(/\([^)]*\)/g, '').replace(/[^a-z0-9]/g, '');
const strip = (s) => norm(s).replace(/(east|west|north|south|i+$)/g, '');
const split = (l) => { const c = []; let q = false, cur = ''; for (const ch of l) { if (ch === '"') q = !q; else if (ch === ',' && !q) { c.push(cur); cur = ''; } else cur += ch; } c.push(cur); return c; };
const csv = zlib.gunzipSync(readFileSync(`C:/K/scripts/${tcpd}_AE.csv.gz`)).toString('utf8');
const lines = csv.split(/\r?\n/).filter(Boolean); const Hh = split(lines[0]); const yi = Hh.indexOf('Year'), cnoi = Hh.indexOf('Constituency_No'), cnamei = Hh.indexOf('Constituency_Name');
const tcpdNames = new Map();
for (const l of lines.slice(1)) { const r = split(l); if (+r[yi] !== hist) continue; tcpdNames.set(+r[cnoi], r[cnamei]); }
const tcpdNorm = new Set([...tcpdNames.values()].map(norm));

const exTxt = readFileSync(`C:/K/data/seed/${base}-constituencies.ts`, 'utf8');
const ex = [...exTxt.matchAll(/\{ acNo: \d+, name: '([^']+)',([^}]*)\}/g)].map((m) => {
  const w = (m[2].match(new RegExp(`winner${cur}: '([^']*)'`)) || [])[1] || '';
  const wn = (m[2].match(new RegExp(`winnerName${cur}: '([^']*)'`)) || [])[1] || '';
  return { name: m[1], w, wn };
});
console.log(`existing seed entries: ${ex.length} | tcpd ${hist} seats: ${tcpdNames.size}`);
console.log('\n-- existing-seed names NOT matching any TCPD name (need alias or are extra) --');
for (const e of ex) if (!tcpdNorm.has(norm(e.name))) console.log(`  ${e.name}  [${e.w} ${e.wn}]`);
console.log('\n-- TCPD names NOT present in existing seed (seats missing current data) --');
const exNorm = new Set(ex.map((e) => norm(e.name)));
for (const [cno, nm] of [...tcpdNames].sort((a, b) => a[0] - b[0])) if (!exNorm.has(norm(nm))) console.log(`  ${cno}: ${nm}`);
