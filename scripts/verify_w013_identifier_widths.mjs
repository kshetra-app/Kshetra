/**
 * verify_w013_identifier_widths.mjs
 * Authoritative Preflight / Static Assertion Suite for W013 Schema Column Widths
 *
 * Mandate: CTO Directive W013 — Requirement 12
 * Purpose: Deterministically prove that 100% of W013 canonical seed identifiers
 *          strictly fit within their schema-defined column widths prior to staging submission.
 */

import fs from 'node:fs';
import path from 'node:path';

const sqlPath = path.resolve('supabase/staging_migration_package_040.sql');
if (!fs.existsSync(sqlPath)) {
  console.error(`FATAL: File not found: ${sqlPath}`);
  process.exit(1);
}

const sql = fs.readFileSync(sqlPath, 'utf8');

console.log('================================================================');
console.log('W013: CANONICAL GEOGRAPHY IDENTIFIER-WIDTH STATIC AUDIT');
console.log(`Package Target: ${sqlPath}`);
console.log(`Timestamp: ${new Date().toISOString()}`);
console.log('================================================================\n');

// 1. Extract Schema Column Widths from DDL
function extractVarcharWidth(tableRegex, colName) {
  const tableBlockMatch = sql.match(tableRegex);
  if (!tableBlockMatch) {
    throw new Error(`Failed to find table definition matching: ${tableRegex}`);
  }
  const colRegex = new RegExp(`${colName}\\s+VARCHAR\\((\\d+)\\)`, 'i');
  const colMatch = tableBlockMatch[0].match(colRegex);
  if (!colMatch) {
    throw new Error(`Failed to find column ${colName} VARCHAR definition in table block`);
  }
  return parseInt(colMatch[1], 10);
}

const schemaWidths = {
  'districts.code': extractVarcharWidth(/CREATE TABLE IF NOT EXISTS public\.districts \([\s\S]+?\);/, 'code'),
  'districts.entity_type': extractVarcharWidth(/CREATE TABLE IF NOT EXISTS public\.districts \([\s\S]+?\);/, 'entity_type'),
  'parliamentary_constituencies.code': extractVarcharWidth(/CREATE TABLE IF NOT EXISTS public\.parliamentary_constituencies \([\s\S]+?\);/, 'code'),
  'parliamentary_constituencies.entity_type': extractVarcharWidth(/CREATE TABLE IF NOT EXISTS public\.parliamentary_constituencies \([\s\S]+?\);/, 'entity_type'),
  'constituencies.canonical_code': extractVarcharWidth(/ALTER TABLE public\.constituencies[\s\S]+?;/, 'canonical_code'),
  'constituencies.entity_type': extractVarcharWidth(/ALTER TABLE public\.constituencies[\s\S]+?;/, 'entity_type')
};

console.log('Extracted Schema Definitions:');
for (const [col, width] of Object.entries(schemaWidths)) {
  console.log(`  • ${col}: VARCHAR(${width})`);
}
console.log('');

// 2. Parse Districts Seed Tuples
// ('TS-DIST-ADILABAD', 'TS', 'district', 'Adilabad', 'ts_districts_2016_v1')
const districtInsertRegex = /INSERT INTO public\.districts \([^\)]+\)\s+VALUES\s+([\s\S]+?)\s+ON CONFLICT/i;
const distMatch = sql.match(districtInsertRegex);
if (!distMatch) throw new Error('Failed to find districts INSERT statement');

const distRowRegex = /\('([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']+)'\)/g;
let m;
const districtRecords = [];
while ((m = distRowRegex.exec(distMatch[1])) !== null) {
  districtRecords.push({ code: m[1], state_code: m[2], entity_type: m[3], name: m[4], version: m[5] });
}

// 3. Parse Parliamentary Constituencies Seed Tuples
// ('TS-PC-01', 'TS', 'parliamentary_constituency', 1, 'Adilabad', 'st', 'eci_ts_pc_2008_v1')
const pcInsertRegex = /INSERT INTO public\.parliamentary_constituencies \([^\)]+\)\s+VALUES\s+([\s\S]+?)\s+ON CONFLICT/i;
const pcMatch = sql.match(pcInsertRegex);
if (!pcMatch) throw new Error('Failed to find parliamentary_constituencies INSERT statement');

