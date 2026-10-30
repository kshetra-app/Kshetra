import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import { pagesRoutes } from '../apps/api/src/routes/pages';
import { AspirantService } from '../apps/api/src/services/aspirantService';
import { setSupabaseConfiguredForTesting } from '../apps/api/src/lib/supabase';

test('JOB 048: Aspirant Page, Followers & Event Dispatching Engine', async (t) => {
  setSupabaseConfiguredForTesting(false);
  const app = Fastify();
  await app.register(pagesRoutes);
  await app.ready();

  t.after(async () => {
    await app.close();
    AspirantService.resetMockState();
    setSupabaseConfiguredForTesting(true);
  });

  AspirantService.resetMockState();

  const ownerId = 'usr-page-owner-001';
  const followerId = 'usr-follower-002';
  const handle = 'vikram_reddy_official';
  let createdPageId: string;
  let createdEventId: string;

  await t.test('1. Successfully creates an official aspirant page', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/pages',
      headers: {
        'x-user-id': ownerId,
        'x-user-role': 'aspirant',
      },
      payload: {
        userId: ownerId,
        title: 'Vikram Reddy Official',
        handle,
        role: 'aspirant',
        category: 'political',
        bio: 'Working towards equitable development in Serilingampally.',
        constituencyId: 'TS-AC-67',
        stateCode: 'TG',
      },
    });

    assert.equal(res.statusCode, 201);
    const body = JSON.parse(res.payload);
    assert.equal(body.success, true);
    assert.equal(body.page.title, 'Vikram Reddy Official');
    assert.equal(body.page.handle, handle);
    assert.equal(body.page.followerCount, 0);
    createdPageId = body.page.id;
  });

  await t.test('2. Rejects duplicate page handle', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/pages',
      headers: {
        'x-user-id': 'usr-other-003',
        'x-user-role': 'aspirant',
      },
      payload: {
        userId: 'usr-other-003',
        title: 'Another Page',
        handle, // Duplicate handle
        role: 'aspirant',
      },
    });

    assert.equal(res.statusCode, 409);
    const body = JSON.parse(res.payload);
    assert.equal(body.code, 'HANDLE_CONFLICT');
  });

  await t.test('3. Citizen follows page, follower counter increments to 1', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/pages/${createdPageId}/follow`,
      headers: {
        'x-user-id': followerId,
        'x-user-role': 'citizen',
      },
      payload: {
        userId: followerId,
      },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.equal(body.success, true);
    assert.equal(body.isFollowing, true);
    assert.equal(body.followerCount, 1);
  });

  await t.test('4. Page detail shows isFollowing: true for follower', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/pages/${createdPageId}`,
      headers: {
        'x-user-id': followerId,
        'x-user-role': 'citizen',
      },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.equal(body.success, true);
    assert.equal(body.page.isFollowing, true);
    assert.equal(body.page.followerCount, 1);
  });

  await t.test('5. Page owner creates event and verifies follower notification dispatch', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/pages/${createdPageId}/events`,
      headers: {
        'x-user-id': ownerId,
        'x-user-role': 'aspirant',
      },
      payload: {
        userId: ownerId,
        title: 'Miyapur Metro Transit Public Hearing',
        eventType: 'townhall',
        startTime: new Date(Date.now() + 172800000).toISOString(),
        venueName: 'Miyapur Community Center',
        constituencyId: 'TS-AC-67',
        isVirtual: false,
      },
    });

    assert.equal(res.statusCode, 201);
    const body = JSON.parse(res.payload);
    assert.equal(body.success, true);
    assert.equal(body.event.title, 'Miyapur Metro Transit Public Hearing');
    assert.equal(body.event.dispatchedToFollowers, true);
    createdEventId = body.event.id;
  });

  await t.test('6. Follower RSVPs going to the event, RSVP counter increments', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/pages/events/${createdEventId}/rsvp`,
      headers: {
        'x-user-id': followerId,
        'x-user-role': 'citizen',
      },
      payload: {
        userId: followerId,
        status: 'going',
      },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.equal(body.success, true);
    assert.equal(body.status, 'going');
    assert.equal(body.rsvpCount, 1);
  });

  await t.test('7. Citizen unfollows page, follower counter decrements to 0', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/pages/${createdPageId}/follow`,
      headers: {
        'x-user-id': followerId,
        'x-user-role': 'citizen',
      },
      payload: {
        userId: followerId,
      },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.equal(body.success, true);
    assert.equal(body.isFollowing, false);
    assert.equal(body.followerCount, 0);
  });
});
