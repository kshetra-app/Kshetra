import { readFileSync, readdirSync } from 'node:fs';
const seedDir = 'C:/K/data/seed';
const codes = new Map(); // code -> Set(states)
for (const f of readdirSync(seedDir).filter((f) => f.endsWith('-constituencies.ts'))) {
  const t = readFileSync(`${seedDir}/${f}`, 'utf8');
  const st = f.replace('-constituencies.ts', '');
  for (const m of t.matchAll(/(?:winner\d{4}|currentParty|runnerUp\d{4}): '([^']*)'/g)) {
    const c = m[1].trim();
    if (!c) continue;
    if (!codes.has(c)) codes.set(c, new Set());
    codes.get(c).add(st);
  }
}
const cfg = readFileSync('C:/K/packages/shared/src/constants/parties.ts', 'utf8');
const known = new Set([...cfg.matchAll(/^\s{2}([A-Z0-9]+): \{/gm)].map((m) => m[1]));
const typeF = readFileSync('C:/K/packages/shared/src/types/constituency.ts', 'utf8');
const typeBlock = (typeF.match(/PartyCode\s*=([^;]*);/s) || [, ''])[1];
const typeCodes = new Set([...typeBlock.matchAll(/'([^']+)'/g)].map((m) => m[1]));

console.log('PARTY_CONFIG entries:', known.size, '| PartyCode union entries:', typeCodes.size);
const missingCfg = [...codes.keys()].filter((c) => !known.has(c)).sort();
const missingType = [...codes.keys()].filter((c) => !typeCodes.has(c)).sort();
console.log('\nCodes used in seeds but MISSING from PARTY_CONFIG:');
for (const c of missingCfg) console.log(`  ${c}  (in: ${[...codes.get(c)].join(', ')})`);
console.log('\nCodes used in seeds but MISSING from PartyCode union type:');
console.log(' ', missingType.join(', ') || 'none');
