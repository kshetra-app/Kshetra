import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import { mediaRoutes } from '../apps/api/src/routes/media';
import { MediaService } from '../apps/api/src/services/mediaService';
import { setSupabaseConfiguredForTesting } from '../apps/api/src/lib/supabase';

test('JOB 043: Shorts Analytics & Reach Engine', async (t) => {
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

  let shortId: string;

  // Create a short for analytics testing
  const createRes = await app.inject({
    method: 'POST',
    url: '/api/v1/media/shorts',
    headers: { 'x-user-id': 'usr-creator-test' },
    payload: {
      title: 'Water harvesting awareness in Banjara Hills',
      videoUrl: 'https://cdn.kshetra.app/shorts/water-harvesting.mp4',
      durationSeconds: 30,
      constituencyId: 'tg-ac-61',
    },
  });
  const createdShort = JSON.parse(createRes.payload).short;
  shortId = createdShort.id;

  await t.test('1. Ingests DPDP-compliant telemetry event with hashed user identity', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/media/shorts/analytics',
      payload: {
        shortId,
        userIdHash: 'sha256_salt_e3b0c44298fc1c149afbf4c8996fb924',
        watchDurationSeconds: 30,
        isCompleted: true,
        shared: true,
        constituencyId: 'tg-ac-61',
      },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.equal(body.success, true);
  });

  await t.test('2. Ingests partial watch event from a second viewer', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/media/shorts/analytics',
      payload: {
        shortId,
        userIdHash: 'sha256_salt_9f833bc42e88b2292e468824aa16ec20',
        watchDurationSeconds: 15,
        isCompleted: false,
        shared: false,
        constituencyId: 'tg-ac-61',
      },
    });

    assert.equal(res.statusCode, 200);
  });

  await t.test('3. Computes aggregated reach and completion metrics', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/media/shorts/${shortId}/analytics`,
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.equal(body.success, true);
    assert.equal(body.summary.shortId, shortId);
    assert.equal(body.summary.totalViews, 2);
    assert.equal(body.summary.totalWatchDurationSeconds, 45);
    assert.equal(body.summary.completionRatePercentage, 50); // 1 out of 2 completed
    assert.equal(body.summary.sharesCount, 1);
    assert.equal(body.summary.uniqueViewersCount, 2);
  });

  await t.test('4. Rejects invalid analytics payload missing required hashed user ID', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/media/shorts/analytics',
      payload: {
        shortId,
        // userIdHash missing
        watchDurationSeconds: 10,
        isCompleted: false,
      },
    });

    assert.equal(res.statusCode, 400);
  });
});
