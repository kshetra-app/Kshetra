import { readFileSync } from 'node:fs';
const t = readFileSync('C:/K/data/seed/tripura-mla-profiles.ts', 'utf8');
const b = t.slice(t.indexOf('= [') + 3, t.lastIndexOf('];'));
const blocks = [...b.matchAll(/\{[^{}]+\}/g)].map((m) => m[0]);
const g = (blk, k) => (blk.match(new RegExp(k + ": '([^']*)'")) || [])[1];
for (const ac of [1, 6, 7, 20, 23, 3, 25, 36, 53, 58]) {
  const blk = blocks.find((x) => new RegExp('acNo: ' + ac + ',').test(x));
  if (!blk) { console.log(ac, 'MISSING'); continue; }
  console.log(String(ac).padStart(2), '|', (g(blk, 'constituencyName') || '').padEnd(22), '|', (g(blk, 'name') || '').padEnd(26), '|', (g(blk, 'party') || '').padEnd(6), '| dist', g(blk, 'district'));
}
