/**
 * Re-key the Puducherry MLA profiles from alphabetical acNo to OFFICIAL ECI acNo
 * (so getPYMLAProfile(officialAcNo) returns the correct legislator). Re-keys the
 * top-level `acNo` (by each profile's constituencyName) and every
 * `constituencyNumber` (by its adjacent constituencyName). Names/parties untouched.
 *
 *   node scripts/rekey-py-mla.mjs [--write]
 */
import { readFileSync, writeFileSync } from 'node:fs';
const WRITE = process.argv.includes('--write');
const norm = (s) => String(s).toLowerCase().replace(/\([^)]*\)/g, '').replace(/[^a-z0-9]/g, '');

const seed = readFileSync('C:/K/data/seed/puducherry-constituencies.ts', 'utf8');
const official = new Map();
for (const m of seed.matchAll(/acNo: (\d+), name: '([^']+)'/g)) official.set(norm(m[2]), +m[1]);

const file = 'C:/K/data/seed/puducherry-mla-profiles.ts';
let txt = readFileSync(file, 'utf8');
const unmatched = new Set();
const lookup = (name) => { const o = official.get(norm(name)); if (o == null) unmatched.add(name); return o; };

// Pass A: every constituencyNumber follows its constituencyName — set to official.
txt = txt.replace(/(constituencyName: '([^']+)',(\s*\n\s*)constituencyNumber: )\d+/g, (full, pre, name) => {
  const o = lookup(name); return o == null ? full : `${pre}${o}`;
});
// Pass B: top-level acNo precedes the profile's (first) constituencyName.
let acFixed = 0;
txt = txt.replace(/acNo: \d+(,[\s\S]*?constituencyName: ')([^']+)/g, (full, mid, name) => {
  const o = lookup(name); if (o == null) return full; acFixed++; return `acNo: ${o}${mid}${name}`;
});

// report
const acNos = [...txt.matchAll(/^    acNo: (\d+),$/gm)].map((m) => +m[1]);
const dup = [...new Set(acNos.filter((a, i) => acNos.indexOf(a) !== i))];
console.log(`acNo fields re-keyed: ${acFixed} | distinct acNos: ${new Set(acNos).size} | dup: ${dup.join(',') || 'none'}`);
console.log('unmatched constituency names:', [...unmatched].join(', ') || 'none');

if (WRITE && !unmatched.size && !dup.length) { writeFileSync(file, txt, 'utf8'); console.log('WROTE', file); }
else if (WRITE) console.log('NOT WRITING — unmatched names or duplicate acNos.');
