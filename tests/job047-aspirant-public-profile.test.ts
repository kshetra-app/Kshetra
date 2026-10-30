import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import { aspirantRoutes } from '../apps/api/src/routes/aspirant';
import { pagesRoutes } from '../apps/api/src/routes/pages';
import { AspirantService } from '../apps/api/src/services/aspirantService';
import { setSupabaseConfiguredForTesting } from '../apps/api/src/lib/supabase';

test('JOB 047: Aspirant Public Profile & Aggregated Timeline', async (t) => {
  setSupabaseConfiguredForTesting(false);
  const app = Fastify();
  await app.register(aspirantRoutes);
  await app.register(pagesRoutes);
  await app.ready();

  t.after(async () => {
    await app.close();
    AspirantService.resetMockState();
    setSupabaseConfiguredForTesting(true);
  });

  AspirantService.resetMockState();

  const userId = 'usr-asp-007';
  const handle = 'ananya_sharma';

  // Seed aspirant profile
  const profile = await AspirantService.registerAspirant(userId, {
    displayName: 'Ananya Sharma',
    bio: 'Civic activist advocating for urban governance and local parks.',
    stateCode: 'TG',
    targetConstituencyAcNo: 61,
    targetConstituencyName: 'Jubilee Hills',
    targetElectionYear: 2028,
    partyAffiliation: 'Independent',
    isIndependent: true,
    handle,
  });

  // Seed aspirant page & event
  const page = await AspirantService.createPage(userId, {
    title: 'Ananya Sharma Campaign',
    handle: 'ananya-campaign',
    role: 'aspirant',
    category: 'political',
  });

  await AspirantService.createPageEvent(page.id, userId, {
    title: 'Ward 104 Cleanliness Townhall',
    eventType: 'townhall',
    startTime: new Date(Date.now() + 86400000).toISOString(),
    venueName: 'Yousufguda Community Hall',
  });

  await t.test('1. Resolves public profile by unique handle', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/aspirant/profile/${handle}`,
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.equal(body.success, true);
    assert.equal(body.profile.displayName, 'Ananya Sharma');
    assert.equal(body.profile.handle, handle);
    assert.equal(body.profile.targetConstituencyName, 'Jubilee Hills');
  });

  await t.test('2. Resolves public profile by UUID id', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/aspirant/profile/${profile.id}`,
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.equal(body.success, true);
    assert.equal(body.profile.id, profile.id);
  });

  await t.test('3. Aggregates upcoming scheduled events into the public profile', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/aspirant/profile/${handle}`,
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.equal(body.success, true);
    assert.equal(Array.isArray(body.profile.upcomingEvents), true);
    assert.equal(body.profile.upcomingEvents.length, 1);
    assert.equal(body.profile.upcomingEvents[0].title, 'Ward 104 Cleanliness Townhall');
  });

  await t.test('4. Returns 404 for non-existent profile handle', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/aspirant/profile/unknown_aspirant_handle_999',
    });

    assert.equal(res.statusCode, 404);
    const body = JSON.parse(res.payload);
    assert.equal(body.code, 'ASPIRANT_NOT_FOUND');
  });
});
