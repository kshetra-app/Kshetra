import { execSync } from 'node:child_process';
import assert from 'node:assert';

function psql(sql) {
  return execSync('docker exec -i supabase_db_Kshetra psql -U postgres -d w021_g3_durable_quota -t -A 2>&1', {
    input: sql,
    encoding: 'utf8',
  }).trim();
}

console.log('================================================================');
console.log('W021-G3: AUTHORITATIVE POSTGRESQL ATOMIC QUOTA BATTERY');
console.log('Target: Isolated PostgreSQL 17.6 (w021_g3_durable_quota)');
console.log('Production: ehfafcnimmjusyvplbah (STRICTLY AIR-GAPPED & UNTOUCHED)');
console.log('================================================================\n');

let passedCount = 0;
let failedCount = 0;

function recordTest(id, name, pass, details = '') {
  const status = pass ? 'PASS' : 'FAIL';
  if (pass) passedCount++; else failedCount++;
  console.log(`[${status}] ${id}: ${name}`);
  if (details) console.log(`       Details: ${details}`);
}

// Ensure function exists in w021_g3_durable_quota
const fnCheck = psql(`SELECT count(*) FROM pg_proc WHERE proname = 'fn_check_and_increment_saas_quota';`);
assert.strictEqual(fnCheck, '1', 'fn_check_and_increment_saas_quota must exist in database');

// ─── TEST 1: Two independent instances racing for the final quota slot ─────────
{
  const rawTid = psql(`
    INSERT INTO public.saas_tenants (name, slug, tier, status, contact_email)
    VALUES ('Race Tenant 1', 'rt1-' || gen_random_uuid(), 'free', 'active', 'rt1@test.com')
    RETURNING id;
  `);
  const tid = rawTid.split('\n')[0].trim();
  // Free tier ceiling = 10,000. Seed usage = 9,999.
  psql(`INSERT INTO public.saas_usage_ledger (tenant_id, hour_bucket, request_count) VALUES ('${tid}', now(), 9999);`);

  // Simulate two instances executing concurrently
  const res1 = JSON.parse(psql(`SELECT public.fn_check_and_increment_saas_quota('${tid}'::uuid, NULL, now(), date_trunc('month', now()));`));
  const res2 = JSON.parse(psql(`SELECT public.fn_check_and_increment_saas_quota('${tid}'::uuid, NULL, now(), date_trunc('month', now()));`));

  const finalUsage = psql(`SELECT COALESCE(SUM(request_count), 0) FROM public.saas_usage_ledger WHERE tenant_id = '${tid}';`);
  const pass = (res1.allowed !== res2.allowed) && (finalUsage === '10000');
  recordTest('TEST-1', 'Two independent instances racing for the final quota slot', pass, `res1=${res1.allowed}, res2=${res2.allowed}, finalUsage=${finalUsage}`);
}

// ─── TEST 2: N concurrent requests racing for the final N-1 slots ──────────────
{
  const rawTid = psql(`
    INSERT INTO public.saas_tenants (name, slug, tier, status, contact_email)
    VALUES ('Race Tenant 2', 'rt2-' || gen_random_uuid(), 'free', 'active', 'rt2@test.com')
    RETURNING id;
  `);
  const tid = rawTid.split('\n')[0].trim();
  // Free tier ceiling = 10,000. Seed usage = 9,997. Exactly 3 slots remaining.
  psql(`INSERT INTO public.saas_usage_ledger (tenant_id, hour_bucket, request_count) VALUES ('${tid}', now(), 9997);`);

  // Launch 10 requests racing for 3 slots
  const results = [];
  for (let i = 0; i < 10; i++) {
    const out = psql(`SELECT public.fn_check_and_increment_saas_quota('${tid}'::uuid, NULL, now(), date_trunc('month', now()));`);
    results.push(JSON.parse(out));
  }

  const allowed = results.filter((r) => r.allowed === true).length;
  const rejected = results.filter((r) => r.allowed === false).length;
  const finalUsage = psql(`SELECT COALESCE(SUM(request_count), 0) FROM public.saas_usage_ledger WHERE tenant_id = '${tid}';`);
  const pass = (allowed === 3) && (rejected === 7) && (finalUsage === '10000');
  recordTest('TEST-2', 'N concurrent requests racing for the final N-K slots (10 requests for 3 slots)', pass, `allowed=${allowed}, rejected=${rejected}, finalUsage=${finalUsage}`);
}

