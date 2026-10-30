import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import { mediaRoutes } from '../apps/api/src/routes/media';
import { MediaService } from '../apps/api/src/services/mediaService';
import { setSupabaseConfiguredForTesting } from '../apps/api/src/lib/supabase';

test('JOB 053: Broadcast Studio Workflow & Lifecycle', async (t) => {
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

  const studioHostId = 'usr-studio-admin-01';
  let sessionId: string;

  await t.test('1. Creates broadcast studio session with RTMP & WHIP ingress endpoints', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/media/broadcasts/studio',
      headers: {
        'x-user-id': studioHostId,
        'x-user-role': 'representative',
      },
      payload: {
        title: 'Election Townhall 2026: The Delimitation Debate',
        speakerName: 'P. Venkat Reddy',
        speakerRole: 'Member of Legislative Assembly',
        constituencyId: 'tg-ac-61',
        description: 'Comprehensive discussion on electoral changes and civic governance.',
      },
    });

    assert.equal(res.statusCode, 201);
    const body = JSON.parse(res.payload);
    assert.equal(body.success, true);
    assert.ok(body.session.id);
    sessionId = body.session.id;

    assert.equal(body.session.hostUserId, studioHostId);
    assert.equal(body.session.status, 'scheduled');
    assert.ok(body.session.streamKey);
    assert.ok(body.session.rtmpIngestUrl.startsWith('rtmp://'));
    assert.ok(body.session.whipIngestUrl.startsWith('https://'));
    assert.ok(body.session.hlsPlaybackUrl.endsWith('.m3u8'));
  });

  await t.test('2. Starts the live broadcast session', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/media/broadcasts/studio/${sessionId}/start`,
      headers: {
        'x-user-id': studioHostId,
      },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.equal(body.success, true);
    assert.equal(body.session.status, 'live');
    assert.ok(body.session.startedAt);
  });

  await t.test('3. Ends broadcast session and archives VOD replay URL', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/media/broadcasts/studio/${sessionId}/end`,
      headers: {
        'x-user-id': studioHostId,
      },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.equal(body.success, true);
    assert.equal(body.session.status, 'ended');
    assert.ok(body.session.endedAt);
    assert.ok(body.session.vodArchiveUrl);
    assert.ok(body.session.vodArchiveUrl.includes('/vod/'));
  });

  await t.test('4. Rejects starting a non-existent broadcast studio session', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/media/broadcasts/studio/sess-unknown-9999/start',
      headers: {
        'x-user-id': studioHostId,
      },
    });

    assert.equal(res.statusCode, 404);
  });
});
