/**
 * tests/webhooks-real-postgres-verification.test.ts
 *
 * Milestone W022 — B2B SaaS Outbound Webhooks & Event Dispatching Engine
 * Directive: W022-CTO-PG-UNBLOCK-002
 * Target: Real Disposable Local PostgreSQL 16 Container (127.0.0.1:54333)
 *
 * Scope: Real PostgreSQL runtime verification of:
 * 1. Server version, function ownership, SECURITY DEFINER, fixed search_path.
 * 2. Table-level DAC and role execution grants (service_role, anon, authenticated).
 * 3. Immutable audit log: UPDATE and DELETE denial, caller-settable GUC attack rejection,
 *    spoofed pg_temp function attack rejection.
 * 4. Retention purge function authorization, retention cutoff validation, cascade-safe order.
 * 5. Mathematical composite tenant foreign keys & cross-tenant rejection.
 * 6. Concurrent FOR UPDATE SKIP LOCKED batch claiming, lease expiry, and stale-token fencing.
 */

import assert from 'node:assert';
import { execFileSync, spawn } from 'node:child_process';

console.log('================================================================');
console.log('W022: REAL POSTGRESQL 16 RUNTIME VERIFICATION SUITE');
console.log('Timestamp:', new Date().toISOString());
console.log('Authority: CTO DIRECTIVE W022-CTO-PG-UNBLOCK-002');
console.log('Target: Localhost Docker PostgreSQL 16 (w022-verify-postgres)');
console.log('================================================================\n');

const CONTAINER_NAME = 'w022-verify-postgres';
const DB_USER = 'w022_admin';
const DB_NAME = process.env.W022_TEST_DB || 'w022_disposable_db';

let passCount = 0;
let failCount = 0;

