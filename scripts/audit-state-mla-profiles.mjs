import fs from 'node:fs';
import path from 'node:path';

const REPO_ROOT = process.cwd();
const seedDir = path.join(REPO_ROOT, 'data', 'seed');

// Load STATES constants to know canonical AC counts
const statesTs = fs.readFileSync(path.join(REPO_ROOT, 'packages', 'shared', 'src', 'constants', 'states.ts'), 'utf8');

// Map of stateCode -> { name, assemblySeats, parliamentarySeats }
const stateMeta = {
  AP: { name: 'Andhra Pradesh', ac: 175, pc: 25, seedFile: 'andhra-pradesh-mla-profiles.ts' },
  AR: { name: 'Arunachal Pradesh', ac: 60, pc: 2, seedFile: 'arunachal-pradesh-mla-profiles.ts' },
  AS: { name: 'Assam', ac: 126, pc: 14, seedFile: 'assam-mla-profiles.ts' },
  BR: { name: 'Bihar', ac: 243, pc: 40, seedFile: 'bihar-mla-profiles.ts' },
  CG: { name: 'Chhattisgarh', ac: 90, pc: 11, seedFile: 'chhattisgarh-mla-profiles.ts' },
  GA: { name: 'Goa', ac: 40, pc: 2, seedFile: 'goa-mla-profiles.ts' },
  GJ: { name: 'Gujarat', ac: 182, pc: 26, seedFile: 'gujarat-mla-profiles.ts' },
  HR: { name: 'Haryana', ac: 90, pc: 10, seedFile: 'haryana-mla-profiles.ts' },
  HP: { name: 'Himachal Pradesh', ac: 68, pc: 4, seedFile: 'himachal-pradesh-mla-profiles.ts' },
  JH: { name: 'Jharkhand', ac: 81, pc: 14, seedFile: 'jharkhand-mla-profiles.ts' },
  KA: { name: 'Karnataka', ac: 224, pc: 28, seedFile: 'karnataka-mla-profiles.ts' },
  KL: { name: 'Kerala', ac: 140, pc: 20, seedFile: 'kerala-mla-profiles.ts' },
  MP: { name: 'Madhya Pradesh', ac: 230, pc: 29, seedFile: 'madhya-pradesh-mla-profiles.ts' },
  MH: { name: 'Maharashtra', ac: 288, pc: 48, seedFile: 'maharashtra-mla-profiles.ts' },
  MN: { name: 'Manipur', ac: 60, pc: 2, seedFile: 'manipur-mla-profiles.ts' },
  ML: { name: 'Meghalaya', ac: 60, pc: 2, seedFile: 'meghalaya-mla-profiles.ts' },
  MZ: { name: 'Mizoram', ac: 40, pc: 1, seedFile: 'mizoram-mla-profiles.ts' },
  NL: { name: 'Nagaland', ac: 60, pc: 1, seedFile: 'nagaland-mla-profiles.ts' },
  OD: { name: 'Odisha', ac: 147, pc: 21, seedFile: 'odisha-mla-profiles.ts' },
  PB: { name: 'Punjab', ac: 117, pc: 13, seedFile: 'punjab-mla-profiles.ts' },
  RJ: { name: 'Rajasthan', ac: 200, pc: 25, seedFile: 'rajasthan-mla-profiles.ts' },
  SK: { name: 'Sikkim', ac: 32, pc: 1, seedFile: 'sikkim-mla-profiles.ts' },
  TN: { name: 'Tamil Nadu', ac: 234, pc: 39, seedFile: 'tamil-nadu-mla-profiles.ts' },
  TS: { name: 'Telangana', ac: 119, pc: 17, seedFile: 'telangana-mla-profiles.ts' },
  TR: { name: 'Tripura', ac: 60, pc: 2, seedFile: 'tripura-mla-profiles.ts' },
  UP: { name: 'Uttar Pradesh', ac: 403, pc: 80, seedFile: 'uttar-pradesh-mla-profiles.ts' },
  UK: { name: 'Uttarakhand', ac: 70, pc: 5, seedFile: 'uttarakhand-mla-profiles.ts' },
  WB: { name: 'West Bengal', ac: 294, pc: 42, seedFile: 'west-bengal-mla-profiles.ts' },
  DL: { name: 'Delhi', ac: 70, pc: 7, seedFile: 'delhi-mla-profiles.ts' },
  JK: { name: 'Jammu & Kashmir', ac: 90, pc: 5, seedFile: 'jammu-kashmir-mla-profiles.ts' },
  PY: { name: 'Puducherry', ac: 30, pc: 1, seedFile: 'puducherry-mla-profiles.ts' },
  // UTs without Assembly
  AN: { name: 'Andaman & Nicobar Islands', ac: 0, pc: 1 },
  CH: { name: 'Chandigarh', ac: 0, pc: 1 },
  DN: { name: 'Dadra & Nagar Haveli and Daman & Diu', ac: 0, pc: 2 },
  LA: { name: 'Ladakh', ac: 0, pc: 1 },
  LD: { name: 'Lakshadweep', ac: 0, pc: 1 },
};

