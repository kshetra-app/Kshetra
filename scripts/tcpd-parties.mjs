import { readFileSync } from 'node:fs';
import zlib from 'node:zlib';
const files = { Tripura: 2023, Meghalaya: 2023, Manipur: 2022, Nagaland: 2023, Uttarakhand: 2022, Puducherry: 2021 };
const split = (l) => { const c = []; let q = false, cur = ''; for (const ch of l) { if (ch === '"') q = !q; else if (ch === ',' && !q) { c.push(cur); cur = ''; } else cur += ch; } c.push(cur); return c; };
const all = new Map();
for (const [s, yr] of Object.entries(files)) {
  const csv = zlib.gunzipSync(readFileSync(`C:/K/scripts/${s}_AE.csv.gz`)).toString('utf8');
  const lines = csv.split(/\r?\n/).filter(Boolean);
  const H = split(lines[0]); const ci = (n) => H.indexOf(n);
  for (const l of lines.slice(1)) {
    const r = split(l);
    if (+r[ci('Year')] !== yr) continue;
    if (+r[ci('Position')] > 2) continue; // winners + runners-up
    const p = (r[ci('Party')] || '').trim();
    all.set(p, (all.get(p) || 0) + 1);
  }
}
[...all.entries()].sort((a, b) => b[1] - a[1]).forEach(([p, n]) => console.log(String(n).padStart(4), p));
