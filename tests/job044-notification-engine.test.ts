import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import { mediaRoutes } from '../apps/api/src/routes/media';
import { MediaService } from '../apps/api/src/services/mediaService';
import { setSupabaseConfiguredForTesting } from '../apps/api/src/lib/supabase';

test('JOB 044: Notification Engine & Anti-Spam Rate Limiter', async (t) => {
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

  const citizenUserId = 'usr-citizen-notif-01';
  const constituencyId = 'tg-ac-61';

  await t.test('1. Subscribes citizen to constituency civic alerts topic', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/media/notifications/subscribe',
      headers: { 'x-user-id': citizenUserId },
      payload: {
        constituencyId,
        topic: 'civic_alerts',
        pushToken: 'fcm-device-token-abc-123',
        tokenPlatform: 'fcm',
        isActive: true,
      },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.equal(body.success, true);
    assert.equal(body.subscription.userId, citizenUserId);
    assert.equal(body.subscription.constituencyId, constituencyId);
    assert.equal(body.subscription.topic, 'civic_alerts');
  });

  await t.test('2. Lists active subscriptions for authenticated citizen', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/media/notifications/subscriptions',
      headers: { 'x-user-id': citizenUserId },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.equal(body.success, true);
    assert.equal(body.subscriptions.length, 1);
    assert.equal(body.subscriptions[0].topic, 'civic_alerts');
  });

  await t.test('3. Enforces anti-spam dispatch cap (max 3/week for regular announcements)', async () => {
    // Dispatch 1
    const d1 = await app.inject({
      method: 'POST',
      url: '/api/v1/media/notifications/dispatch',
      headers: { 'x-user-id': 'admin-usr' },
      payload: {
        constituencyId,
        topic: 'civic_alerts',
        title: 'Community Townhall Announcement',
        body: 'Join the MLA for a townhall on water maintenance.',
        isEmergency: false,
      },
    });
    assert.equal(d1.statusCode, 200);
    assert.equal(JSON.parse(d1.payload).dispatchedCount, 1);

    // Dispatch 2
    const d2 = await app.inject({
      method: 'POST',
      url: '/api/v1/media/notifications/dispatch',
      headers: { 'x-user-id': 'admin-usr' },
      payload: {
        constituencyId,
        topic: 'civic_alerts',
        title: 'Sanitation Drive',
        body: 'Colony cleanup drive this Saturday morning.',
        isEmergency: false,
      },
    });
    assert.equal(d2.statusCode, 200);
    assert.equal(JSON.parse(d2.payload).dispatchedCount, 1);

    // Dispatch 3
    const d3 = await app.inject({
      method: 'POST',
      url: '/api/v1/media/notifications/dispatch',
      headers: { 'x-user-id': 'admin-usr' },
      payload: {
        constituencyId,
        topic: 'civic_alerts',
        title: 'Road Work Notice',
        body: 'Diversion on Road No. 36 tonight.',
        isEmergency: false,
      },
    });
    assert.equal(d3.statusCode, 200);
    assert.equal(JSON.parse(d3.payload).dispatchedCount, 1);

    // Dispatch 4 - Exceeds 3/week limit, citizen should be rate-limited
    const d4 = await app.inject({
      method: 'POST',
      url: '/api/v1/media/notifications/dispatch',
      headers: { 'x-user-id': 'admin-usr' },
      payload: {
        constituencyId,
        topic: 'civic_alerts',
        title: 'Routine Garden Update',
        body: 'Park timings extended by 30 minutes.',
        isEmergency: false,
      },
    });
    assert.equal(d4.statusCode, 200);
    const d4Body = JSON.parse(d4.payload);
    assert.equal(d4Body.dispatchedCount, 0); // throttled by rate limiter!
    assert.equal(d4Body.rateLimitedCount, 1);
  });

  await t.test('4. Emergency civic alert bypasses the rate limiter', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/media/notifications/dispatch',
      headers: { 'x-user-id': 'admin-usr' },
      payload: {
        constituencyId,
        topic: 'civic_alerts',
        title: 'URGENT: Flood Alert for Jubilee Hills nullahs',
        body: 'High water levels reported. Emergency control room activated.',
        isEmergency: true,
      },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.equal(body.dispatchedCount, 1); // dispatched despite 3/week cap
    assert.equal(body.rateLimitedCount, 0);
  });
});
