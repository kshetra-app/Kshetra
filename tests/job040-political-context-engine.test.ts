import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import { mediaRoutes } from '../apps/api/src/routes/media';
import { MediaService } from '../apps/api/src/services/mediaService';
import { setSupabaseConfiguredForTesting } from '../apps/api/src/lib/supabase';

test('JOB 040: Political Context Engine', async (t) => {
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

  let articleId: string;

  await t.test('1. Creates a news article linked to a constituency and representative', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/media/news',
      payload: {
        title: 'MLA reviews flyover construction near Jubilee Hills Checkpost',
        summary: 'Inspection completed by sitting legislator with GHMC engineering officials.',
        contentUrl: 'https://thehindu.com/news/cities/Hyderabad/flyover-inspection-jubilee-hills',
        sourceName: 'The Hindu',
        category: 'development',
        stateCode: 'TG',
        constituencyId: 'tg-ac-61',
        taggedRepresentativeId: 'rep-mla-61',
        sentimentScore: 0.6,
        language: 'en',
      },
    });

    assert.equal(res.statusCode, 201);
    const body = JSON.parse(res.payload);
    articleId = body.article.id;
    assert.ok(articleId);
  });

  await t.test('2. Resolves deep political context for the published article', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/media/news/${articleId}/context`,
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.equal(body.success, true);
    assert.equal(body.context.articleId, articleId);
    assert.ok(body.context.constituency);
    assert.equal(body.context.constituency.id, 'tg-ac-61');
    assert.ok(body.context.constituency.name.includes('Jubilee Hills'));
    assert.ok(body.context.representative);
    assert.equal(body.context.representative.id, 'rep-mla-61');
    assert.ok(body.context.relatedCivicIssues.length >= 0);
  });

  await t.test('3. Returns 404 for unknown articleId context resolution', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/media/news/art-non-existent-9999/context',
    });

    assert.equal(res.statusCode, 404);
    const body = JSON.parse(res.payload);
    assert.equal(body.code, 'ARTICLE_NOT_FOUND');
  });
});
