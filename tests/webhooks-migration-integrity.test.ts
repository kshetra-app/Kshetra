/**
 * tests/webhooks-migration-integrity.test.ts
 *
 * Milestone W022 — B2B SaaS Outbound Webhooks & Event Dispatching Engine
 * Gate W022-G3 / Gate C: Migration DDL Static & Dynamic In-Memory PostgreSQL Verification Suite
 *
 * Mandatory Verification Invariants:
 * 1. Preflight assertion: verifies uq_saas_applications_tenant_app constraint with SQLSTATE 55000.
 * 2. Composite tenant foreign keys on webhook_subscriptions and webhook_deliveries.
 * 3. Scoped tenant idempotency unique index on (tenant_id, idempotency_key).
 * 4. Immutability trigger: trg_webhook_events_immutable blocks direct UPDATE/DELETE with SQLSTATE 55000.
 * 5. Retention procedure: fn_purge_expired_webhook_data requires retention_days >= 7 and authorization flag.
 * 6. Deletion order: deletes deliveries first, orphaned events second.
 * 7. Real PostgreSQL DDL and trigger execution in isolated in-memory PGlite engine.
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';

console.log('================================================================');
console.log('W022: MIGRATION 070 DDL & ISOLATED POSTGRESQL VERIFICATION SUITE');
console.log('Timestamp:', new Date().toISOString());
console.log('Authority: CTO DIRECTIVE W022-CTO-EXEC-001 (Gate C)');
console.log('================================================================\n');

let passCount = 0;
let failCount = 0;

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
  const migrationPath = path.resolve('supabase/migrations/070_saas_webhook_engine.sql');
  assert.ok(fs.existsSync(migrationPath), 'Migration file 070_saas_webhook_engine.sql must exist.');
  const sqlContent = fs.readFileSync(migrationPath, 'utf8');
  const correctiveMigrationPath = path.resolve('supabase/migrations/071_w022_webhook_runtime_security_and_atomicity.sql');
  assert.ok(fs.existsSync(correctiveMigrationPath), 'Corrective migration 071 must exist.');
  const correctiveSqlContent = fs.readFileSync(correctiveMigrationPath, 'utf8');

  // ─── Part 1: Static DDL & Contract Invariants ───
  await runCheck('DDL-01', 'Preflight check verifies uq_saas_applications_tenant_app with SQLSTATE 55000', () => {
    assert.ok(sqlContent.includes('uq_saas_applications_tenant_app'));
    assert.ok(sqlContent.includes('ERRCODE = \'55000\''));
  });

  await runCheck('DDL-02', 'webhook_subscriptions defines composite FK fk_webhook_sub_tenant_app and HTTPS check', () => {
    assert.ok(sqlContent.includes('CONSTRAINT fk_webhook_sub_tenant_app FOREIGN KEY (tenant_id, application_id)'));
    assert.ok(sqlContent.includes('endpoint_url ~* \'^https://.+\''));
    assert.ok(sqlContent.includes('secret_ciphertext BYTEA NOT NULL'));
    assert.ok(sqlContent.includes('previous_secret_ciphertext BYTEA'));
  });

  await runCheck('DDL-03', 'webhook_events defines composite unique key (tenant_id, id) and tenant scoped idempotency', () => {
    assert.ok(sqlContent.includes('CONSTRAINT uq_webhook_events_tenant_id UNIQUE (tenant_id, id)'));
    assert.ok(sqlContent.includes('CREATE UNIQUE INDEX uq_webhook_events_tenant_idempotency'));
    assert.ok(sqlContent.includes('ON public.webhook_events (tenant_id, idempotency_key)'));
    assert.ok(sqlContent.includes('payload_raw TEXT NOT NULL'));
  });

  await runCheck('DDL-04', 'trg_webhook_events_immutable blocks UPDATE and DELETE on webhook_events', () => {
    assert.ok(sqlContent.includes('CREATE TRIGGER trg_webhook_events_immutable'));
    assert.ok(sqlContent.includes('BEFORE UPDATE OR DELETE ON public.webhook_events'));
    assert.ok(sqlContent.includes('ERRCODE = \'55000\''));
  });

  await runCheck('DDL-05', 'webhook_deliveries enforces composite FKs to both subscriptions and events', () => {
    assert.ok(sqlContent.includes('CONSTRAINT fk_webhook_deliv_tenant_sub FOREIGN KEY (tenant_id, subscription_id)'));
    assert.ok(sqlContent.includes('REFERENCES public.webhook_subscriptions(tenant_id, id)'));
    assert.ok(sqlContent.includes('CONSTRAINT fk_webhook_deliv_tenant_event FOREIGN KEY (tenant_id, event_id)'));
    assert.ok(sqlContent.includes('REFERENCES public.webhook_events(tenant_id, id)'));
    assert.ok(sqlContent.includes('attempt_count >= 1 AND attempt_count <= 5'));
  });

  await runCheck('DDL-06', 'fn_purge_expired_webhook_data enforces authorization and cascade-safe deletion order', () => {
    assert.ok(sqlContent.includes('p_retention_days < 7'));
    assert.ok(sqlContent.includes('app.retention_cleanup_authorized'));
    // Deliveries purged before events
    const delivPos = sqlContent.indexOf('DELETE FROM public.webhook_deliveries');
    const evtPos = sqlContent.indexOf('DELETE FROM public.webhook_events');
    assert.ok(delivPos > 0 && evtPos > delivPos, 'Deliveries must be deleted prior to events to maintain FK integrity');
  });

  await runCheck('DDL-07', 'Revoke direct UPDATE/DELETE on webhook_events from service_role', () => {
    assert.ok(sqlContent.includes('REVOKE UPDATE, DELETE ON public.webhook_events FROM service_role'));
  });

  await runCheck('DDL-08', '071 implements atomic enqueue and fenced worker state transitions', () => {
    assert.ok(correctiveSqlContent.includes('fn_enqueue_webhook_event'));
    assert.ok(correctiveSqlContent.includes('ON CONFLICT (tenant_id, idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING'));
    assert.ok(correctiveSqlContent.includes('fn_complete_webhook_delivery'));
    assert.ok(correctiveSqlContent.includes('fn_recover_expired_webhook_leases'));
    assert.ok(correctiveSqlContent.includes('p_retention_days > 3650'));
    assert.ok(correctiveSqlContent.includes('p_batch_size > 5000'));
  });

  await runCheck('DDL-09', '071 provisions a non-login worker role and prevents direct table access', () => {
    assert.ok(correctiveSqlContent.includes('CREATE ROLE webhook_worker NOLOGIN NOINHERIT NOSUPERUSER'));
    assert.ok(correctiveSqlContent.includes('GRANT webhook_worker TO authenticator'));
    assert.ok(correctiveSqlContent.includes('REVOKE ALL ON public.webhook_events, public.webhook_deliveries FROM service_role'));
    assert.ok(correctiveSqlContent.includes('GRANT EXECUTE ON FUNCTION public.fn_claim_webhook_batch(INTEGER, INTEGER) TO webhook_worker'));
  });

  // ─── Part 2: Dynamic Execution in Isolated In-Memory PGlite Engine ───
  const db = new PGlite();

  await runCheck('PG-01', 'Bootstrap prerequisite tables (saas_tenants, saas_applications with composite key)', async () => {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS public.saas_tenants (
        id UUID PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS public.saas_applications (
        id UUID PRIMARY KEY,
        tenant_id UUID NOT NULL REFERENCES public.saas_tenants(id) ON DELETE RESTRICT,
        application_id TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT uq_saas_applications_tenant_app UNIQUE (tenant_id, id)
      );

      -- Mock Supabase standard roles for grant verification
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
          CREATE ROLE anon;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
          CREATE ROLE authenticated;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
          CREATE ROLE service_role;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticator') THEN
          CREATE ROLE authenticator NOINHERIT;
        END IF;
      END $$;
    `);
  });

  await runCheck('PG-02', 'Execute migration 070_saas_webhook_engine.sql cleanly against PostgreSQL', async () => {
    await db.exec(sqlContent);
    await db.exec(correctiveSqlContent);
  });

  // Seed sample tenant & app
  const tenantId = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1';
  const saasAppRowId = 'b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2';
  const appId = 'app-unit-test';

  await runCheck('PG-03', 'Insert tenant and application records', async () => {
    await db.query(`INSERT INTO public.saas_tenants (id, name) VALUES ('${tenantId}', 'Test Tenant Alpha')`);
    await db.query(`INSERT INTO public.saas_applications (id, tenant_id, application_id) VALUES ('${saasAppRowId}', '${tenantId}', '${appId}')`);
  });

  const subId = 'c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3';
  await runCheck('PG-04', 'Insert valid webhook_subscription with HTTPS endpoint and composite FK', async () => {
    await db.query(`
      INSERT INTO public.webhook_subscriptions (
        id, tenant_id, application_id, endpoint_url,
        secret_ciphertext, secret_iv, secret_tag, secret_hash, secret_hint
      ) VALUES (
        '${subId}', '${tenantId}', '${saasAppRowId}', 'https://api.subscriber.com/events',
        '\\x01020304', '\\x05060708090a0b0c', '\\x0d0e0f101112131415161718191a1b1c', 'hash123', 'hint123'
      );
    `);
    const res = await db.query(`SELECT id, status FROM public.webhook_subscriptions WHERE id = '${subId}'`);
    assert.strictEqual(res.rows.length, 1);
  });

  await runCheck('PG-05', 'Reject webhook_subscription with non-HTTPS endpoint_url', async () => {
    try {
      await assert.rejects(
        async () => {
          await db.query(`
            INSERT INTO public.webhook_subscriptions (
              id, tenant_id, application_id, endpoint_url,
              secret_ciphertext, secret_iv, secret_tag, secret_hash, secret_hint
            ) VALUES (
              gen_random_uuid(), '${tenantId}', '${saasAppRowId}', 'http://insecure.subscriber.com/events',
              '\\x0102', '\\x030405060708090a0b0c', '\\x0d0e0f101112131415161718191a1b1c', 'hash', 'hint'
            );
          `);
        },
        /ck_webhook_endpoint_https/
      );
    } finally {
      await db.query('ROLLBACK').catch(() => {});
    }
  });

  const eventId = 'd4d4d4d4-d4d4-d4d4-d4d4-d4d4d4d4d4d4';
  await runCheck('PG-06', 'Insert webhook_event with payload_raw and composite key', async () => {
    await db.query(`
      INSERT INTO public.webhook_events (
        id, tenant_id, event_type, idempotency_key, payload, payload_raw, payload_sha256
      ) VALUES (
        '${eventId}', '${tenantId}', 'election.results.published', 'idemp-pg-01',
        '{"status":"declared"}'::jsonb, '{"status":"declared"}', 'sha256_mock'
      );
    `);
    const res = await db.query(`SELECT id, event_type FROM public.webhook_events WHERE id = '${eventId}'`);
    assert.strictEqual(res.rows.length, 1);
  });

  await runCheck('PG-07', 'trg_webhook_events_immutable blocks UPDATE on webhook_events (SQLSTATE 55000)', async () => {
    try {
      await assert.rejects(
        async () => {
          await db.query(`UPDATE public.webhook_events SET event_type = 'tampered' WHERE id = '${eventId}'`);
        },
        /MUTATION_FORBIDDEN|55000/
      );
    } finally {
      await db.query('ROLLBACK').catch(() => {});
    }
  });

  await runCheck('PG-08', 'trg_webhook_events_immutable blocks direct DELETE on webhook_events (SQLSTATE 55000)', async () => {
    try {
      await assert.rejects(
        async () => {
          await db.query(`DELETE FROM public.webhook_events WHERE id = '${eventId}'`);
        },
        /DELETE_UNAUTHORIZED|55000/
      );
    } finally {
      await db.query('ROLLBACK').catch(() => {});
    }
  });

  await runCheck('PG-08B', 'trg_webhook_events_immutable blocks DELETE even when caller sets app.retention_cleanup_authorized=true (SQLSTATE 55000)', async () => {
    try {
      await db.exec(`SET app.retention_cleanup_authorized = 'true';`);
      await assert.rejects(
        async () => {
          await db.query(`DELETE FROM public.webhook_events WHERE id = '${eventId}'`);
        },
        /DELETE_UNAUTHORIZED|55000/
      );
    } finally {
      await db.exec(`RESET app.retention_cleanup_authorized;`).catch(() => {});
      await db.query('ROLLBACK').catch(() => {});
    }
  });

  await runCheck('PG-08C', 'trg_webhook_events_immutable blocks spoofed function in pg_temp from deleting webhook_events', async () => {
    try {
      await db.exec(`
        CREATE OR REPLACE FUNCTION pg_temp.fn_purge_expired_webhook_data(p1 integer, p2 integer) RETURNS void LANGUAGE plpgsql AS $$
        BEGIN
          PERFORM set_config('app.retention_cleanup_authorized', 'true', true);
          DELETE FROM public.webhook_events WHERE id = '${eventId}';
        END;
        $$;
      `);
      await assert.rejects(
        async () => {
          await db.query(`SELECT pg_temp.fn_purge_expired_webhook_data(7, 100);`);
        },
        /DELETE_UNAUTHORIZED|55000/
      );
    } finally {
      await db.query('ROLLBACK').catch(() => {});
    }
  });

  await runCheck('PG-08D', 'Table-level DAC boundary: ordinary application role has no DELETE grant on webhook_events', async () => {
    try {
      await db.exec(`
        CREATE ROLE test_app_client;
        GRANT SELECT, INSERT ON public.webhook_events TO test_app_client;
        SET ROLE test_app_client;
      `);
      await assert.rejects(
        async () => {
          await db.query(`DELETE FROM public.webhook_events WHERE id = '${eventId}'`);
        },
        /permission denied for table webhook_events/
      );
    } finally {
      await db.exec(`RESET ROLE;`).catch(() => {});
      await db.query('ROLLBACK').catch(() => {});
    }
  });

  const delivId = 'e5e5e5e5-e5e5-e5e5-e5e5-e5e5e5e5e5e5';
  await runCheck('PG-09', 'Insert webhook_delivery with composite FKs referencing subscription and event', async () => {
    await db.query(`
      INSERT INTO public.webhook_deliveries (
        id, tenant_id, subscription_id, event_id, status, attempt_count
      ) VALUES (
        '${delivId}', '${tenantId}', '${subId}', '${eventId}', 'delivered', 1
      );
    `);
    const res = await db.query(`SELECT id, status FROM public.webhook_deliveries WHERE id = '${delivId}'`);
    assert.strictEqual(res.rows.length, 1);
  });

  const eventId2 = 'd5d5d5d5-d5d5-d5d5-d5d5-d5d5d5d5d5d5';
  await runCheck('PG-10', 'Reject cross-tenant delivery insertion (composite FK violation)', async () => {
    // Insert distinct second event
    await db.query(`
      INSERT INTO public.webhook_events (
        id, tenant_id, event_type, idempotency_key, payload, payload_raw, payload_sha256
      ) VALUES (
        '${eventId2}', '${tenantId}', 'election.results.published', 'idemp-pg-02',
        '{}'::jsonb, '{}', 'sha256_mock_2'
      );
    `);

    const wrongTenantId = 'f6f6f6f6-f6f6-f6f6-f6f6-f6f6f6f6f6f6';
    try {
      await assert.rejects(
        async () => {
          await db.query(`
            INSERT INTO public.webhook_deliveries (
              id, tenant_id, subscription_id, event_id, status, attempt_count
            ) VALUES (
              gen_random_uuid(), '${wrongTenantId}', '${subId}', '${eventId2}', 'queued', 1
            );
          `);
        },
        /violates foreign key constraint/
      );
    } finally {
      await db.query('ROLLBACK').catch(() => {});
    }
  });

  await runCheck('PG-11', 'fn_purge_expired_webhook_data rejects unsafe retention periods (< 7 days)', async () => {
    try {
      await assert.rejects(
        async () => {
          await db.query(`SELECT * FROM public.fn_purge_expired_webhook_data(3, 100);`);
        },
        /INVALID_RETENTION_PERIOD|22023/
      );
    } finally {
      await db.query('ROLLBACK').catch(() => {});
    }
  });

  await runCheck('PG-12', 'fn_purge_expired_webhook_data executes safely for authorized retention period (>= 7 days)', async () => {
    const res = await db.query(`SELECT * FROM public.fn_purge_expired_webhook_data(30, 100);`);
    assert.strictEqual(res.rows.length, 1);
    assert.ok(res.rows[0].purged_deliveries_count !== undefined);
    assert.ok(res.rows[0].purged_events_count !== undefined);
  });

  await runCheck('PG-13', 'fn_claim_webhook_batch atomically claims queued deliveries using SKIP LOCKED', async () => {
    const queuedDelivId = 'f7f7f7f7-f7f7-f7f7-f7f7-f7f7f7f7f7f7';
    await db.query(`
      INSERT INTO public.webhook_deliveries (
        id, tenant_id, subscription_id, event_id, status, attempt_count
      ) VALUES (
        '${queuedDelivId}', '${tenantId}', '${subId}', '${eventId2}', 'queued', 1
      );
    `);

    const claimed = await db.query(`SELECT * FROM public.fn_claim_webhook_batch(10, 30);`);
    assert.strictEqual(claimed.rows.length, 1);
    const row = claimed.rows[0];
    assert.strictEqual(row.delivery_id, queuedDelivId);
    assert.strictEqual(row.tenant_id, tenantId);
    assert.strictEqual(row.subscription_id, subId);
    assert.strictEqual(row.event_id, eventId2);
    assert.ok(row.lease_token);
    assert.ok(row.leased_until);
    assert.strictEqual(row.endpoint_url, 'https://api.subscriber.com/events');
    assert.strictEqual(row.event_type, 'election.results.published');
  });

  await runCheck('PG-14', 'Concurrent worker claim skips actively leased delivery (SKIP LOCKED returns 0 rows)', async () => {
    const secondClaim = await db.query(`SELECT * FROM public.fn_claim_webhook_batch(10, 30);`);
    assert.strictEqual(secondClaim.rows.length, 0);
  });

  await db.close();

  // ─── Summary ───
  console.log('\n----------------------------------------------------------------');
  console.log(`Results: ${passCount} passed, ${failCount} failed.`);
  console.log('----------------------------------------------------------------\n');
  if (failCount > 0) {
    process.exit(1);
  }
}

runAll().catch((err) => {
  console.error('Unhandled migration integrity test suite failure:', err);
  process.exit(1);
});
