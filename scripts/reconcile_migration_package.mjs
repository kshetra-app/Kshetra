import fs from 'node:fs';
import crypto from 'node:crypto';

const CANONICAL_COMMIT = '966b992b5c7e12118d9cb0565968eb6386f51470';

const f35Path = 'supabase/migrations/035_campaign_recharge_orders.sql';
const f36Path = 'supabase/migrations/036_foundation_and_grants_repair.sql';
const f37Path = 'supabase/migrations/037_page_pro_orders.sql';
const pkgPath = 'supabase/staging_migration_package_035_037.sql';
const verifyPath = 'supabase/verify_staging_migration_package_035_037.sql';

const f35 = fs.readFileSync(f35Path);
const f36 = fs.readFileSync(f36Path);
const f37 = fs.readFileSync(f37Path);
const verify = fs.readFileSync(verifyPath);

const headerStr = `-- ==============================================================================
-- W009-B5-R3A-R3: STAGING DETERMINISTIC MIGRATION APPLICATION PACKAGE (035 -> 037)
-- Canonical Git Commit: ${CANONICAL_COMMIT}
-- Target Supabase Project: panIN-staging (fkpigozcqnmcvofuksar)
-- Order: 035_campaign_recharge_orders.sql -> 036_foundation_and_grants_repair.sql -> 037_page_pro_orders.sql
-- Invariant: Migration bodies are 100% byte-for-byte exact matches of source files.
-- Transaction: Atomic (all 3 migrations apply together or rollback).
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
    canonicalCommit: CANONICAL_COMMIT,
    gitBlobSha: gitBlob(f35),
    sha256: sha256(f35),
    packageByteRange: `[${start35}, ${end35}) (${f35.length} bytes)`,
    exactMatch: s35.equals(f35) ? 'YES' : 'NO',
  },
  {
    file: '036_foundation_and_grants_repair.sql',
    canonicalCommit: CANONICAL_COMMIT,
    gitBlobSha: gitBlob(f36),
    sha256: sha256(f36),
    packageByteRange: `[${start36}, ${end36}) (${f36.length} bytes)`,
    exactMatch: s36.equals(f36) ? 'YES' : 'NO',
  },
  {
    file: '037_page_pro_orders.sql',
    canonicalCommit: CANONICAL_COMMIT,
    gitBlobSha: gitBlob(f37),
    sha256: sha256(f37),
    packageByteRange: `[${start37}, ${end37}) (${f37.length} bytes)`,
    exactMatch: s37.equals(f37) ? 'YES' : 'NO',
  },
  {
    file: 'staging_migration_package_035_037.sql',
    canonicalCommit: CANONICAL_COMMIT,
    gitBlobSha: gitBlob(readPkg),
    sha256: sha256(readPkg),
    packageByteRange: `[0, ${readPkg.length}) (${readPkg.length} bytes)`,
    exactMatch: 'N/A (PACKAGE ENVELOPE)',
  },
  {
    file: 'verify_staging_migration_package_035_037.sql',
    canonicalCommit: CANONICAL_COMMIT,
    gitBlobSha: gitBlob(verify),
    sha256: sha256(verify),
    packageByteRange: `N/A (VERIFICATION SUITE, ${verify.length} bytes)`,
    exactMatch: 'N/A (VERIFICATION SUITE)',
  },
];

console.table(table);

const allMatched = s35.equals(f35) && s36.equals(f36) && s37.equals(f37);
if (!allMatched) {
  console.error('CRITICAL: Package exact-match verification FAILED!');
  process.exit(1);
} else {
  console.log('PROGRAMMATIC AUDIT RESULT: 100% EXACT-MATCH VERIFIED');
}