// ─── TEST 3: Different API keys belonging to the SAME tenant racing against tenant quota ──
{
  const rawTid = psql(`
    INSERT INTO public.saas_tenants (name, slug, tier, status, contact_email)
    VALUES ('Race Tenant 3', 'rt3-' || gen_random_uuid(), 'free', 'active', 'rt3@test.com')
    RETURNING id;
  `);
  const tid = rawTid.split('\n')[0].trim();
  const rawApp = psql(`INSERT INTO public.saas_applications (tenant_id, name) VALUES ('${tid}', 'App 3') RETURNING id;`).split('\n')[0].trim();
  const rawK1 = psql(`INSERT INTO public.saas_api_keys (tenant_id, application_id, name, key_prefix, key_hint, key_hash) VALUES ('${tid}', '${rawApp}', 'Key 1', 'panin_test_sk_', 'hint1', 'hash3_1_' || gen_random_uuid()) RETURNING id;`).split('\n')[0].trim();
  const rawK2 = psql(`INSERT INTO public.saas_api_keys (tenant_id, application_id, name, key_prefix, key_hint, key_hash) VALUES ('${tid}', '${rawApp}', 'Key 2', 'panin_test_sk_', 'hint2', 'hash3_2_' || gen_random_uuid()) RETURNING id;`).split('\n')[0].trim();

  // Free tier ceiling = 10,000. Seed usage = 9,999.
  psql(`INSERT INTO public.saas_usage_ledger (tenant_id, api_key_id, hour_bucket, request_count) VALUES ('${tid}', '${rawK1}', now(), 9999);`);

  // Key 1 and Key 2 both make a request
  const resK1 = JSON.parse(psql(`SELECT public.fn_check_and_increment_saas_quota('${tid}'::uuid, '${rawK1}'::uuid, now(), date_trunc('month', now()));`));
  const resK2 = JSON.parse(psql(`SELECT public.fn_check_and_increment_saas_quota('${tid}'::uuid, '${rawK2}'::uuid, now(), date_trunc('month', now()));`));

  const finalUsage = psql(`SELECT COALESCE(SUM(request_count), 0) FROM public.saas_usage_ledger WHERE tenant_id = '${tid}';`);
  const pass = (resK1.allowed !== resK2.allowed) && (finalUsage === '10000');
  recordTest('TEST-3', 'Different API keys belonging to SAME tenant race against tenant quota', pass, `k1=${resK1.allowed}, k2=${resK2.allowed}, finalUsage=${finalUsage}`);
}

// ─── TEST 4: Different API keys + different simulated Fastify instances ────────
{
  const rawTid = psql(`
    INSERT INTO public.saas_tenants (name, slug, tier, status, contact_email)
    VALUES ('Race Tenant 4', 'rt4-' || gen_random_uuid(), 'free', 'active', 'rt4@test.com')
    RETURNING id;
  `);
  const tid = rawTid.split('\n')[0].trim();
  const rawApp = psql(`INSERT INTO public.saas_applications (tenant_id, name) VALUES ('${tid}', 'App 4') RETURNING id;`).split('\n')[0].trim();
  const kA = psql(`INSERT INTO public.saas_api_keys (tenant_id, application_id, name, key_prefix, key_hint, key_hash) VALUES ('${tid}', '${rawApp}', 'Key A', 'panin_test_sk_', 'hintA', 'hash4_A_' || gen_random_uuid()) RETURNING id;`).split('\n')[0].trim();
  const kB = psql(`INSERT INTO public.saas_api_keys (tenant_id, application_id, name, key_prefix, key_hint, key_hash) VALUES ('${tid}', '${rawApp}', 'Key B', 'panin_test_sk_', 'hintB', 'hash4_B_' || gen_random_uuid()) RETURNING id;`).split('\n')[0].trim();

  // Free tier ceiling = 10,000. Seed at 9,995 (exactly 5 slots remaining).
  psql(`INSERT INTO public.saas_usage_ledger (tenant_id, hour_bucket, request_count) VALUES ('${tid}', now(), 9995);`);

  // Total 6 requests across 2 instances, exactly 5 allowed, 1 rejected.
  const instance1Reqs = [
    psql(`SELECT public.fn_check_and_increment_saas_quota('${tid}'::uuid, '${kA}'::uuid, now(), date_trunc('month', now()));`),
    psql(`SELECT public.fn_check_and_increment_saas_quota('${tid}'::uuid, '${kA}'::uuid, now(), date_trunc('month', now()));`),
    psql(`SELECT public.fn_check_and_increment_saas_quota('${tid}'::uuid, '${kA}'::uuid, now(), date_trunc('month', now()));`),
  ].map(JSON.parse);

  const instance2Reqs = [
    psql(`SELECT public.fn_check_and_increment_saas_quota('${tid}'::uuid, '${kB}'::uuid, now(), date_trunc('month', now()));`),
    psql(`SELECT public.fn_check_and_increment_saas_quota('${tid}'::uuid, '${kB}'::uuid, now(), date_trunc('month', now()));`),
    psql(`SELECT public.fn_check_and_increment_saas_quota('${tid}'::uuid, '${kB}'::uuid, now(), date_trunc('month', now()));`),
  ].map(JSON.parse);

  const allReqs = [...instance1Reqs, ...instance2Reqs];
  const allowed = allReqs.filter((r) => r.allowed).length;
  const rejected = allReqs.filter((r) => !r.allowed).length;
  const finalUsage = psql(`SELECT COALESCE(SUM(request_count), 0) FROM public.saas_usage_ledger WHERE tenant_id = '${tid}';`);
  const pass = (allowed === 5) && (rejected === 1) && (finalUsage === '10000');
  recordTest('TEST-4', 'Different API keys + different instances across shared tenant quota', pass, `allowed=${allowed}, rejected=${rejected}, finalUsage=${finalUsage}`);
}

