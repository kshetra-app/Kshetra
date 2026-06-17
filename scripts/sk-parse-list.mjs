import { readFileSync } from 'node:fs';
const t = readFileSync('C:/K/scripts/sk-list.txt', 'utf8');
const j = t.lastIndexOf('{|', t.search(/col-1right/i));
const end = t.indexOf('\n|}', j);
const tbl = t.slice(j, end);
const clean = (s) => s
  .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
  .replace(/\[\[([^\]]+)\]\]/g, '$1')
  .replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, '')
  .replace(/<ref[^>]*\/>/g, '')
  .replace(/\{\{[^{}]*\}\}/g, '')
  .replace(/<[^>]+>/g, '')
  .replace(/'''?/g, '')
  .trim();
const blocks = tbl.split(/\n\|-/);
const out = [];
for (const b of blocks) {
  const cells = b.split('\n').map((l) => l.trim()).filter((l) => /^[|!]/.test(l)).map((l) => l.replace(/^[|!]+\s?/, ''));
  if (cells.length < 3) continue;
  const no = cells[0].replace(/[^0-9]/g, '');
  if (!/^\d+$/.test(no)) continue;
  out.push([no, clean(cells[1]), clean(cells[2]), clean(cells[3] || '')]);
}
console.log('rows', out.length);
out.forEach((r) => console.log(r[0].padStart(2), '|', r[1].padEnd(22), '|', r[2].padEnd(6), '|', r[3]));
