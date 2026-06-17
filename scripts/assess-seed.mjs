import { readFileSync } from 'node:fs';
for (const base of ['sikkim', 'arunachal-pradesh', 'mizoram']) {
  const t = readFileSync(`C:/K/data/seed/${base}-constituencies.ts`, 'utf8');
  const yrs = [...new Set([...t.matchAll(/winner(\d{4})/g)].map((m) => m[1]))];
  const entries = [...t.matchAll(/\{ acNo: (\d+), name: '([^']+)',([^}]*)\}/g)];
  const yr = yrs[0] || '????';
  const tally = {}; let zeroVotes = 0; let badDist = 0;
  const acs = [];
  for (const e of entries) {
    acs.push(+e[1]);
    const body = e[3];
    const w = (body.match(new RegExp(`winner${yr}: '([^']*)'`)) || [])[1] || '?';
    tally[w] = (tally[w] || 0) + 1;
    const v = (body.match(new RegExp(`winnerVotes${yr}: (\\d+)`)) || [])[1];
    if (v === '0') zeroVotes++;
    const d = (body.match(/district: '([^']*)'/) || [])[1] || '';
    if (!d || /^(sc|st|bl|gen)$/i.test(d)) badDist++;
  }
  const dup = [...new Set(acs.filter((a, i) => acs.indexOf(a) !== i))];
  console.log(`\n=== ${base} | years ${yrs.join(',')} | entries ${entries.length} ===`);
  console.log('acNo range', Math.min(...acs), '..', Math.max(...acs), '| dup', dup.join(',') || 'none', '| zeroVotes', zeroVotes, '| badDistrict', badDist);
  console.log('tally', JSON.stringify(tally));
  console.log('first', entries[0] ? entries[0][0].slice(0, 160) : 'none');
}
