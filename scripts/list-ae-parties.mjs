/** List distinct winner/runner-up party strings for a state's target year. */
import { readFileSync } from 'node:fs';
import zlib from 'node:zlib';
const file = process.argv[2], year = +process.argv[3];
const split = (l) => { const c = []; let q = false, cur = ''; for (const ch of l) { if (ch === '"') q = !q; else if (ch === ',' && !q) { c.push(cur); cur = ''; } else cur += ch; } c.push(cur); return c; };
const text = zlib.gunzipSync(readFileSync(`C:/K/scripts/${file}`)).toString('utf8');
const lines = text.split(/\r?\n/).filter(Boolean);
const H = split(lines[0]); const ci = (n) => H.indexOf(n);
const rows = lines.slice(1).map(split).filter((r) => +r[ci('Year')] === year && (+r[ci('Position')] === 1 || +r[ci('Position')] === 2));
const set = new Set(rows.map((r) => r[ci('Party')]));
console.log(file, year, '->', [...set].sort().join(' | '));
