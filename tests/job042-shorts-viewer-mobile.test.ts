import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import { mediaRoutes } from '../apps/api/src/routes/media';
import { MediaService } from '../apps/api/src/services/mediaService';
import { setSupabaseConfiguredForTesting } from '../apps/api/src/lib/supabase';

test('JOB 042: Shorts Viewer & Mobile Player Feed', async (t) => {
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

  const authorId = 'usr-civic-creator-02';

  // Seed two shorts in different constituencies
  await app.inject({
    method: 'POST',
    url: '/api/v1/media/shorts',
    headers: { 'x-user-id': authorId },
    payload: {
      title: 'Jubilee Hills Park Renovation Tour',
      videoUrl: 'https://cdn.kshetra.app/shorts/jh-park.mp4',
      durationSeconds: 28,
      constituencyId: 'tg-ac-61',
    },
  });

  await app.inject({
    method: 'POST',
    url: '/api/v1/media/shorts',
    headers: { 'x-user-id': authorId },
    payload: {
      title: 'Khairatabad Metro Station Pedestrian Bridge Inauguration',
      videoUrl: 'https://cdn.kshetra.app/shorts/kh-bridge.mp4',
      durationSeconds: 45,
      constituencyId: 'tg-ac-60',
    },
  });

  await t.test('1. Fetches constituency-targeted shorts feed for local vertical player', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/media/shorts/feed?constituencyId=tg-ac-61&limit=5',
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.equal(body.success, true);
    assert.equal(body.shorts.length, 1);
    assert.equal(body.shorts[0].constituencyId, 'tg-ac-61');
    assert.ok(body.shorts[0].title.includes('Jubilee Hills'));
    assert.ok(body.shorts[0].videoUrl);
    assert.ok(typeof body.shorts[0].durationSeconds === 'number');
  });

  await t.test('2. Fetches global/statewide shorts feed when no constituency filter is passed', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/media/shorts/feed?limit=10',
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.equal(body.success, true);
    assert.equal(body.shorts.length, 2);
  });

  await t.test('3. Enforces limit parameter on feed queries', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/media/shorts/feed?limit=1',
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.equal(body.success, true);
    assert.equal(body.shorts.length, 1);
  });
});
