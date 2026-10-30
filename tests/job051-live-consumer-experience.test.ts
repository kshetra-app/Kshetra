import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import { mediaRoutes } from '../apps/api/src/routes/media';
import { MediaService } from '../apps/api/src/services/mediaService';
import { setSupabaseConfiguredForTesting } from '../apps/api/src/lib/supabase';

test('JOB 051: Live Consumer Experience (HLS Playback & Discovery)', async (t) => {
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

  const hostUserId = 'usr-mla-host-01';
  const constituencyId = 'tg-ac-61';

  // 1. Host creates and starts broadcast session
  const createRes = await app.inject({
    method: 'POST',
    url: '/api/v1/media/broadcasts/studio',
    headers: { 'x-user-id': hostUserId },
    payload: {
      title: 'Constituency Live Q&A on Municipal Monsoon Preparedness',
      speakerName: 'P. Venkat Reddy',
      speakerRole: 'MLA, Jubilee Hills',
      constituencyId,
      description: 'Live interactive session on storm drainage and road safety.',
    },
  });
  const createdSession = JSON.parse(createRes.payload).session;
  const sessionId = createdSession.id;

  await app.inject({
    method: 'POST',
    url: `/api/v1/media/broadcasts/studio/${sessionId}/start`,
    headers: { 'x-user-id': hostUserId },
  });

  await t.test('1. Discovers active live broadcasts for mobile consumer feed', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/media/broadcasts/live?constituencyId=${constituencyId}`,
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.equal(body.success, true);
    assert.equal(body.streams.length, 1);
    assert.equal(body.streams[0].id, sessionId);
    assert.equal(body.streams[0].status, 'live');
    assert.ok(body.streams[0].hlsPlaybackUrl.endsWith('.m3u8'));
  });

  await t.test('2. Updates and syncs live viewer count as mobile clients join', async () => {
    // 3 clients join
    await app.inject({
      method: 'POST',
      url: `/api/v1/media/broadcasts/${sessionId}/viewers`,
      payload: { delta: 3 },
    });

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/media/broadcasts/live?constituencyId=${constituencyId}`,
    });

    const body = JSON.parse(res.payload);
    assert.equal(body.streams[0].currentLiveViewers, 3);
    assert.equal(body.streams[0].peakLiveViewers, 3);
  });

  await t.test('3. Updates viewer count as mobile clients leave', async () => {
    await app.inject({
      method: 'POST',
      url: `/api/v1/media/broadcasts/${sessionId}/viewers`,
      payload: { delta: -1 },
    });

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/media/broadcasts/live?constituencyId=${constituencyId}`,
    });

    const body = JSON.parse(res.payload);
    assert.equal(body.streams[0].currentLiveViewers, 2);
    // Peak should remain 3
    assert.equal(body.streams[0].peakLiveViewers, 3);
  });
});
