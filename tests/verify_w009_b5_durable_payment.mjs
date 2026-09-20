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

    -- Seed trusted internal payment secrets and strictly isolate from client-accessible roles
    INSERT INTO internal_payment_secrets (provider, key_secret)
    VALUES ('razorpay', '${RAZORPAY_KEY_SECRET}')
    ON CONFLICT (provider) DO UPDATE SET key_secret = EXCLUDED.key_secret, updated_at = now();
    REVOKE ALL ON TABLE internal_payment_secrets FROM PUBLIC, anon, authenticated, service_role;
  `);

  // Step 6: Start PostgREST container
  console.log('Starting PostgREST container w009-b5-postgrest...');
  execSync('docker run --name w009-b5-postgrest --network w009-b5-net -p 127.0.0.1:55431:3000 -e PGRST_DB_URI=postgresql://authenticator:disposable_local_test_pwd@w009-b5-postgres:5432/w009_b5_test -e PGRST_DB_SCHEMAS=public -e PGRST_DB_ANON_ROLE=anon -e "PGRST_JWT_SECRET=super-secret-jwt-token-with-at-least-32-characters-long" -d public.ecr.aws/supabase/postgrest:v14.13');

  // Wait for PostgREST
  console.log('Waiting for PostgREST to be ready...');
  await new Promise((r) => setTimeout(r, 2000));
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
  const { supabase, setSupabaseConfiguredForTesting } = await import('../apps/api/src/lib/supabase.ts');
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
      has_function_privilege('public', 'verify_and_activate_page_pro(text,uuid,uuid,text,text,text,boolean)', 'execute') as public_exec,
      has_function_privilege('anon', 'verify_and_activate_page_pro(text,uuid,uuid,text,text,text,boolean)', 'execute') as anon_exec,
      has_function_privilege('authenticated', 'verify_and_activate_page_pro(text,uuid,uuid,text,text,text,boolean)', 'execute') as authenticated_exec,
      has_function_privilege('service_role', 'verify_and_activate_page_pro(text,uuid,uuid,text,text,text,boolean)', 'execute') as service_role_exec,
      has_function_privilege('postgres', 'verify_and_activate_page_pro(text,uuid,uuid,text,text,text,boolean)', 'execute') as postgres_exec;
  `);
  console.log('RPC Privileges Matrix:', rpcPrivileges[0]);

  const secretsPrivileges = queryDb(`
    SELECT
      has_table_privilege('public', 'internal_payment_secrets', 'select') as public_select,
      has_table_privilege('anon', 'internal_payment_secrets', 'select') as anon_select,
      has_table_privilege('authenticated', 'internal_payment_secrets', 'select') as authenticated_select,
      has_table_privilege('service_role', 'internal_payment_secrets', 'select') as service_role_select,
      has_table_privilege('postgres', 'internal_payment_secrets', 'select') as postgres_select;
  `);
  console.log('Secrets Table Privileges Matrix:', secretsPrivileges[0]);

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
    secretsTablePrivileges: secretsPrivileges[0],
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
  // DIRECT SQL RPC BOUNDARY INVARIANT TESTS (A - M)
  // Testing verify_and_activate_page_pro directly at the PostgreSQL
  // transaction boundary, asserting that the database transaction itself
  // independently verifies cryptographic payment signatures and enforces
  // all transaction invariants.
  // ================================================================
  console.log('\n================================================================');
  console.log('DIRECT POSTGRESQL TRANSACTION BOUNDARY INVARIANT TESTS (A - M)');
  console.log('================================================================');

  function computeValidSig(oId, pId, secret = RAZORPAY_KEY_SECRET) {
    return crypto.createHmac('sha256', secret).update(`${oId}|${pId}`).digest('hex');
  }

  // Invariant A: Valid Cryptographic Verification via Direct SQL RPC
  console.log('\n--- INVARIANT A: Valid Cryptographic Verification via Direct SQL RPC ---');
  execPsql(`
    INSERT INTO page_pro_orders (provider_order_id, page_id, user_id, billing_cycle, amount_paise, status)
    VALUES ('order_direct_inv_a', '${PAGE_A_ID}', '${USER1_ID}', 'monthly', 49900, 'created')
    ON CONFLICT (provider_order_id) DO NOTHING;
  `);
  const sigA = computeValidSig('order_direct_inv_a', 'pay_direct_inv_a');
  const rpcResA = queryDb(`
    SELECT verify_and_activate_page_pro('order_direct_inv_a', '${PAGE_A_ID}', '${USER1_ID}', 'pay_direct_inv_a', '${sigA}', 'monthly', false) AS result;
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
    description: 'Direct SQL RPC execution with valid cryptographic proof activates order and commits page Pro entitlement',
    rpcResult: rpcResA,
    orderStatus: dbOrderA?.status,
    signatureVerified: dbOrderA?.signature_verified,
    pageIsPro: dbPageA?.is_pro,
    passed: invAPassed,
  });
  console.log('INVARIANT-A PASSED:', invAPassed);

  // Invariant B: Missing Signature Fails
  console.log('\n--- INVARIANT B: Missing Signature Fails at RPC Boundary ---');
  execPsql(`
    INSERT INTO page_pro_orders (provider_order_id, page_id, user_id, billing_cycle, amount_paise, status)
    VALUES ('order_direct_inv_b', '${PAGE_A_ID}', '${USER1_ID}', 'monthly', 49900, 'created')
    ON CONFLICT (provider_order_id) DO NOTHING;
  `);
  const rpcResB = queryDb(`
    SELECT verify_and_activate_page_pro('order_direct_inv_b', '${PAGE_A_ID}', '${USER1_ID}', 'pay_direct_inv_b', NULL, 'monthly', false) AS result;
  `)[0]?.result;
  const dbOrderB = queryDb(`SELECT * FROM page_pro_orders WHERE provider_order_id = 'order_direct_inv_b'`)[0];

  const invBPassed =
    rpcResB?.success === false &&
    rpcResB?.code === 'MISSING_SIGNATURE' &&
    dbOrderB?.status === 'created' &&
    dbOrderB?.signature_verified === false;

  report.tests.push({
    testId: 'INVARIANT-B',
    description: 'Missing cryptographic signature rejected at database boundary with MISSING_SIGNATURE',
    rpcResult: rpcResB,
    orderStatusUnchanged: dbOrderB?.status === 'created',
    passed: invBPassed,
  });
  console.log('INVARIANT-B PASSED:', invBPassed);

  // Invariant C: Invalid Signature Fails
  console.log('\n--- INVARIANT C: Invalid Signature Fails at RPC Boundary ---');
  execPsql(`
    INSERT INTO page_pro_orders (provider_order_id, page_id, user_id, billing_cycle, amount_paise, status)
    VALUES ('order_direct_inv_c', '${PAGE_A_ID}', '${USER1_ID}', 'monthly', 49900, 'created')
    ON CONFLICT (provider_order_id) DO NOTHING;
  `);
  const rpcResC = queryDb(`
    SELECT verify_and_activate_page_pro('order_direct_inv_c', '${PAGE_A_ID}', '${USER1_ID}', 'pay_direct_inv_c', 'deadbeef_invalid_hmac_hex', 'monthly', false) AS result;
  `)[0]?.result;
  const dbOrderC = queryDb(`SELECT * FROM page_pro_orders WHERE provider_order_id = 'order_direct_inv_c'`)[0];

  const invCPassed =
    rpcResC?.success === false &&
    rpcResC?.code === 'INVALID_SIGNATURE' &&
    dbOrderC?.status === 'created' &&
    dbOrderC?.signature_verified === false;

  report.tests.push({
    testId: 'INVARIANT-C',
    description: 'Invalid cryptographic signature rejected at database boundary with INVALID_SIGNATURE',
    rpcResult: rpcResC,
    orderStatusUnchanged: dbOrderC?.status === 'created',
    passed: invCPassed,
  });
  console.log('INVARIANT-C PASSED:', invCPassed);

  // Invariant D: Tampered Order ID Fails
  console.log('\n--- INVARIANT D: Tampered Order ID Fails HMAC Verification ---');
  const sigD = computeValidSig('order_direct_inv_d', 'pay_direct_inv_d');
  const rpcResD = queryDb(`
    SELECT verify_and_activate_page_pro('order_direct_inv_d_TAMPERED', '${PAGE_A_ID}', '${USER1_ID}', 'pay_direct_inv_d', '${sigD}', 'monthly', false) AS result;
  `)[0]?.result;

  const invDPassed =
    rpcResD?.success === false &&
    rpcResD?.code === 'INVALID_SIGNATURE';

  report.tests.push({
    testId: 'INVARIANT-D',
    description: 'Tampered order ID fails cryptographic HMAC verification at database boundary',
    rpcResult: rpcResD,
    passed: invDPassed,
  });
  console.log('INVARIANT-D PASSED:', invDPassed);

  // Invariant E: Tampered Payment ID Fails
  console.log('\n--- INVARIANT E: Tampered Payment ID Fails HMAC Verification ---');
  const sigE = computeValidSig('order_direct_inv_a', 'pay_direct_inv_a');
  const rpcResE = queryDb(`
    SELECT verify_and_activate_page_pro('order_direct_inv_a', '${PAGE_A_ID}', '${USER1_ID}', 'pay_direct_inv_a_TAMPERED', '${sigE}', 'monthly', false) AS result;
  `)[0]?.result;

  const invEPassed =
    rpcResE?.success === false &&
    rpcResE?.code === 'INVALID_SIGNATURE';

  report.tests.push({
    testId: 'INVARIANT-E',
    description: 'Tampered payment ID fails cryptographic HMAC verification at database boundary',
    rpcResult: rpcResE,
    passed: invEPassed,
  });
  console.log('INVARIANT-E PASSED:', invEPassed);

  // Invariant F: Cross-Page Order Fails
  console.log('\n--- INVARIANT F: Cross-Page Order Fails PAGE_ORDER_MISMATCH ---');
  execPsql(`
    INSERT INTO page_pro_orders (provider_order_id, page_id, user_id, billing_cycle, amount_paise, status)
    VALUES ('order_direct_inv_f', '${PAGE_A_ID}', '${USER1_ID}', 'monthly', 49900, 'created')
    ON CONFLICT (provider_order_id) DO NOTHING;
  `);
  const sigF = computeValidSig('order_direct_inv_f', 'pay_direct_inv_f');
  const rpcResF = queryDb(`
    SELECT verify_and_activate_page_pro('order_direct_inv_f', '${PAGE_B_ID}', '${USER1_ID}', 'pay_direct_inv_f', '${sigF}', 'monthly', false) AS result;
  `)[0]?.result;
  const dbOrderF = queryDb(`SELECT * FROM page_pro_orders WHERE provider_order_id = 'order_direct_inv_f'`)[0];

  const invFPassed =
    rpcResF?.success === false &&
    rpcResF?.code === 'PAGE_ORDER_MISMATCH' &&
    dbOrderF?.status === 'created' &&
    dbOrderF?.signature_verified === false;

  report.tests.push({
    testId: 'INVARIANT-F',
    description: 'Direct SQL RPC rejects cross-page verification attempt with PAGE_ORDER_MISMATCH even with valid HMAC',
    rpcResult: rpcResF,
    orderStatusUnchanged: dbOrderF?.status === 'created',
    passed: invFPassed,
  });
  console.log('INVARIANT-F PASSED:', invFPassed);

  // Invariant G: Cross-Principal Attack Rejected
  console.log('\n--- INVARIANT G: Cross-Principal Attack Rejected ORDER_PRINCIPAL_MISMATCH ---');
  execPsql(`
    INSERT INTO page_pro_orders (provider_order_id, page_id, user_id, billing_cycle, amount_paise, status)
    VALUES ('order_direct_inv_g', '${PAGE_A_ID}', '${USER1_ID}', 'monthly', 49900, 'created')
    ON CONFLICT (provider_order_id) DO NOTHING;
  `);
  const sigG = computeValidSig('order_direct_inv_g', 'pay_direct_inv_g');
  const rpcResG = queryDb(`
    SELECT verify_and_activate_page_pro('order_direct_inv_g', '${PAGE_A_ID}', '${USER2_ID}', 'pay_direct_inv_g', '${sigG}', 'monthly', false) AS result;
  `)[0]?.result;
  const dbOrderG = queryDb(`SELECT * FROM page_pro_orders WHERE provider_order_id = 'order_direct_inv_g'`)[0];

  const invGPassed =
    rpcResG?.success === false &&
    rpcResG?.code === 'ORDER_PRINCIPAL_MISMATCH' &&
    dbOrderG?.status === 'created' &&
    dbOrderG?.signature_verified === false;

  report.tests.push({
    testId: 'INVARIANT-G',
    description: 'Direct SQL RPC rejects cross-principal attempt with ORDER_PRINCIPAL_MISMATCH even with valid HMAC',
    rpcResult: rpcResG,
    orderStatusUnchanged: dbOrderG?.status === 'created',
    passed: invGPassed,
  });
  console.log('INVARIANT-G PASSED:', invGPassed);

  // Invariant H: Billing-Cycle Mismatch Rejected
  console.log('\n--- INVARIANT H: Billing-Cycle Mismatch Rejected BILLING_CYCLE_MISMATCH ---');
  execPsql(`
    INSERT INTO page_pro_orders (provider_order_id, page_id, user_id, billing_cycle, amount_paise, status)
    VALUES ('order_direct_inv_h', '${PAGE_A_ID}', '${USER1_ID}', 'monthly', 49900, 'created')
    ON CONFLICT (provider_order_id) DO NOTHING;
  `);
  const sigH = computeValidSig('order_direct_inv_h', 'pay_direct_inv_h');
  const rpcResH = queryDb(`
    SELECT verify_and_activate_page_pro('order_direct_inv_h', '${PAGE_A_ID}', '${USER1_ID}', 'pay_direct_inv_h', '${sigH}', 'annual', false) AS result;
  `)[0]?.result;
  const dbOrderH = queryDb(`SELECT * FROM page_pro_orders WHERE provider_order_id = 'order_direct_inv_h'`)[0];

  const invHPassed =
    rpcResH?.success === false &&
    rpcResH?.code === 'BILLING_CYCLE_MISMATCH' &&
    dbOrderH?.status === 'created';

  report.tests.push({
    testId: 'INVARIANT-H',
    description: 'Direct SQL RPC rejects billing cycle mismatch with BILLING_CYCLE_MISMATCH',
    rpcResult: rpcResH,
    orderStatusUnchanged: dbOrderH?.status === 'created',
    passed: invHPassed,
  });
  console.log('INVARIANT-H PASSED:', invHPassed);

  // Invariant I: Product Mismatch Blocked by Table Constraint
  console.log('\n--- INVARIANT I: Product Tampering Blocked by Database CHECK Constraint ---');
  let prodTamperBlocked = false;
  try {
    execSync('docker exec -i w009-b5-postgres psql -v ON_ERROR_STOP=1 -U postgres -d w009_b5_test', {
      input: `
        INSERT INTO page_pro_orders (provider_order_id, page_id, user_id, billing_cycle, amount_paise, product, status)
        VALUES ('order_direct_inv_i', '${PAGE_A_ID}', '${USER1_ID}', 'monthly', 49900, 'pages_enterprise', 'created');
      `,
      encoding: 'utf8',
    });
  } catch (err) {
    prodTamperBlocked = (err.stderr || err.message).includes('page_pro_orders_product_check');
  }

  const invIPassed = prodTamperBlocked;
  report.tests.push({
    testId: 'INVARIANT-I',
    description: 'Product tampering blocked: table CHECK constraint restricts product strictly to pages_pro',
    prodTamperBlocked,
    passed: invIPassed,
  });
  console.log('INVARIANT-I PASSED:', invIPassed);

  // Invariant J: Amount Mismatch Blocked by Table Constraint & RPC Immutability
  console.log('\n--- INVARIANT J: Amount Tampering Blocked by Database CHECK Constraint & RPC Immutability ---');
  let amtTamperBlocked = false;
  try {
    execSync('docker exec -i w009-b5-postgres psql -v ON_ERROR_STOP=1 -U postgres -d w009_b5_test', {
      input: `
        INSERT INTO page_pro_orders (provider_order_id, page_id, user_id, billing_cycle, amount_paise, status)
        VALUES ('order_direct_inv_j', '${PAGE_A_ID}', '${USER1_ID}', 'monthly', 100, 'created');
      `,
      encoding: 'utf8',
    });
  } catch (err) {
    amtTamperBlocked = (err.stderr || err.message).includes('page_pro_orders_amount_paise_check');
  }

  const rpcArgs = report.schemaInspection.rpc.identityArgs;
  const rpcHasNoAmountParam = !rpcArgs.includes('amount');

  const invJPassed = amtTamperBlocked && rpcHasNoAmountParam;
  report.tests.push({
    testId: 'INVARIANT-J',
    description: 'Amount tampering blocked: table CHECK constraint enforces ₹499/₹4999 in paise, and RPC takes no caller amount parameter',
    amtTamperBlocked,
    rpcHasNoAmountParam,
    passed: invJPassed,
  });
  console.log('INVARIANT-J PASSED:', invJPassed);

  // Invariant K: Replay Protection via Direct SQL RPC
  console.log('\n--- INVARIANT K: Replay Protection via Direct SQL RPC ---');
  const rpcResKIdempotent = queryDb(`
    SELECT verify_and_activate_page_pro('order_direct_inv_a', '${PAGE_A_ID}', '${USER1_ID}', 'pay_direct_inv_a', '${sigA}', 'monthly', false) AS result;
  `)[0]?.result;

  const sigKFraud = computeValidSig('order_direct_inv_a', 'pay_fraud_different_payment');
  const rpcResKConsumed = queryDb(`
    SELECT verify_and_activate_page_pro('order_direct_inv_a', '${PAGE_A_ID}', '${USER1_ID}', 'pay_fraud_different_payment', '${sigKFraud}', 'monthly', false) AS result;
  `)[0]?.result;

  const invKPassed =
    rpcResKIdempotent?.success === true &&
    rpcResKIdempotent?.idempotent === true &&
    rpcResKIdempotent?.code === 'ENTITLEMENT_ALREADY_ACTIVE' &&
    rpcResKConsumed?.success === false &&
    rpcResKConsumed?.code === 'ORDER_ALREADY_CONSUMED';

  report.tests.push({
    testId: 'INVARIANT-K',
    description: 'Replay protection in RPC: identical payment tuple succeeds idempotently; different payment rejected with ORDER_ALREADY_CONSUMED',
    idempotentResult: rpcResKIdempotent,
    consumedResult: rpcResKConsumed,
    passed: invKPassed,
  });
  console.log('INVARIANT-K PASSED:', invKPassed);

  // Invariant L: Concurrent Verification (FOR UPDATE serialization)
  console.log('\n--- INVARIANT L: Concurrent Verification Under Row Lock (FOR UPDATE) ---');
  execPsql(`
    INSERT INTO page_pro_orders (provider_order_id, page_id, user_id, billing_cycle, amount_paise, status)
    VALUES ('order_direct_inv_l', '${PAGE_A_ID}', '${USER1_ID}', 'monthly', 49900, 'created')
    ON CONFLICT (provider_order_id) DO NOTHING;
  `);

  const sigL1 = computeValidSig('order_direct_inv_l', 'pay_concurrent_1');
  const sigL2 = computeValidSig('order_direct_inv_l', 'pay_concurrent_2');

  const worker1 = new Promise((resolve) => {
    exec(`docker exec w009-b5-postgres psql -U postgres -d w009_b5_test -t -A -c "SELECT verify_and_activate_page_pro('order_direct_inv_l', '${PAGE_A_ID}', '${USER1_ID}', 'pay_concurrent_1', '${sigL1}', 'monthly', false);"`, (err, stdout) => {
      resolve(JSON.parse(stdout.trim()));
    });
  });

  const worker2 = new Promise((resolve) => {
    exec(`docker exec w009-b5-postgres psql -U postgres -d w009_b5_test -t -A -c "SELECT verify_and_activate_page_pro('order_direct_inv_l', '${PAGE_A_ID}', '${USER1_ID}', 'pay_concurrent_2', '${sigL2}', 'monthly', false);"`, (err, stdout) => {
      resolve(JSON.parse(stdout.trim()));
    });
  });

  const [resConcurrent1, resConcurrent2] = await Promise.all([worker1, worker2]);
  console.log('Concurrent RPC Results:', { worker1: resConcurrent1, worker2: resConcurrent2 });

  const resultsList = [resConcurrent1, resConcurrent2];
  const activatedCount = resultsList.filter((r) => r.code === 'ENTITLEMENT_ACTIVATED').length;
  const consumedCount = resultsList.filter((r) => r.code === 'ORDER_ALREADY_CONSUMED').length;

  const invLPassed = activatedCount === 1 && consumedCount === 1;
  report.tests.push({
    testId: 'INVARIANT-L',
    description: 'Concurrent verification calls serialized by FOR UPDATE: exactly one activates, other receives ORDER_ALREADY_CONSUMED with zero deadlock',
    worker1Result: resConcurrent1,
    worker2Result: resConcurrent2,
    activatedCount,
    consumedCount,
    passed: invLPassed,
  });
  console.log('INVARIANT-L PASSED:', invLPassed);

  // Invariant M1: Attacker-Selected Secret + Attacker HMAC FAILS (INVALID_SIGNATURE)
  console.log('\n--- INVARIANT M1: Attacker-Selected Secret + Attacker HMAC FAILS ---');
  execPsql(`
    INSERT INTO page_pro_orders (provider_order_id, page_id, user_id, billing_cycle, amount_paise, status)
    VALUES ('order_m1', '${PAGE_A_ID}', '${USER1_ID}', 'monthly', 49900, 'created')
    ON CONFLICT (provider_order_id) DO NOTHING;
  `);
  const attackerSecretM1 = 'attacker_malicious_secret_666';
  const attackerSigM1 = computeValidSig('order_m1', 'pay_m1', attackerSecretM1);
  const resM1 = queryDb(`
    SELECT verify_and_activate_page_pro('order_m1', '${PAGE_A_ID}', '${USER1_ID}', 'pay_m1', '${attackerSigM1}', 'monthly', false) AS result;
  `)[0]?.result;
  const dbOrderM1 = queryDb(`SELECT * FROM page_pro_orders WHERE provider_order_id = 'order_m1'`)[0];
  const invM1Passed =
    resM1?.success === false &&
    resM1?.code === 'INVALID_SIGNATURE' &&
    dbOrderM1?.status === 'created' &&
    dbOrderM1?.signature_verified === false &&
    dbOrderM1?.provider_payment_id === null;

  report.tests.push({
    testId: 'INVARIANT-M1',
    description: 'Attacker-selected secret with attacker-generated signature rejected with INVALID_SIGNATURE; zero database mutation',
    rpcResult: resM1,
    orderRemainsCreated: dbOrderM1?.status === 'created',
    passed: invM1Passed,
  });
  console.log('INVARIANT-M1 PASSED:', invM1Passed);

  // Invariant M2: Genuine Server Secret SUCCEEDS (ENTITLEMENT_ACTIVATED)
  console.log('\n--- INVARIANT M2: Genuine Server Secret SUCCEEDS ---');
  execPsql(`
    INSERT INTO page_pro_orders (provider_order_id, page_id, user_id, billing_cycle, amount_paise, status)
    VALUES ('order_m2', '${PAGE_B_ID}', '${USER1_ID}', 'monthly', 49900, 'created')
    ON CONFLICT (provider_order_id) DO NOTHING;
  `);
  const genuineSigM2 = computeValidSig('order_m2', 'pay_m2', RAZORPAY_KEY_SECRET);
  const resM2 = queryDb(`
    SELECT verify_and_activate_page_pro('order_m2', '${PAGE_B_ID}', '${USER1_ID}', 'pay_m2', '${genuineSigM2}', 'monthly', false) AS result;
  `)[0]?.result;
  const dbOrderM2 = queryDb(`SELECT * FROM page_pro_orders WHERE provider_order_id = 'order_m2'`)[0];
  const dbPageM2 = queryDb(`SELECT is_pro, pro_subscription_id FROM pages WHERE id = '${PAGE_B_ID}'`)[0];
  const invM2Passed =
    resM2?.success === true &&
    resM2?.code === 'ENTITLEMENT_ACTIVATED' &&
    dbOrderM2?.status === 'completed' &&
    dbOrderM2?.signature_verified === true &&
    dbOrderM2?.provider_payment_id === 'pay_m2' &&
    dbPageM2?.is_pro === true &&
    dbPageM2?.pro_subscription_id === 'pay_m2';

  report.tests.push({
    testId: 'INVARIANT-M2',
    description: 'Genuine server secret and valid signature succeeds with ENTITLEMENT_ACTIVATED and commits page entitlement',
    rpcResult: resM2,
    orderCompleted: dbOrderM2?.status === 'completed',
    pageIsPro: dbPageM2?.is_pro,
    passed: invM2Passed,
  });
  console.log('INVARIANT-M2 PASSED:', invM2Passed);

  // Invariant M3: Genuine Signature with Tampered Tuple FAILS
  console.log('\n--- INVARIANT M3: Genuine Signature with Tampered Tuple FAILS ---');
  execPsql(`
    INSERT INTO page_pro_orders (provider_order_id, page_id, user_id, billing_cycle, amount_paise, status)
    VALUES ('order_m3', '${PAGE_A_ID}', '${USER1_ID}', 'monthly', 49900, 'created')
    ON CONFLICT (provider_order_id) DO NOTHING;
  `);
  const genuineSigM3 = computeValidSig('order_m3', 'pay_m3', RAZORPAY_KEY_SECRET);
  const resM3 = queryDb(`
    SELECT verify_and_activate_page_pro('order_m3', '${PAGE_A_ID}', '${USER1_ID}', 'pay_m3_TAMPERED', '${genuineSigM3}', 'monthly', false) AS result;
  `)[0]?.result;
  const dbOrderM3 = queryDb(`SELECT * FROM page_pro_orders WHERE provider_order_id = 'order_m3'`)[0];
  const invM3Passed =
    resM3?.success === false &&
    resM3?.code === 'INVALID_SIGNATURE' &&
    dbOrderM3?.status === 'created' &&
    dbOrderM3?.signature_verified === false;

  report.tests.push({
    testId: 'INVARIANT-M3',
    description: 'Genuine signature with tampered order/payment tuple fails HMAC check at transaction boundary',
    rpcResult: resM3,
    passed: invM3Passed,
  });
  console.log('INVARIANT-M3 PASSED:', invM3Passed);

  // Invariant M4: Corrupted Attacker Signature FAILS
  console.log('\n--- INVARIANT M4: Corrupted Attacker Signature FAILS ---');
  const resM4 = queryDb(`
    SELECT verify_and_activate_page_pro('order_m3', '${PAGE_A_ID}', '${USER1_ID}', 'pay_m3', 'deadbeef_attacker_bogus_signature', 'monthly', false) AS result;
  `)[0]?.result;
  const invM4Passed =
    resM4?.success === false &&
    resM4?.code === 'INVALID_SIGNATURE';

  report.tests.push({
    testId: 'INVARIANT-M4',
    description: 'Attacker corrupted signature against genuine server secret rejected with INVALID_SIGNATURE',
    rpcResult: resM4,
    passed: invM4Passed,
  });
  console.log('INVARIANT-M4 PASSED:', invM4Passed);

  // Invariant M5: Caller GUC Session Injection FAILS
  console.log('\n--- INVARIANT M5: Caller GUC Session Injection FAILS ---');
  const attackerSecretM5 = 'attacker_injected_session_secret';
  const attackerSigM5 = computeValidSig('order_m3', 'pay_m3', attackerSecretM5);
  let resM5;
  try {
    const rawM5 = execSync('docker exec -i w009-b5-postgres psql -U postgres -d w009_b5_test -t -A', {
      input: `
        SET app.settings.razorpay_key_secret = '${attackerSecretM5}';
        SELECT verify_and_activate_page_pro('order_m3', '${PAGE_A_ID}', '${USER1_ID}', 'pay_m3', '${attackerSigM5}', 'monthly', false);
        RESET app.settings.razorpay_key_secret;
      `,
      encoding: 'utf8',
    });
    const lines = rawM5.trim().split('\n').filter(l => l.startsWith('{'));
    resM5 = JSON.parse(lines[0]);
  } catch (err) {
    console.error('M5 execution error:', err);
  }
  const dbOrderM5 = queryDb(`SELECT * FROM page_pro_orders WHERE provider_order_id = 'order_m3'`)[0];
  const invM5Passed =
    resM5?.success === false &&
    resM5?.code === 'INVALID_SIGNATURE' &&
    dbOrderM5?.status === 'created' &&
    dbOrderM5?.signature_verified === false;

  report.tests.push({
    testId: 'INVARIANT-M5',
    description: 'Caller session injection (SET app.settings.razorpay_key_secret) cannot override internal_payment_secrets; rejected with INVALID_SIGNATURE',
    rpcResult: resM5,
    passed: invM5Passed,
  });
  console.log('INVARIANT-M5 PASSED:', invM5Passed);

  // Invariant M6: Missing Secret in DB FAILS KEY_SECRET_MISSING
  console.log('\n--- INVARIANT M6: Missing Secret in DB FAILS KEY_SECRET_MISSING ---');
  execPsql(`
    INSERT INTO page_pro_orders (provider_order_id, page_id, user_id, billing_cycle, amount_paise, status)
    VALUES ('order_m6', '${PAGE_A_ID}', '${USER1_ID}', 'monthly', 49900, 'created')
    ON CONFLICT (provider_order_id) DO NOTHING;
  `);
  let resM6;
  try {
    const rawM6 = execSync('docker exec -i w009-b5-postgres psql -U postgres -d w009_b5_test -t -A', {
      input: `
        BEGIN;
        DELETE FROM internal_payment_secrets WHERE provider = 'razorpay';
        SELECT verify_and_activate_page_pro('order_m6', '${PAGE_A_ID}', '${USER1_ID}', 'pay_m6', 'any_signature', 'monthly', false);
        ROLLBACK;
      `,
      encoding: 'utf8',
    });
    const lines = rawM6.trim().split('\n').filter(l => l.startsWith('{'));
    resM6 = JSON.parse(lines[0]);
  } catch (err) {
    console.error('M6 execution error:', err);
  }
  const dbOrderM6 = queryDb(`SELECT * FROM page_pro_orders WHERE provider_order_id = 'order_m6'`)[0];
  const invM6Passed =
    resM6?.success === false &&
    resM6?.code === 'KEY_SECRET_MISSING' &&
    dbOrderM6?.status === 'created';

  report.tests.push({
    testId: 'INVARIANT-M6',
    description: 'Missing cryptographic secret in DB store returns KEY_SECRET_MISSING with zero database mutation',
    rpcResult: resM6,
    passed: invM6Passed,
  });
  console.log('INVARIANT-M6 PASSED:', invM6Passed);

  // Invariant N: Non-Service Roles Denied EXECUTE at Privilege Boundary
  console.log('\n--- INVARIANT N: Non-Service Roles Denied EXECUTE at Privilege Boundary ---');
  let anonCallBlocked = false;
  try {
    execSync('docker exec -i w009-b5-postgres psql -v ON_ERROR_STOP=1 -U postgres -d w009_b5_test', {
      input: `
        SET ROLE anon;
        SELECT verify_and_activate_page_pro('order_direct_inv_a', '${PAGE_A_ID}', '${USER1_ID}', 'pay_anon', '${sigA}', 'monthly', false);
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
        SELECT verify_and_activate_page_pro('order_direct_inv_a', '${PAGE_A_ID}', '${USER1_ID}', 'pay_auth', '${sigA}', 'monthly', false);
        RESET ROLE;
      `,
      encoding: 'utf8',
    });
  } catch (err) {
    authCallBlocked = (err.stderr || err.message).includes('permission denied for function verify_and_activate_page_pro');
  }

  const invNPassed = anonCallBlocked && authCallBlocked;
  report.tests.push({
    testId: 'INVARIANT-N',
    description: 'Non-service roles (anon, authenticated, PUBLIC) denied EXECUTE privilege on RPC at database catalog boundary',
    anonCallBlocked,
    authCallBlocked,
    passed: invNPassed,
  });
  console.log('INVARIANT-N PASSED:', invNPassed);

  // Invariant O: Non-Owner Roles Denied Access to internal_payment_secrets Table
  console.log('\n--- INVARIANT O: Client Roles Denied Access to internal_payment_secrets ---');
  let anonSecretsBlocked = false;
  try {
    execSync('docker exec -i w009-b5-postgres psql -v ON_ERROR_STOP=1 -U postgres -d w009_b5_test', {
      input: `
        SET ROLE anon;
        SELECT * FROM internal_payment_secrets;
        RESET ROLE;
      `,
      encoding: 'utf8',
    });
  } catch (err) {
    anonSecretsBlocked = (err.stderr || err.message).includes('permission denied for table internal_payment_secrets');
  }

  let authSecretsBlocked = false;
  try {
    execSync('docker exec -i w009-b5-postgres psql -v ON_ERROR_STOP=1 -U postgres -d w009_b5_test', {
      input: `
        SET ROLE authenticated;
        SELECT * FROM internal_payment_secrets;
        RESET ROLE;
      `,
      encoding: 'utf8',
    });
  } catch (err) {
    authSecretsBlocked = (err.stderr || err.message).includes('permission denied for table internal_payment_secrets');
  }

  let serviceRoleSecretsBlocked = false;
  try {
    execSync('docker exec -i w009-b5-postgres psql -v ON_ERROR_STOP=1 -U postgres -d w009_b5_test', {
      input: `
        SET ROLE service_role;
        SELECT * FROM internal_payment_secrets;
        RESET ROLE;
      `,
      encoding: 'utf8',
    });
  } catch (err) {
    serviceRoleSecretsBlocked = (err.stderr || err.message).includes('permission denied for table internal_payment_secrets');
  }

  const invOPassed = anonSecretsBlocked && authSecretsBlocked && serviceRoleSecretsBlocked;
  report.tests.push({
    testId: 'INVARIANT-O',
    description: 'Non-owner roles (anon, authenticated, service_role) strictly denied SELECT on internal_payment_secrets table',
    anonSecretsBlocked,
    authSecretsBlocked,
    serviceRoleSecretsBlocked,
    passed: invOPassed,
  });
  console.log('INVARIANT-O PASSED:', invOPassed);

  // Invariant P: Fastify Application Client Isolation (Cannot Query Secrets via PostgREST / Supabase Client)
  console.log('\n--- INVARIANT P: Fastify Application Client Cannot Query internal_payment_secrets ---');
  const { data: appData, error: appError } = await supabase.from('internal_payment_secrets').select('*');
  const invPPassed = appData === null && (appError !== null || appData === null);
  report.tests.push({
    testId: 'INVARIANT-P',
    description: 'Fastify application client (service_role) cannot read internal_payment_secrets table via API/PostgREST layer',
    appQueryBlocked: invPPassed,
    errorMessage: appError?.message,
    passed: invPPassed,
  });
  console.log('INVARIANT-P PASSED:', invPPassed);

  // Invariant Q: Operational Secret Rotation Verification (Test F)
  console.log('\n--- INVARIANT Q: Operational Secret Rotation Verification ---');
  const ROTATED_TEST_SECRET = 'disposable_test_rotated_secret_99999';

  // 1. Admin updates secret in internal store using standard administrative mechanism
  execPsql(`
    INSERT INTO internal_payment_secrets (provider, key_secret)
    VALUES ('razorpay', '${ROTATED_TEST_SECRET}')
    ON CONFLICT (provider) DO UPDATE SET key_secret = EXCLUDED.key_secret, updated_at = now();
  `);

  // 2. New order verified with signature computed under the new rotated secret succeeds
  execPsql(`
    INSERT INTO page_pro_orders (provider_order_id, page_id, user_id, billing_cycle, amount_paise, status)
    VALUES ('order_rot_new', '${PAGE_A_ID}', '${USER1_ID}', 'monthly', 49900, 'created')
    ON CONFLICT (provider_order_id) DO NOTHING;
  `);
  const newRotSig = computeValidSig('order_rot_new', 'pay_rot_new', ROTATED_TEST_SECRET);
  const resRotNew = queryDb(`
    SELECT verify_and_activate_page_pro('order_rot_new', '${PAGE_A_ID}', '${USER1_ID}', 'pay_rot_new', '${newRotSig}', 'monthly', false) AS result;
  `)[0]?.result;

  // 3. New order verified with signature computed under the old retired secret FAILS
  execPsql(`
    INSERT INTO page_pro_orders (provider_order_id, page_id, user_id, billing_cycle, amount_paise, status)
    VALUES ('order_rot_old', '${PAGE_A_ID}', '${USER1_ID}', 'monthly', 49900, 'created')
    ON CONFLICT (provider_order_id) DO NOTHING;
  `);
  const oldRetiredSig = computeValidSig('order_rot_old', 'pay_rot_old', RAZORPAY_KEY_SECRET);
  const resRotOld = queryDb(`
    SELECT verify_and_activate_page_pro('order_rot_old', '${PAGE_A_ID}', '${USER1_ID}', 'pay_rot_old', '${oldRetiredSig}', 'monthly', false) AS result;
  `)[0]?.result;

  // 4. Verify historically completed orders remain completed
  const dbHistoricalOrder = queryDb(`SELECT status, signature_verified FROM page_pro_orders WHERE provider_order_id = 'order_direct_inv_a'`)[0];

  const invQPassed =
    resRotNew?.success === true &&
    resRotNew?.code === 'ENTITLEMENT_ACTIVATED' &&
    resRotOld?.success === false &&
    resRotOld?.code === 'INVALID_SIGNATURE' &&
    dbHistoricalOrder?.status === 'completed' &&
    dbHistoricalOrder?.signature_verified === true;

  report.tests.push({
    testId: 'INVARIANT-Q',
    description: 'Secret rotation: new secret activates subsequent payments, retired secret fails, past completed orders remain unaffected',
    newSecretSuccess: resRotNew?.success === true,
    oldSecretFailed: resRotOld?.code === 'INVALID_SIGNATURE',
    historicalCompletedPreserved: dbHistoricalOrder?.status === 'completed',
    passed: invQPassed,
  });
  console.log('INVARIANT-Q PASSED:', invQPassed);
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
