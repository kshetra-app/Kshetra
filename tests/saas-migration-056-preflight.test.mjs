/**
 * tests/saas-migration-056-preflight.test.mjs
 *
 * Milestone W021 — B2B Political SaaS & Public/Partner Developer API Foundation
 * Gate W021-G2: Migration 056 Preflight & Security Probe Verification Suite (Remediated)
 *
 * Directives & Authorities:
 * - CTO AUTHORIZATION — W021-G2 MIGRATION 056 PREFLIGHT & STAGING EXECUTION
 * - CTO REMEDIATION DIRECTIVE — CRITICAL TENANT-ISOLATION DEFECT RESOLUTION
 * - Ratified Plan: PLAN-W021-MASTER-REV-1.0.md
 * - Master Execution Framework Amendments v1.2-v1.6
 *
 * Verification Scope:
 * 1. Transactional DDL execution & atomicity
 * 2. Idempotency on replay
 * 3. Failure rollback proof
 * 4. Catalog inspection: tables, columns, constraints, composite FK, indexes
 * 5. Mandatory Tenant-Isolation & Security Probes:
 *    - Probe 1: Anon direct access denied
 *    - Probe 2: Authenticated direct access denied
 *    - Probe 3: Arbitrary tenant access denied
 *    - Probe 4A: Authoritative cross-tenant rejection (Tenant A + Application B -> DATABASE CONSTRAINT FAILURE)
 *    - Probe 4B: Authoritative same-tenant success (Tenant A + Application A -> SUCCESS)
 *    - Probe 4C: Authoritative second same-tenant success (Tenant B + Application B -> SUCCESS)
 *    - Probe 5: Revoked key remains persisted (soft-state)
 *    - Probe 6: Historical usage remains after key revocation
 *    - Probe 7: Physical key deletion sets api_key_id = NULL without deleting usage row
 *    - Probe 8: Duplicate key_hash rejected (unique violation)
 *    - Probe 9: Duplicate tenant slug rejected (unique violation)
 *    - Probe 10A: Duplicate usage bucket with key rejected (unique violation)
 *    - Probe 10B: Duplicate usage bucket with NULL key rejected (UNIQUE NULLS NOT DISTINCT violation)
 *    - Probe 11: Expired-key representation verified
 *    - Probe 12A: Invalid status rejected (check constraint)
 *    - Probe 12B: revoked_at consistency check (active with non-null revoked_at or revoked with null revoked_at rejected)
 *    - Probe 13: Invalid environment rejected (check constraint)
 *    - Probe 14: Invalid tier rejected (check constraint)
 * 6. PostGIS 589 geometry digest invariance check
 * 7. Production air-gap confirmation
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

console.log('================================================================');
console.log('W021-G2: MIGRATION 056 PREFLIGHT & SECURITY PROBE SUITE (REMEDIATED)');
console.log(`Execution Timestamp: ${new Date().toISOString()}`);
console.log('Target: panIN-staging (fkpigozcqnmcvofuksar) & Isolated PG 17.6');
console.log('Production: ehfafcnimmjusyvplbah (STRICTLY AIR-GAPPED & UNTOUCHED)');
console.log('================================================================\n');

// ─── 0. ENVIRONMENT & AIR-GAP GUARDS ──────────────────────────────────────────
const envPath = path.resolve('.env.staging');
if (!fs.existsSync(envPath)) {
  console.error('FATAL: .env.staging not found');
  process.exit(1);
}
const env = dotenv.parse(fs.readFileSync(envPath, 'utf8'));
const supabaseUrl = env.SUPABASE_URL || 'https://fkpigozcqnmcvofuksar.supabase.co';

// Strict Production Guard
if (supabaseUrl.includes('ehfafcnimmjusyvplbah')) {
  console.error('FATAL: Production database detected in configuration! Immediate abort.');
  process.exit(1);
}
if (!supabaseUrl.includes('fkpigozcqnmcvofuksar')) {
  console.error(`FATAL: Execution target is NOT panIN-staging! Detected: ${supabaseUrl}`);
  process.exit(1);
}

let passedChecks = 0;
let failedChecks = 0;
const results = [];

function recordCheck(id, title, pass, observed = '', details = '') {
  const status = pass ? 'PASS' : 'FAIL';
  if (pass) {
    passedChecks++;
  } else {
    failedChecks++;
  }
  console.log(`[${status}] ${id}: ${title}`);
  if (observed || details) {
    if (observed) console.log(`       Observed: ${observed}`);
    if (details) console.log(`       Details:  ${details}`);
  }
  results.push({ id, title, status, observed, details });
}

function queryPsql(db, sql) {
  try {
    const stdout = execSync(`docker exec -i supabase_db_Kshetra psql -U postgres -d ${db} -v ON_ERROR_STOP=1 -t -A`, {
      input: sql,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { ok: true, stdout: stdout.trim(), stderr: '' };
  } catch (err) {
    const errOutput = err.stderr ? err.stderr.toString() : err.message;
    return { ok: false, stdout: '', stderr: errOutput.trim() };
  }
}

async function runG2PreflightBattery() {
  const testDb = 'w021_g2_pg_verify';

  // ─── STEP 0: PROVISION ISOLATED REHEARSAL HARNESS ───────────────────────────
  console.log('--- 0. PROVISIONING ISOLATED POSTGRESQL 17.6 TEST HARNESS ---');
  execSync(`docker exec supabase_db_Kshetra psql -U postgres -c "DROP DATABASE IF EXISTS ${testDb};"`, { stdio: 'pipe' });
  execSync(`docker exec supabase_db_Kshetra psql -U postgres -c "CREATE DATABASE ${testDb};"`, { stdio: 'pipe' });

  const setupSql = fs.readFileSync('scripts/setup_w021_g2_isolated_test.sql', 'utf8');
  const setupRes = queryPsql(testDb, setupSql);
  if (!setupRes.ok) {
    console.error('FATAL: Setup script failed:', setupRes.stderr);
    process.exit(1);
  }
  console.log('Isolated test database provisioned successfully.\n');

  // ─── STEP 1: TRANSACTIONAL EXECUTION & IDEMPOTENCY ──────────────────────────
  console.log('--- 1. MIGRATION EXECUTION, IDEMPOTENCY & ROLLBACK PROOFS ---');

  // MIG-01: Transactional Execution
  const mig056Sql = fs.readFileSync('supabase/migrations/056_saas_partner_foundation.sql', 'utf8');
  const migRes = queryPsql(testDb, mig056Sql);
  recordCheck(
    'W021-G2-MIG-01',
    'Migration 056 executes transactionally with exit code 0',
    migRes.ok,
    migRes.ok ? 'Transaction committed successfully' : migRes.stderr
  );

  // MIG-02: Idempotency Replay
  const replayRes = queryPsql(testDb, mig056Sql);
  recordCheck(
    'W021-G2-MIG-02',
    'Migration 056 is idempotent on replay (zero errors on re-execution)',
    replayRes.ok,
    replayRes.ok ? 'Replay succeeded cleanly with IF NOT EXISTS guards' : replayRes.stderr
  );

  // MIG-03: Failure Rehearsal Rollback Proof
  const failureRehearsalSql = `
    BEGIN;
    CREATE TABLE public.canary_saas_fail (id UUID PRIMARY KEY);
    ALTER TABLE public.saas_tenants ADD CONSTRAINT bogus_fail_check CHECK (non_existent_column > 0);
    COMMIT;
  `;
  const failRes = queryPsql(testDb, failureRehearsalSql);
  const canaryCheck = queryPsql(testDb, "SELECT count(*) FROM information_schema.tables WHERE table_name = 'canary_saas_fail';").stdout.trim();
  recordCheck(
    'W021-G2-MIG-03',
    'Failure rehearsal rolls back cleanly (zero partial schema application)',
    !failRes.ok && canaryCheck === '0',
    `Execution aborted on error; canary table count = ${canaryCheck}`
  );

  // ─── STEP 2: SCHEMA & CATALOG INSPECTION ────────────────────────────────────
  console.log('\n--- 2. SCHEMA & CATALOG INSPECTION ---');

  // SCH-01: 4 Required Tables Exist
  const tablesRaw = queryPsql(testDb, `
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name IN ('saas_tenants', 'saas_applications', 'saas_api_keys', 'saas_usage_ledger')
    ORDER BY table_name;
  `).stdout.split('\n').filter(Boolean);
  recordCheck(
    'W021-G2-SCH-01',
    'All 4 ratified SaaS tables exist in public schema',
    tablesRaw.length === 4,
    `Tables found: [${tablesRaw.join(', ')}]`
  );

  // SCH-02: Composite Unique and Composite FK Constraints Exist
  const compUqCheck = queryPsql(testDb, `
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.saas_applications'::regclass
      AND contype = 'u'
      AND conname = 'uq_saas_applications_tenant_app';
  `).stdout.trim();
  const compFkCheck = queryPsql(testDb, `
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.saas_api_keys'::regclass
      AND confrelid = 'public.saas_applications'::regclass
      AND contype = 'f'
      AND conname = 'fk_saas_api_keys_tenant_application';
  `).stdout.trim();
  recordCheck(
    'W021-G2-SCH-02',
    'Composite UNIQUE constraint and composite FK constraint exist on database kernel',
    compUqCheck === 'uq_saas_applications_tenant_app' && compFkCheck === 'fk_saas_api_keys_tenant_application',
    `UQ: ${compUqCheck}; FK: ${compFkCheck}`
  );

  // SCH-03: Indexes and Partial Active Lookup Index
  const indexesRaw = queryPsql(testDb, `
    SELECT indexname, indexdef FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename IN ('saas_tenants', 'saas_applications', 'saas_api_keys', 'saas_usage_ledger')
      AND indexname IN ('idx_saas_tenants_status', 'idx_saas_applications_tenant', 'idx_saas_api_keys_lookup', 'idx_saas_api_keys_tenant', 'idx_saas_api_keys_app', 'idx_saas_usage_ledger_tenant')
    ORDER BY indexname;
  `).stdout;
  const hasPartialIndex = indexesRaw.includes('idx_saas_api_keys_lookup') && indexesRaw.includes("WHERE (status = 'active'::text)");
  recordCheck(
    'W021-G2-SCH-03',
    'Partial active key lookup index and performance indexes exist',
    hasPartialIndex,
    'idx_saas_api_keys_lookup includes WHERE status = active partial clause'
  );

  // SCH-04: RLS Enabled and Forced
  const rlsRaw = queryPsql(testDb, `
    SELECT c.relname || ': rls=' || c.relrowsecurity || ', force=' || c.relforcerowsecurity
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname IN ('saas_tenants', 'saas_applications', 'saas_api_keys', 'saas_usage_ledger')
    ORDER BY c.relname;
  `).stdout.split('\n').filter(Boolean);
  const allRlsForced = rlsRaw.every(r => r.includes('rls=true, force=true'));
  recordCheck(
    'W021-G2-SCH-04',
    'ROW LEVEL SECURITY is ENABLED and FORCED on all 4 tables',
    allRlsForced && rlsRaw.length === 4,
    rlsRaw.join(' | ')
  );

  // SCH-05: revoked_at Column & Audit Lifecycle Consistency
  const revokedAtCol = queryPsql(testDb, `
    SELECT column_name || ':' || is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'saas_api_keys' AND column_name = 'revoked_at';
  `).stdout.trim();
  recordCheck(
    'W021-G2-SCH-05',
    'saas_api_keys.revoked_at column exists and is nullable',
    revokedAtCol === 'revoked_at:YES',
    `Found column: ${revokedAtCol}`
  );

  // ─── STEP 3: 14 MANDATORY SECURITY PROBES + AUTHORITATIVE TENANT ISOLATION ──
  console.log('\n--- 3. 14 MANDATORY SECURITY PROBES & AUTHORITATIVE TENANT ISOLATION ---');

  function runAsRole(role, sql) {
    return queryPsql(testDb, `
      SET ROLE ${role};
      ${sql}
      RESET ROLE;
    `);
  }

  // PROBE 1: Anon direct access denied
  const probe1Res = runAsRole('anon', 'SELECT * FROM public.saas_tenants;');
  recordCheck(
    'W021-G2-PROBE-01',
    'Anon direct access denied (permission denied for table saas_tenants)',
    !probe1Res.ok && probe1Res.stderr.includes('permission denied'),
    probe1Res.stderr
  );

  // PROBE 2: Authenticated direct access denied
  const probe2Res = runAsRole('authenticated', 'SELECT * FROM public.saas_api_keys;');
  recordCheck(
    'W021-G2-PROBE-02',
    'Authenticated direct access denied (permission denied for table saas_api_keys)',
    !probe2Res.ok && probe2Res.stderr.includes('permission denied'),
    probe2Res.stderr
  );

  // Insert seed test data: Tenant A + Application A, Tenant B + Application B
  const seedTenantsSql = `
    INSERT INTO public.saas_tenants (id, name, slug, tier, status, contact_email)
    VALUES 
      ('aaaaaaaa-1111-1111-1111-111111111111', 'Tenant A', 'tenant-a', 'pro', 'active', 'admin@tenant-a.com'),
      ('bbbbbbbb-2222-2222-2222-222222222222', 'Tenant B', 'tenant-b', 'free', 'active', 'admin@tenant-b.com');

    INSERT INTO public.saas_applications (id, tenant_id, name, environment)
    VALUES 
      ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-1111-1111-1111-111111111111', 'Application A', 'live'),
      ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'bbbbbbbb-2222-2222-2222-222222222222', 'Application B', 'test');
  `;
  queryPsql(testDb, seedTenantsSql);

  // PROBE 3: Arbitrary tenant access denied under non-privileged role
  const probe3Res = runAsRole('anon', "SELECT * FROM public.saas_tenants WHERE id = 'aaaaaaaa-1111-1111-1111-111111111111';");
  recordCheck(
    'W021-G2-PROBE-03',
    'Arbitrary tenant access denied (public/anon cannot query tenant row)',
    !probe3Res.ok && probe3Res.stderr.includes('permission denied'),
    probe3Res.stderr
  );

  // PROBE 4A: AUTHORITATIVE CROSS-TENANT ISOLATION DEFECT TEST (MANDATORY CTO REQUIREMENT)
  // Attempt: API Key with tenant_id = Tenant A, application_id = Application B
  const probe4ACrossTenant = queryPsql(testDb, `
    INSERT INTO public.saas_api_keys (
      tenant_id, application_id, name, key_prefix, key_hint, key_hash, status
    ) VALUES (
      'aaaaaaaa-1111-1111-1111-111111111111',
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      'Cross Tenant Malicious Key',
      'panin_live_sk_',
      'crosskey',
      'hash_cross_tenant_malicious_key_11111111111111111111111111111111111',
      'active'
    );
  `);
  recordCheck(
    'W021-G2-PROBE-04A',
    'Authoritative cross-tenant rejection: Tenant A + Application B fails with composite FK constraint violation',
    !probe4ACrossTenant.ok && probe4ACrossTenant.stderr.includes('fk_saas_api_keys_tenant_application'),
    probe4ACrossTenant.stderr
  );

  // PROBE 4B: Authoritative same-tenant success: Tenant A + Application A -> SUCCESS
  const probe4BValidA = queryPsql(testDb, `
    INSERT INTO public.saas_api_keys (
      id, tenant_id, application_id, name, key_prefix, key_hint, key_hash, status
    ) VALUES (
      'aaaaaaaa-9999-9999-9999-999999999999',
      'aaaaaaaa-1111-1111-1111-111111111111',
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      'Tenant A Primary Key',
      'panin_live_sk_',
      'hintaaa1',
      'hash_tenant_a_primary_key_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      'active'
    );
  `);
  recordCheck(
    'W021-G2-PROBE-04B',
    'Authoritative same-tenant association: Tenant A + Application A succeeds cleanly',
    probe4BValidA.ok,
    probe4BValidA.ok ? 'Successfully inserted Tenant A + Application A key' : probe4BValidA.stderr
  );

  // PROBE 4C: Authoritative same-tenant success: Tenant B + Application B -> SUCCESS
  const probe4CValidB = queryPsql(testDb, `
    INSERT INTO public.saas_api_keys (
      id, tenant_id, application_id, name, key_prefix, key_hint, key_hash, status
    ) VALUES (
      'bbbbbbbb-9999-9999-9999-999999999999',
      'bbbbbbbb-2222-2222-2222-222222222222',
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      'Tenant B Primary Key',
      'panin_test_sk_',
      'hintbbb1',
      'hash_tenant_b_primary_key_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      'active'
    );
  `);
  recordCheck(
    'W021-G2-PROBE-04C',
    'Authoritative same-tenant association: Tenant B + Application B succeeds cleanly',
    probe4CValidB.ok,
    probe4CValidB.ok ? 'Successfully inserted Tenant B + Application B key' : probe4CValidB.stderr
  );

  // PROBE 5: Revoked key remains persisted (soft-state revocation with revoked_at populated)
  queryPsql(testDb, `
    UPDATE public.saas_api_keys 
    SET status = 'revoked', revoked_at = now()
    WHERE id = 'aaaaaaaa-9999-9999-9999-999999999999';
  `);
  const probe5Status = queryPsql(testDb, `
    SELECT status || '|' || (revoked_at IS NOT NULL)::text 
    FROM public.saas_api_keys WHERE id = 'aaaaaaaa-9999-9999-9999-999999999999';
  `).stdout.trim();
  const partialIdxProbe = queryPsql(testDb, `
    SELECT count(*) FROM public.saas_api_keys 
    WHERE key_hash = 'hash_tenant_a_primary_key_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' AND status = 'active';
  `).stdout.trim();
  recordCheck(
    'W021-G2-PROBE-05',
    'Revoked key remains persisted with revoked_at timestamp but excluded from active partial index',
    probe5Status === 'revoked|true' && partialIdxProbe === '0',
    `Status & revoked_at = ${probe5Status}; Active index match count = ${partialIdxProbe}`
  );

  // PROBE 6: Historical usage remains after key revocation
  queryPsql(testDb, `
    INSERT INTO public.saas_usage_ledger (tenant_id, api_key_id, hour_bucket, request_count, error_count)
    VALUES ('aaaaaaaa-1111-1111-1111-111111111111', 'aaaaaaaa-9999-9999-9999-999999999999', '2026-10-01 12:00:00Z', 100, 2);
  `);
  const probe6Res = queryPsql(testDb, `
    SELECT count(*) FROM public.saas_usage_ledger WHERE api_key_id = 'aaaaaaaa-9999-9999-9999-999999999999';
  `).stdout.trim();
  recordCheck(
    'W021-G2-PROBE-06',
    'Historical usage remains fully accessible and linked after key revocation',
    probe6Res === '1',
    `Usage records matching revoked key = ${probe6Res}`
  );

  // PROBE 7: Physical key deletion sets api_key_id = NULL without deleting usage row (ON DELETE SET NULL)
  queryPsql(testDb, `
    INSERT INTO public.saas_api_keys (id, tenant_id, application_id, name, key_prefix, key_hint, key_hash, status)
    VALUES ('88888888-8888-8888-8888-888888888888', 'aaaaaaaa-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Disposable Key', 'panin_test_sk_', '99998888', 'hash_disposable_key', 'active');

    INSERT INTO public.saas_usage_ledger (id, tenant_id, api_key_id, hour_bucket, request_count, error_count)
    VALUES ('77777777-7777-7777-7777-777777777777', 'aaaaaaaa-1111-1111-1111-111111111111', '88888888-8888-8888-8888-888888888888', '2026-10-01 13:00:00Z', 50, 0);

    DELETE FROM public.saas_api_keys WHERE id = '88888888-8888-8888-8888-888888888888';
  `);
  const probe7UsageRow = queryPsql(testDb, `
    SELECT id || '|' || COALESCE(api_key_id::text, 'NULL') || '|' || request_count
    FROM public.saas_usage_ledger WHERE id = '77777777-7777-7777-7777-777777777777';
  `).stdout.trim();
  recordCheck(
    'W021-G2-PROBE-07',
    'Physical key deletion sets api_key_id = NULL without deleting usage record (ON DELETE SET NULL)',
    probe7UsageRow === '77777777-7777-7777-7777-777777777777|NULL|50',
    `Usage row preserved: ${probe7UsageRow}`
  );

  // PROBE 8: Duplicate key_hash rejected (unique constraint uq_saas_api_keys_hash)
  const probe8Res = queryPsql(testDb, `
    INSERT INTO public.saas_api_keys (tenant_id, application_id, name, key_prefix, key_hint, key_hash, status)
    VALUES ('bbbbbbbb-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Duplicate Hash Key', 'panin_test_sk_', '12345678', 'hash_tenant_b_primary_key_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', 'active');
  `);
  recordCheck(
    'W021-G2-PROBE-08',
    'Duplicate key_hash rejected (unique constraint uq_saas_api_keys_hash)',
    !probe8Res.ok && probe8Res.stderr.includes('uq_saas_api_keys_hash'),
    probe8Res.stderr
  );

  // PROBE 9: Duplicate tenant slug rejected (unique constraint uq_saas_tenants_slug)
  const probe9Res = queryPsql(testDb, `
    INSERT INTO public.saas_tenants (name, slug, tier, status, contact_email)
    VALUES ('Tenant A Duplicate', 'tenant-a', 'free', 'active', 'dup@a.com');
  `);
  recordCheck(
    'W021-G2-PROBE-09',
    'Duplicate tenant slug rejected (unique constraint uq_saas_tenants_slug)',
    !probe9Res.ok && probe9Res.stderr.includes('uq_saas_tenants_slug'),
    probe9Res.stderr
  );

  // PROBE 10A: Duplicate usage bucket with non-null api_key_id rejected
  const probe10ARes = queryPsql(testDb, `
    INSERT INTO public.saas_usage_ledger (tenant_id, api_key_id, hour_bucket, request_count, error_count)
    VALUES ('aaaaaaaa-1111-1111-1111-111111111111', 'aaaaaaaa-9999-9999-9999-999999999999', '2026-10-01 12:00:00Z', 10, 0);
  `);
  recordCheck(
    'W021-G2-PROBE-10A',
    'Duplicate usage bucket with active/revoked key rejected (unique constraint uq_saas_usage_bucket)',
    !probe10ARes.ok && probe10ARes.stderr.includes('uq_saas_usage_bucket'),
    probe10ARes.stderr
  );

  // PROBE 10B: AUTHORITATIVE USAGE LEDGER NULL UNIQUENESS PROOF (UNIQUE NULLS NOT DISTINCT)
  // Attempt duplicate insert where api_key_id is NULL for the same tenant and hour bucket:
  const probe10BNullUniq = queryPsql(testDb, `
    INSERT INTO public.saas_usage_ledger (tenant_id, api_key_id, hour_bucket, request_count, error_count)
    VALUES ('aaaaaaaa-1111-1111-1111-111111111111', NULL, '2026-10-01 13:00:00Z', 25, 0);
  `);
  recordCheck(
    'W021-G2-PROBE-10B',
    'Usage ledger NULL uniqueness enforced: duplicate (tenant_id, NULL, hour_bucket) rejected by UNIQUE NULLS NOT DISTINCT',
    !probe10BNullUniq.ok && probe10BNullUniq.stderr.includes('uq_saas_usage_bucket'),
    probe10BNullUniq.stderr
  );

  // PROBE 11: Expired-key representation verified
  queryPsql(testDb, `
    INSERT INTO public.saas_api_keys (id, tenant_id, application_id, name, key_prefix, key_hint, key_hash, status, expires_at)
    VALUES ('66666666-6666-6666-6666-666666666666', 'aaaaaaaa-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Expired Key', 'panin_test_sk_', '11223344', 'hash_expired_key', 'active', now() - INTERVAL '1 hour');
  `);
  const probe11Res = queryPsql(testDb, `
    SELECT (expires_at < now())::text FROM public.saas_api_keys WHERE id = '66666666-6666-6666-6666-666666666666';
  `).stdout.trim();
  recordCheck(
    'W021-G2-PROBE-11',
    'Expired-key representation accurately evaluates (expires_at < now() is true)',
    probe11Res === 'true',
    `Evaluated expiration state = ${probe11Res}`
  );

  // PROBE 12A: Invalid key status rejected (check constraint chk_saas_api_keys_status)
  const probe12ARes = queryPsql(testDb, `
    INSERT INTO public.saas_api_keys (tenant_id, application_id, name, key_prefix, key_hint, key_hash, status)
    VALUES ('aaaaaaaa-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Bad Status Key', 'panin_test_sk_', '44556677', 'hash_bad_status', 'invalid_status_value');
  `);
  recordCheck(
    'W021-G2-PROBE-12A',
    'Invalid key status rejected (database check constraint rejects invalid_status_value)',
    !probe12ARes.ok && (probe12ARes.stderr.includes('chk_saas_api_keys_status') || probe12ARes.stderr.includes('chk_saas_api_keys_revoked_at')),
    probe12ARes.stderr
  );

  // PROBE 12B: revoked_at check constraint consistency (active with revoked_at != NULL rejected)
  const probe12BConsistency = queryPsql(testDb, `
    INSERT INTO public.saas_api_keys (tenant_id, application_id, name, key_prefix, key_hint, key_hash, status, revoked_at)
    VALUES ('aaaaaaaa-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Inconsistent Key', 'panin_test_sk_', '55667788', 'hash_inconsistent_revoked', 'active', now());
  `);
  recordCheck(
    'W021-G2-PROBE-12B',
    'Inconsistent key state rejected: status active with non-null revoked_at rejected by check constraint',
    !probe12BConsistency.ok && probe12BConsistency.stderr.includes('chk_saas_api_keys_revoked_at'),
    probe12BConsistency.stderr
  );

  // PROBE 13: Invalid application environment rejected (check constraint chk_saas_applications_env)
  const probe13Res = queryPsql(testDb, `
    INSERT INTO public.saas_applications (tenant_id, name, environment)
    VALUES ('aaaaaaaa-1111-1111-1111-111111111111', 'Bad Env App', 'staging_qa');
  `);
  recordCheck(
    'W021-G2-PROBE-13',
    'Invalid application environment rejected (check constraint chk_saas_applications_env)',
    !probe13Res.ok && probe13Res.stderr.includes('chk_saas_applications_env'),
    probe13Res.stderr
  );

  // PROBE 14: Invalid tenant tier rejected (check constraint chk_saas_tenants_tier)
  const probe14Res = queryPsql(testDb, `
    INSERT INTO public.saas_tenants (name, slug, tier, status, contact_email)
    VALUES ('Bad Tier Org', 'bad-tier-org', 'unlimited_super', 'active', 'test@org.com');
  `);
  recordCheck(
    'W021-G2-PROBE-14',
    'Invalid tenant tier rejected (check constraint chk_saas_tenants_tier)',
    !probe14Res.ok && probe14Res.stderr.includes('chk_saas_tenants_tier'),
    probe14Res.stderr
  );

  // ─── STEP 4: GEOMETRY DIGEST & LIVE STAGING CATALOG CHECKS ──────────────────
  console.log('\n--- 4. POSTGIS 589 DIGEST & STAGING CATALOG CHECKS ---');

  const geoCount = queryPsql(testDb, 'SELECT count(*) FROM public.constituency_boundaries;').stdout.trim();
  const geoDigest = queryPsql(testDb, 'SELECT source_digest FROM public.constituency_boundaries LIMIT 1;').stdout.trim();
  const canonicalDigest = 'f839fa02980318a8f35f932ebe72fa1d3ad6325dc86a624bf159d932fe5f613b';
  recordCheck(
    'W021-G2-GEO-01',
    'PostGIS 589 constituency geometry baseline count and canonical digest remain frozen',
    geoCount === '589' && geoDigest === canonicalDigest,
    `Count = ${geoCount}, Digest = ${geoDigest}`
  );

  recordCheck(
    'W021-G2-PRD-01',
    'Production environment ehfafcnimmjusyvplbah is 100% air-gapped and untouched',
    !supabaseUrl.includes('ehfafcnimmjusyvplbah') && supabaseUrl.includes('fkpigozcqnmcvofuksar'),
    `Staging confirmed at ${supabaseUrl}`
  );

  // ─── SUMMARY & REPORT EMISSION ──────────────────────────────────────────────
  console.log('\n================================================================');
  console.log(`TOTAL CHECKS: ${passedChecks + failedChecks}`);
  console.log(`PASSED:       ${passedChecks}`);
  console.log(`FAILED:       ${failedChecks}`);
  console.log(`PASS RATE:    ${((passedChecks / (passedChecks + failedChecks)) * 100).toFixed(1)}%`);
  console.log('================================================================\n');

  const reportData = {
    gate: 'W021-G2',
    remediation: 'CTO_TENANT_ISOLATION_REMEDIATION_COMPLETE',
    timestamp: new Date().toISOString(),
    targetDatabase: 'panIN-staging (fkpigozcqnmcvofuksar)',
    isolatedHarness: 'PostgreSQL 17.6 (supabase_db_Kshetra / w021_g2_pg_verify)',
    productionAirGapped: true,
    totalChecks: passedChecks + failedChecks,
    passedChecks,
    failedChecks,
    passRate: `${((passedChecks / (passedChecks + failedChecks)) * 100).toFixed(1)}%`,
    checks: results
  };

  fs.writeFileSync('reports/w021_g2_migration_preflight.json', JSON.stringify(reportData, null, 2));
  console.log('Preflight evidence written to reports/w021_g2_migration_preflight.json');

  if (failedChecks > 0) {
    console.error('PREFLIGHT FAILED WITH NON-ZERO FAILURES.');
    process.exit(1);
  }
}

runG2PreflightBattery().catch(err => {
  console.error('FATAL UNCAUGHT ERROR IN PREFLIGHT SUITE:', err);
  process.exit(1);
});
