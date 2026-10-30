import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import { mediaRoutes } from '../apps/api/src/routes/media';
import { MediaService } from '../apps/api/src/services/mediaService';
import { setSupabaseConfiguredForTesting } from '../apps/api/src/lib/supabase';

test('JOB 041: Shorts Creation Pipeline', async (t) => {
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

  const authorId = 'usr-civic-creator-01';

  await t.test('1. Rejects shorts creation without user authentication', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/media/shorts',
      payload: {
        title: 'Community Water Tanker Update',
        videoUrl: 'https://cdn.kshetra.app/shorts/water-update-61.mp4',
        durationSeconds: 30,
        constituencyId: 'tg-ac-61',
      },
    });

    assert.equal(res.statusCode, 401);
  });

  await t.test('2. Successfully creates vertical short bound to local constituency', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/media/shorts',
      headers: {
        'x-user-id': authorId,
        'x-user-role': 'citizen',
      },
      payload: {
        title: 'Road repairs finally underway at Borabanda Main Road',
        description: 'Civic issue report resolved after 3 months of citizen petitions.',
        videoUrl: 'https://cdn.kshetra.app/shorts/borabanda-road-work.mp4',
        thumbnailUrl: 'https://cdn.kshetra.app/shorts/thumbs/borabanda-thumb.jpg',
        durationSeconds: 42,
        constituencyId: 'tg-ac-61',
        stateCode: 'TG',
        candidateId: 'cand-001',
        hashtags: ['#CivicAction', '#JubileeHills', '#Infrastructure'],
      },
    });

    assert.equal(res.statusCode, 201);
    const body = JSON.parse(res.payload);
    assert.equal(body.success, true);
    assert.ok(body.short.id);
    assert.equal(body.short.creatorId, authorId);
    assert.equal(body.short.constituencyId, 'tg-ac-61');
    assert.equal(body.short.durationSeconds, 42);
    assert.equal(body.short.viewCount, 0);
    assert.equal(body.short.likeCount, 0);
  });

  await t.test('3. Rejects short exceeding maximum allowable duration (> 60s)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/media/shorts',
      headers: {
        'x-user-id': authorId,
      },
      payload: {
        title: 'Overlength monologue video',
        videoUrl: 'https://cdn.kshetra.app/shorts/long-speech.mp4',
        durationSeconds: 120, // exceeds 60s max
        constituencyId: 'tg-ac-61',
      },
    });

    assert.equal(res.statusCode, 400);
  });

  await t.test('4. Rejects short missing constituency binding (anti-astroturfing gate)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/media/shorts',
      headers: {
        'x-user-id': authorId,
      },
      payload: {
        title: 'Unbound political ad',
        videoUrl: 'https://cdn.kshetra.app/shorts/astroturf.mp4',
        durationSeconds: 25,
        // constituencyId missing
      },
    });

    assert.equal(res.statusCode, 400);
  });
});
