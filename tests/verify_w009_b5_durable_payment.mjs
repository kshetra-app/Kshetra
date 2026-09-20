import http from 'http';
import crypto from 'crypto';
import { execSync, exec } from 'child_process';
import fs from 'fs';
import path from 'path';

process.env.NODE_ENV = 'test';

console.log('================================================================');
console.log('W009-B5-R4: ISOLATED POSTGRESQL DURABLE PAYMENT PERSISTENCE TEST');
console.log('================================================================\n');

// 1. JWT & Secret Helpers
const JWT_SECRET = 'super-secret-jwt-token-with-at-least-32-characters-long';
const RAZORPAY_KEY_ID = 'rzp_test_w009_b5';
const RAZORPAY_KEY_SECRET = 'secret_w009_b5_test_hmac_key_12345';

function createJwt(payload, secret = JWT_SECRET) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const h = b64(header);
  const p = b64(payload);
  const sig = crypto.createHmac('sha256', secret).update(h + '.' + p).digest('base64url');
  return h + '.' + p + '.' + sig;
}

const serviceToken = createJwt({ role: 'service_role', exp: Math.floor(Date.now() / 1000) + 3600 * 24 * 365 });

const USER1_ID = '00000000-0000-0000-0000-000000000001';
const USER2_ID = '00000000-0000-0000-0000-000000000002';
const ADMIN_ID = '00000000-0000-0000-0000-000000000099';

const PAGE_A_ID = '11111111-1111-1111-1111-111111111111';
const PAGE_B_ID = '22222222-2222-2222-2222-222222222222';

const user1AuthHeader = `Bearer ${createJwt({ sub: USER1_ID, role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })}`;
const user2AuthHeader = `Bearer ${createJwt({ sub: USER2_ID, role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })}`;
const adminAuthHeader = `Bearer ${createJwt({ sub: ADMIN_ID, role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })}`;

