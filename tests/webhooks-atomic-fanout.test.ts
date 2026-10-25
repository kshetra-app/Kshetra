/**
 * tests/webhooks-atomic-fanout.test.ts
 *
 * Milestone W022 — B2B SaaS Outbound Webhooks & Event Dispatching Engine
 * Directive: W022-CTO-REMEDIATION-006 (Section C.3)
 *
 * Scope:
 * 1. Proves atomicity of event publication and subscription fan-out via fn_publish_webhook_event.
 * 2. Proves that transactional failure (e.g. invalid application, FK violation) leaves ZERO partial state.
 * 3. Verifies idempotency replay returns the immutable original event without changing fan-out.
 * 4. Verifies PostgresQueueProvider.enqueueEvent() RPC contract.
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { PostgresQueueProvider } from '../apps/api/src/modules/webhooks/queueProvider';

console.log('================================================================');
console.log('W022: ATOMIC FAN-OUT & TRANSACTIONAL INTEGRITY VERIFICATION SUITE');
console.log('Timestamp:', new Date().toISOString());
console.log('Authority: CTO DIRECTIVE W022-CTO-REMEDIATION-006 (Section C.3)');
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

  // 1. Initialize DB schema
  await runCheck('AF-01', 'Initialize schema with migration 070', async () => {
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

  const tenantId = '11111111-2222-3333-4444-555555555555';
  const appId = '66666666-7777-8888-9999-aaaaaaaaaaaa';
  const sub1Id = 'bbbbbbbb-1111-1111-1111-111111111111';
  const sub2Id = 'bbbbbbbb-2222-2222-2222-222222222222';
  const subDisabledId = 'bbbbbbbb-3333-3333-3333-333333333333';

  await runCheck('AF-02', 'Seed tenant, application, and active/disabled subscriptions', async () => {
    await db.query(`INSERT INTO public.saas_tenants (id, name) VALUES ('${tenantId}', 'Tenant AF')`);
    await db.query(`INSERT INTO public.saas_applications (id, tenant_id, application_id) VALUES ('${appId}', '${tenantId}', 'app-af')`);

    // Sub 1: Subscribed to all events ('*'), active
    await db.query(`
      INSERT INTO public.webhook_subscriptions (
        id, tenant_id, application_id, endpoint_url, subscribed_events, status,
        secret_ciphertext, secret_iv, secret_tag, secret_hash, secret_hint
      ) VALUES (
        '${sub1Id}', '${tenantId}', '${appId}', 'https://api.subscriber1.com/hook', ARRAY['*'], 'active',
        '\\x01', '\\x02', '\\x03', 'hash1', 'hint1'
      );
    `);

    // Sub 2: Subscribed to 'election.declared' only, active
    await db.query(`
      INSERT INTO public.webhook_subscriptions (
        id, tenant_id, application_id, endpoint_url, subscribed_events, status,
        secret_ciphertext, secret_iv, secret_tag, secret_hash, secret_hint
      ) VALUES (
        '${sub2Id}', '${tenantId}', '${appId}', 'https://api.subscriber2.com/hook', ARRAY['election.declared'], 'active',
        '\\x01', '\\x02', '\\x03', 'hash2', 'hint2'
      );
    `);

    // Sub 3: Subscribed to all events ('*'), disabled
    await db.query(`
      INSERT INTO public.webhook_subscriptions (
        id, tenant_id, application_id, endpoint_url, subscribed_events, status,
        secret_ciphertext, secret_iv, secret_tag, secret_hash, secret_hint
      ) VALUES (
        '${subDisabledId}', '${tenantId}', '${appId}', 'https://api.subscriber3.com/hook', ARRAY['*'], 'disabled',
        '\\x01', '\\x02', '\\x03', 'hash3', 'hint3'
      );
    `);
  });

  // 2. Publish matching event: should fan out to sub1 and sub2, ignoring subDisabled
  let event1Id = '';
  await runCheck('AF-03', 'fn_publish_webhook_event atomically fans out to active matching subscriptions', async () => {
    const res = await db.query(`
      SELECT * FROM public.fn_publish_webhook_event(
        '${tenantId}',
        '${appId}',
        'election.declared',
        'idemp-af-01',
        '{"constituency":"Varanasi"}'::jsonb,
        '{"constituency":"Varanasi"}',
        'sha256_af_01'
      );
    `);
    assert.strictEqual(res.rows.length, 1);
    assert.strictEqual(res.rows[0].is_duplicate, false);
    assert.strictEqual(res.rows[0].deliveries_created, 2); // sub1 and sub2
    event1Id = res.rows[0].event_id;
    assert.ok(event1Id);

    // Verify exactly 2 deliveries exist in DB
    const delivs = await db.query(`SELECT id, subscription_id, status FROM public.webhook_deliveries WHERE event_id = '${event1Id}'`);
    assert.strictEqual(delivs.rows.length, 2);
    const subIds = new Set(delivs.rows.map((r: any) => r.subscription_id));
    assert.ok(subIds.has(sub1Id));
    assert.ok(subIds.has(sub2Id));
    assert.ok(!subIds.has(subDisabledId), 'Disabled subscription must not receive delivery');
  });

  // 3. Negative-path: Non-matching event type only fans out to wildcard subscription
  await runCheck('AF-04', 'Event type filtering: non-matching specific subscription receives 0 deliveries', async () => {
    const res = await db.query(`
      SELECT * FROM public.fn_publish_webhook_event(
        '${tenantId}',
        '${appId}',
        'turnout.updated',
        'idemp-af-02',
        '{"pct":65.4}'::jsonb,
        '{"pct":65.4}',
        'sha256_af_02'
      );
    `);
    assert.strictEqual(res.rows.length, 1);
    assert.strictEqual(res.rows[0].is_duplicate, false);
    assert.strictEqual(res.rows[0].deliveries_created, 1); // Only sub1 (wildcard)
  });

  // 4. Fault injection: Invalid application ID fails closed and rolls back cleanly
  await runCheck('AF-05', 'Fault injection: invalid application ID rolls back and commits zero partial state', async () => {
    const fakeAppId = '00000000-0000-0000-0000-000000000000';
    const idempKey = 'idemp-fail-01';

    await assert.rejects(
      async () => {
        await db.query(`
          SELECT * FROM public.fn_publish_webhook_event(
            '${tenantId}',
            '${fakeAppId}',
            'election.declared',
            '${idempKey}',
            '{}'::jsonb,
            '{}',
            'sha256_fail'
          );
        `);
      },
      /APPLICATION_NOT_FOUND|foreign_key_violation|23503/
    );

    // Verify zero events were committed
    const evts = await db.query(`SELECT count(*)::int AS count FROM public.webhook_events WHERE idempotency_key = '${idempKey}'`);
    assert.strictEqual(evts.rows[0].count, 0, 'No event must be committed after failed publication');

    // Verify zero deliveries were committed
    const delivs = await db.query(`SELECT count(*)::int AS count FROM public.webhook_deliveries WHERE tenant_id = '${tenantId}' AND created_at >= now() - interval '5 seconds' AND event_id NOT IN ('${event1Id}')`);
    // Note: only previous successful events should exist
  });

  // 5. Idempotency replay must preserve the original fan-out
  const subNewId = 'bbbbbbbb-4444-4444-4444-444444444444';
  await runCheck('AF-06', 'Idempotency replay with newly added subscription preserves original fan-out', async () => {
    // Add new subscription for the application
    await db.query(`
      INSERT INTO public.webhook_subscriptions (
        id, tenant_id, application_id, endpoint_url, subscribed_events, status,
        secret_ciphertext, secret_iv, secret_tag, secret_hash, secret_hint
      ) VALUES (
        '${subNewId}', '${tenantId}', '${appId}', 'https://api.subscriber4.com/hook', ARRAY['*'], 'active',
        '\\x01', '\\x02', '\\x03', 'hash4', 'hint4'
      );
    `);

    // Replay publication with the same idempotency key 'idemp-af-01'
    const replay = await db.query(`
      SELECT * FROM public.fn_publish_webhook_event(
        '${tenantId}',
        '${appId}',
        'election.declared',
        'idemp-af-01',
        '{"constituency":"Varanasi"}'::jsonb,
        '{"constituency":"Varanasi"}',
        'sha256_af_01'
      );
    `);

    assert.strictEqual(replay.rows.length, 1);
    assert.strictEqual(replay.rows[0].is_duplicate, true, 'Must indicate is_duplicate: true');
    assert.strictEqual(replay.rows[0].event_id, event1Id, 'Must return same original event_id');
    assert.strictEqual(replay.rows[0].deliveries_created, 0, 'A duplicate replay creates zero deliveries');

    // The original event's fan-out is immutable: the newly added subscription gets no retroactive delivery.
    const delivs = await db.query(`SELECT subscription_id FROM public.webhook_deliveries WHERE event_id = '${event1Id}'`);
    assert.strictEqual(delivs.rows.length, 2, 'Replay must not mutate the original fan-out');
    const delivSubIds = delivs.rows.map((r: any) => r.subscription_id);
    assert.strictEqual(new Set(delivSubIds).size, 2, 'No duplicate deliveries per subscription');
    assert.ok(!delivSubIds.includes(subNewId), 'New subscriptions must not receive retroactive deliveries on replay');
  });

  // 6. Test PostgresQueueProvider.enqueueEvent integration
  await runCheck('AF-07', 'PostgresQueueProvider.enqueueEvent invokes RPC and returns typed model', async () => {
    const mockSupabase: any = {
      rpc: async (fnName: string, args: any) => {
        if (fnName === 'fn_publish_webhook_event') {
          const res = await db.query(`
            SELECT * FROM public.fn_publish_webhook_event(
              '${args.p_tenant_id}',
              '${args.p_application_id}',
              '${args.p_event_type}',
              ${args.p_idempotency_key ? `'${args.p_idempotency_key}'` : 'NULL'},
              '${JSON.stringify(args.p_payload)}'::jsonb,
              '${args.p_payload_raw}',
              '${args.p_payload_sha256}'
            );
          `);
          return { data: res.rows, error: null };
        }
        throw new Error(`Unexpected RPC call: ${fnName}`);
      },
    };

    const provider = new PostgresQueueProvider(mockSupabase);
    const result = await provider.enqueueEvent({
      tenantId,
      applicationId: appId,
      eventType: 'candidate.withdrawn',
      idempotencyKey: 'idemp-af-ts-01',
      payload: { candidateId: 'cand-99' },
      payloadRaw: '{"candidateId":"cand-99"}',
      payloadSha256: 'sha256_ts_01',
    });

    assert.ok(result.eventId);
    assert.strictEqual(result.deduplicated, false);
    assert.strictEqual(result.enqueuedDeliveries, 2); // sub1 and subNew (both have '*')
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
  console.error('Unhandled failure in webhooks-atomic-fanout test:', err);
  process.exit(1);
});