const pcRowRegex = /\('([^']+)',\s*'([^']+)',\s*'([^']+)',\s*(\d+),\s*'([^']+)',\s*'([^']+)',\s*'([^']+)'\)/g;
const pcRecords = [];
while ((m = pcRowRegex.exec(pcMatch[1])) !== null) {
  pcRecords.push({ code: m[1], state_code: m[2], entity_type: m[3], pc_num: m[4], name: m[5], reservation: m[6], version: m[7] });
}

// 4. Parse Assembly Constituencies Seed Tuples
// ( 'TS-AC-1', 1, 'Sirpur', '...', 'TS-AC-001', 'assembly_constituency', ... )
const acInsertRegex = /INSERT INTO public\.constituencies \([^\)]+\)\s+VALUES\s+([\s\S]+?)\s+ON CONFLICT/i;
const acMatch = sql.match(acInsertRegex);
if (!acMatch) throw new Error('Failed to find constituencies INSERT statement');

const acRowRegex = /\(\s*'([^']+)',\s*(\d+),\s*'([^']+)',\s*'([^']*)',\s*'([^']+)',\s*'([^']+)'/g;
const acRecords = [];
while ((m = acRowRegex.exec(acMatch[1])) !== null) {
  acRecords.push({ legacy_id: m[1], ac_no: m[2], name: m[3], name_te: m[4], canonical_code: m[5], entity_type: m[6] });
}

console.log(`Parsed Seed Records:`);
console.log(`  • Districts: ${districtRecords.length} rows`);
console.log(`  • Parliamentary Constituencies: ${pcRecords.length} rows`);
console.log(`  • Assembly Constituencies: ${acRecords.length} rows\n`);

// 5. Verification Assertions
let failureCount = 0;
const auditResults = [];

function auditColumn(colName, schemaWidth, values) {
  let maxLen = 0;
  let longestVal = '';
  let colFailures = 0;

  for (const v of values) {
    const len = v.length;
    if (len > maxLen) {
      maxLen = len;
      longestVal = v;
    }
    if (len > schemaWidth) {
      colFailures++;
      failureCount++;
      console.error(`❌ VIOLATION in ${colName}: value '${v}' has length ${len} > VARCHAR(${schemaWidth})`);
    }
  }

  const margin = schemaWidth - maxLen;
  const status = colFailures === 0 ? 'PASS' : 'FAIL';
  auditResults.push({
    column: colName,
    schemaWidth: `VARCHAR(${schemaWidth})`,
    maxLen,
    longestVal,
    margin,
    status
  });
}

auditColumn('districts.code', schemaWidths['districts.code'], districtRecords.map(d => d.code));
auditColumn('districts.entity_type', schemaWidths['districts.entity_type'], districtRecords.map(d => d.entity_type));
auditColumn('parliamentary_constituencies.code', schemaWidths['parliamentary_constituencies.code'], pcRecords.map(p => p.code));
auditColumn('parliamentary_constituencies.entity_type', schemaWidths['parliamentary_constituencies.entity_type'], pcRecords.map(p => p.entity_type));
auditColumn('constituencies.canonical_code', schemaWidths['constituencies.canonical_code'], acRecords.map(a => a.canonical_code));
auditColumn('constituencies.entity_type', schemaWidths['constituencies.entity_type'], acRecords.map(a => a.entity_type));

// 6. Explicit check on TS-DIST-JAYASHANKAR-BHUPALPALLY
const bhupalpally = districtRecords.find(d => d.code === 'TS-DIST-JAYASHANKAR-BHUPALPALLY');
if (!bhupalpally) {
  console.error("❌ CRITICAL: 'TS-DIST-JAYASHANKAR-BHUPALPALLY' is missing from districts seed!");
  failureCount++;
} else {
  console.log(`✅ Confirmed target identifier present: '${bhupalpally.code}' (length: ${bhupalpally.code.length})`);
  if (bhupalpally.code.length > schemaWidths['districts.code']) {
    console.error(`❌ Target identifier exceeds schema width: ${bhupalpally.code.length} > ${schemaWidths['districts.code']}`);
    failureCount++;
  }
}

console.log('\nAudit Summary Table:');
console.table(auditResults);

if (failureCount > 0) {
  console.error(`\n❌ PREFLIGHT FAILED: ${failureCount} identifier width violation(s) detected.`);
  process.exit(1);
} else {
  console.log(`\n✅ PREFLIGHT PASSED: 100% of seed identifiers fit within schema column widths.`);
  process.exit(0);
}
