import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = process.cwd();
const seedDir = path.join(REPO_ROOT, 'data', 'seed');

// 1. Audit all 31 MLA files
const mlaFiles = fs.readdirSync(seedDir).filter(f => f.endsWith('-mla-profiles.ts'));
console.log(`Auditing ${mlaFiles.length} MLA profile files...\n`);

const stateMlaStats = [];
let totalMlaRecords = 0;

for (const file of mlaFiles) {
  const content = fs.readFileSync(path.join(seedDir, file), 'utf8');
  // Extract array name
  const arrayMatch = content.match(/export const ([A-Z_]+_MLA_PROFILES): LegislatorProfile\[\] = \[/);
  const arrayName = arrayMatch ? arrayMatch[1] : 'UNKNOWN';

  // Count records by finding { id: '...'
  const idMatches = [...content.matchAll(/id:\s*['"]([^'"]+)['"]/g)].map(m => m[1]);
  const constMatches = [...content.matchAll(/constituency:\s*['"]([^'"]+)['"]/g)].map(m => m[1]);

  stateMlaStats.push({
    file,
    arrayName,
    count: idMatches.length,
    ids: idMatches,
    constituencies: constMatches,
  });
  totalMlaRecords += idMatches.length;
}

console.log('State MLA Record Counts:');
for (const s of stateMlaStats) {
  console.log(`- ${s.file.padEnd(35)} : ${String(s.count).padStart(4)} profiles`);
}
console.log(`\nTotal World-A MLA Profiles: ${totalMlaRecords}\n`);

// 2. Audit mp-profiles.ts
const mpPath = path.join(seedDir, 'mp-profiles.ts');
let mpRecords = 0;
let lsRecords = 0;
let rsRecords = 0;
if (fs.existsSync(mpPath)) {
  const mpContent = fs.readFileSync(mpPath, 'utf8');
  const mpMatches = [...mpContent.matchAll(/id:\s*['"]([^'"]+)['"]/g)].map(m => m[1]);
  mpRecords = mpMatches.length;

  const houseMatches = [...mpContent.matchAll(/house:\s*['"]([^'"]+)['"]/g)].map(m => m[1]);
  lsRecords = houseMatches.filter(h => h.includes('Lok') || h === 'LOK_SABHA').length;
  rsRecords = houseMatches.filter(h => h.includes('Rajya') || h === 'RAJYA_SABHA').length;

  console.log(`mp-profiles.ts: ${mpRecords} total profiles`);
  console.log(`  - Lok Sabha: ${lsRecords}`);
  console.log(`  - Rajya Sabha: ${rsRecords}`);
  console.log(`  - Other / Unspecified: ${mpRecords - (lsRecords + rsRecords)}`);
}

// Write json summary
fs.writeFileSync(
  path.join(REPO_ROOT, 'reports', 'forensic_seed_counts.json'),
  JSON.stringify({ totalMlaRecords, stateMlaStats, mpRecords, lsRecords, rsRecords }, null, 2)
);
console.log('\nReport written to reports/forensic_seed_counts.json');
