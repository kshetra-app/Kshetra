/**
 * tests/job050-leadership-academy-persistence.test.ts
 *
 * Verifies JOB 050: Leadership Academy — Course/Quiz Persistence & Certification
 * Ratified under DEC-176 and DEC-177
 *
 * Validates:
 * 1. Module listing across political science curriculum categories
 * 2. Module detail retrieval with lessons, question items, and options
 * 3. Server-side quiz evaluation with <80% failing threshold (no honors badge)
 * 4. Server-side quiz evaluation with >=80% passing threshold (awards 'election_scholar' badge + 15 civic points)
 * 5. Persistence across sessions & repeated queries
 * 6. Profile linkage reflecting updated modulesCompleted count and badges array
 * 7. 404 rejection on non-existent module
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import { aspirantRoutes } from '../apps/api/src/routes/aspirant';
import { AspirantService } from '../apps/api/src/services/aspirantService';
import { setSupabaseConfiguredForTesting } from '../apps/api/src/lib/supabase';

test('JOB 050: Leadership Academy — Course/Quiz Persistence & Certification', async (t) => {
  setSupabaseConfiguredForTesting(false);
  const app = Fastify();
  await app.register(aspirantRoutes);
  await app.ready();

  t.after(async () => {
    await app.close();
    AspirantService.resetMockState();
    setSupabaseConfiguredForTesting(true);
  });

  AspirantService.resetMockState();

  const userId = 'usr-candidate-academy-1';
  const handle = 'suresh_goud_secunderabad';

  // Seed candidate profile
  await AspirantService.registerAspirant(userId, {
    displayName: 'Suresh Goud',
    bio: 'Secunderabad public transport & youth employment advocate.',
    stateCode: 'TG',
    targetConstituencyAcNo: 70,
    targetConstituencyName: 'Secunderabad',
    targetElectionYear: 2028,
    partyAffiliation: 'Independent',
    isIndependent: true,
    handle,
  });

  await t.test('1. Lists academy curriculum modules', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/aspirant/modules',
      headers: {
        'x-user-id': userId,
        'x-user-role': 'aspirant',
      },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.equal(body.success, true);
    assert.equal(Array.isArray(body.modules), true);
    assert.ok(body.modules.length >= 4, 'Must have at least 4 curriculum modules');

    const mod1 = body.modules.find((m: any) => m.id === 'mod-1');
    assert.ok(mod1, 'Module 1 must exist');
    assert.equal(mod1.category, 'electoral_process');
    assert.equal(mod1.completed, false);
  });

  await t.test('2. Retrieves module detail with quiz questions and choices', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/aspirant/modules/mod-1',
      headers: {
        'x-user-id': userId,
        'x-user-role': 'aspirant',
      },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.equal(body.success, true);
    assert.equal(body.module.id, 'mod-1');
    assert.ok(body.module.quiz.length >= 2, 'Module 1 must contain quiz questions');
    assert.equal(body.module.quiz[0].options.length, 4, 'Each question has 4 options');
  });

  await t.test('3. Evaluates failing quiz (<80%), records score without honors badge', async () => {
    // mod-1 has 2 questions. Answering q1-1 wrong (index 1), q1-2 right (index 0) -> 50% (< 80%)
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/aspirant/modules/mod-1/quiz',
      headers: {
        'x-user-id': userId,
        'x-user-role': 'aspirant',
      },
      payload: {
        userId,
        answers: [
          { questionId: 'q1-1', selectedIndex: 1 }, // Wrong (Article 356)
          { questionId: 'q1-2', selectedIndex: 0 }, // Correct (VVPAT)
        ],
      },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.equal(body.success, true);
    assert.equal(body.result.scorePercentage, 50);
    assert.equal(body.result.passed, false);
    assert.equal(body.result.badgeAwarded, undefined);
    assert.equal(body.result.pointsEarned, 5); // 5 points participation
  });

  await t.test('4. Evaluates passing quiz (>=80%), awards election_scholar honors badge', async () => {
    // Answering both questions correctly (indices 0 and 0) -> 100% (>= 80%)
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/aspirant/modules/mod-1/quiz',
      headers: {
        'x-user-id': userId,
        'x-user-role': 'aspirant',
      },
      payload: {
        userId,
        answers: [
          { questionId: 'q1-1', selectedIndex: 0 }, // Correct (Article 324)
          { questionId: 'q1-2', selectedIndex: 0 }, // Correct (VVPAT)
        ],
      },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.equal(body.success, true);
    assert.equal(body.result.scorePercentage, 100);
    assert.equal(body.result.passed, true);
    assert.equal(body.result.badgeAwarded, 'election_scholar');
    assert.equal(body.result.pointsEarned, 15);
  });

  await t.test('5. Progress persists on module detail query', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/aspirant/modules/mod-1',
      headers: {
        'x-user-id': userId,
        'x-user-role': 'aspirant',
      },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.equal(body.success, true);
    assert.equal(body.module.completed, true);
    assert.equal(body.module.quizScore, 100);
  });

  await t.test('6. Profile linkage reflects badges and completed module count', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/aspirant/profile/${handle}`,
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.equal(body.success, true);
    assert.ok(body.profile.modulesCompleted >= 1);
    assert.ok(body.profile.civicScore >= 15);
    assert.ok(body.profile.badges.some((b: any) => b.badgeType === 'election_scholar'));
  });

  await t.test('7. Rejects quiz submission for non-existent module with 404', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/aspirant/modules/mod-invalid-999/quiz',
      headers: {
        'x-user-id': userId,
        'x-user-role': 'aspirant',
      },
      payload: {
        userId,
        answers: [],
      },
    });

    assert.equal(res.statusCode, 404);
    const body = JSON.parse(res.payload);
    assert.equal(body.code, 'MODULE_NOT_FOUND');
  });
});
