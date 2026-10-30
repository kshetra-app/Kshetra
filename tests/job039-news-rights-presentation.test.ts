import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import { mediaRoutes } from '../apps/api/src/routes/media';
import { MediaService } from '../apps/api/src/services/mediaService';
import { setSupabaseConfiguredForTesting } from '../apps/api/src/lib/supabase';

test('JOB 039: News Rights & Multi-Lingual Presentation', async (t) => {
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

  await t.test('1. Ingests Telugu language regional news with full attribution', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/media/news',
      payload: {
        title: 'జూబ్లీహిల్స్ నియోజకవర్గంలో తాగునీటి సమస్య పరిష్కారానికి ప్రత్యేక నిధులు',
        summary: 'హైదరాబాద్ జలమండలి ఆధ్వర్యంలో నూతన పైప్‌లైన్ పనులకు శంకుస్థాపన.',
        contentUrl: 'https://eenadu.net/hyderabad/civic/water-project-2026',
        sourceName: 'Eenadu Regional Bureau',
        category: 'local_civic',
        stateCode: 'TG',
        constituencyId: 'tg-ac-61',
        sentimentScore: 0.7,
        language: 'te',
        isFactChecked: true,
        factCheckVerdict: 'VERIFIED_REGIONAL_MEDIA',
      },
    });

    assert.equal(res.statusCode, 201);
    const body = JSON.parse(res.payload);
    assert.equal(body.success, true);
    assert.equal(body.article.language, 'te');
    assert.equal(body.article.sourceName, 'Eenadu Regional Bureau');
    assert.ok(body.article.contentUrl.startsWith('https://eenadu.net'));
  });

  await t.test('2. Ingests Hindi national political news with copyright compliant attribution', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/media/news',
      payload: {
        title: 'संसद में नए परिसीमन आयोग के नियमों पर सर्वदलीय बैठक संपन्न',
        summary: 'सभी प्रमुख दलों ने क्षेत्रीय प्रतिनिधित्व और जनसंख्या भार पर अपने विचार प्रस्तुत किए।',
        contentUrl: 'https://ddnews.gov.in/national/delimitation-meeting-delhi',
        sourceName: 'DD News National',
        category: 'policy',
        stateCode: 'DL',
        sentimentScore: 0.2,
        language: 'hi',
        isFactChecked: true,
        factCheckVerdict: 'VERIFIED_PUBLIC_BROADCASTER',
      },
    });

    assert.equal(res.statusCode, 201);
    const body = JSON.parse(res.payload);
    assert.equal(body.success, true);
    assert.equal(body.article.language, 'hi');
  });

  await t.test('3. Fetches multi-lingual news feed filtered by language', async () => {
    const teluguRes = await app.inject({
      method: 'GET',
      url: '/api/v1/media/news/feed?language=te',
    });
    assert.equal(teluguRes.statusCode, 200);
    const teluguBody = JSON.parse(teluguRes.payload);
    assert.equal(teluguBody.success, true);
    assert.equal(teluguBody.articles.length, 1);
    assert.equal(teluguBody.articles[0].language, 'te');
    assert.ok(teluguBody.articles[0].title.includes('జూబ్లీహిల్స్'));

    const hindiRes = await app.inject({
      method: 'GET',
      url: '/api/v1/media/news/feed?language=hi',
    });
    assert.equal(hindiRes.statusCode, 200);
    const hindiBody = JSON.parse(hindiRes.payload);
    assert.equal(hindiBody.success, true);
    assert.equal(hindiBody.articles.length, 1);
    assert.equal(hindiBody.articles[0].language, 'hi');
    assert.ok(hindiBody.articles[0].title.includes('संसद में नए'));
  });
});
