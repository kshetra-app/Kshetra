import { readFileSync } from 'node:fs';
const D = 'C:/K/data/seed/';
const acs = (f, body = true) => {
  const t = readFileSync(f, 'utf8');
  const s = body ? t.slice(t.indexOf('= [') + 3, t.lastIndexOf('];')) : t;
  return [...s.matchAll(/acNo: (\d+)/g)].map((m) => +m[1]);
};
const chk = (label, arr, expect = 60) => {
  const u = new Set(arr); const miss = [];
  for (let i = 1; i <= expect; i++) if (!u.has(i)) miss.push(i);
  const dup = [...new Set(arr.filter((a, i) => arr.indexOf(a) !== i))];
  console.log(`${label.padEnd(14)} count=${arr.length} unique=${u.size} missing=${miss.join(',') || 'none'} dup=${dup.join(',') || 'none'}`);
};
chk('seed', acs(D + 'tripura-constituencies.ts'));
chk('demographics', acs(D + 'tripura-demographics.ts'));
chk('mla', acs(D + 'tripura-mla-profiles.ts'));
const tl = acs(D + 'tripura-political-timeline.ts');
console.log('timeline       entries=' + tl.length, 'allValid=' + tl.every((a) => a >= 1 && a <= 60));
const geo = JSON.parse(readFileSync('C:/K/apps/mobile/data/tr-assembly.json', 'utf8'));
chk('geojson', geo.features.map((f) => f.properties.AC_NO));
