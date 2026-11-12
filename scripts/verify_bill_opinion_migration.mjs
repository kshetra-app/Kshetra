import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function verifyMigration() {
  const database = new PGlite();
  try {
    await database.exec(`
      CREATE ROLE anon;
      CREATE ROLE authenticated;
      CREATE ROLE service_role;
      CREATE SCHEMA auth;
      CREATE TABLE auth.users (id UUID PRIMARY KEY);
      CREATE TABLE public.bills (id UUID PRIMARY KEY);
    `);

    const migrationPath = path.join(
      repositoryRoot,
      'supabase',
      'migrations',
      '100_idempotent_bill_public_opinions.sql',
    );
    const migration = fs.readFileSync(migrationPath, 'utf8');
    await database.exec(migration);
    await database.exec(migration);

    const billId = '11111111-1111-4111-8111-111111111111';
    const userId = '22222222-2222-4222-8222-222222222222';
    const otherUserId = '33333333-3333-4333-8333-333333333333';
    const unknownBillId = '44444444-4444-4444-8444-444444444444';
    await database.query('INSERT INTO public.bills (id) VALUES ($1)', [billId]);
    await database.query('INSERT INTO auth.users (id) VALUES ($1), ($2)', [userId, otherUserId]);

    const record = (actorId, support) => database.query(
      'SELECT * FROM public.record_bill_opinion($1::uuid, $2::uuid, $3::boolean)',
      [billId, actorId, support],
    );

    assert.deepEqual((await record(userId, true)).rows[0], {
      bill_id: billId,
      support: 1,
      oppose: 0,
      neutral: 0,
    });
    assert.deepEqual((await record(userId, true)).rows[0], {
      bill_id: billId,
      support: 1,
      oppose: 0,
      neutral: 0,
    });
    assert.deepEqual((await record(userId, false)).rows[0], {
      bill_id: billId,
      support: 0,
      oppose: 1,
      neutral: 0,
    });
    assert.deepEqual((await record(otherUserId, true)).rows[0], {
      bill_id: billId,
      support: 1,
      oppose: 1,
      neutral: 0,
    });

    const counts = await database.query(
      'SELECT * FROM public.get_bill_opinion_counts($1::uuid[]) ORDER BY bill_id',
      [[billId, unknownBillId]],
    );
    assert.deepEqual(counts.rows, [
      { bill_id: billId, support: 1, oppose: 1, neutral: 0 },
      { bill_id: unknownBillId, support: 0, oppose: 0, neutral: 0 },
    ]);

    const access = await database.query(`
      SELECT
        (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.bill_opinions'::regclass) AS rls_enabled,
        has_table_privilege('anon', 'public.bill_opinions', 'SELECT') AS anon_can_select,
        has_table_privilege('authenticated', 'public.bill_opinions', 'SELECT') AS authenticated_can_select,
        has_function_privilege('authenticated', 'public.record_bill_opinion(uuid,uuid,boolean)', 'EXECUTE') AS authenticated_can_record,
        has_function_privilege('service_role', 'public.record_bill_opinion(uuid,uuid,boolean)', 'EXECUTE') AS service_role_can_record
    `);
    assert.deepEqual(access.rows[0], {
      rls_enabled: true,
      anon_can_select: false,
      authenticated_can_select: false,
      authenticated_can_record: false,
      service_role_can_record: true,
    });

    console.log('PASS: migration repeatability, vote idempotency, counts, and role permissions');
  } finally {
    await database.close();
  }
}

verifyMigration().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