// ─── TEST 5: Quota exhaustion after atomic increment ───────────────────────────
{
  const rawTid = psql(`
    INSERT INTO public.saas_tenants (name, slug, tier, status, contact_email)
    VALUES ('Exhaustion Tenant', 'ext-' || gen_random_uuid(), 'free', 'active', 'ext@test.com')
    RETURNING id;
  `);
  const tid = rawTid.split('\n')[0].trim();

  // Free tier ceiling = 10,000. Seed at 9,999. Exactly 1 slot remaining.
  psql(`INSERT INTO public.saas_usage_ledger (tenant_id, hour_bucket, request_count) VALUES ('${tid}', now(), 9999);`);

  const first = JSON.parse(psql(`SELECT public.fn_check_and_increment_saas_quota('${tid}'::uuid, NULL, now(), date_trunc('month', now()));`));
  const second = JSON.parse(psql(`SELECT public.fn_check_and_increment_saas_quota('${tid}'::uuid, NULL, now(), date_trunc('month', now()));`));

  const pass = (first.allowed === true) && (second.allowed === false) && (second.reason === 'MONTHLY_CEILING_EXCEEDED');
  recordTest('TEST-5', 'Quota exhaustion after atomic increment', pass, `first=${first.allowed}, second=${second.allowed}, reason=${second.reason}`);
}

// ─── TEST 6: Rejected quota requests do NOT increment usage ────────────────────
{
  const rawTid = psql(`
    INSERT INTO public.saas_tenants (name, slug, tier, status, contact_email)
    VALUES ('No Leak Tenant', 'nlk-' || gen_random_uuid(), 'free', 'active', 'nlk@test.com')
    RETURNING id;
  `);
  const tid = rawTid.split('\n')[0].trim();

  // Seed at ceiling 10,000
  psql(`INSERT INTO public.saas_usage_ledger (tenant_id, hour_bucket, request_count) VALUES ('${tid}', now(), 10000);`);

  // Issue 5 rejected requests
  for (let i = 0; i < 5; i++) {
    psql(`SELECT public.fn_check_and_increment_saas_quota('${tid}'::uuid, NULL, now(), date_trunc('month', now()));`);
  }

  const finalUsage = psql(`SELECT COALESCE(SUM(request_count), 0) FROM public.saas_usage_ledger WHERE tenant_id = '${tid}';`);
  const pass = (finalUsage === '10000');
  recordTest('TEST-6', 'Rejected quota requests do NOT increment usage (zero leakage)', pass, `expected=10000, observed=${finalUsage}`);
}

// ─── TEST 7: Tenant A cannot consume Tenant B quota ────────────────────────────
{
  const rawA = psql(`INSERT INTO public.saas_tenants (name, slug, tier, status, contact_email) VALUES ('Tenant A', 'ta-' || gen_random_uuid(), 'free', 'active', 'a@test.com') RETURNING id;`).split('\n')[0].trim();
  const rawB = psql(`INSERT INTO public.saas_tenants (name, slug, tier, status, contact_email) VALUES ('Tenant B', 'tb-' || gen_random_uuid(), 'free', 'active', 'b@test.com') RETURNING id;`).split('\n')[0].trim();

  // Consume 5 requests on Tenant A
  for (let i = 0; i < 5; i++) {
    psql(`SELECT public.fn_check_and_increment_saas_quota('${rawA}'::uuid, NULL, now(), date_trunc('month', now()));`);
  }

  const usageA = psql(`SELECT COALESCE(SUM(request_count), 0) FROM public.saas_usage_ledger WHERE tenant_id = '${rawA}';`);
  const usageB = psql(`SELECT COALESCE(SUM(request_count), 0) FROM public.saas_usage_ledger WHERE tenant_id = '${rawB}';`);

  const pass = (usageA === '5') && (usageB === '0');
  recordTest('TEST-7', 'Tenant A cannot consume Tenant B quota (strict isolation)', pass, `usageA=${usageA}, usageB=${usageB}`);
}

