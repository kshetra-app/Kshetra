import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import { mediaRoutes } from '../apps/api/src/routes/media';
import { MediaService } from '../apps/api/src/services/mediaService';
import { setSupabaseConfiguredForTesting } from '../apps/api/src/lib/supabase';

test('JOB 038: Political News Ingestion Pipeline', async (t) => {
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

  await t.test('1. Ingests news article from official source (ECI Gazette)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/media/news',
      payload: {
        title: 'Election Commission of India Notification on Delimitation Consultations',
        summary: 'ECI convenes stakeholder consultation on delimitation benchmarks across southern states.',
        contentUrl: 'https://eci.gov.in/notifications/delimitation-2026-south',
        sourceName: 'Election Commission of India',
        category: 'election',
        stateCode: 'TG',
        constituencyId: 'tg-ac-61',
        sentimentScore: 0.1,
        language: 'en',
        isFactChecked: true,
        factCheckVerdict: 'VERIFIED_OFFICIAL',
      },
    });

    assert.equal(res.statusCode, 201);
    const body = JSON.parse(res.payload);
    assert.equal(body.success, true);
    assert.ok(body.article.id);
    assert.equal(body.article.sourceName, 'Election Commission of India');
    assert.equal(body.article.isFactChecked, true);
    assert.equal(body.article.factCheckVerdict, 'VERIFIED_OFFICIAL');
  });

  await t.test('2. Ingests local developmental news article from PIB', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/media/news',
      payload: {
        title: 'Cabinet sanctions ₹1,200 Cr urban transit expansion for Hyderabad Metro Phase 2',
        summary: 'Metro rail connectivity from Raidurg to Rajiv Gandhi International Airport sanctioned.',
        contentUrl: 'https://pib.gov.in/newsite/PrintRelease.aspx?relid=99281',
        sourceName: 'Press Information Bureau (PIB)',
        category: 'development',
        stateCode: 'TG',
        constituencyId: 'tg-ac-61',
        sentimentScore: 0.85,
        language: 'en',
        isFactChecked: true,
        factCheckVerdict: 'VERIFIED_OFFICIAL',
      },
    });

    assert.equal(res.statusCode, 201);
  });

  await t.test('3. Filters news feed by category and constituency', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/media/news/feed?category=development&constituencyId=tg-ac-61',
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.equal(body.success, true);
    assert.equal(body.articles.length, 1);
    assert.ok(body.articles[0].title.includes('Hyderabad Metro'));
    assert.equal(body.articles[0].category, 'development');
  });

  await t.test('4. Rejects invalid news payload lacking required title or contentUrl', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/media/news',
      payload: {
        summary: 'Incomplete news article without title',
        sourceName: 'Unknown',
      },
    });

    assert.equal(res.statusCode, 400);
  });
});