// Check sums of canonical ACs and PCs
let sumAcs = 0;
let sumPcs = 0;
for (const [code, meta] of Object.entries(stateMeta)) {
  sumAcs += meta.ac;
  sumPcs += meta.pc;
}
console.log(`SUM ACs: ${sumAcs} (Expect 4,123)`);
console.log(`SUM PCs: ${sumPcs} (Expect 543)`);

// Detailed inspection of each MLA seed file
const stateAuditResults = [];

for (const [code, meta] of Object.entries(stateMeta)) {
  if (meta.ac === 0) continue; // Skip UTs without assembly

  const filePath = path.join(seedDir, meta.seedFile);
  if (!fs.existsSync(filePath)) {
    stateAuditResults.push({
      code,
      name: meta.name,
      statutoryAcCount: meta.ac,
      profileCount: 0,
      diff: -meta.ac,
      missingAcs: [],
      duplicateAcs: [],
      status: 'FILE_MISSING'
    });
    continue;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  
  // Extract all acNos
  // Matches { acNo: 1, ... or acNo: 1
  const acMatches = [...content.matchAll(/\bacNo:\s*(\d+)/g)].map(m => parseInt(m[1], 10));
  
  // Count frequency of each acNo
  const freq = {};
  for (const ac of acMatches) {
    freq[ac] = (freq[ac] || 0) + 1;
  }

  const duplicates = [];
  for (const [ac, count] of Object.entries(freq)) {
    if (count > 1) {
      duplicates.push({ acNo: parseInt(ac, 10), count });
    }
  }

  const missing = [];
  for (let i = 1; i <= meta.ac; i++) {
    if (!freq[i]) {
      missing.push(i);
    }
  }

  // Also check if any acNo is outside 1..meta.ac
  const outOfRange = [];
  for (const ac of acMatches) {
    if (ac < 1 || ac > meta.ac) {
      outOfRange.push(ac);
    }
  }

  stateAuditResults.push({
    code,
    name: meta.name,
    statutoryAcCount: meta.ac,
    profileCount: acMatches.length,
    diff: acMatches.length - meta.ac,
    uniqueAcsCovered: Object.keys(freq).length,
    missingCount: missing.length,
    duplicateCount: duplicates.length,
    outOfRangeCount: outOfRange.length,
    missingAcs: missing.slice(0, 10),
    duplicateAcs: duplicates,
    outOfRangeAcs: outOfRange,
  });
}

console.log('\nState MLA Profile Audit vs Statutory ACs:');
console.log('Code | Name | Statutory ACs | Profiles | Diff | Unique Covered | Missing | Dups');
console.log('---|---|---|---|---|---|---|---');
let totalProfiles = 0;
for (const s of stateAuditResults) {
  console.log(`${s.code} | ${s.name.padEnd(18)} | ${String(s.statutoryAcCount).padStart(3)} | ${String(s.profileCount).padStart(4)} | ${String(s.diff).padStart(4)} | ${String(s.uniqueAcsCovered).padStart(4)} | ${String(s.missingCount).padStart(3)} | ${String(s.duplicateCount).padStart(3)}`);
  totalProfiles += s.profileCount;
}
console.log(`\nTOTAL PROFILES: ${totalProfiles} across all 31 states`);

fs.writeFileSync(
  path.join(REPO_ROOT, 'reports', 'forensic_state_mla_reconciliation.json'),
  JSON.stringify({ sumAcs, sumPcs, totalProfiles, stateAuditResults }, null, 2)
);