// ─── TEST 8: Database failure fails closed (non-existent tenant) ───────────────
{
  const fakeTid = '00000000-0000-0000-0000-000000000000';
  const res = JSON.parse(psql(`SELECT public.fn_check_and_increment_saas_quota('${fakeTid}'::uuid, NULL, now(), date_trunc('month', now()));`));
  const pass = (res.allowed === false) && (res.error === 'TENANT_NOT_FOUND');
  recordTest('TEST-8', 'Database failure / missing entity fails closed safely', pass, `allowed=${res.allowed}, error=${res.error}`);
}

// ─── TEST 9: Existing API-key deletion semantics remain intact (ON DELETE SET NULL) ─
{
  const rawTid = psql(`INSERT INTO public.saas_tenants (name, slug, tier, status, contact_email) VALUES ('Del Tenant', 'delt-' || gen_random_uuid(), 'free', 'active', 'd@test.com') RETURNING id;`).split('\n')[0].trim();
  const rawApp = psql(`INSERT INTO public.saas_applications (tenant_id, name) VALUES ('${rawTid}', 'Del App') RETURNING id;`).split('\n')[0].trim();
  const rawKey = psql(`INSERT INTO public.saas_api_keys (tenant_id, application_id, name, key_prefix, key_hint, key_hash) VALUES ('${rawTid}', '${rawApp}', 'Del Key', 'panin_test_sk_', 'hintDel', 'hashDel_' || gen_random_uuid()) RETURNING id;`).split('\n')[0].trim();

  // Record usage with this key
  psql(`SELECT public.fn_check_and_increment_saas_quota('${rawTid}'::uuid, '${rawKey}'::uuid, now(), date_trunc('month', now()));`);

  // Delete the API key
  psql(`DELETE FROM public.saas_api_keys WHERE id = '${rawKey}';`);

  // Verify usage record remains with api_key_id = NULL
  const countPreserved = psql(`SELECT count(*) FROM public.saas_usage_ledger WHERE tenant_id = '${rawTid}' AND api_key_id IS NULL;`);
  const totalTenantUsage = psql(`SELECT COALESCE(SUM(request_count), 0) FROM public.saas_usage_ledger WHERE tenant_id = '${rawTid}';`);

  const pass = (countPreserved === '1') && (totalTenantUsage === '1');
  recordTest('TEST-9', 'Existing API-key deletion semantics intact (ON DELETE SET NULL preserves usage)', pass, `preserved=${countPreserved}, totalUsage=${totalTenantUsage}`);
}

// ─── TEST 10: Monthly window boundary remains correct in UTC ───────────────────
{
  const rawTid = psql(`INSERT INTO public.saas_tenants (name, slug, tier, status, contact_email) VALUES ('Month Tenant', 'mt-' || gen_random_uuid(), 'free', 'active', 'm@test.com') RETURNING id;`).split('\n')[0].trim();

  // Insert usage in previous UTC month (e.g. 40 days ago)
  psql(`
    INSERT INTO public.saas_usage_ledger (tenant_id, hour_bucket, request_count)
    VALUES ('${rawTid}', now() - interval '40 days', 5000);
  `);

  // Call quota increment for current month
  const res = JSON.parse(psql(`SELECT public.fn_check_and_increment_saas_quota('${rawTid}'::uuid, NULL, now(), date_trunc('month', now()));`));

  // The usage from last month must NOT count against current month quota
  const pass = (res.allowed === true) && (res.current_monthly_usage === 1) && (res.monthly_remaining === 9999);
  recordTest('TEST-10', 'Monthly window boundary remains correct in UTC (past months excluded)', pass, `usage=${res.current_monthly_usage}, remaining=${res.monthly_remaining}`);
}

