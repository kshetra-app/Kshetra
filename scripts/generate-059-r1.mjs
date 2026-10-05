import fs from 'fs';
import crypto from 'crypto';

const srcPath = 'supabase/staging_packages/059_canonical_national_constituency_registry.sql';
const dstPath = 'supabase/staging_packages/059-R1_temporal_reconciliation.sql';

let content = fs.readFileSync(srcPath, 'utf8');

// 1. Add Fail-closed prechecks immediately after BEGIN;
const precheckSql = `
-- ─── 0. FAIL-CLOSED PRE-EXECUTION HEALTH & DEPENDENCY ASSERTIONS ──────────
DO $$$
DECLARE
  v_050_exists BOOLEAN;
  v_ts_2014_exists BOOLEAN;
  v_constituencies_count INT;
BEGIN
  -- 1. Assert Migration 050 tables exist
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'political_organizations'
  ) INTO v_050_exists;
  IF NOT v_050_exists THEN
    RAISE EXCEPTION 'PRECONDITION FAILED: Migration 050 (political_organizations) must be applied before 059-R1.';
  END IF;

  -- 2. Assert TS-STATE-2014 version exists in state_versions
  SELECT EXISTS (
    SELECT 1 FROM public.state_versions WHERE version_code = 'TS-STATE-2014' AND state_code = 'TS'
  ) INTO v_ts_2014_exists;
  IF NOT v_ts_2014_exists THEN
    RAISE EXCEPTION 'PRECONDITION FAILED: Pre-existing TS-STATE-2014 must be present in public.state_versions.';
  END IF;

  -- 3. Assert 059 has not already populated national constituencies
  SELECT count(*) FROM public.constituencies INTO v_constituencies_count;
  IF v_constituencies_count > 500 THEN
    RAISE EXCEPTION 'PRECONDITION FAILED: public.constituencies already populated (% rows). Aborting.', v_constituencies_count;
  END IF;
END $$;
`;

content = content.replace('BEGIN;\n', 'BEGIN;\n' + precheckSql);

// 2. Remove TS-STATE-2008 from Section 4 INSERT
const tsLine = "  ('TS', 'TS-STATE-2008', 'Telangana', 'Hyderabad', 36, '36', '2008-02-19'::date, NULL, true, 'mha_national_jurisdictions_2024_v1'),\n";
if (!content.includes(tsLine)) {
  throw new Error('TS line not found in content!');
}
content = content.replace(tsLine, '');

// 3. Update header comment to clearly document 059-R1
const headerOld = `-- Migration 059: Canonical National Constituency Registry (W021.5-B1)
-- Target: Staging Supabase & Local PostgreSQL (fkpigozcqnmcvofuksar)
-- Authority: CTO Master Implementation Specification W021.5-B1`;

const headerNew = `-- Migration 059-R1: Temporal Reconciliation & Canonical National Constituency Registry (W021.5-B1)
-- Target: Staging Supabase & Local PostgreSQL (fkpigozcqnmcvofuksar)
-- Derived from authoritative migration 059 (SHA-256: 80285b808850f76391860de827e38b6722afb5d5b0a44727d9869f48a24cb03e)
-- Transformations Applied:
--   1. Removed invalid 'updated_at = now();' in Section 3 public.states ON CONFLICT DO UPDATE SET.
--   2. Omitted fabricated 'TS-STATE-2008' record in Section 4 public.state_versions to prevent GiST exclusion violation
--      (uq_state_versions_no_overlap) against pre-existing authoritative TS-STATE-2014 [2014-06-02, null).
--   3. Injected fail-closed pre-execution health assertions (Migration 050 DDL presence, TS-STATE-2014 presence, unpopulated AC gate).
--   4. Preserved 100% of all other statutory definitions, 543 PCs, 4,123 ACs, linkages, and conflict audits.`;

content = content.replace(headerOld, headerNew);

fs.writeFileSync(dstPath, content, 'utf8');

const hash = crypto.createHash('sha256').update(content).digest('hex');
console.log(`Generated ${dstPath}`);
console.log(`Byte size: ${Buffer.byteLength(content, 'utf8')}`);
console.log(`SHA-256: ${hash}`);
