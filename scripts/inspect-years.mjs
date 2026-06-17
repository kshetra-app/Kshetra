import { readFileSync } from 'node:fs';
import zlib from 'node:zlib';
const states = ['Meghalaya', 'Manipur', 'Nagaland', 'Uttarakhand', 'Puducherry', 'Sikkim', 'Arunachal_Pradesh', 'Mizoram', 'Tripura'];
const split = (l) => { const c = []; let q = false, cur = ''; for (const ch of l) { if (ch === '"') q = !q; else if (ch === ',' && !q) { c.push(cur); cur = ''; } else cur += ch; } c.push(cur); return c; };
for (const s of states) {
  const csv = zlib.gunzipSync(readFileSync(`C:/K/scripts/${s}_AE.csv.gz`)).toString('utf8');
  const lines = csv.split(/\r?\n/).filter(Boolean);
  const H = split(lines[0]); const yi = H.indexOf('Year'); const ci = H.indexOf('Constituency_No');
  const years = {};
  for (const l of lines.slice(1)) { const r = split(l); const y = +r[yi]; if (!years[y]) years[y] = new Set(); years[y].add(+r[ci]); }
  const ys = Object.keys(years).map(Number).sort((a, b) => b - a);
  const latest = ys[0];
  console.log(s.padEnd(18), 'latest', latest, 'seats', years[latest].size, '| years:', ys.slice(0, 4).join(','));
}