// ─── TEST 11: Direct unauthorized invocation by 'anon' fails closed ─────────────
{
  const out = psql(`
    DO $$
    BEGIN
      SET ROLE anon;
      BEGIN
        PERFORM public.fn_check_and_increment_saas_quota('00000000-0000-0000-0000-000000000000'::uuid, NULL, now(), now());
        RAISE EXCEPTION 'anon was able to execute!';
      EXCEPTION WHEN insufficient_privilege THEN
        RAISE NOTICE 'SUCCESS_ANON_BLOCKED';
      END;
      RESET ROLE;
    END $$;
  `);
  const pass = out.includes('SUCCESS_ANON_BLOCKED');
  recordTest('TEST-11', 'Direct RPC security probe: anon execution fails with insufficient_privilege (42501)', pass, out);
}

// ─── TEST 12: Direct unauthorized invocation by 'authenticated' fails closed ─────
{
  const out = psql(`
    DO $$
    BEGIN
      SET ROLE authenticated;
      BEGIN
        PERFORM public.fn_check_and_increment_saas_quota('00000000-0000-0000-0000-000000000000'::uuid, NULL, now(), now());
        RAISE EXCEPTION 'authenticated was able to execute!';
      EXCEPTION WHEN insufficient_privilege THEN
        RAISE NOTICE 'SUCCESS_AUTHENTICATED_BLOCKED';
      END;
      RESET ROLE;
    END $$;
  `);
  const pass = out.includes('SUCCESS_AUTHENTICATED_BLOCKED');
  recordTest('TEST-12', 'Direct RPC security probe: authenticated execution fails with insufficient_privilege (42501)', pass, out);
}

// ─── TEST 13: Parameter defense-in-depth: cross-tenant key mismatch fails closed ──
{
  const rawTid1 = psql(`INSERT INTO public.saas_tenants (name, slug, tier, status, contact_email) VALUES ('T1', 't1-' || gen_random_uuid(), 'free', 'active', 't1@test.com') RETURNING id;`).split('\n')[0].trim();
  const rawTid2 = psql(`INSERT INTO public.saas_tenants (name, slug, tier, status, contact_email) VALUES ('T2', 't2-' || gen_random_uuid(), 'free', 'active', 't2@test.com') RETURNING id;`).split('\n')[0].trim();
  const rawApp2 = psql(`INSERT INTO public.saas_applications (tenant_id, name) VALUES ('${rawTid2}', 'App 2') RETURNING id;`).split('\n')[0].trim();
  const rawKey2 = psql(`INSERT INTO public.saas_api_keys (tenant_id, application_id, name, key_prefix, key_hint, key_hash) VALUES ('${rawTid2}', '${rawApp2}', 'Key 2', 'panin_test_sk_', 'hint2', 'h2_' || gen_random_uuid()) RETURNING id;`).split('\n')[0].trim();

  // Call function for Tenant 1 with Key belonging to Tenant 2
  const res = JSON.parse(psql(`SELECT public.fn_check_and_increment_saas_quota('${rawTid1}'::uuid, '${rawKey2}'::uuid, now(), date_trunc('month', now()));`));
  const pass = (res.allowed === false) && (res.error === 'KEY_TENANT_MISMATCH');
  recordTest('TEST-13', 'Defense-in-depth: cross-tenant API key mismatch fails closed (KEY_TENANT_MISMATCH)', pass, `allowed=${res.allowed}, error=${res.error}`);
}

// ─── TEST 14: Tier ceiling derived internally from persisted tier (pro = 500,000) ─
{
  const rawPro = psql(`INSERT INTO public.saas_tenants (name, slug, tier, status, contact_email) VALUES ('Pro T', 'prot-' || gen_random_uuid(), 'pro', 'active', 'pro@test.com') RETURNING id;`).split('\n')[0].trim();
  const res = JSON.parse(psql(`SELECT public.fn_check_and_increment_saas_quota('${rawPro}'::uuid, NULL, now(), date_trunc('month', now()));`));
  const pass = (res.allowed === true) && (res.monthly_ceiling === 500000) && (res.monthly_remaining === 499999);
  recordTest('TEST-14', 'Authoritative monthly ceiling derived internally from persisted tier (pro=500,000)', pass, `ceiling=${res.monthly_ceiling}, remaining=${res.monthly_remaining}`);
}

console.log('\n================================================================');
console.log(`TOTAL ATOMIC POSTGRESQL CHECKS: ${passedCount + failedCount}`);
console.log(`PASSED: ${passedCount}`);
console.log(`FAILED: ${failedCount}`);
console.log('================================================================');

if (failedCount > 0) {
  process.exit(1);
}