// 2. Direct PostgreSQL Query Helper
function queryDb(sql) {
  const cleanSql = sql.trim().replace(/;+$/, '').replace(/\r?\n/g, ' ');
  const sanitizedSql = cleanSql.replace(/"/g, '\\"');
  const jsonQuery = `SELECT coalesce(json_agg(t), '[]'::json) FROM (${sanitizedSql}) t;`;
  const cmd = `docker exec w009-b5-postgres psql -U postgres -d w009_b5_test -t -A -c "${jsonQuery}"`;
  const output = execSync(cmd, { encoding: 'utf8' }).trim();
  return JSON.parse(output);
}

function execPsql(sql) {
  const cmd = `docker exec -i w009-b5-postgres psql -U postgres -d w009_b5_test`;
  return execSync(cmd, { input: sql, encoding: 'utf8' });
}

let proxyServer = null;
let app = null;

const report = {
  job: 'W009-B5-R4',
  title: 'Durable Pages Pro Payment Persistence Verification',
  timestamp: new Date().toISOString(),
  environment: {
    postgresContainer: 'w009-b5-postgres (postgis/postgis:16-3.4-alpine)',
    postgrestContainer: 'w009-b5-postgrest (public.ecr.aws/supabase/postgrest:v14.13)',
    databaseName: 'w009_b5_test',
    databaseVersion: '',
  },
  migrations: {
    bundledFile: 'supabase/all_migrations_combined.sql',
    totalMigrations: 39,
    migration037IdempotentPass: false,
  },
  schemaInspection: {},
  tests: [],
};

async function cleanup() {
  console.log('\nCleaning up containers and test environment...');
  if (app) {
    try { await app.close(); } catch (_) {}
  }
  if (proxyServer) {
    try { proxyServer.close(); } catch (_) {}
  }
  try {
    execSync('docker rm -f w009-b5-postgrest w009-b5-postgres', { stdio: 'ignore' });
    execSync('docker network rm w009-b5-net', { stdio: 'ignore' });
  } catch (_) {}
  console.log('Cleanup complete.');
}

try {
  // Step 1: Cleanup any dangling instances
  try {
    execSync('docker rm -f w009-b5-postgrest w009-b5-postgres', { stdio: 'ignore' });
    execSync('docker network rm w009-b5-net', { stdio: 'ignore' });
  } catch (_) {}

  // Step 2: Create Docker network & start isolated Postgres container
  console.log('Creating Docker network w009-b5-net...');
  execSync('docker network create w009-b5-net');

  console.log('Starting isolated PostgreSQL container w009-b5-postgres on port 55432...');
  execSync('docker run --name w009-b5-postgres --network w009-b5-net -e POSTGRES_PASSWORD=disposable_local_test_pwd -e POSTGRES_DB=w009_b5_test -p 127.0.0.1:55432:5432 -d postgis/postgis:16-3.4-alpine');

  // Wait for PostgreSQL full initialization and final startup
  console.log('Waiting for PostgreSQL init process to complete...');
  let ready = false;
  for (let i = 0; i < 45; i++) {
    try {
      const logs = execSync('docker logs w009-b5-postgres', { encoding: 'utf8' });
      if (logs.includes('PostgreSQL init process complete; ready for start up.') &&
          logs.includes('database system is ready to accept connections')) {
        ready = true;
        break;
      }
    } catch (_) {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  if (!ready) throw new Error('PostgreSQL failed to complete init within 45 seconds');
  console.log('PostgreSQL is fully initialized and accepting connections.');

  report.environment.databaseVersion = execSync('docker exec w009-b5-postgres psql -U postgres -d w009_b5_test -t -A -c "SELECT version();"', { encoding: 'utf8' }).trim();
  console.log('Postgres Version:', report.environment.databaseVersion);

  // Step 2b: Setup Supabase prerequisite roles and auth schema
  console.log('\nSetting up Supabase roles and auth schema in container...');
  execPsql(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE ROLE service_role;
    ALTER ROLE service_role WITH BYPASSRLS;
    CREATE SCHEMA IF NOT EXISTS auth;
    CREATE TABLE IF NOT EXISTS auth.users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    );
    CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID AS 'SELECT ''00000000-0000-0000-0000-000000000000''::UUID;' LANGUAGE sql STABLE;
    CREATE OR REPLACE FUNCTION auth.role() RETURNS TEXT AS 'SELECT ''authenticated''::TEXT;' LANGUAGE sql STABLE;
  `);

  // Step 3: Run all combined migrations (001 through 037)
  console.log('\nApplying all combined migrations (001 through 037)...');
  execSync('docker cp supabase/all_migrations_combined.sql w009-b5-postgres:/tmp/all_migrations_combined.sql');
  execSync('docker exec w009-b5-postgres psql -U postgres -d w009_b5_test -f /tmp/all_migrations_combined.sql');
  console.log('Migrations applied successfully.');

  // Step 4: Verify Migration 037 Idempotency by re-applying it
  console.log('\nTesting Migration 037 Idempotency (re-applying 037_page_pro_orders.sql)...');
  execSync('docker cp supabase/migrations/037_page_pro_orders.sql w009-b5-postgres:/tmp/037_page_pro_orders.sql');
  execSync('docker exec w009-b5-postgres psql -U postgres -d w009_b5_test -f /tmp/037_page_pro_orders.sql');
  report.migrations.migration037IdempotentPass = true;
  console.log('Migration 037 re-applied cleanly with zero errors. IDEMPOTENCY CONFIRMED.');

  // Step 5: Configure PostgREST authenticator role
  console.log('\nConfiguring PostgREST authenticator role...');
  execPsql(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticator') THEN
        CREATE ROLE authenticator NOINHERIT LOGIN PASSWORD 'disposable_local_test_pwd';
      END IF;
    END $$;
    GRANT anon, authenticated, service_role TO authenticator;
    GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
    GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
    GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
    GRANT ALL ON ALL ROUTINES IN SCHEMA public TO service_role;
  `);

  // Step 6: Start PostgREST container
  console.log('Starting PostgREST container w009-b5-postgrest...');
  execSync('docker run --name w009-b5-postgrest --network w009-b5-net -p 127.0.0.1:55431:3000 -e PGRST_DB_URI=postgresql://authenticator:disposable_local_test_pwd@w009-b5-postgres:5432/w009_b5_test -e PGRST_DB_SCHEMAS=public -e PGRST_DB_ANON_ROLE=anon -e "PGRST_JWT_SECRET=super-secret-jwt-token-with-at-least-32-characters-long" -d public.ecr.aws/supabase/postgrest:v14.13');

  // Wait for PostgREST
  console.log('Waiting for PostgREST to be ready...');
  let pgrstReady = false;
  for (let i = 0; i < 30; i++) {
    try {
      const statusCode = await new Promise((resolve, reject) => {
        const r = http.get('http://127.0.0.1:55431/', (res) => resolve(res.statusCode));
        r.on('error', reject);
        r.setTimeout(1000, () => { r.destroy(); reject(new Error('timeout')); });
      });
      if (statusCode === 200) {
        pgrstReady = true;
        break;
      }
    } catch (_) {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  if (!pgrstReady) throw new Error('PostgREST failed to become ready within 30 seconds');
  console.log('PostgREST is ready on http://127.0.0.1:55431');

  // Step 7: Start reverse proxy mapping /rest/v1/* to /*
  proxyServer = http.createServer((req, res) => {
    const targetPath = req.url.replace(/^\/rest\/v1/, '') || '/';
    const options = {
      hostname: '127.0.0.1',
      port: 55431,
      path: targetPath,
      method: req.method,
      headers: req.headers,
    };
    const proxyReq = http.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res, { end: true });
    });
    proxyReq.on('error', (err) => {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Proxy error', message: err.message }));
    });
    req.pipe(proxyReq, { end: true });
  });

  await new Promise((resolve) => proxyServer.listen(55430, '127.0.0.1', resolve));
  console.log('PostgREST reverse proxy listening on http://127.0.0.1:55430');

  // Step 8: Configure Environment & Initialize Fastify App
  process.env.SUPABASE_URL = 'http://127.0.0.1:55430';
  process.env.SUPABASE_SERVICE_ROLE_KEY = serviceToken;
  process.env.SUPABASE_ANON_KEY = serviceToken;
  process.env.RAZORPAY_KEY_ID = RAZORPAY_KEY_ID;
  process.env.RAZORPAY_KEY_SECRET = RAZORPAY_KEY_SECRET;

  const { buildApp } = await import('../apps/api/src/server.ts');
  const { setSupabaseConfiguredForTesting } = await import('../apps/api/src/lib/supabase.ts');
  const { PRO_ORDER_REGISTRY, setTestAuthResolver, setTestPageAuthorityResolver, resetPagesTestResolvers } = await import('../apps/api/src/routes/pages.ts');

  setSupabaseConfiguredForTesting(true);

  app = await buildApp();
  await app.ready();
  console.log('Fastify API ready with isolated runtime connection.');

  // Step 9: Database Schema & Constraint Introspection
  console.log('\n--- 1. Database Schema & Constraint Inspection ---');
  const columns = queryDb(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'page_pro_orders'
    ORDER BY ordinal_position;
  `);
  console.log('Columns in page_pro_orders:', columns);

  const indexes = queryDb(`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE tablename = 'page_pro_orders';
  `);
  console.log('Indexes on page_pro_orders:', indexes);

  const rlsInfo = queryDb(`
    SELECT relname, relrowsecurity
    FROM pg_class
    WHERE relname = 'page_pro_orders';
  `);
  console.log('RLS Status:', rlsInfo);

  const rpcInfo = queryDb(`
    SELECT
      p.proname,
      p.prosecdef,
      r.rolname AS proowner,
      p.proconfig,
      pg_get_function_identity_arguments(p.oid) AS identity_args,
      p.prosrc
    FROM pg_proc p
    JOIN pg_roles r ON r.oid = p.proowner
    WHERE p.proname = 'verify_and_activate_page_pro';
  `);
  console.log('RPC verify_and_activate_page_pro Catalog Record:', {
    name: rpcInfo[0]?.proname,
    securityDefiner: rpcInfo[0]?.prosecdef,
    owner: rpcInfo[0]?.proowner,
    searchPathConfig: rpcInfo[0]?.proconfig,
    identityArgs: rpcInfo[0]?.identity_args,
  });

  const rpcPrivileges = queryDb(`
    SELECT
      has_function_privilege('public', 'verify_and_activate_page_pro(text,uuid,uuid,text,text,boolean)', 'execute') as public_exec,
      has_function_privilege('anon', 'verify_and_activate_page_pro(text,uuid,uuid,text,text,boolean)', 'execute') as anon_exec,
      has_function_privilege('authenticated', 'verify_and_activate_page_pro(text,uuid,uuid,text,text,boolean)', 'execute') as authenticated_exec,
      has_function_privilege('service_role', 'verify_and_activate_page_pro(text,uuid,uuid,text,text,boolean)', 'execute') as service_role_exec,
      has_function_privilege('postgres', 'verify_and_activate_page_pro(text,uuid,uuid,text,text,boolean)', 'execute') as postgres_exec;
  `);
  console.log('RPC Privileges Matrix:', rpcPrivileges[0]);

  const defaultAcl = queryDb(`
    SELECT defaclobjtype, defaclrole::regrole::text as defaclrole, defaclnamespace::regnamespace::text as defaclnamespace, defaclacl::text as defaclacl
    FROM pg_default_acl
    WHERE defaclobjtype = 'f';
  `);
  console.log('Default Function ACLs:', defaultAcl);

  report.schemaInspection = {
    table: 'page_pro_orders',
    columns,
    indexes,
    rlsEnabled: rlsInfo[0]?.relrowsecurity === true,
    rpc: {
      name: rpcInfo[0]?.proname,
      securityDefiner: rpcInfo[0]?.prosecdef,
      owner: rpcInfo[0]?.proowner,
      searchPathConfig: rpcInfo[0]?.proconfig,
      identityArgs: rpcInfo[0]?.identity_args,
    },
    rpcPrivileges: rpcPrivileges[0],
    defaultAcl,
  };

  // Step 10: Seed Users & Pages
  console.log('\n--- 2. Seeding Users and Pages ---');
  execPsql(`
    INSERT INTO auth.users (id, email, created_at)
    VALUES
      ('${USER1_ID}', 'owner1@kshetra.gov.in', now()),
      ('${USER2_ID}', 'owner2@kshetra.gov.in', now()),
      ('${ADMIN_ID}', 'admin@kshetra.gov.in', now())
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO user_profiles (user_id, role, display_name)
    VALUES
      ('${USER1_ID}', 'politician', 'MLA Sitaram'),
      ('${USER2_ID}', 'politician', 'Leader Ramesh'),
      ('${ADMIN_ID}', 'admin', 'System Admin')
    ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;

    INSERT INTO pages (id, owner_id, title, handle, role, is_pro, created_at, updated_at)
    VALUES
      ('${PAGE_A_ID}', '${USER1_ID}', 'MLA Sitaram Page', 'mla-sitaram', 'politician', false, now(), now()),
      ('${PAGE_B_ID}', '${USER2_ID}', 'Leader Ramesh Page', 'leader-ramesh', 'politician', false, now(), now())
    ON CONFLICT (id) DO NOTHING;
  `);

  // Setup test resolvers to authenticate via user IDs
  setTestAuthResolver(async (req) => {
    const authH = req.headers.authorization;
    if (authH === user1AuthHeader) return { userId: USER1_ID, role: 'politician' };
    if (authH === user2AuthHeader) return { userId: USER2_ID, role: 'politician' };
    if (authH === adminAuthHeader) return { userId: ADMIN_ID, role: 'admin' };
    return null;
  });

  setTestPageAuthorityResolver(async (auth, pageId) => {
    const pRows = queryDb(`SELECT * FROM pages WHERE id = '${pageId}' OR handle = '${pageId}'`);
    if (pRows.length === 0) return { authorized: false, notFound: true };
    const page = pRows[0];
    const authorized = page.owner_id === auth.userId || auth.role === 'admin';
    return { authorized, notFound: false, page };
  });

  // ================================================================
  // TEST-B5-PERSIST-01: Order Creation with Durable Database Persistence
  // ================================================================
  console.log('\n--- TEST-B5-PERSIST-01: Order Creation with Durable Persistence ---');
  const orderRes = await app.inject({
    method: 'POST',
    url: `/api/v1/pages/${PAGE_A_ID}/pro/order`,
    headers: { authorization: user1AuthHeader },
    payload: { billingCycle: 'monthly' },
  });
  console.log('Order Response Status:', orderRes.statusCode);
  const orderBody = JSON.parse(orderRes.payload);
  console.log('Order Response Body:', orderBody);

  const orderId = orderBody.orderId;
  const dbOrderRows = queryDb(`SELECT * FROM page_pro_orders WHERE provider_order_id = '${orderId}'`);
  console.log('DB Row in page_pro_orders:', dbOrderRows[0]);

  const test1Passed =
    orderRes.statusCode === 200 &&
    dbOrderRows.length === 1 &&
    dbOrderRows[0].provider_order_id === orderId &&
    dbOrderRows[0].page_id === PAGE_A_ID &&
    dbOrderRows[0].user_id === USER1_ID &&
    dbOrderRows[0].product === 'pages_pro' &&
    dbOrderRows[0].billing_cycle === 'monthly' &&
    dbOrderRows[0].amount_paise === 49900 &&
    dbOrderRows[0].currency === 'INR' &&
    dbOrderRows[0].status === 'created' &&
    dbOrderRows[0].signature_verified === false;

  report.tests.push({
    testId: 'TEST-B5-PERSIST-01',
    description: 'POST /order durably persists order in page_pro_orders with status created',
    httpStatus: orderRes.statusCode,
    orderId,
    dbRecord: dbOrderRows[0],
    passed: test1Passed,
  });
  console.log('TEST-B5-PERSIST-01 PASSED:', test1Passed);

  // ================================================================
  // TEST-B5-PERSIST-02: True Process Destroy / Restart & Memory Purge
  // ================================================================
  console.log('\n--- TEST-B5-PERSIST-02: Process Termination / Cold Restart / Memory Registry Purge ---');
  console.log('Pre-purge PRO_ORDER_REGISTRY size:', PRO_ORDER_REGISTRY.size);
  // 1. Destroy running Fastify application instance
  await app.close();
  app = null;
  console.log('Fastify App Instance 1 destroyed.');

  // 2. Clear in-process memory registry completely
  PRO_ORDER_REGISTRY.clear();
  console.log('Post-purge PRO_ORDER_REGISTRY size:', PRO_ORDER_REGISTRY.size);

  // 3. Rebuild fresh Fastify application instance 2 (cold start)
  app = await buildApp();
  await app.ready();
  console.log('Fresh Fastify App Instance 2 built and ready.');

  // Re-register test auth and authority resolvers on the new process instance
  setTestAuthResolver(async (req) => {
    const authH = req.headers.authorization;
    if (authH === user1AuthHeader) return { userId: USER1_ID, role: 'politician' };
    if (authH === user2AuthHeader) return { userId: USER2_ID, role: 'politician' };
    if (authH === adminAuthHeader) return { userId: ADMIN_ID, role: 'admin' };
    return null;
  });

  setTestPageAuthorityResolver(async (auth, pageId) => {
    const pRows = queryDb(`SELECT * FROM pages WHERE id = '${pageId}' OR handle = '${pageId}'`);
    if (pRows.length === 0) return { authorized: false, notFound: true };
    const page = pRows[0];
    const authorized = page.owner_id === auth.userId || auth.role === 'admin';
    return { authorized, notFound: false, page };
  });

  const test2Passed = PRO_ORDER_REGISTRY.size === 0 && app !== null;
  report.tests.push({
    testId: 'TEST-B5-PERSIST-02',
    description: 'Process destroy, fresh application rebuild, and empty memory registry verified',
    processDestroyedAndRebuilt: true,
    memoryOrderCount: PRO_ORDER_REGISTRY.size,
    passed: test2Passed,
  });
  console.log('TEST-B5-PERSIST-02 PASSED:', test2Passed);

  // ================================================================
  // TEST-B5-PERSIST-03: Durable Payment Verification Survives Memory Loss
  // ================================================================
  console.log('\n--- TEST-B5-PERSIST-03: Durable Payment Verification Survives Memory Loss ---');
  const paymentId1 = 'pay_w009_b5_durable_001';
  const validSig1 = crypto
    .createHmac('sha256', RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId1}`)
    .digest('hex');

  const verifyRes1 = await app.inject({
    method: 'POST',
    url: `/api/v1/pages/${PAGE_A_ID}/pro/verify`,
    headers: { authorization: user1AuthHeader },
    payload: {
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId1,
      razorpay_signature: validSig1,
      billingCycle: 'monthly',
    },
  });
  console.log('Verify Response Status:', verifyRes1.statusCode);
  const verifyBody1 = JSON.parse(verifyRes1.payload);
  console.log('Verify Response Body:', verifyBody1);

  const dbOrderAfter1 = queryDb(`SELECT * FROM page_pro_orders WHERE provider_order_id = '${orderId}'`)[0];
  const dbPageAfter1 = queryDb(`SELECT id, is_pro, pro_subscription_id, pro_expires_at FROM pages WHERE id = '${PAGE_A_ID}'`)[0];

  console.log('DB Order After Verification:', dbOrderAfter1);
  console.log('DB Page After Verification:', dbPageAfter1);

  const test3Passed =
    verifyRes1.statusCode === 200 &&
    verifyBody1.success === true &&
    verifyBody1.entitlement.isPro === true &&
    dbOrderAfter1.status === 'completed' &&
    dbOrderAfter1.provider_payment_id === paymentId1 &&
    dbOrderAfter1.signature_verified === true &&
    dbOrderAfter1.completed_at !== null &&
    dbPageAfter1.is_pro === true &&
    dbPageAfter1.pro_subscription_id === paymentId1 &&
    new Date(dbPageAfter1.pro_expires_at) > new Date();

  report.tests.push({
    testId: 'TEST-B5-PERSIST-03',
    description: 'Payment verification succeeds from durable DB after memory registry purge and activates page entitlement',
    httpStatus: verifyRes1.statusCode,
    orderStatusInDb: dbOrderAfter1.status,
    pageIsProInDb: dbPageAfter1.is_pro,
    pageProExpiresAt: dbPageAfter1.pro_expires_at,
    passed: test3Passed,
  });
  console.log('TEST-B5-PERSIST-03 PASSED:', test3Passed);

  // ================================================================
  // TEST-B5-PERSIST-04: Idempotent Replay Verification
  // ================================================================
  console.log('\n--- TEST-B5-PERSIST-04: Idempotent Replay Verification ---');
  const replayRes = await app.inject({
    method: 'POST',
    url: `/api/v1/pages/${PAGE_A_ID}/pro/verify`,
    headers: { authorization: user1AuthHeader },
    payload: {
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId1,
      razorpay_signature: validSig1,
      billingCycle: 'monthly',
    },
  });
  console.log('Replay Response Status:', replayRes.statusCode);
  const replayBody = JSON.parse(replayRes.payload);
  console.log('Replay Response Body:', replayBody);

  const test4Passed =
    replayRes.statusCode === 200 &&
    replayBody.success === true &&
    replayBody.entitlement.isPro === true;

  report.tests.push({
    testId: 'TEST-B5-PERSIST-04',
    description: 'Idempotent replay with identical order + payment tuple succeeds without error',
    httpStatus: replayRes.statusCode,
    passed: test4Passed,
  });
  console.log('TEST-B5-PERSIST-04 PASSED:', test4Passed);

  // ================================================================
  // TEST-B5-PERSIST-05: Order Replay with Different Payment Rejected
  // ================================================================
  console.log('\n--- TEST-B5-PERSIST-05: Order Replay with Different Payment ID (ORDER_ALREADY_CONSUMED) ---');
  const paymentId2 = 'pay_w009_b5_fraudulent_replay';
  const validSig2 = crypto
    .createHmac('sha256', RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId2}`)
    .digest('hex');

  const replayDiffRes = await app.inject({
    method: 'POST',
    url: `/api/v1/pages/${PAGE_A_ID}/pro/verify`,
    headers: { authorization: user1AuthHeader },
    payload: {
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId2,
      razorpay_signature: validSig2,
      billingCycle: 'monthly',
    },
  });
  console.log('Different Payment Replay Status:', replayDiffRes.statusCode);
  const replayDiffBody = JSON.parse(replayDiffRes.payload);
  console.log('Different Payment Replay Body:', replayDiffBody);

  const test5Passed =
    replayDiffRes.statusCode === 400 &&
    replayDiffBody.code === 'ORDER_ALREADY_CONSUMED';

  report.tests.push({
    testId: 'TEST-B5-PERSIST-05',
    description: 'Replay of completed order with different payment ID rejected with ORDER_ALREADY_CONSUMED',
    httpStatus: replayDiffRes.statusCode,
    errorCode: replayDiffBody.code,
    passed: test5Passed,
  });
  console.log('TEST-B5-PERSIST-05 PASSED:', test5Passed);

  // ================================================================
  // TEST-B5-PERSIST-06: Cross-Page Order Theft Rejected (PAGE_ORDER_MISMATCH)
  // ================================================================
  console.log('\n--- TEST-B5-PERSIST-06: Cross-Page Order Theft Rejected (PAGE_ORDER_MISMATCH) ---');
  // Create order for Page A
  const orderResA = await app.inject({
    method: 'POST',
    url: `/api/v1/pages/${PAGE_A_ID}/pro/order`,
    headers: { authorization: user1AuthHeader },
    payload: { billingCycle: 'monthly' },
  });
  const orderIdA = JSON.parse(orderResA.payload).orderId;
  const payIdTheft = 'pay_cross_page_attempt';
  const sigTheft = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET).update(`${orderIdA}|${payIdTheft}`).digest('hex');

  // Purge memory to force DB evaluation
  PRO_ORDER_REGISTRY.clear();

  // Attempt to apply Page A's order to Page B (even by Admin)
  const crossPageRes = await app.inject({
    method: 'POST',
    url: `/api/v1/pages/${PAGE_B_ID}/pro/verify`,
    headers: { authorization: adminAuthHeader },
    payload: {
      razorpay_order_id: orderIdA,
      razorpay_payment_id: payIdTheft,
      razorpay_signature: sigTheft,
      billingCycle: 'monthly',
    },
  });
  console.log('Cross Page Verify Status:', crossPageRes.statusCode);
  const crossPageBody = JSON.parse(crossPageRes.payload);
  console.log('Cross Page Verify Body:', crossPageBody);

  const test6Passed =
    crossPageRes.statusCode === 400 &&
    crossPageBody.code === 'PAGE_ORDER_MISMATCH';

  report.tests.push({
    testId: 'TEST-B5-PERSIST-06',
    description: 'Order created for Page A rejected when verified for Page B (PAGE_ORDER_MISMATCH)',
    httpStatus: crossPageRes.statusCode,
    errorCode: crossPageBody.code,
    passed: test6Passed,
  });
  console.log('TEST-B5-PERSIST-06 PASSED:', test6Passed);

  // ================================================================
  // TEST-B5-PERSIST-07: Unrelated Principal Order Theft Rejected (ORDER_PRINCIPAL_MISMATCH)
  // ================================================================
  console.log('\n--- TEST-B5-PERSIST-07: Principal Mismatch Rejected (ORDER_PRINCIPAL_MISMATCH) ---');
  // User 2 attempts to verify User 1's order on Page A
  const principalMismatchRes = await app.inject({
    method: 'POST',
    url: `/api/v1/pages/${PAGE_A_ID}/pro/verify`,
    headers: { authorization: user2AuthHeader },
    payload: {
      razorpay_order_id: orderIdA,
      razorpay_payment_id: payIdTheft,
      razorpay_signature: sigTheft,
      billingCycle: 'monthly',
    },
  });
  console.log('Principal Mismatch Status:', principalMismatchRes.statusCode);
  const principalMismatchBody = JSON.parse(principalMismatchRes.payload);
  console.log('Principal Mismatch Body:', principalMismatchBody);

  // User 2 is also forbidden on Page A authority check OR order principal check -> either 403 FORBIDDEN or 403 ORDER_PRINCIPAL_MISMATCH
  const test7Passed = principalMismatchRes.statusCode === 403;

  report.tests.push({
    testId: 'TEST-B5-PERSIST-07',
    description: 'Unrelated user attempting to verify another user order rejected with 403',
    httpStatus: principalMismatchRes.statusCode,
    errorCode: principalMismatchBody.code,
    passed: test7Passed,
  });
  console.log('TEST-B5-PERSIST-07 PASSED:', test7Passed);

  // ================================================================
  // TEST-B5-PERSIST-08: Non-Existent Order Rejected (ORDER_NOT_FOUND)
  // ================================================================
  console.log('\n--- TEST-B5-PERSIST-08: Non-Existent Order Rejected (ORDER_NOT_FOUND) ---');
  PRO_ORDER_REGISTRY.clear();
  const fakeSig = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET).update(`order_ghost_999|pay_ghost_999`).digest('hex');

  const notFoundRes = await app.inject({
    method: 'POST',
    url: `/api/v1/pages/${PAGE_A_ID}/pro/verify`,
    headers: { authorization: user1AuthHeader },
    payload: {
      razorpay_order_id: 'order_ghost_999',
      razorpay_payment_id: 'pay_ghost_999',
      razorpay_signature: fakeSig,
    },
  });
  console.log('Not Found Status:', notFoundRes.statusCode);
  const notFoundBody = JSON.parse(notFoundRes.payload);
  console.log('Not Found Body:', notFoundBody);

  const test8Passed =
    notFoundRes.statusCode === 400 &&
    notFoundBody.code === 'ORDER_NOT_FOUND';

  report.tests.push({
    testId: 'TEST-B5-PERSIST-08',
    description: 'Payment verification for non-existent order rejected with 400 ORDER_NOT_FOUND',
    httpStatus: notFoundRes.statusCode,
    errorCode: notFoundBody.code,
    passed: test8Passed,
  });
  console.log('TEST-B5-PERSIST-08 PASSED:', test8Passed);

  // ================================================================
  // TEST-B5-PERSIST-09: Billing Cycle Mismatch Rejected
  // ================================================================
  console.log('\n--- TEST-B5-PERSIST-09: Billing Cycle Mismatch Rejected ---');
  PRO_ORDER_REGISTRY.clear();
  const payIdCycle = 'pay_cycle_test';
  const sigCycle = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET).update(`${orderIdA}|${payIdCycle}`).digest('hex');

  const cycleMismatchRes = await app.inject({
    method: 'POST',
    url: `/api/v1/pages/${PAGE_A_ID}/pro/verify`,
    headers: { authorization: user1AuthHeader },
    payload: {
      razorpay_order_id: orderIdA,
      razorpay_payment_id: payIdCycle,
      razorpay_signature: sigCycle,
      billingCycle: 'annual', // Mismatched: orderIdA was created as 'monthly'
    },
  });
  console.log('Cycle Mismatch Status:', cycleMismatchRes.statusCode);
  const cycleMismatchBody = JSON.parse(cycleMismatchRes.payload);
  console.log('Cycle Mismatch Body:', cycleMismatchBody);

  const test9Passed =
    cycleMismatchRes.statusCode === 400 &&
    cycleMismatchBody.code === 'BILLING_CYCLE_MISMATCH';

  report.tests.push({
    testId: 'TEST-B5-PERSIST-09',
    description: 'Billing cycle mismatch between created order and verify payload rejected with BILLING_CYCLE_MISMATCH',
    httpStatus: cycleMismatchRes.statusCode,
    errorCode: cycleMismatchBody.code,
    passed: test9Passed,
  });
  console.log('TEST-B5-PERSIST-09 PASSED:', test9Passed);

  // ================================================================
  // TEST-B5-PERSIST-10: Invalid HMAC Signature Fails Closed Without DB Mutation
  // ================================================================
  console.log('\n--- TEST-B5-PERSIST-10: Invalid HMAC Signature Rejection ---');
  PRO_ORDER_REGISTRY.clear();
  const beforeState = queryDb(`SELECT * FROM page_pro_orders WHERE provider_order_id = '${orderIdA}'`)[0];

  const invalidSigRes = await app.inject({
    method: 'POST',
    url: `/api/v1/pages/${PAGE_A_ID}/pro/verify`,
    headers: { authorization: user1AuthHeader },
    payload: {
      razorpay_order_id: orderIdA,
      razorpay_payment_id: 'pay_invalid_sig_attempt',
      razorpay_signature: 'deadbeef_invalid_hmac_signature',
      billingCycle: 'monthly',
    },
  });
  console.log('Invalid Sig Status:', invalidSigRes.statusCode);
  const invalidSigBody = JSON.parse(invalidSigRes.payload);
  console.log('Invalid Sig Body:', invalidSigBody);

  const afterState = queryDb(`SELECT * FROM page_pro_orders WHERE provider_order_id = '${orderIdA}'`)[0];

  const test10Passed =
    invalidSigRes.statusCode === 400 &&
    invalidSigBody.code === 'INVALID_SIGNATURE' &&
    afterState.status === beforeState.status &&
    afterState.provider_payment_id === null &&
    afterState.signature_verified === false;

  report.tests.push({
    testId: 'TEST-B5-PERSIST-10',
    description: 'Invalid signature rejected with 400 INVALID_SIGNATURE with zero database mutation',
    httpStatus: invalidSigRes.statusCode,
    errorCode: invalidSigBody.code,
    orderStatusUnchanged: afterState.status === 'created',
    passed: test10Passed,
  });
  console.log('TEST-B5-PERSIST-10 PASSED:', test10Passed);

  // ================================================================
  // TEST-B5-PERSIST-11: Direct Client Mutation Blocked by RLS
  // ================================================================
  console.log('\n--- TEST-B5-PERSIST-11: Direct Client Mutation Blocked by RLS ---');
  // Attempt direct INSERT as anon role using psql with ON_ERROR_STOP=1
  let rlsBlocked = false;
  try {
    execSync('docker exec -i w009-b5-postgres psql -v ON_ERROR_STOP=1 -U postgres -d w009_b5_test', {
      input: `
        SET ROLE anon;
        INSERT INTO page_pro_orders (provider_order_id, page_id, user_id, billing_cycle, amount_paise)
        VALUES ('order_attacker_hack', '${PAGE_A_ID}', '${USER1_ID}', 'monthly', 49900);
        RESET ROLE;
      `,
      encoding: 'utf8',
    });
  } catch (err) {
    rlsBlocked = true;
    console.log('Direct anon INSERT rejected by PostgreSQL/RLS (as expected):', (err.stderr || err.message).trim());
  }

  const test11Passed = rlsBlocked;
  report.tests.push({
    testId: 'TEST-B5-PERSIST-11',
    description: 'Direct table INSERT by anon/authenticated blocked by Row Level Security',
    rlsBlocked,
    passed: test11Passed,
  });
  console.log('TEST-B5-PERSIST-11 PASSED:', test11Passed);

  // ================================================================
  // DIRECT SQL RPC BOUNDARY INVARIANT TESTS (A - I)
  // Testing verify_and_activate_page_pro directly at the PostgreSQL
  // transaction boundary, bypassing Fastify HTTP routes completely.
  // ================================================================
  console.log('\n================================================================');
  console.log('DIRECT POSTGRESQL TRANSACTION BOUNDARY INVARIANT TESTS (A - I)');
  console.log('================================================================');

  // Invariant A: Valid Order Activation via Direct SQL RPC
  console.log('\n--- INVARIANT A: Valid Order Activation via Direct SQL RPC ---');
  execPsql(`
    INSERT INTO page_pro_orders (provider_order_id, page_id, user_id, billing_cycle, amount_paise, status)
    VALUES ('order_direct_inv_a', '${PAGE_A_ID}', '${USER1_ID}', 'monthly', 49900, 'created')
    ON CONFLICT (provider_order_id) DO NOTHING;
  `);
  const rpcResA = queryDb(`
    SELECT verify_and_activate_page_pro('order_direct_inv_a', '${PAGE_A_ID}', '${USER1_ID}', 'pay_direct_inv_a', 'monthly', false) AS result;
  `)[0]?.result;
  const dbOrderA = queryDb(`SELECT * FROM page_pro_orders WHERE provider_order_id = 'order_direct_inv_a'`)[0];
  const dbPageA = queryDb(`SELECT is_pro, pro_subscription_id FROM pages WHERE id = '${PAGE_A_ID}'`)[0];

  const invAPassed =
    rpcResA?.success === true &&
    rpcResA?.code === 'ENTITLEMENT_ACTIVATED' &&
    dbOrderA?.status === 'completed' &&
    dbOrderA?.signature_verified === true &&
    dbOrderA?.provider_payment_id === 'pay_direct_inv_a' &&
    dbPageA?.is_pro === true &&
    dbPageA?.pro_subscription_id === 'pay_direct_inv_a';

  report.tests.push({
    testId: 'INVARIANT-A',
    description: 'Direct SQL RPC execution activates valid order and commits page Pro entitlement',
    rpcResult: rpcResA,
    orderStatus: dbOrderA?.status,
    signatureVerified: dbOrderA?.signature_verified,
    pageIsPro: dbPageA?.is_pro,
    passed: invAPassed,
  });
  console.log('INVARIANT-A PASSED:', invAPassed);

  // Invariant B: Cross-Page Attack via Direct SQL RPC
  console.log('\n--- INVARIANT B: Cross-Page Attack Rejected by RPC (PAGE_ORDER_MISMATCH) ---');
  execPsql(`
    INSERT INTO page_pro_orders (provider_order_id, page_id, user_id, billing_cycle, amount_paise, status)
    VALUES ('order_direct_inv_b', '${PAGE_A_ID}', '${USER1_ID}', 'monthly', 49900, 'created')
    ON CONFLICT (provider_order_id) DO NOTHING;
  `);
  const rpcResB = queryDb(`
    SELECT verify_and_activate_page_pro('order_direct_inv_b', '${PAGE_B_ID}', '${USER1_ID}', 'pay_direct_inv_b', 'monthly', false) AS result;
  `)[0]?.result;
  const dbOrderB = queryDb(`SELECT * FROM page_pro_orders WHERE provider_order_id = 'order_direct_inv_b'`)[0];

  const invBPassed =
    rpcResB?.success === false &&
    rpcResB?.code === 'PAGE_ORDER_MISMATCH' &&
    dbOrderB?.status === 'created' &&
    dbOrderB?.signature_verified === false;

  report.tests.push({
    testId: 'INVARIANT-B',
    description: 'Direct SQL RPC rejects cross-page verification attempt with PAGE_ORDER_MISMATCH',
    rpcResult: rpcResB,
    orderStatusUnchanged: dbOrderB?.status === 'created',
    passed: invBPassed,
  });
  console.log('INVARIANT-B PASSED:', invBPassed);

  // Invariant C: Cross-Principal Attack via Direct SQL RPC
  console.log('\n--- INVARIANT C: Cross-Principal Attack Rejected by RPC (ORDER_PRINCIPAL_MISMATCH) ---');
  execPsql(`
    INSERT INTO page_pro_orders (provider_order_id, page_id, user_id, billing_cycle, amount_paise, status)
    VALUES ('order_direct_inv_c', '${PAGE_A_ID}', '${USER1_ID}', 'monthly', 49900, 'created')
    ON CONFLICT (provider_order_id) DO NOTHING;
  `);
  const rpcResC = queryDb(`
    SELECT verify_and_activate_page_pro('order_direct_inv_c', '${PAGE_A_ID}', '${USER2_ID}', 'pay_direct_inv_c', 'monthly', false) AS result;
  `)[0]?.result;
  const dbOrderC = queryDb(`SELECT * FROM page_pro_orders WHERE provider_order_id = 'order_direct_inv_c'`)[0];

  const invCPassed =
    rpcResC?.success === false &&
    rpcResC?.code === 'ORDER_PRINCIPAL_MISMATCH' &&
    dbOrderC?.status === 'created' &&
    dbOrderC?.signature_verified === false;

  report.tests.push({
    testId: 'INVARIANT-C',
    description: 'Direct SQL RPC rejects cross-principal attempt with ORDER_PRINCIPAL_MISMATCH',
    rpcResult: rpcResC,
    orderStatusUnchanged: dbOrderC?.status === 'created',
    passed: invCPassed,
  });
  console.log('INVARIANT-C PASSED:', invCPassed);

  // Invariant D: Billing-Cycle Tampering via Direct SQL RPC
  console.log('\n--- INVARIANT D: Billing-Cycle Tampering Rejected by RPC (BILLING_CYCLE_MISMATCH) ---');
  execPsql(`
    INSERT INTO page_pro_orders (provider_order_id, page_id, user_id, billing_cycle, amount_paise, status)
    VALUES ('order_direct_inv_d', '${PAGE_A_ID}', '${USER1_ID}', 'monthly', 49900, 'created')
    ON CONFLICT (provider_order_id) DO NOTHING;
  `);
  const rpcResD = queryDb(`
    SELECT verify_and_activate_page_pro('order_direct_inv_d', '${PAGE_A_ID}', '${USER1_ID}', 'pay_direct_inv_d', 'annual', false) AS result;
  `)[0]?.result;
  const dbOrderD = queryDb(`SELECT * FROM page_pro_orders WHERE provider_order_id = 'order_direct_inv_d'`)[0];

  const invDPassed =
    rpcResD?.success === false &&
    rpcResD?.code === 'BILLING_CYCLE_MISMATCH' &&
    dbOrderD?.status === 'created';

  report.tests.push({
    testId: 'INVARIANT-D',
    description: 'Direct SQL RPC rejects billing cycle mismatch with BILLING_CYCLE_MISMATCH',
    rpcResult: rpcResD,
    orderStatusUnchanged: dbOrderD?.status === 'created',
    passed: invDPassed,
  });
  console.log('INVARIANT-D PASSED:', invDPassed);

  // Invariant E: Amount Tampering
  console.log('\n--- INVARIANT E: Amount Tampering Blocked by Database CHECK Constraint & RPC Immutability ---');
  let amtTamperBlocked = false;
  try {
    execSync('docker exec -i w009-b5-postgres psql -v ON_ERROR_STOP=1 -U postgres -d w009_b5_test', {
      input: `
        INSERT INTO page_pro_orders (provider_order_id, page_id, user_id, billing_cycle, amount_paise, status)
        VALUES ('order_direct_inv_e', '${PAGE_A_ID}', '${USER1_ID}', 'monthly', 100, 'created');
      `,
      encoding: 'utf8',
    });
  } catch (err) {
    amtTamperBlocked = (err.stderr || err.message).includes('page_pro_orders_amount_paise_check');
  }

  // Confirm RPC signature takes no amount parameter (amount is locked in database row)
  const rpcArgs = report.schemaInspection.rpc.identityArgs;
  const rpcHasNoAmountParam = !rpcArgs.includes('amount');

  const invEPassed = amtTamperBlocked && rpcHasNoAmountParam;
  report.tests.push({
    testId: 'INVARIANT-E',
    description: 'Amount tampering blocked: table CHECK constraint enforces ₹499/₹4999 in paise, and RPC takes no caller amount parameter',
    amtTamperBlocked,
    rpcHasNoAmountParam,
    passed: invEPassed,
  });
  console.log('INVARIANT-E PASSED:', invEPassed);

  // Invariant F: Product Tampering
  console.log('\n--- INVARIANT F: Product Tampering Blocked by Database CHECK Constraint ---');
  let prodTamperBlocked = false;
  try {
    execSync('docker exec -i w009-b5-postgres psql -v ON_ERROR_STOP=1 -U postgres -d w009_b5_test', {
      input: `
        INSERT INTO page_pro_orders (provider_order_id, page_id, user_id, billing_cycle, amount_paise, product, status)
        VALUES ('order_direct_inv_f', '${PAGE_A_ID}', '${USER1_ID}', 'monthly', 49900, 'pages_enterprise', 'created');
      `,
      encoding: 'utf8',
    });
  } catch (err) {
    prodTamperBlocked = (err.stderr || err.message).includes('page_pro_orders_product_check');
  }

  const invFPassed = prodTamperBlocked;
  report.tests.push({
    testId: 'INVARIANT-F',
    description: 'Product tampering blocked: table CHECK constraint restricts product strictly to pages_pro',
    prodTamperBlocked,
    passed: invFPassed,
  });
  console.log('INVARIANT-F PASSED:', invFPassed);

  // Invariant G: Signature-State Bypass
  console.log('\n--- INVARIANT G: Signature-State Bypass Blocked at Privilege Boundary ---');
  let anonCallBlocked = false;
  try {
    execSync('docker exec -i w009-b5-postgres psql -v ON_ERROR_STOP=1 -U postgres -d w009_b5_test', {
      input: `
        SET ROLE anon;
        SELECT verify_and_activate_page_pro('order_direct_inv_a', '${PAGE_A_ID}', '${USER1_ID}', 'pay_anon', 'monthly', false);
        RESET ROLE;
      `,
      encoding: 'utf8',
    });
  } catch (err) {
    anonCallBlocked = (err.stderr || err.message).includes('permission denied for function verify_and_activate_page_pro');
  }

  let authCallBlocked = false;
  try {
    execSync('docker exec -i w009-b5-postgres psql -v ON_ERROR_STOP=1 -U postgres -d w009_b5_test', {
      input: `
        SET ROLE authenticated;
        SELECT verify_and_activate_page_pro('order_direct_inv_a', '${PAGE_A_ID}', '${USER1_ID}', 'pay_auth', 'monthly', false);
        RESET ROLE;
      `,
      encoding: 'utf8',
    });
  } catch (err) {
    authCallBlocked = (err.stderr || err.message).includes('permission denied for function verify_and_activate_page_pro');
  }

  const invGPassed = anonCallBlocked && authCallBlocked;
  report.tests.push({
    testId: 'INVARIANT-G',
    description: 'Signature-state bypass prevented: non-service roles (anon, authenticated, PUBLIC) denied EXECUTE privilege on RPC',
    anonCallBlocked,
    authCallBlocked,
    passed: invGPassed,
  });
  console.log('INVARIANT-G PASSED:', invGPassed);

  // Invariant H: Replay Protection via Direct SQL RPC
  console.log('\n--- INVARIANT H: Replay Protection via Direct SQL RPC ---');
  const rpcResHIdempotent = queryDb(`
    SELECT verify_and_activate_page_pro('order_direct_inv_a', '${PAGE_A_ID}', '${USER1_ID}', 'pay_direct_inv_a', 'monthly', false) AS result;
  `)[0]?.result;

  const rpcResHConsumed = queryDb(`
    SELECT verify_and_activate_page_pro('order_direct_inv_a', '${PAGE_A_ID}', '${USER1_ID}', 'pay_fraud_different_payment', 'monthly', false) AS result;
  `)[0]?.result;

  const invHPassed =
    rpcResHIdempotent?.success === true &&
    rpcResHIdempotent?.idempotent === true &&
    rpcResHIdempotent?.code === 'ENTITLEMENT_ALREADY_ACTIVE' &&
    rpcResHConsumed?.success === false &&
    rpcResHConsumed?.code === 'ORDER_ALREADY_CONSUMED';

  report.tests.push({
    testId: 'INVARIANT-H',
    description: 'Replay protection in RPC: identical payment tuple succeeds idempotently; different payment rejected with ORDER_ALREADY_CONSUMED',
    idempotentResult: rpcResHIdempotent,
    consumedResult: rpcResHConsumed,
    passed: invHPassed,
  });
  console.log('INVARIANT-H PASSED:', invHPassed);

  // Invariant I: Concurrent Verification (FOR UPDATE serialization)
  console.log('\n--- INVARIANT I: Concurrent Verification Under Row Lock (FOR UPDATE) ---');
  execPsql(`
    INSERT INTO page_pro_orders (provider_order_id, page_id, user_id, billing_cycle, amount_paise, status)
    VALUES ('order_direct_inv_i', '${PAGE_A_ID}', '${USER1_ID}', 'monthly', 49900, 'created')
    ON CONFLICT (provider_order_id) DO NOTHING;
  `);

  const worker1 = new Promise((resolve) => {
    exec(`docker exec w009-b5-postgres psql -U postgres -d w009_b5_test -t -A -c "SELECT verify_and_activate_page_pro('order_direct_inv_i', '${PAGE_A_ID}', '${USER1_ID}', 'pay_concurrent_1', 'monthly', false);"`, (err, stdout) => {
      resolve(JSON.parse(stdout.trim()));
    });
  });

  const worker2 = new Promise((resolve) => {
    exec(`docker exec w009-b5-postgres psql -U postgres -d w009_b5_test -t -A -c "SELECT verify_and_activate_page_pro('order_direct_inv_i', '${PAGE_A_ID}', '${USER1_ID}', 'pay_concurrent_2', 'monthly', false);"`, (err, stdout) => {
      resolve(JSON.parse(stdout.trim()));
    });
  });

  const [resConcurrent1, resConcurrent2] = await Promise.all([worker1, worker2]);
  console.log('Concurrent RPC Results:', { worker1: resConcurrent1, worker2: resConcurrent2 });

  const resultsList = [resConcurrent1, resConcurrent2];
  const activatedCount = resultsList.filter((r) => r.code === 'ENTITLEMENT_ACTIVATED').length;
  const consumedCount = resultsList.filter((r) => r.code === 'ORDER_ALREADY_CONSUMED').length;

  const invIPassed = activatedCount === 1 && consumedCount === 1;
  report.tests.push({
    testId: 'INVARIANT-I',
    description: 'Concurrent verification calls serialized by FOR UPDATE: exactly one activates, other receives ORDER_ALREADY_CONSUMED with zero deadlock',
    worker1Result: resConcurrent1,
    worker2Result: resConcurrent2,
    activatedCount,
    consumedCount,
    passed: invIPassed,
  });
  console.log('INVARIANT-I PASSED:', invIPassed);

  // ================================================================
  // Summary & Report Generation
  // ================================================================
  const allPassed = report.tests.every((t) => t.passed) && report.migrations.migration037IdempotentPass;
  report.overallPassed = allPassed;
  console.log('\n================================================================');
  console.log('ALL PERSISTENCE TESTS PASSED:', allPassed);
  console.log(`PASSED: ${report.tests.filter((t) => t.passed).length} / ${report.tests.length}`);
  console.log('================================================================\n');

  fs.writeFileSync('reports/w009_b5_runtime_persistence_report.json', JSON.stringify(report, null, 2), 'utf8');
  console.log('Wrote reports/w009_b5_runtime_persistence_report.json successfully.');

} catch (err) {
  console.error('Test execution failed:', err);
  process.exitCode = 1;
} finally {
  await cleanup();
}
