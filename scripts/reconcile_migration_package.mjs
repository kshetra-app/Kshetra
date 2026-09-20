import fs from 'node:fs';
import crypto from 'node:crypto';

// Reconciled lineage: 
// Parent commit: 966b992b5c7e12118d9cb0565968eb6386f51470
// Current commit before remediation: c17e78d3ce360a1cd08e2f476220899db5b10cce
const LINEAGE_PARENT = '966b992b5c7e12118d9cb0565968eb6386f51470';
const LINEAGE_C17E78D = 'c17e78d3ce360a1cd08e2f476220899db5b10cce';

const f35Path = 'supabase/migrations/035_campaign_recharge_orders.sql';
const f36Path = 'supabase/migrations/036_foundation_and_grants_repair.sql';
const f37Path = 'supabase/migrations/037_page_pro_orders.sql';
const pkgPath = 'supabase/staging_migration_package_035_037.sql';
const verifyPath = 'supabase/verify_staging_migration_package_035_037.sql';

const f35 = fs.readFileSync(f35Path);
const f36 = fs.readFileSync(f36Path);
const f37 = fs.readFileSync(f37Path);
const verify = fs.readFileSync(verifyPath);

const countBOM = (buf) => (buf.toString('utf-8').match(/\uFEFF/g) || []).length;

// Assert that none of the source files contain BOM
if (countBOM(f35) !== 0 || countBOM(f36) !== 0 || countBOM(f37) !== 0) {
  console.error('ERROR: U+FEFF detected in authoritative migration files!');
  process.exit(1);
}

const headerStr = `-- ==============================================================================
-- W009-B5-R3A-R4: STAGING DETERMINISTIC MIGRATION APPLICATION PACKAGE (035 -> 037)
-- Remediation: Authoritative Migration 035 UTF-8 BOM (U+FEFF) Defect Eliminated
-- Target Supabase Project: panIN-staging (fkpigozcqnmcvofuksar)
-- Order: 035_campaign_recharge_orders.sql -> 036_foundation_and_grants_repair.sql -> 037_page_pro_orders.sql
-- Invariant: Migration bodies are 100% byte-for-byte exact matches of corrected sources.
-- Transaction: Atomic (all 3 migrations apply together or rollback).
-- Zero BOM Guarantee: Exactly 0 U+FEFF characters across the entire file.
-- ==============================================================================

BEGIN;

`;

const footerStr = `COMMIT;
`;

const header = Buffer.from(headerStr, 'utf-8');
const footer = Buffer.from(footerStr, 'utf-8');

const pkg = Buffer.concat([header, f35, f36, f37, footer]);
fs.writeFileSync(pkgPath, pkg);

const start35 = header.length;
const end35 = start35 + f35.length;
const start36 = end35;
const end36 = start36 + f36.length;
const start37 = end36;
const end37 = start37 + f37.length;

const readPkg = fs.readFileSync(pkgPath);
const s35 = readPkg.subarray(start35, end35);
const s36 = readPkg.subarray(start36, end36);
const s37 = readPkg.subarray(start37, end37);

const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const gitBlob = (buf) => crypto.createHash('sha1').update(`blob ${buf.length}\0`).update(buf).digest('hex');

const table = [
  {
    file: '035_campaign_recharge_orders.sql',
    gitBlobSha: gitBlob(f35),
    sha256: sha256(f35),
    byteLength: f35.length,
    packageByteRange: `[${start35}, ${end35})`,
    uFeffCount: countBOM(f35),
    exactMatch: s35.equals(f35) ? 'YES' : 'NO',
  },
  {
    file: '036_foundation_and_grants_repair.sql',
    gitBlobSha: gitBlob(f36),
    sha256: sha256(f36),
    byteLength: f36.length,
    packageByteRange: `[${start36}, ${end36})`,
    uFeffCount: countBOM(f36),
    exactMatch: s36.equals(f36) ? 'YES' : 'NO',
  },
  {
    file: '037_page_pro_orders.sql',
    gitBlobSha: gitBlob(f37),
    sha256: sha256(f37),
    byteLength: f37.length,
    packageByteRange: `[${start37}, ${end37})`,
    uFeffCount: countBOM(f37),
    exactMatch: s37.equals(f37) ? 'YES' : 'NO',
  },
  {
    file: 'staging_migration_package_035_037.sql',
    gitBlobSha: gitBlob(readPkg),
    sha256: sha256(readPkg),
    byteLength: readPkg.length,
    packageByteRange: `[0, ${readPkg.length})`,
    uFeffCount: countBOM(readPkg),
    exactMatch: 'N/A (PACKAGE)',
  },
  {
    file: 'verify_staging_migration_package_035_037.sql',
    gitBlobSha: gitBlob(verify),
    sha256: sha256(verify),
    byteLength: verify.length,
    packageByteRange: 'N/A (VERIFICATION SUITE)',
    uFeffCount: countBOM(verify),
    exactMatch: 'N/A (SUITE)',
  },
];

console.table(table);

const pkgStr = readPkg.toString('utf-8');
const hasBegin = pkgStr.startsWith('-- ==============================================================================\n-- W009-B5-R3A-R4: STAGING DETERMINISTIC MIGRATION APPLICATION PACKAGE (035 -> 037)') && pkgStr.includes('\nBEGIN;\n');
const hasCommit = pkgStr.trimEnd().endsWith('\nCOMMIT;');
const contiguity = (start36 === end35) && (start37 === end36);
const uFeffTotal = countBOM(readPkg);
let mismatchCount = 0;
if (!s35.equals(f35)) mismatchCount++;
if (!s36.equals(f36)) mismatchCount++;
if (!s37.equals(f37)) mismatchCount++;

console.log('--- PACKAGE INTEGRITY AUDIT ---');
console.log('Order: 035 -> 036 -> 037');
console.log('Contiguity Verified:', contiguity ? 'YES' : 'NO');
console.log('BEGIN Presence:', hasBegin ? 'YES' : 'NO');
console.log('COMMIT Presence:', hasCommit ? 'YES' : 'NO');
console.log('U+FEFF Count in Package:', uFeffTotal);
console.log('Body Mismatch Count:', mismatchCount);
console.log('Audit Result:', (mismatchCount === 0 && uFeffTotal === 0 && contiguity && hasBegin && hasCommit) ? '100% RECONCILED' : 'FAILED');

if (mismatchCount > 0 || uFeffTotal > 0 || !contiguity) {
  process.exit(1);
}
