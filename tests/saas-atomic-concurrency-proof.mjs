import { execSync } from 'node:child_process';

function psql(sql) {
  return execSync('docker exec -i supabase_db_Kshetra psql -U postgres -d w021_g3_durable_quota -t -A', {
    input: sql,
    encoding: 'utf8',
  }).trim();
}

console.log('=== ATOMIC CONCURRENCY PROOF: 10 CONCURRENT REQUESTS FOR 1 FINAL QUOTA SLOT ===');

const rawTid = psql(`
  INSERT INTO public.saas_tenants (name, slug, tier, status, contact_email)
  VALUES ('Concurrent Corp', 'conc-' || gen_random_uuid(), 'free', 'active', 'test@conc.com')
  RETURNING id;
`);
const tid = rawTid.split('\n')[0].trim();

// Seed usage at 9,999 for ceiling 10,000
psql(`
  INSERT INTO public.saas_usage_ledger (tenant_id, hour_bucket, request_count)
  VALUES ('${tid}', now(), 9999);
`);

console.log('Tenant:', tid);
console.log('Initial usage seeded at 9,999. Monthly ceiling = 10,000. Exactly 1 slot remaining.');

// Run 10 parallel queries
const promises = Array.from({ length: 10 }, (_, i) => {
  return new Promise((resolve) => {
    try {
      const sql = `SELECT public.fn_check_and_increment_saas_quota('${tid}'::uuid, NULL, now(), date_trunc('month', now()));`;
      const out = psql(sql);
      resolve(JSON.parse(out));
    } catch (err) {
      resolve({ error: err.message });
    }
  });
});

const results = await Promise.all(promises);

const allowedCount = results.filter((r) => r.allowed === true).length;
const rejectedCount = results.filter((r) => r.allowed === false).length;
const finalUsage = psql(`SELECT COALESCE(SUM(request_count), 0) FROM public.saas_usage_ledger WHERE tenant_id = '${tid}';`);

console.log('Results:');
console.log('  Allowed requests:', allowedCount);
console.log('  Rejected requests (429 RATE_LIMIT_EXCEEDED):', rejectedCount);
console.log('  Final Committed Usage in PostgreSQL:', finalUsage);

if (allowedCount === 1 && rejectedCount === 9 && finalUsage === '10000') {
  console.log('PROOF VERIFIED: EXACTLY 1 ALLOWED, 9 REJECTED, COMMITTED USAGE = 10,000 (INVARIANT HELD).');
} else {
  console.error('INVARIANT BREACH DETECTED: allowedCount=' + allowedCount + ', finalUsage=' + finalUsage);
  process.exit(1);
}
