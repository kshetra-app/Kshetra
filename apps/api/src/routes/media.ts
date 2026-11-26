/**
 * Canonical Domain 5 Media, News, Shorts & Broadcasting Fastify Routes
 * Master Product Blueprint — Domain 5 (JOB 037 - JOB 045 & JOB 051 - JOB 053)
 * Ratified under DEC-179 and DEC-180
 */

import type { FastifyInstance } from 'fastify';
import { sendApiError } from '../lib/replyHelper';
import { resolveAuthenticatedUser, assertActingUserMatch } from '../lib/userAuth';
import { submitCreatorShort, toMediaShort } from './shorts';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { MediaService } from '../services/mediaService';
import { isProductionLikeRuntime } from '../lib/runtimeEnvironment';
import type {
  RepresentativeCivicResponseCreateRequest,
  NewsArticleCreateRequest,
  ShortsVideoCreateRequest,
  ShortsAnalyticsEventRequest,
  NotificationSubscriptionRequest,
  BroadcastStudioCreateRequest,
} from '@kshetra/shared';

export async function mediaRoutes(app: FastifyInstance) {
  // ─── 1. REPRESENTATIVE CIVIC RESPONSE (JOB 037) ───

  app.post<{
    Body: RepresentativeCivicResponseCreateRequest;
  }>(
    '/api/v1/media/representative/responses',
    {
      schema: {
        body: {
          type: 'object',
          required: ['issueId', 'responseText', 'officialDesignation'],
          properties: {
            issueId: { type: 'string' },
            responseText: { type: 'string', minLength: 5 },
            actionPlan: { type: 'string' },
            estimatedCompletionDate: { type: 'string' },
            officialDesignation: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const auth = await resolveAuthenticatedUser(request, reply);
      if (!auth) return;

      try {
        const response = await MediaService.createRepresentativeResponse(auth.userId, request.body);
        return reply.status(201).send({ success: true, response });
      } catch (err: any) {
        return sendApiError(reply, request, 400, 'Bad Request', err.message, {
          code: 'INVALID_RESPONSE',
        });
      }
    },
  );

  app.get<{
    Params: { issueId: string };
  }>('/api/v1/media/representative/responses/:issueId', async (request, reply) => {
    const { issueId } = request.params;
    const responses = await MediaService.getResponsesForIssue(issueId);
    return reply.send({ success: true, responses, total: responses.length });
  });

  // ─── 2. POLITICAL NEWS, PRESENTATION & CONTEXT (JOB 038, 039, 040) ───

  app.post<{
    Body: NewsArticleCreateRequest;
  }>(
    '/api/v1/media/news',
    {
      schema: {
        body: {
          type: 'object',
          required: ['title', 'contentUrl', 'sourceName'],
          properties: {
            title: { type: 'string', minLength: 3 },
            summary: { type: 'string' },
            contentUrl: { type: 'string' },
            sourceName: { type: 'string' },
            publishedAt: { type: 'string' },
            category: { type: 'string' },
            stateCode: { type: 'string' },
            constituencyId: { type: 'string' },
            constituencyName: { type: 'string' },
            taggedRepresentativeId: { type: 'string' },
            sentimentScore: { type: 'number' },
            language: { type: 'string' },
            isFactChecked: { type: 'boolean' },
            factCheckVerdict: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const article = await MediaService.publishNewsArticle(request.body);
        return reply.status(201).send({ success: true, article });
      } catch (err: any) {
        return sendApiError(reply, request, 400, 'Bad Request', err.message, {
          code: 'INVALID_NEWS_PAYLOAD',
        });
      }
    },
  );

  app.get<{
    Querystring: {
      constituencyId?: string;
      stateCode?: string;
      category?: any;
      language?: string;
      limit?: number;
      offset?: number;
    };
  }>('/api/v1/media/news/feed', async (request, reply) => {
    const result = await MediaService.queryNewsFeed(request.query);
    return reply.send({ success: true, ...result });
  });

  app.get<{
    Params: { articleId: string };
  }>('/api/v1/media/news/:articleId/context', async (request, reply) => {
    const { articleId } = request.params;
    const context = await MediaService.resolvePoliticalContext(articleId);
    if (!context) {
      return sendApiError(reply, request, 404, 'Not Found', 'Article not found', {
        code: 'ARTICLE_NOT_FOUND',
      });
    }
    return reply.send({ success: true, context });
  });

  // ─── 3. SHORTS PIPELINE, VIEWER & ANALYTICS (JOB 041, 042, 043) ───

  app.post<{
    Body: ShortsVideoCreateRequest & { id: string; videoPath: string };
  }>(
    '/api/v1/media/shorts',
    {
      schema: {
        body: {
          type: 'object',
          required: ['id', 'title', 'videoPath', 'constituencyId', 'rightsConfirmed'],
          properties: {
            id: { type: 'string', format: 'uuid' },
            title: { type: 'string', minLength: 3 },
            description: { type: 'string' },
            videoPath: { type: 'string', maxLength: 80 },
            rightsConfirmed: { const: true },
            thumbnailUrl: { type: 'string' },
            durationSeconds: { type: 'number', minimum: 5, maximum: 60 },
            constituencyId: { type: 'string' },
            stateCode: { type: 'string' },
            candidateId: { type: 'string' },
            hashtags: { type: 'array', items: { type: 'string' } },
          },
        },
      },
    },
    (request, reply) => submitCreatorShort(request, reply, true),
  );

  app.get<{
    Querystring: { constituencyId?: string; limit?: number };
  }>('/api/v1/media/shorts/feed', async (request, reply) => {
    const { constituencyId, limit } = request.query;
    if (!isSupabaseConfigured) {
      return sendApiError(
        reply,
        request,
        503,
        'DATABASE_UNAVAILABLE',
        'Shorts feed is unavailable.',
      );
    }
    let query = supabase
      .from('political_shorts')
      .select('*')
      .eq('status', 'approved')
      .like('video_url', '%.mp4')
      .not('video_url', 'like', 'http%')
      .order('created_at', { ascending: false })
      .limit(Math.min(100, Math.max(1, Number(limit) || 10)));
    if (constituencyId) query = query.eq('constituency_id', constituencyId);
    const { data, error } = await query;
    if (error)
      return sendApiError(reply, request, 503, 'DATABASE_UNAVAILABLE', 'Could not load Shorts.');
    const paths = (data ?? []).map((row) => row.video_url);
    const signed = paths.length
      ? await supabase.storage.from('short-videos').createSignedUrls(paths, 600)
      : { data: [] };
    const byPath = new Map(signed.data?.map((entry) => [entry.path, entry.signedUrl]));
    const shorts = (data ?? []).flatMap((row) => {
      const videoUrl = byPath.get(row.video_url);
      return videoUrl ? [{ ...toMediaShort(row), videoUrl }] : [];
    });
    return reply.send({ success: true, shorts, total: shorts.length });
  });

  app.post<{
    Body: ShortsAnalyticsEventRequest;
  }>(
    '/api/v1/media/shorts/analytics',
    {
      schema: {
        body: {
          type: 'object',
          required: ['shortId', 'userIdHash', 'watchDurationSeconds', 'isCompleted'],
          properties: {
            shortId: { type: 'string' },
            userIdHash: { type: 'string' },
            watchDurationSeconds: { type: 'number' },
            isCompleted: { type: 'boolean' },
            shared: { type: 'boolean' },
            constituencyId: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const result = await MediaService.recordShortsAnalytics(request.body);
      return reply.send({ success: result.success });
    },
  );

  app.get<{
    Params: { shortId: string };
  }>('/api/v1/media/shorts/:shortId/analytics', async (request, reply) => {
    const { shortId } = request.params;
    const summary = await MediaService.getShortsAnalyticsSummary(shortId);
    return reply.send({ success: true, summary });
  });

  // ─── 4. NOTIFICATIONS & RETENTION DIGESTS (JOB 044, 045) ───

  app.post<{
    Body: NotificationSubscriptionRequest;
  }>(
    '/api/v1/media/notifications/subscribe',
    {
      schema: {
        body: {
          type: 'object',
          required: ['constituencyId', 'topic'],
          properties: {
            constituencyId: { type: 'string' },
            topic: { type: 'string' },
            pushToken: { type: 'string' },
            tokenPlatform: { type: 'string', enum: ['fcm', 'apns', 'web'] },
            isActive: { type: 'boolean' },
          },
        },
      },
    },
    async (request, reply) => {
      const auth = await resolveAuthenticatedUser(request, reply);
      if (!auth) return;

      const sub = await MediaService.updateNotificationSubscription(auth.userId, request.body);
      return reply.send({ success: true, subscription: sub });
    },
  );

  app.get('/api/v1/media/notifications/subscriptions', async (request, reply) => {
    const auth = await resolveAuthenticatedUser(request, reply);
    if (!auth) return;

    const subscriptions = await MediaService.getSubscriptions(auth.userId);
    return reply.send({ success: true, subscriptions });
  });

  app.post<{
    Body: {
      constituencyId: string;
      topic: string;
      title: string;
      body: string;
      isEmergency?: boolean;
    };
  }>(
    '/api/v1/media/notifications/dispatch',
    {
      schema: {
        body: {
          type: 'object',
          required: ['constituencyId', 'topic', 'title', 'body'],
          properties: {
            constituencyId: { type: 'string' },
            topic: { type: 'string' },
            title: { type: 'string' },
            body: { type: 'string' },
            isEmergency: { type: 'boolean' },
          },
        },
      },
    },
    async (request, reply) => {
      const auth = await resolveAuthenticatedUser(request, reply);
      if (!auth) return;

      const { constituencyId, topic, title, body, isEmergency } = request.body;
      const res = await MediaService.dispatchNotification(constituencyId, topic, {
        title,
        body,
        isEmergency,
      });
      return reply.send({ success: true, ...res });
    },
  );

  app.get<{
    Params: { constituencyId: string };
    Querystring: { digestType?: 'weekly' | 'monthly' };
  }>('/api/v1/media/digests/:constituencyId', async (request, reply) => {
    const { constituencyId } = request.params;
    const digestType = request.query.digestType || 'weekly';
    const digest = await MediaService.generateConstituencyDigest(constituencyId, digestType);
    return reply.send({ success: true, digest });
  });

  // ─── 5. LIVE STREAMING & BROADCAST STUDIO (JOB 051, 052, 053) ───

  // These historical fixtures have no durable stream or media behind them.
  // Deployed clients use the Live Media Exchange routes for the whole lifecycle.
  if (isProductionLikeRuntime()) return;

  app.get<{
    Querystring: { constituencyId?: string };
  }>('/api/v1/media/broadcasts/live', async (request, reply) => {
    const { constituencyId } = request.query;
    const streams = await MediaService.getLiveConsumerStreams(constituencyId);
    return reply.send({ success: true, streams, total: streams.length });
  });

  app.post<{
    Body: BroadcastStudioCreateRequest;
  }>(
    '/api/v1/media/broadcasts/studio',
    {
      schema: {
        body: {
          type: 'object',
          required: ['title'],
          properties: {
            title: { type: 'string', minLength: 3 },
            speakerName: { type: 'string' },
            speakerRole: { type: 'string' },
            constituencyId: { type: 'string' },
            description: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const auth = await resolveAuthenticatedUser(request, reply);
      if (!auth) return;

      try {
        const session = await MediaService.createBroadcastSession(auth.userId, request.body);
        return reply.status(201).send({ success: true, session });
      } catch (err: any) {
        return sendApiError(reply, request, 400, 'Bad Request', err.message, {
          code: 'INVALID_STUDIO_PAYLOAD',
        });
      }
    },
  );

  app.post<{
    Params: { sessionId: string };
  }>('/api/v1/media/broadcasts/studio/:sessionId/start', async (request, reply) => {
    const auth = await resolveAuthenticatedUser(request, reply);
    if (!auth) return;

    try {
      const session = await MediaService.startBroadcast(request.params.sessionId);
      return reply.send({ success: true, session });
    } catch (err: any) {
      return sendApiError(reply, request, 404, 'Not Found', err.message, {
        code: 'STREAM_NOT_FOUND',
      });
    }
  });

  app.post<{
    Params: { sessionId: string };
  }>('/api/v1/media/broadcasts/studio/:sessionId/end', async (request, reply) => {
    const auth = await resolveAuthenticatedUser(request, reply);
    if (!auth) return;

    try {
      const session = await MediaService.endBroadcast(request.params.sessionId);
      return reply.send({ success: true, session });
    } catch (err: any) {
      return sendApiError(reply, request, 404, 'Not Found', err.message, {
        code: 'STREAM_NOT_FOUND',
      });
    }
  });

  app.post<{
    Params: { sessionId: string };
    Body: { delta: number };
  }>('/api/v1/media/broadcasts/:sessionId/viewers', async (request, reply) => {
    try {
      const res = await MediaService.updateViewerCount(
        request.params.sessionId,
        request.body?.delta || 1,
      );
      return reply.send({ success: true, ...res });
    } catch (err: any) {
      return sendApiError(reply, request, 404, 'Not Found', err.message, {
        code: 'STREAM_NOT_FOUND',
      });
    }
  });
}
