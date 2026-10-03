import fs from 'node:fs';
import path from 'node:path';

const REPO_ROOT = process.cwd();
const seedDir = path.join(REPO_ROOT, 'data', 'seed');

// Let's audit *-constituencies.ts
const constFiles = fs.readdirSync(seedDir).filter(f => f.endsWith('-constituencies.ts'));
console.log(`Auditing ${constFiles.length} constituency files...`);

const constSummary = [];
let totalConstInSeeds = 0;
let totalMlaNamesInSeeds = 0;

for (const f of constFiles) {
  const content = fs.readFileSync(path.join(seedDir, f), 'utf8');
  // Count entries by finding { acNo: or acNo:
  const acMatches = [...content.matchAll(/\bacNo:\s*(\d+)/g)];
  // Count winner names
  const winnerNameMatches = [...content.matchAll(/\bwinnerName\w*:\s*['"]([^'"]+)['"]/g)];
  
  const stateMatch = f.replace('-constituencies.ts', '');
  constSummary.push({
    state: stateMatch,
    file: f,
    constituencies: acMatches.length,
    winnerNames: winnerNameMatches.length,
  });
  totalConstInSeeds += acMatches.length;
  totalMlaNamesInSeeds += winnerNameMatches.length;
}

console.log(`Total Constituencies in *-constituencies.ts: ${totalConstInSeeds}`);
console.log(`Total Winner Names in *-constituencies.ts: ${totalMlaNamesInSeeds}`);

// Now audit mp-profiles.ts in detail
const mpContent = fs.readFileSync(path.join(seedDir, 'mp-profiles.ts'), 'utf8');
const mpIdMatches = [...mpContent.matchAll(/id:\s*['"]([^'"]+)['"]/g)];
const mpNames = [...mpContent.matchAll(/name:\s*['"]([^'"]+)['"]/g)];
const houseMatches = [...mpContent.matchAll(/house:\s*['"]([^'"]+)['"]/g)].map(m => m[1]);

console.log(`\nmp-profiles.ts:`);
console.log(`Total IDs: ${mpIdMatches.length}`);
console.log(`Total Names: ${mpNames.length}`);
console.log(`Houses count: ${houseMatches.length}`);
const houseFreq = {};
for (const h of houseMatches) {
  houseFreq[h] = (houseFreq[h] || 0) + 1;
}
console.log('House breakdown:', houseFreq);

fs.writeFileSync(
  path.join(REPO_ROOT, 'reports', 'forensic_constituency_seed_counts.json'),
  JSON.stringify({ totalConstInSeeds, totalMlaNamesInSeeds, constSummary, houseFreq }, null, 2)
);
