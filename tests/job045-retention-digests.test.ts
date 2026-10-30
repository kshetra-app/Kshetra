import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import { mediaRoutes } from '../apps/api/src/routes/media';
import { MediaService } from '../apps/api/src/services/mediaService';
import { setSupabaseConfiguredForTesting } from '../apps/api/src/lib/supabase';

test('JOB 045: Retention Digests & Civic Recaps', async (t) => {
  setSupabaseConfiguredForTesting(false);
  const app = Fastify();
  await app.register(mediaRoutes);
  await app.ready();

  t.after(async () => {
    await app.close();
    MediaService.resetMockState();
    setSupabaseConfiguredForTesting(true);
  });

  MediaService.resetMockState();

  const constituencyId = 'tg-ac-61';

  await t.test('1. Generates weekly constituency civic digest', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/media/digests/${constituencyId}?digestType=weekly`,
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.equal(body.success, true);
    assert.ok(body.digest.id);
    assert.equal(body.digest.constituencyId, constituencyId);
    assert.equal(body.digest.digestType, 'weekly');
    assert.ok(body.digest.summaryReport);
    assert.ok(typeof body.digest.topIssuesResolved === 'number');
    assert.ok(typeof body.digest.activeAspirantsCount === 'number');
    assert.ok(typeof body.digest.civicParticipationIndex === 'number');
  });

  await t.test('2. Generates monthly constituency governance recap', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/media/digests/${constituencyId}?digestType=monthly`,
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.equal(body.success, true);
    assert.equal(body.digest.digestType, 'monthly');
    assert.ok(body.digest.summaryReport.includes('Monthly'));
  });

  await t.test('3. Returns cached digest for identical time window without recalculation duplicate', async () => {
    const firstRes = await app.inject({
      method: 'GET',
      url: `/api/v1/media/digests/${constituencyId}?digestType=weekly`,
    });
    const firstId = JSON.parse(firstRes.payload).digest.id;

    const secondRes = await app.inject({
      method: 'GET',
      url: `/api/v1/media/digests/${constituencyId}?digestType=weekly`,
    });
    const secondId = JSON.parse(secondRes.payload).digest.id;

    assert.equal(firstId, secondId);
  });
});