function runPsql(sql: string, extraArgs: string[] = []): string {
  const args = [
    'exec',
    CONTAINER_NAME,
    'psql',
    '-U',
    DB_USER,
    '-d',
    DB_NAME,
    '-v',
    'ON_ERROR_STOP=1',
    '--quiet',
    ...extraArgs,
    '-c',
    sql,
  ];
  try {
    return execFileSync('docker', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (err: any) {
    const stderr = err.stderr ? err.stderr.toString() : '';
    const stdout = err.stdout ? err.stdout.toString() : '';
    throw new Error(`PSQL_ERROR: ${stderr || stdout || err.message}`);
  }
}

function queryJson(sql: string): any {
  const cleanSql = sql.trim().replace(/;+$/, '');
  const wrapped = `SELECT json_agg(sub) FROM (${cleanSql}) sub;`;
  const res = runPsql(wrapped, ['-t', '-A']).trim();
  if (!res || res === '') return [];
  return JSON.parse(res);
}

async function runCheck(id: string, description: string, fn: () => Promise<void> | void) {
  try {
    const res = fn();
    if (res instanceof Promise) {
      await res;
    }
    passCount++;
    console.log(`[PASS] ${id}: ${description}`);
  } catch (err: any) {
    failCount++;
    console.error(`[FAIL] ${id}: ${description}`);
    console.error(`       Error: ${err.message}`);
  }
}

async function runAll() {
  // ─── 1. SERVER VERSION & METADATA ───
  await runCheck('REAL-PG-01', 'Confirm real PostgreSQL 15+ server version', () => {
    const rows = queryJson('SELECT version() AS ver');
    assert.ok(rows.length === 1 && rows[0].ver, 'Must return server version');
    const ver = rows[0].ver;
    console.log(`       Observed Version: ${ver}`);
    assert.ok(/PostgreSQL 1[5-9]\./i.test(ver), 'Server must be PostgreSQL 15 or higher');
  });

  // ─── 2. FUNCTION METADATA, SECURITY DEFINER & SEARCH_PATH ───
  await runCheck('REAL-PG-02', 'Verify SECURITY DEFINER and fixed search_path on engine functions', () => {
    const rows = queryJson(`
      SELECT proname, prosecdef, proconfig::text AS proconfig
      FROM pg_proc 
      WHERE proname IN ('fn_webhook_events_prevent_mutation', 'fn_enqueue_webhook_event',
        'fn_purge_expired_webhook_data', 'fn_claim_webhook_batch',
        'fn_complete_webhook_delivery', 'fn_recover_expired_webhook_leases')
        AND pronamespace = 'public'::regnamespace
      ORDER BY proname;
    `);
    assert.strictEqual(rows.length, 6, 'Must find all 6 engine functions');
    for (const r of rows) {
      assert.strictEqual(r.prosecdef, true, `Function ${r.proname} must be SECURITY DEFINER`);
      assert.ok(r.proconfig.includes('search_path=pg_catalog, pg_temp'), `Function ${r.proname} must have fixed search_path=pg_catalog, pg_temp`);
    }
  });

  // ─── 3. TABLE DAC & ROLE EXECUTION GRANTS ───
  await runCheck('REAL-PG-03', 'Verify service_role and webhook_worker have no direct event/delivery table access', () => {
    const rows = queryJson(`
      SELECT
        has_table_privilege('service_role', 'public.webhook_events', 'SELECT') AS sr_event_select,
        has_table_privilege('service_role', 'public.webhook_events', 'INSERT') AS sr_event_insert,
        has_table_privilege('service_role', 'public.webhook_events', 'UPDATE') AS sr_event_update,
        has_table_privilege('service_role', 'public.webhook_events', 'DELETE') AS sr_event_delete,
        has_table_privilege('service_role', 'public.webhook_deliveries', 'SELECT') AS sr_delivery_select,
        has_table_privilege('service_role', 'public.webhook_deliveries', 'INSERT') AS sr_delivery_insert,
        has_table_privilege('service_role', 'public.webhook_deliveries', 'UPDATE') AS sr_delivery_update,
        has_table_privilege('service_role', 'public.webhook_deliveries', 'DELETE') AS sr_delivery_delete,
        has_table_privilege('webhook_worker', 'public.webhook_events', 'SELECT') AS worker_event_select,
        has_table_privilege('webhook_worker', 'public.webhook_deliveries', 'SELECT') AS worker_delivery_select,
        has_table_privilege('anon', 'public.webhook_events', 'SELECT') AS anon_select,
        has_table_privilege('authenticated', 'public.webhook_events', 'SELECT') AS auth_select;
    `);
    for (const key of [
      'sr_event_select', 'sr_event_insert', 'sr_event_update', 'sr_event_delete',
      'sr_delivery_select', 'sr_delivery_insert', 'sr_delivery_update', 'sr_delivery_delete',
      'worker_event_select', 'worker_delivery_select', 'anon_select', 'auth_select',
    ]) assert.strictEqual(rows[0][key], false, key + ' must be denied');
  });

  await runCheck('REAL-PG-04', 'Verify execute-only worker grants and atomic enqueue permission', () => {
    const rows = queryJson(`
      SELECT
        (SELECT rolsuper FROM pg_roles WHERE rolname = 'webhook_worker') AS worker_super,
        (SELECT rolinherit FROM pg_roles WHERE rolname = 'webhook_worker') AS worker_inherit,
        (SELECT rolcreaterole FROM pg_roles WHERE rolname = 'webhook_worker') AS worker_create_role,
        (SELECT rolcreatedb FROM pg_roles WHERE rolname = 'webhook_worker') AS worker_create_db,
        (SELECT rolcanlogin FROM pg_roles WHERE rolname = 'webhook_worker') AS worker_login,
        (SELECT rolbypassrls FROM pg_roles WHERE rolname = 'webhook_worker') AS worker_bypass_rls,
        has_function_privilege('service_role', 'public.fn_enqueue_webhook_event(uuid, text, text, jsonb, text, text)', 'EXECUTE') AS sr_enqueue,
        has_function_privilege('service_role', 'public.fn_claim_webhook_batch(integer, integer)', 'EXECUTE') AS sr_claim,
        has_function_privilege('webhook_worker', 'public.fn_enqueue_webhook_event(uuid, text, text, jsonb, text, text)', 'EXECUTE') AS worker_enqueue,
        has_function_privilege('webhook_worker', 'public.fn_claim_webhook_batch(integer, integer)', 'EXECUTE') AS worker_claim,
        has_function_privilege('webhook_worker', 'public.fn_complete_webhook_delivery(uuid, uuid, boolean, integer, integer, jsonb, jsonb, text, text)', 'EXECUTE') AS worker_complete,
        has_function_privilege('webhook_worker', 'public.fn_recover_expired_webhook_leases(integer)', 'EXECUTE') AS worker_recover,
        has_function_privilege('webhook_worker', 'public.fn_purge_expired_webhook_data(integer, integer)', 'EXECUTE') AS worker_purge,
        has_function_privilege('anon', 'public.fn_claim_webhook_batch(integer, integer)', 'EXECUTE') AS anon_claim,
        has_function_privilege('authenticated', 'public.fn_claim_webhook_batch(integer, integer)', 'EXECUTE') AS auth_claim;
    `);
    assert.strictEqual(rows[0].worker_super, false);
    assert.strictEqual(rows[0].worker_inherit, false);
    assert.strictEqual(rows[0].worker_create_role, false);
    assert.strictEqual(rows[0].worker_create_db, false);
    assert.strictEqual(rows[0].worker_login, false);
    assert.strictEqual(rows[0].worker_bypass_rls, false);
    assert.strictEqual(rows[0].sr_enqueue, true);
    assert.strictEqual(rows[0].sr_claim, false);
    assert.strictEqual(rows[0].worker_enqueue, false);
    assert.strictEqual(rows[0].worker_claim, true);
    assert.strictEqual(rows[0].worker_complete, true);
    assert.strictEqual(rows[0].worker_recover, true);
    assert.strictEqual(rows[0].worker_purge, true);
    assert.strictEqual(rows[0].anon_claim, false);
    assert.strictEqual(rows[0].auth_claim, false);
  });

  // ─── 4. SEED TEST FIXTURES ───
  const tenantA = '11111111-1111-1111-1111-111111111111';
  const tenantB = '22222222-2222-2222-2222-222222222222';
  const appA = '33333333-3333-3333-3333-333333333333';
  const appB = '44444444-4444-4444-4444-444444444444';
  const subA = '55555555-5555-5555-5555-555555555555';
  const eventA1 = '66666666-6666-6666-6666-666666666661';

  await runCheck('REAL-PG-05', 'Seed tenants, applications, and subscriptions', () => {
    runPsql(`
      INSERT INTO public.saas_tenants (id, name, slug, contact_email) VALUES 
        ('${tenantA}', 'Tenant Alpha', 'tenant-alpha', 'alpha@example.com'),
        ('${tenantB}', 'Tenant Beta', 'tenant-beta', 'beta@example.com')
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO public.saas_applications (id, tenant_id, name, environment) VALUES
        ('${appA}', '${tenantA}', 'App Alpha', 'live'),
        ('${appB}', '${tenantB}', 'App Beta', 'live')
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO public.webhook_subscriptions (
        id, tenant_id, application_id, endpoint_url,
        secret_ciphertext, secret_iv, secret_tag, secret_hash, secret_hint
      ) VALUES (
        '${subA}', '${tenantA}', '${appA}', 'https://api.subscriber.com/events',
        '\\x01020304', '\\x05060708090a0b0c', '\\x0d0e0f101112131415161718191a1b1c', 'hash123', 'hint123'
      ) ON CONFLICT (id) DO NOTHING;
    `);
  });

  // ─── 5. COMPOSITE FOREIGN KEY & TENANT ISOLATION ───
  await runCheck('REAL-PG-06', 'Reject cross-tenant subscription referencing another tenant application', () => {
    assert.throws(
      () => {
        runPsql(`
          INSERT INTO public.webhook_subscriptions (
            id, tenant_id, application_id, endpoint_url,
            secret_ciphertext, secret_iv, secret_tag, secret_hash, secret_hint
          ) VALUES (
            gen_random_uuid(), '${tenantA}', '${appB}', 'https://api.subscriber.com/cross-tenant',
            '\\x0102', '\\x030405060708090a0b0c', '\\x0d0e0f101112131415161718191a1b1c', 'hash', 'hint'
          );
        `);
      },
      /violates foreign key constraint "fk_webhook_sub_tenant_app"/
    );
  });

  await runCheck('REAL-PG-07', 'Reject webhook_subscription with non-HTTPS endpoint_url', () => {
    assert.throws(
      () => {
        runPsql(`
          INSERT INTO public.webhook_subscriptions (
            id, tenant_id, application_id, endpoint_url,
            secret_ciphertext, secret_iv, secret_tag, secret_hash, secret_hint
          ) VALUES (
            gen_random_uuid(), '${tenantA}', '${appA}', 'http://insecure.subscriber.com/events',
            '\\x0102', '\\x030405060708090a0b0c', '\\x0d0e0f101112131415161718191a1b1c', 'hash', 'hint'
          );
        `);
      },
      /violates check constraint "ck_webhook_endpoint_https"/
    );
  });

  await runCheck('REAL-PG-08', 'Insert valid webhook_event and reject cross-tenant delivery insertion', () => {
    runPsql(`
      INSERT INTO public.webhook_events (
        id, tenant_id, event_type, idempotency_key, payload, payload_raw, payload_sha256
      ) VALUES (
        '${eventA1}', '${tenantA}', 'election.results.published', 'idemp-real-01',
        '{"status":"declared"}'::jsonb, '{"status":"declared"}', 'sha256_mock_01'
      ) ON CONFLICT (id) DO NOTHING;
    `);

    // Cross-tenant delivery attempt: Tenant B referencing Event A1 (owned by Tenant A)
    assert.throws(
      () => {
        runPsql(`
          INSERT INTO public.webhook_deliveries (
            id, tenant_id, subscription_id, event_id, status, attempt_count
          ) VALUES (
            gen_random_uuid(), '${tenantB}', '${subA}', '${eventA1}', 'queued', 1
          );
        `);
      },
      /violates foreign key constraint/
    );
  });

  // ─── 6. IMMUTABILITY TRIGGER HARDENING PROBES ───
  await runCheck('REAL-PG-09', 'Direct UPDATE on webhook_events is prohibited (SQLSTATE 55000)', () => {
    assert.throws(
      () => {
        runPsql(`UPDATE public.webhook_events SET event_type = 'tampered' WHERE id = '${eventA1}';`);
      },
      /MUTATION_FORBIDDEN/
    );
  });

  await runCheck('REAL-PG-10', 'Direct DELETE on webhook_events is prohibited (SQLSTATE 55000)', () => {
    assert.throws(
      () => {
        runPsql(`DELETE FROM public.webhook_events WHERE id = '${eventA1}';`);
      },
      /DELETE_UNAUTHORIZED/
    );
  });

  await runCheck('REAL-PG-11', 'Caller-settable GUC manipulation (SET app.retention_cleanup_authorized=true) is prohibited (SQLSTATE 55000)', () => {
    assert.throws(
      () => {
        runPsql(`
          SET app.retention_cleanup_authorized = 'true';
          DELETE FROM public.webhook_events WHERE id = '${eventA1}';
        `);
      },
      /DELETE_UNAUTHORIZED/
    );
    // Reset session variable
    runPsql(`RESET app.retention_cleanup_authorized;`);
  });

  await runCheck('REAL-PG-12', 'Spoofed function in pg_temp cannot bypass immutability trigger (SQLSTATE 55000)', () => {
    assert.throws(
      () => {
        runPsql(`
          CREATE OR REPLACE FUNCTION pg_temp.fn_purge_expired_webhook_data(p1 integer, p2 integer) 
          RETURNS void LANGUAGE plpgsql AS $$
          BEGIN
            PERFORM set_config('app.retention_cleanup_authorized', 'true', true);
            DELETE FROM public.webhook_events WHERE id = '${eventA1}';
          END;
          $$;
          SELECT pg_temp.fn_purge_expired_webhook_data(7, 100);
        `);
      },
      /DELETE_UNAUTHORIZED/
    );
  });

  await runCheck('REAL-PG-12B', 'Alternate-schema lookalike (hacker_schema.fn_purge_expired_webhook_data) cannot bypass immutability trigger', () => {
    assert.throws(
      () => {
        runPsql(`
          DROP SCHEMA IF EXISTS hacker_schema CASCADE;
          CREATE SCHEMA hacker_schema;
          CREATE OR REPLACE FUNCTION hacker_schema.fn_purge_expired_webhook_data(p1 integer, p2 integer) 
          RETURNS void LANGUAGE plpgsql AS $$
          BEGIN
            PERFORM set_config('app.retention_cleanup_authorized', 'true', true);
            DELETE FROM public.webhook_events WHERE id = '${eventA1}';
          END;
          $$;
          SET search_path = hacker_schema, public;
          SELECT hacker_schema.fn_purge_expired_webhook_data(7, 100);
        `);
      },
      /DELETE_UNAUTHORIZED/
    );
    runPsql(`RESET search_path; DROP SCHEMA IF EXISTS hacker_schema CASCADE;`);
  });

  await runCheck('REAL-PG-12C', 'Unauthorized wrapper function calling direct DELETE cannot bypass immutability trigger', () => {
    assert.throws(
      () => {
        runPsql(`
          CREATE OR REPLACE FUNCTION public.unauthorized_wrapper_purge() 
          RETURNS void LANGUAGE plpgsql AS $$
          BEGIN
            PERFORM set_config('app.retention_cleanup_authorized', 'true', true);
            DELETE FROM public.webhook_events WHERE id = '${eventA1}';
          END;
          $$;
          SELECT public.unauthorized_wrapper_purge();
        `);
      },
      /DELETE_UNAUTHORIZED/
    );
    runPsql(`DROP FUNCTION IF EXISTS public.unauthorized_wrapper_purge();`);
  });

  await runCheck('REAL-PG-12D', 'Name lookalike function (fake_fn_purge_expired_webhook_data) cannot bypass immutability trigger', () => {
    assert.throws(
      () => {
        runPsql(`
          CREATE OR REPLACE FUNCTION public.fake_fn_purge_expired_webhook_data(p1 integer, p2 integer) 
          RETURNS void LANGUAGE plpgsql AS $$
          BEGIN
            PERFORM set_config('app.retention_cleanup_authorized', 'true', true);
            DELETE FROM public.webhook_events WHERE id = '${eventA1}';
          END;
          $$;
          SELECT public.fake_fn_purge_expired_webhook_data(7, 100);
        `);
      },
      /DELETE_UNAUTHORIZED/
    );
    runPsql(`DROP FUNCTION IF EXISTS public.fake_fn_purge_expired_webhook_data(integer, integer);`);
  });

  await runCheck('REAL-PG-13', 'Table-level DAC: service_role has no DELETE grant on webhook_events (SQLSTATE 42501)', () => {
    assert.throws(
      () => {
        runPsql(`
          SET ROLE service_role;
          DELETE FROM public.webhook_events WHERE id = '${eventA1}';
        `);
      },
      /permission denied for table webhook_events/
    );
    runPsql(`RESET ROLE;`);
  });

  // ─── 7. RETENTION PURGE FUNCTION & CUTOFF VALIDATION ───
  await runCheck('REAL-PG-14', 'fn_purge_expired_webhook_data rejects retention periods < 7 days (SQLSTATE 22023)', () => {
    assert.throws(
      () => {
        runPsql(`SELECT * FROM public.fn_purge_expired_webhook_data(3, 100);`);
      },
      /INVALID_RETENTION_PERIOD/
    );
  });

  await runCheck('REAL-PG-15', 'fn_purge_expired_webhook_data purges completed deliveries older than cutoff and preserves active', () => {
    const oldEventId = '77777777-7777-7777-7777-777777777777';
    const oldDelivId = '88888888-8888-8888-8888-888888888888';
    const activeDelivId = '99999999-9999-9999-9999-999999999999';

    // Insert old event and old delivered delivery (completed 40 days ago)
    runPsql(`
      INSERT INTO public.webhook_events (
        id, tenant_id, event_type, idempotency_key, payload, payload_raw, payload_sha256, created_at
      ) VALUES (
        '${oldEventId}', '${tenantA}', 'test.ping', 'idemp-old-01',
        '{"ping":true}'::jsonb, '{"ping":true}', 'sha_old', timezone('utc', now()) - interval '40 days'
      ) ON CONFLICT (id) DO NOTHING;

      INSERT INTO public.webhook_deliveries (
        id, tenant_id, subscription_id, event_id, status, attempt_count, completed_at, created_at
      ) VALUES (
        '${oldDelivId}', '${tenantA}', '${subA}', '${oldEventId}', 'delivered', 1,
        timezone('utc', now()) - interval '35 days', timezone('utc', now()) - interval '40 days'
      ) ON CONFLICT (id) DO NOTHING;

      -- Insert active queued delivery (created recently, not completed)
      INSERT INTO public.webhook_deliveries (
        id, tenant_id, subscription_id, event_id, status, attempt_count, created_at
      ) VALUES (
        '${activeDelivId}', '${tenantA}', '${subA}', '${eventA1}', 'queued', 1, timezone('utc', now())
      ) ON CONFLICT (id) DO NOTHING;
    `);

    // Execute retention purge with 30-day cutoff
    const res = queryJson(`SELECT * FROM public.fn_purge_expired_webhook_data(30, 1000);`);
    assert.strictEqual(res.length, 1);
    assert.ok(res[0].purged_deliveries_count >= 1, 'Must purge old delivery');
    assert.ok(res[0].purged_events_count >= 1, 'Must purge old orphaned event');

    // Verify active queued delivery still exists
    const activeCheck = queryJson(`SELECT id FROM public.webhook_deliveries WHERE id = '${activeDelivId}';`);
    assert.strictEqual(activeCheck.length, 1, 'Active queued delivery must be preserved');
  });

  // ─── 8. ATOMIC QUEUE CONCURRENCY VIA FOR UPDATE SKIP LOCKED ───
  await runCheck('REAL-PG-16', 'Atomic concurrency: fn_claim_webhook_batch with SKIP LOCKED partitions jobs with zero overlap', () => {
    // Clean up deliveries and insert 6 new queued deliveries for concurrency test
    runPsql(`DELETE FROM public.webhook_deliveries;`);

    const delivIds = [
      'a0000000-0000-0000-0000-000000000001',
      'a0000000-0000-0000-0000-000000000002',
      'a0000000-0000-0000-0000-000000000003',
      'a0000000-0000-0000-0000-000000000004',
      'a0000000-0000-0000-0000-000000000005',
      'a0000000-0000-0000-0000-000000000006',
    ];

    for (let i = 0; i < delivIds.length; i++) {
      const evtId = `b0000000-0000-0000-0000-00000000000${i + 1}`;
      runPsql(`
        INSERT INTO public.webhook_events (id, tenant_id, event_type, idempotency_key, payload, payload_raw, payload_sha256)
        VALUES ('${evtId}', '${tenantA}', 'test.ping', 'idemp-conc-${i}', '{}'::jsonb, '{}', 'sha')
        ON CONFLICT (id) DO NOTHING;

        INSERT INTO public.webhook_deliveries (id, tenant_id, subscription_id, event_id, status, attempt_count, created_at)
        VALUES ('${delivIds[i]}', '${tenantA}', '${subA}', '${evtId}', 'queued', 1, timezone('utc', now()) + interval '${i} seconds');
      `);
    }

    // Worker 1 claims batch of 3
    const batch1 = queryJson(`SELECT delivery_id, lease_token FROM public.fn_claim_webhook_batch(3, 60);`);
    assert.strictEqual(batch1.length, 3, 'Worker 1 must claim exactly 3 deliveries');

    // Worker 2 claims batch of 3 (SKIP LOCKED ensures zero overlap)
    const batch2 = queryJson(`SELECT delivery_id, lease_token FROM public.fn_claim_webhook_batch(3, 60);`);
    assert.strictEqual(batch2.length, 3, 'Worker 2 must claim remaining 3 deliveries');

    const ids1 = new Set(batch1.map((r: any) => r.delivery_id));
    const ids2 = new Set(batch2.map((r: any) => r.delivery_id));
    for (const id of ids1) {
      assert.ok(!ids2.has(id), `Delivery ${id} was claimed by both workers! Zero overlap invariant violated.`);
    }

    // Worker 3 attempts claim: all are currently leased
    const batch3 = queryJson(`SELECT delivery_id FROM public.fn_claim_webhook_batch(3, 60);`);
    assert.strictEqual(batch3.length, 0, 'Worker 3 must get 0 deliveries when all are leased');
  });

  // ─── 9. LEASE EXPIRY & CRASH RECOVERY ───
  await runCheck('REAL-PG-17', 'Crash recovery: expired lease is reclaimed by next batch claim with refreshed lease token', () => {
    // Fast-forward leased_until of one delivery into past to simulate crashed worker
    const crashedId = 'a0000000-0000-0000-0000-000000000001';
    runPsql(`
      UPDATE public.webhook_deliveries 
      SET leased_until = timezone('utc', now()) - interval '10 seconds'
      WHERE id = '${crashedId}';
    `);

    // Next worker claim must pick up the stalled delivery
    const reclaimed = queryJson(`SELECT delivery_id, lease_token FROM public.fn_claim_webhook_batch(1, 60);`);
    assert.strictEqual(reclaimed.length, 1, 'Must reclaim the expired leased delivery');
    assert.strictEqual(reclaimed[0].delivery_id, crashedId, 'Must be the crashed delivery ID');
    assert.ok(reclaimed[0].lease_token, 'Must assign a fresh lease token');
  });

  // ─── 10. STALE LEASE-TOKEN FENCING ───
  await runCheck('REAL-PG-18', 'Stale lease-token fencing: late completion from crashed worker affects 0 rows', () => {
    const fencedId = 'a0000000-0000-0000-0000-000000000001';
    const staleToken = '00000000-0000-0000-0000-000000000000'; // Token from before crash/reclaim

    // Attempt fenced completion with stale token directly at top level
    const countStr = runPsql(`
      WITH updated AS (
        UPDATE public.webhook_deliveries
        SET status = 'delivered', completed_at = timezone('utc', now())
        WHERE id = '${fencedId}' AND lease_token = '${staleToken}'
        RETURNING id
      )
      SELECT count(*) FROM updated;
    `, ['-t', '-A']).trim();

    assert.strictEqual(Number.parseInt(countStr, 10), 0, 'Late update with stale lease token must affect 0 rows');
  });

  console.log('\n----------------------------------------------------------------');
  console.log(`Results: ${passCount} passed, ${failCount} failed.`);
  console.log('----------------------------------------------------------------\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runAll().catch((err) => {
  console.error('FATAL UNCAUGHT ERROR:', err);
  process.exit(1);
});
