import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import { mediaRoutes } from '../apps/api/src/routes/media';
import { MediaService } from '../apps/api/src/services/mediaService';
import { setSupabaseConfiguredForTesting } from '../apps/api/src/lib/supabase';

test('JOB 037: Representative Civic Response Engine', async (t) => {
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

  const representativeUserId = 'rep-usr-mla-042';
  const issueId = 'iss-water-crisis-61';

  await t.test('1. Rejects unauthenticated official response submission', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/media/representative/responses',
      payload: {
        issueId,
        responseText: 'Tenders have been floated for new water tankers in Jubilee Hills.',
        officialDesignation: 'Sitting MLA, Jubilee Hills',
      },
    });

    assert.equal(res.statusCode, 401);
  });

  await t.test('2. Successfully creates verified representative response with action plan', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/media/representative/responses',
      headers: {
        'x-user-id': representativeUserId,
        'x-user-role': 'representative',
      },
      payload: {
        issueId,
        responseText: 'Tenders have been floated for new water tankers and pipeline repairs in Jubilee Hills.',
        actionPlan: 'Phase 1: 5 emergency tankers. Phase 2: Pipeline overhaul by HMWSSB.',
        estimatedCompletionDate: '2026-11-15T00:00:00.000Z',
        officialDesignation: 'MLA, Jubilee Hills Constituency',
      },
    });

    assert.equal(res.statusCode, 201);
    const body = JSON.parse(res.payload);
    assert.equal(body.success, true);
    assert.ok(body.response.id);
    assert.equal(body.response.issueId, issueId);
    assert.equal(body.response.representativeId, representativeUserId);
    assert.equal(body.response.isOfficialStatement, true);
    assert.equal(body.response.officialDesignation, 'MLA, Jubilee Hills Constituency');
  });

  await t.test('3. Fetches official responses for the civic issue timeline', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/media/representative/responses/${issueId}`,
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.equal(body.success, true);
    assert.equal(body.total, 1);
    assert.equal(body.responses[0].issueId, issueId);
    assert.equal(body.responses[0].isOfficialStatement, true);
    assert.ok(body.responses[0].actionPlan.includes('Phase 1'));
  });

  await t.test('4. Rejects response with payload missing required fields', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/media/representative/responses',
      headers: {
        'x-user-id': representativeUserId,
      },
      payload: {
        issueId,
        // responseText missing
        officialDesignation: 'MLA',
      },
    });

    assert.equal(res.statusCode, 400);
  });
});
