import fs from 'node:fs';
import path from 'node:path';

const REPO_ROOT = process.cwd();

const sql059 = fs.readFileSync(path.join(REPO_ROOT, 'supabase', 'migrations', '059_canonical_national_constituency_registry.sql'), 'utf8');
const sql061 = fs.readFileSync(path.join(REPO_ROOT, 'supabase', 'migrations', '061_canonical_national_ac_pc_mappings.sql'), 'utf8');
const sql062 = fs.readFileSync(path.join(REPO_ROOT, 'supabase', 'migrations', '062_canonical_assam_2023_delimitation.sql'), 'utf8');

// Parse ACs from 059
const ac059Matches = [...sql059.matchAll(/\('[^']+',\s*'([A-Z]{2}-AC-\d{3})',\s*(\d+),\s*'([^']+)',\s*'([A-Z]{2})',\s*'[^']*',\s*'(GEN|SC|ST)'/g)];

const acMap = new Map();
for (const m of ac059Matches) {
  acMap.set(m[1], {
    code: m[1],
    acNo: parseInt(m[2], 10),
    name: m[3],
    state: m[4],
    reservation: m[5],
    regime: m[4] === 'JK' ? 'jk_delimitation_2022' : 'eci_delimitation_2008'
  });
}

// In 062: Assam update
const ac062Matches = [...sql062.matchAll(/\('([A-Z]{2}-AC-\d{3})',\s*(\d+),\s*'([^']+)',\s*'[^']+',\s*'(GEN|SC|ST)'\)/g)];
for (const m of ac062Matches) {
  acMap.set(m[1], {
    code: m[1],
    acNo: parseInt(m[2], 10),
    name: m[3],
    state: 'AS',
    reservation: m[4],
    regime: 'eci_delimitation_2023_as'
  });
}

const acResCounts = { GEN: 0, SC: 0, ST: 0 };
const acRegimeCounts = {};
const acStateCounts = {};

for (const ac of acMap.values()) {
  acResCounts[ac.reservation] = (acResCounts[ac.reservation] || 0) + 1;
  acRegimeCounts[ac.regime] = (acRegimeCounts[ac.regime] || 0) + 1;
  acStateCounts[ac.state] = (acStateCounts[ac.state] || 0) + 1;
}

// Parse PCs from 059
const pc059Matches = [...sql059.matchAll(/\('([A-Z]{2}-PC-\d{2})',\s*'([A-Z]{2})',\s*'parliamentary_constituency',\s*(\d+),\s*'([^']+)',\s*'(general|sc|st)'/gi)];

const pcMap = new Map();
for (const m of pc059Matches) {
  const reservation = m[5].toUpperCase() === 'GENERAL' ? 'GEN' : m[5].toUpperCase();
  let regime = 'eci_delimitation_2008';
  if (m[2] === 'JK') regime = 'jk_delimitation_2022';
  if (m[2] === 'AS') regime = 'eci_delimitation_2023_as';
  pcMap.set(m[1], {
    code: m[1],
    state: m[2],
    pcNo: parseInt(m[3], 10),
    name: m[4],
    reservation,
    regime
  });
}

const pcResCounts = { GEN: 0, SC: 0, ST: 0 };
const pcRegimeCounts = {};
const pcStateCounts = {};

for (const pc of pcMap.values()) {
  pcResCounts[pc.reservation] = (pcResCounts[pc.reservation] || 0) + 1;
  pcRegimeCounts[pc.regime] = (pcRegimeCounts[pc.regime] || 0) + 1;
  pcStateCounts[pc.state] = (pcStateCounts[pc.state] || 0) + 1;
}

// Parse AC->PC mappings from 061
// Pattern: ('AP-AC-001', 'AP-PC-21',
const m061Matches = [...sql061.matchAll(/\('([A-Z]{2}-AC-\d{3})',\s*'([A-Z]{2}-PC-\d{2})'/g)];
console.log(`Parsed ${m061Matches.length} AC->PC mappings from Migration 061`);

const mappingMap = new Map();
for (const m of m061Matches) {
  mappingMap.set(m[1], { acCode: m[1], pcCode: m[2] });
}

// In 062: Assam update
const m062Matches = [...sql062.matchAll(/\('([A-Z]{2}-AC-\d{3})',\s*'([A-Z]{2}-PC-\d{2})'/g)];
console.log(`Parsed ${m062Matches.length} updated AC->PC mappings from Migration 062`);
for (const m of m062Matches) {
  mappingMap.set(m[1], { acCode: m[1], pcCode: m[2] });
}

console.log(`\n======================================================`);
console.log(`NATIONAL ELECTORAL GEOGRAPHY MATHEMATICAL PROOF`);
console.log(`======================================================`);
console.log(`Total Canonical ACs: ${acMap.size} (Target: 4,123) -> ${acMap.size === 4123 ? 'PASS' : 'FAIL'}`);
console.log(`Total Canonical PCs: ${pcMap.size} (Target: 543) -> ${pcMap.size === 543 ? 'PASS' : 'FAIL'}`);
console.log(`Total Active AC->PC Mappings: ${mappingMap.size} (Target: 4,123) -> ${mappingMap.size === 4123 ? 'PASS' : 'FAIL'}`);
console.log(`AC Reservation Breakdown: GEN=${acResCounts.GEN}, SC=${acResCounts.SC}, ST=${acResCounts.ST} (Sum = ${acResCounts.GEN + acResCounts.SC + acResCounts.ST})`);
console.log(`PC Reservation Breakdown: GEN=${pcResCounts.GEN}, SC=${pcResCounts.SC}, ST=${pcResCounts.ST} (Sum = ${pcResCounts.GEN + pcResCounts.SC + pcResCounts.ST})`);
console.log(`AC Delimitation Regimes:`, acRegimeCounts);
console.log(`PC Delimitation Regimes:`, pcRegimeCounts);

fs.writeFileSync(
  path.join(REPO_ROOT, 'reports', 'forensic_national_geography_math.json'),
  JSON.stringify({
    totalAcs: acMap.size,
    acResCounts,
    acRegimeCounts,
    acStateCounts,
    totalPcs: pcMap.size,
    pcResCounts,
    pcRegimeCounts,
    pcStateCounts,
    totalMappings: mappingMap.size
  }, null, 2)
);
