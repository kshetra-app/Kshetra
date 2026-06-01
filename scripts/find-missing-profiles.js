/**
 * find-missing-profiles.js
 * 
 * Compares constituency acNos vs MLA profile acNos and reports gaps.
 * Run from project root: node scripts/find-missing-profiles.js
 */

const fs = require('fs');
const path = require('path');

const SEED = path.join(__dirname, '..', 'data', 'seed');

const states = [
  { code: 'TN', constFile: 'tamil-nadu-constituencies.ts', profFile: 'tamil-nadu-mla-profiles.ts' },
  { code: 'KL', constFile: 'kerala-constituencies.ts', profFile: 'kerala-mla-profiles.ts' },
  { code: 'WB', constFile: 'west-bengal-constituencies.ts', profFile: 'west-bengal-mla-profiles.ts' },
  { code: 'AS', constFile: 'assam-constituencies.ts', profFile: 'assam-mla-profiles.ts' },
  { code: 'PY', constFile: 'puducherry-constituencies.ts', profFile: 'puducherry-mla-profiles.ts' },
];

console.log('═══ Missing Profile Diagnostic ═══\n');

for (const s of states) {
  const constContent = fs.readFileSync(path.join(SEED, s.constFile), 'utf8');
  const profContent = fs.readFileSync(path.join(SEED, s.profFile), 'utf8');
  
  // Extract all acNos from constituency file
  const constAcNos = [...constContent.matchAll(/acNo:\s*(\d+)/g)].map(m => Number(m[1]));
  // Filter to just top-level entries (not nested)
  const uniqueConstAcNos = [...new Set(constAcNos)].sort((a, b) => a - b);
  
  // Extract all acNos from profile file (top-level only - 4 spaces indent)
  const profAcNos = [...profContent.matchAll(/^    acNo:\s*(\d+),/gm)].map(m => Number(m[1]));
  const uniqueProfAcNos = [...new Set(profAcNos)].sort((a, b) => a - b);
  
  const missing = uniqueConstAcNos.filter(ac => !uniqueProfAcNos.includes(ac));
  const extra = uniqueProfAcNos.filter(ac => !uniqueConstAcNos.includes(ac));
  const duplicateConst = constAcNos.filter((ac, i) => constAcNos.indexOf(ac) !== i);
  const duplicateProf = profAcNos.filter((ac, i) => profAcNos.indexOf(ac) !== i);
  
  console.log(`${s.code}:`);
  console.log(`  Constituency seats: ${uniqueConstAcNos.length} unique (${constAcNos.length} total, ${duplicateConst.length} duplicates)`);
  console.log(`  Profile entries: ${uniqueProfAcNos.length} unique (${profAcNos.length} total, ${duplicateProf.length} duplicates)`);
  
  if (missing.length > 0) {
    console.log(`  ❌ Missing ${missing.length} profiles for acNos: ${missing.join(', ')}`);
  } else {
    console.log(`  ✅ 100% profile coverage`);
  }
  
  if (extra.length > 0) {
    console.log(`  ⚠️  ${extra.length} profiles with no matching constituency: ${extra.join(', ')}`);
  }
  
  if (duplicateConst.length > 0) {
    console.log(`  ⚠️  Duplicate constituency acNos: ${[...new Set(duplicateConst)].join(', ')}`);
  }
  
  console.log();
}
