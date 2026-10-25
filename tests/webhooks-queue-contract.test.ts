/**
 * tests/webhooks-queue-contract.test.ts
 *
 * Milestone W022 — B2B SaaS Outbound Webhooks & Event Dispatching Engine
 * Directive: W022-CTO-REMEDIATION-006 (Section C.2)
 *
 * Scope:
 * 1. Verifies PostgresQueueProvider.claimBatch() parses the exact flat return shape of fn_claim_webhook_batch.
 * 2. Verifies parseBytea correctly decodes both hex-string and Buffer bytea shapes.
 * 3. Enforces that malformed rows throw MALFORMED_CLAIM_BATCH_ROW.
 * 4. Enforces that RPC failures throw RPC_CLAIM_BATCH_FAILED and do not mask errors as empty queues.
 * 5. Executes against real PostgreSQL DDL/engine via PGlite to capture authentic database row shapes.
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import {
  PostgresQueueProvider,
  parseBytea,
  type LeasedDeliveryJob,
} from '../apps/api/src/modules/webhooks/queueProvider';
import {
  encryptSecret,
  decryptSecret,
  generateWebhookSecret,
} from '../apps/api/src/modules/webhooks/crypto';

console.log('================================================================');
console.log('W022: QUEUE CONTRACT & POSTGRES PROVIDER VERIFICATION SUITE');
console.log('Timestamp:', new Date().toISOString());
console.log('Authority: CTO DIRECTIVE W022-CTO-REMEDIATION-006 (Section C.2)');
console.log('================================================================\n');

process.env.NODE_ENV = 'test';
process.env.WEBHOOK_SECRETS_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

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

  // 1. Setup prerequisite tables and migration 070
  await runCheck('QC-01', 'Initialize PostgreSQL engine with migration 070 schema', async () => {
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

  // Seed sample tenant, application, subscription, and event
  const tenantId = '10000000-0000-0000-0000-000000000001';
  const appId = '20000000-0000-0000-0000-000000000002';
  const subId = '30000000-0000-0000-0000-000000000003';
  const rawSecret = generateWebhookSecret();
  const encrypted = encryptSecret(rawSecret, tenantId, subId);

  await runCheck('QC-02', 'Seed authentic database rows with encrypted secret bytes', async () => {
    await db.query(`INSERT INTO public.saas_tenants (id, name) VALUES ('${tenantId}', 'Tenant QC')`);
    await db.query(`INSERT INTO public.saas_applications (id, tenant_id, application_id) VALUES ('${appId}', '${tenantId}', 'app-qc')`);

    await db.query(`
      INSERT INTO public.webhook_subscriptions (
        id, tenant_id, application_id, endpoint_url,
        secret_ciphertext, secret_iv, secret_tag, secret_hash, secret_hint, secret_key_version
      ) VALUES (
        '${subId}', '${tenantId}', '${appId}', 'https://api.qc-subscriber.com/webhooks',
        decode('${encrypted.ciphertext.toString('hex')}', 'hex'),
        decode('${encrypted.iv.toString('hex')}', 'hex'),
        decode('${encrypted.tag.toString('hex')}', 'hex'),
        '${encrypted.hash}', '${encrypted.hint}', ${encrypted.version}
      );
    `);

    // Atomically publish an event to produce a queued delivery
    const pubRes = await db.query(`
      SELECT * FROM public.fn_publish_webhook_event(
        '${tenantId}',
        '${appId}',
        'candidate.created',
        'idemp-qc-01',
        '{"name":"John Doe"}'::jsonb,
        '{"name":"John Doe"}',
        'sha256_qc_01'
      );
    `);
    assert.strictEqual(pubRes.rows.length, 1);
    assert.strictEqual(pubRes.rows[0].deliveries_created, 1);
  });

  // 2. Query raw database row shape from fn_claim_webhook_batch
  let rawClaimRows: any[] = [];
  await runCheck('QC-03', 'Execute fn_claim_webhook_batch and capture authentic PostgreSQL return shape', async () => {
    const res = await db.query(`SELECT * FROM public.fn_claim_webhook_batch(10, 30);`);
    assert.strictEqual(res.rows.length, 1);
    rawClaimRows = res.rows;
    const row = rawClaimRows[0];
    assert.ok(row.delivery_id, 'Row must include delivery_id');
    assert.ok(row.tenant_id, 'Row must include tenant_id');
    assert.ok(row.application_id, 'Row must include application_id');
    assert.ok(row.subscription_id, 'Row must include subscription_id');
    assert.ok(row.event_id, 'Row must include event_id');
    assert.ok(row.lease_token, 'Row must include lease_token');
    assert.ok(row.secret_ciphertext, 'Row must include secret_ciphertext');
  });

  // 3. Test PostgresQueueProvider.claimBatch with authentic PostgreSQL return shape
  await runCheck('QC-04', 'PostgresQueueProvider.claimBatch parses authentic flat PostgreSQL row into typed models', async () => {
    // Construct mock SupabaseClient that returns the authentic PostgreSQL rows
    const mockSupabase: any = {
      rpc: async (fnName: string, args: any) => {
        if (fnName === 'fn_claim_webhook_batch') {
          return { data: rawClaimRows, error: null };
        }
        throw new Error(`Unexpected RPC call: ${fnName}`);
      },
    };

    const provider = new PostgresQueueProvider(mockSupabase);
    const jobs = await provider.claimBatch(10);
    assert.strictEqual(jobs.length, 1);

    const job = jobs[0];
    assert.strictEqual(job.delivery.id, rawClaimRows[0].delivery_id);
    assert.strictEqual(job.delivery.tenantId, tenantId);
    assert.strictEqual(job.delivery.status, 'leased');
    assert.strictEqual(job.subscription.id, subId);
    assert.strictEqual(job.subscription.tenantId, tenantId);
    assert.strictEqual(job.subscription.applicationId, appId);
    assert.strictEqual(job.subscription.endpointUrl, 'https://api.qc-subscriber.com/webhooks');
    assert.strictEqual(job.event.id, rawClaimRows[0].event_id);
    assert.strictEqual(job.event.eventType, 'candidate.created');
    assert.strictEqual(job.leaseToken, rawClaimRows[0].lease_token);

    // Verify secret decryption using the parsed buffers
    const decrypted = decryptSecret(
      job.subscription.secretCiphertext!,
      job.subscription.secretIv!,
      job.subscription.secretTag!,
      job.subscription.tenantId,
      job.subscription.id
    );
    assert.strictEqual(decrypted, rawSecret, 'Decrypted secret must match original generated secret');
  });

  // 4. Test bytea parser robustness
  await runCheck('QC-05', 'parseBytea decodes hex string (\\x prefix and raw) and Buffer formats', () => {
    const rawBuf = Buffer.from('deadbeef', 'hex');
    assert.deepStrictEqual(parseBytea(rawBuf), rawBuf);
    assert.deepStrictEqual(parseBytea('\\xdeadbeef'), rawBuf);
    assert.deepStrictEqual(parseBytea('0xdeadbeef'), rawBuf);
    assert.deepStrictEqual(parseBytea('deadbeef'), rawBuf);
    assert.throws(() => parseBytea(12345 as any), /INVALID_BYTEA/);
    assert.throws(() => parseBytea(null as any), /INVALID_BYTEA/);
  });

  // 5. Test validation of malformed rows
  await runCheck('QC-06', 'claimBatch rejects malformed rows missing required primary keys', async () => {
    const testCases = [
      { name: 'missing delivery_id', row: { ...rawClaimRows[0], delivery_id: null } },
      { name: 'missing tenant_id', row: { ...rawClaimRows[0], tenant_id: null } },
      { name: 'missing subscription_id', row: { ...rawClaimRows[0], subscription_id: null } },
      { name: 'missing event_id', row: { ...rawClaimRows[0], event_id: null } },
      { name: 'missing lease_token', row: { ...rawClaimRows[0], lease_token: null } },
    ];

    for (const tc of testCases) {
      const mockSupabase: any = {
        rpc: async () => ({ data: [tc.row], error: null }),
      };
      const provider = new PostgresQueueProvider(mockSupabase);
      await assert.rejects(
        () => provider.claimBatch(10),
        /MALFORMED_CLAIM_BATCH_ROW/,
        `Should throw MALFORMED_CLAIM_BATCH_ROW for ${tc.name}`
      );
    }
  });

  // 6. Test RPC error handling (fails closed, does not silently return empty queue)
  await runCheck('QC-07', 'claimBatch propagates RPC errors without masking as empty queue', async () => {
    const mockSupabase: any = {
      rpc: async () => ({ data: null, error: { message: 'Database connection terminated', code: '08006' } }),
    };
    const provider = new PostgresQueueProvider(mockSupabase);
    await assert.rejects(
      () => provider.claimBatch(10),
      /RPC_CLAIM_BATCH_FAILED: Database connection terminated/
    );
  });

  // 7. Test empty queue returns empty array
  await runCheck('QC-08', 'claimBatch returns empty array when no claimable deliveries exist', async () => {
    const mockSupabase: any = {
      rpc: async () => ({ data: [], error: null }),
    };
    const provider = new PostgresQueueProvider(mockSupabase);
    const jobs = await provider.claimBatch(10);
    assert.deepStrictEqual(jobs, []);
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
  console.error('Unhandled failure in webhooks-queue-contract test:', err);
  process.exit(1);
});
