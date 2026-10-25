/**
 * tests/webhooks-app-isolation.test.ts
 *
 * Milestone W022 — B2B SaaS Outbound Webhooks & Event Dispatching Engine
 * Directive: W022-CTO-REMEDIATION-006 (Section C.5)
 *
 * Scope:
 * 1. Proves application-level isolation within the same tenant.
 * 2. Event emitted by App 1 fans out ONLY to App 1's subscriptions; App 2 receives ZERO deliveries.
 * 3. Event emitted by App 2 fans out ONLY to App 2's subscriptions; App 1 receives ZERO deliveries.
 * 4. Idempotency keys are scoped to (tenant_id, application_id, idempotency_key): identical keys in App 1 and App 2 do NOT collide.
 * 5. Composite foreign key rejects cross-tenant/cross-application references.
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';

console.log('================================================================');
console.log('W022: MULTI-APPLICATION TENANT ISOLATION VERIFICATION SUITE');
console.log('Timestamp:', new Date().toISOString());
console.log('Authority: CTO DIRECTIVE W022-CTO-REMEDIATION-006 (Section C.5)');
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
  const db = new PGlite();

  // 1. Initialize schema
  await runCheck('ISO-01', 'Initialize database schema with migration 070', async () => {
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

      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon; END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated; END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role; END IF;
      END $$;
    `);

    const migSql = fs.readFileSync(path.resolve('supabase/migrations/070_saas_webhook_engine.sql'), 'utf8');
    await db.exec(migSql);
  });

  const tenantAlpha = '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const tenantBeta = '22222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

  // Tenant Alpha has TWO applications
  const appAlpha1 = '33333333-1111-1111-1111-111111111111';
  const appAlpha2 = '33333333-2222-2222-2222-222222222222';

  // Tenant Beta has ONE application
  const appBeta1 = '44444444-1111-1111-1111-111111111111';

  const subAlpha1 = '55555555-1111-1111-1111-111111111111';
  const subAlpha2 = '55555555-2222-2222-2222-222222222222';
  const subBeta1 = '55555555-3333-3333-3333-333333333333';

  await runCheck('ISO-02', 'Seed tenants, multiple applications per tenant, and subscriptions', async () => {
    await db.exec(`
      INSERT INTO public.saas_tenants (id, name) VALUES
        ('${tenantAlpha}', 'Tenant Alpha (Enterprise)'),
        ('${tenantBeta}', 'Tenant Beta');

      INSERT INTO public.saas_applications (id, tenant_id, application_id) VALUES
        ('${appAlpha1}', '${tenantAlpha}', 'alpha-app-crm'),
        ('${appAlpha2}', '${tenantAlpha}', 'alpha-app-billing'),
        ('${appBeta1}', '${tenantBeta}', 'beta-app-core');

      INSERT INTO public.webhook_subscriptions (
        id, tenant_id, application_id, endpoint_url, subscribed_events, status,
        secret_ciphertext, secret_iv, secret_tag, secret_hash, secret_hint
      ) VALUES
        ('${subAlpha1}', '${tenantAlpha}', '${appAlpha1}', 'https://crm.alpha.com/hook', ARRAY['*'], 'active', '\\x01', '\\x02', '\\x03', 'h1', 'hint1'),
        ('${subAlpha2}', '${tenantAlpha}', '${appAlpha2}', 'https://billing.alpha.com/hook', ARRAY['*'], 'active', '\\x01', '\\x02', '\\x03', 'h2', 'hint2'),
        ('${subBeta1}', '${tenantBeta}', '${appBeta1}', 'https://core.beta.com/hook', ARRAY['*'], 'active', '\\x01', '\\x02', '\\x03', 'h3', 'hint3');
    `);
  });

  // 2. Publish from App Alpha 1: must deliver ONLY to subAlpha1
  let eventAlpha1Id = '';
  await runCheck('ISO-03', 'App Alpha 1 event fans out strictly to subAlpha1, completely isolated from subAlpha2', async () => {
    const res = await db.query(`
      SELECT * FROM public.fn_publish_webhook_event(
        '${tenantAlpha}',
        '${appAlpha1}',
        'voter.registered',
        'shared-idemp-key-xyz',
        '{"voterId":"v-100"}'::jsonb,
        '{"voterId":"v-100"}',
        'sha256_iso_01'
      );
    `);

    assert.strictEqual(res.rows.length, 1);
    assert.strictEqual(res.rows[0].is_duplicate, false);
    assert.strictEqual(res.rows[0].deliveries_created, 1);
    eventAlpha1Id = res.rows[0].event_id;

    // Verify delivery target is strictly subAlpha1
    const delivs = await db.query(`SELECT subscription_id FROM public.webhook_deliveries WHERE event_id = '${eventAlpha1Id}'`);
    assert.strictEqual(delivs.rows.length, 1);
    assert.strictEqual(delivs.rows[0].subscription_id, subAlpha1);
  });

  // 3. Publish from App Alpha 2 with the SAME idempotency key: must NOT collide with App Alpha 1!
  let eventAlpha2Id = '';
  await runCheck('ISO-04', 'App Alpha 2 using identical idempotency key is isolated and creates distinct event & delivery', async () => {
    const res = await db.query(`
      SELECT * FROM public.fn_publish_webhook_event(
        '${tenantAlpha}',
        '${appAlpha2}',
        'invoice.generated',
        'shared-idemp-key-xyz', -- EXACT SAME idempotency key as App Alpha 1!
        '{"invoiceId":"inv-200"}'::jsonb,
        '{"invoiceId":"inv-200"}',
        'sha256_iso_02'
      );
    `);

    assert.strictEqual(res.rows.length, 1);
    assert.strictEqual(res.rows[0].is_duplicate, false, 'Must not be considered duplicate of App Alpha 1 event');
    assert.strictEqual(res.rows[0].deliveries_created, 1);
    eventAlpha2Id = res.rows[0].event_id;
    assert.notStrictEqual(eventAlpha2Id, eventAlpha1Id, 'Must generate distinct event ID');

    // Verify delivery target is strictly subAlpha2
    const delivs = await db.query(`SELECT subscription_id FROM public.webhook_deliveries WHERE event_id = '${eventAlpha2Id}'`);
    assert.strictEqual(delivs.rows.length, 1);
    assert.strictEqual(delivs.rows[0].subscription_id, subAlpha2);
  });

  // 4. Batch claiming joins on application_id: verify claimed job carries correct application_id
  await runCheck('ISO-05', 'fn_claim_webhook_batch returns correct application_id matching event and subscription', async () => {
    const claimed = await db.query(`SELECT * FROM public.fn_claim_webhook_batch(10, 30);`);
    assert.strictEqual(claimed.rows.length, 2);

    for (const job of claimed.rows) {
      if (job.delivery_id && job.subscription_id === subAlpha1) {
        assert.strictEqual(job.application_id, appAlpha1);
        assert.strictEqual(job.event_type, 'voter.registered');
      } else if (job.delivery_id && job.subscription_id === subAlpha2) {
        assert.strictEqual(job.application_id, appAlpha2);
        assert.strictEqual(job.event_type, 'invoice.generated');
      } else {
        assert.fail(`Unexpected job: ${JSON.stringify(job)}`);
      }
    }
  });

  // 5. Negative test: Cross-tenant application reference rejected by composite FK fk_webhook_events_tenant_app
  await runCheck('ISO-06', 'Direct event insertion with mismatched tenant and application violates composite FK', async () => {
    await assert.rejects(
      async () => {
        await db.query(`
          INSERT INTO public.webhook_events (
            id, tenant_id, application_id, event_type, idempotency_key, payload, payload_raw, payload_sha256
          ) VALUES (
            gen_random_uuid(), '${tenantAlpha}', '${appBeta1}', 'test.event', 'idemp-bad-fk',
            '{}'::jsonb, '{}', 'sha'
          );
        `);
      },
      /fk_webhook_events_tenant_app|violates foreign key constraint/
    );
  });

  // 6. Negative test: fn_publish_webhook_event rejects application belonging to different tenant
  await runCheck('ISO-07', 'fn_publish_webhook_event rejects mismatched tenant_id and application_id', async () => {
    await assert.rejects(
      async () => {
        await db.query(`
          SELECT * FROM public.fn_publish_webhook_event(
            '${tenantAlpha}',
            '${appBeta1}',
            'test.event',
            'idemp-bad-app',
            '{}'::jsonb,
            '{}',
            'sha'
          );
        `);
      },
      /APPLICATION_NOT_FOUND|foreign_key_violation/
    );
  });

  await db.close();

  console.log('\n----------------------------------------------------------------');
  console.log(`Results: ${passCount} passed, ${failCount} failed.`);
  console.log('----------------------------------------------------------------\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runAll().catch((err) => {
  console.error('Unhandled failure in webhooks-app-isolation test:', err);
  process.exit(1);
});
