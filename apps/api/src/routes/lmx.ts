import { isProductionLikeRuntime } from '../lib/runtimeEnvironment';
import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import type { FastifyInstance } from 'fastify';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { sendApiError } from '../lib/replyHelper';
import {
  getHostedLiveConfig,
  hostedRecordingQuery,
  hostedWhipAnswer,
  getMediaHosts,
  isHostedLiveReady,
  isHostedStreamReady,
  isMediaPipelineConfigured,
  isStudioTicketValid,
  liveEventIdPattern,
  listHostedLivePaths,
  liveStudioPath,
  liveWatchPath,
  mediaRequest,
  selectPipeline,
  stopHostedStream,
  studioTicket,
} from '../lib/mediaPipeline';
import { resolveAdminActor } from '../lib/adminAuthorization';
import { resolveAuthenticatedUser } from '../lib/userAuth';
import { renderReviewPreviewHtml, renderStudioHtml } from '../modules/broadcast/studioHtml';
import { getContentArchiveCutoff } from '@kshetra/shared';

const isProductionRuntime = () => isProductionLikeRuntime();

// ─── AJV SCHEMAS FOR LMX ROUTES ───

const lmxLiveQuerySchema = {
  querystring: {
    type: 'object',
    properties: {
      category: { type: 'string', maxLength: 100 },
      state: { type: 'string', pattern: '^[A-Z]{2}$' },
      status: { type: 'string', enum: ['live', 'ended', 'archive', 'all'] },
    },
  },
};

const lmxStreamIdParamSchema = {
  params: {
    type: 'object',
    required: ['streamId'],
    properties: {
      streamId: { type: 'string', minLength: 1, maxLength: 128 },
    },
  },
};

const createLiveEventBodySchema = {
  body: {
    type: 'object',
    required: ['stream_id', 'reporter_id', 'reporter_name'],
    additionalProperties: false,
    properties: {
      stream_id: { type: 'string', minLength: 1, maxLength: 128 },
      reporter_id: { type: 'string', minLength: 1, maxLength: 128 },
      reporter_name: { type: 'string', minLength: 1, maxLength: 100 },
      accreditation_tier: {
        type: 'string',
        enum: ['citizen', 'stringer', 'accredited', 'senior', 'editor', 'organization'],
      },
      credibility_score: { type: 'number', minimum: 0, maximum: 100 },
      gps_lat: { anyOf: [{ type: 'number', minimum: -90, maximum: 90 }, { type: 'null' }] },
      gps_lng: { anyOf: [{ type: 'number', minimum: -180, maximum: 180 }, { type: 'null' }] },
      state_code: { anyOf: [{ type: 'string', pattern: '^[A-Z]{2}$' }, { type: 'null' }] },
      district_name: { anyOf: [{ type: 'string', maxLength: 100 }, { type: 'null' }] },
      mandal_name: { type: 'null' },
      constituency_ac_no: { anyOf: [{ type: 'integer', minimum: 1 }, { type: 'null' }] },
      locality: { anyOf: [{ type: 'string', maxLength: 200 }, { type: 'null' }] },
      issue_category: {
        type: 'string',
        enum: ['emergency', 'traffic', 'weather', 'civic', 'breaking_news', 'general'],
      },
      tags: { type: 'array', items: { type: 'string', maxLength: 80 }, maxItems: 20 },
      language: { type: 'string', minLength: 2, maxLength: 10 },
      media_ingest_url: { anyOf: [{ type: 'string', maxLength: 1000 }, { type: 'null' }] },
      media_playback_hls: { anyOf: [{ type: 'string', maxLength: 1000 }, { type: 'null' }] },
      media_playback_webrtc: { anyOf: [{ type: 'string', maxLength: 1000 }, { type: 'null' }] },
      thumbnail_url: { type: 'null' },
      multi_camera_angles: { type: 'array', maxItems: 8 },
      affiliation_id: { anyOf: [{ type: 'string', format: 'uuid' }, { type: 'null' }] },
      active_brand_kit_id: { anyOf: [{ type: 'string', format: 'uuid' }, { type: 'null' }] },
      exclusivity_flag: { type: 'boolean' },
      visibility_mode: {
        type: 'string',
        enum: ['public', 'exclusive_partner', 'confidential_direct'],
      },
      alert_departments: { type: 'array', items: { type: 'string', maxLength: 80 }, maxItems: 20 },
      buffer_state: { type: 'string', enum: ['buffering', 'cleared', 'held', 'cut', 'bypassed'] },
      buffer_seconds: { type: 'integer', minimum: 0, maximum: 600 },
      human_decision: {
        anyOf: [{ type: 'string', enum: ['allow', 'mute', 'cut', 'escalate'] }, { type: 'null' }],
      },
      status: { type: 'string', enum: ['preparing', 'live', 'ended', 'archived', 'removed'] },
      viewer_count: { type: 'integer', minimum: 0 },
      peak_viewers: { type: 'integer', minimum: 0 },
      priority_score: { type: 'number', minimum: 0, maximum: 100 },
      content_hash: { type: 'null' },
      raw_recording_url: { type: 'null' },
      branded_recording_url: { type: 'null' },
      retention_expiry: { type: 'null' },
      started_at: { type: 'string', format: 'date-time' },
      ended_at: { type: 'null' },
    },
  },
};

const moderateStreamSchema = {
  params: {
    type: 'object',
    required: ['streamId'],
    properties: {
      streamId: { type: 'string', minLength: 1, maxLength: 128 },
    },
  },
  body: {
    type: 'object',
    required: ['decision'],
    properties: {
      decision: { type: 'string', enum: ['allow', 'mute', 'cut', 'escalate'] },
      reason: { type: 'string', maxLength: 500 },
      moderatorId: { type: 'string', maxLength: 128 },
    },
  },
};

const endStreamSchema = {
  params: {
    type: 'object',
    required: ['streamId'],
    properties: {
      streamId: { type: 'string', minLength: 1, maxLength: 128 },
    },
  },
  body: {
    type: 'object',
    properties: {
      content_hash: { type: 'string', maxLength: 128 },
    },
  },
};

const lmxDepartmentsQuerySchema = {
  querystring: {
    type: 'object',
    properties: {
      type: { type: 'string', maxLength: 100 },
      state: { type: 'string', pattern: '^[A-Z]{2}$' },
    },
  },
};

const createDepartmentBodySchema = {
  body: {
    type: 'object',
    required: ['departmentType', 'officeName'],
    properties: {
      departmentType: { type: 'string', minLength: 1, maxLength: 100 },
      officeName: { type: 'string', minLength: 1, maxLength: 200 },
      stateCode: { type: 'string', pattern: '^[A-Z]{2}$' },
    },
  },
};

const createAlertBodySchema = {
  body: {
    type: 'object',
    required: ['department_id', 'alert_type', 'message'],
    properties: {
      department_id: { type: 'string', minLength: 1, maxLength: 128 },
      stream_id: { type: 'string', maxLength: 128 },
      alert_type: { type: 'string', minLength: 1, maxLength: 100 },
      message: { type: 'string', minLength: 1, maxLength: 1000 },
      priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
    },
  },
};

const acknowledgeAlertSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', minLength: 1, maxLength: 128 },
    },
  },
  body: {
    type: 'object',
    required: ['acknowledgment', 'acknowledged_by'],
    properties: {
      acknowledgment: { type: 'string', minLength: 1, maxLength: 1000 },
      acknowledged_by: { type: 'string', minLength: 1, maxLength: 128 },
    },
  },
};

const createDistributionSchema = {
  body: {
    type: 'object',
    required: ['destination_type', 'endpoint_url'],
    properties: {
      stream_id: { type: 'string', maxLength: 128 },
      destination_type: { type: 'string', minLength: 1, maxLength: 50 },
      endpoint_url: { type: 'string', minLength: 1, maxLength: 500 },
      auth_token: { type: 'string', maxLength: 500 },
      status: { type: 'string', enum: ['active', 'inactive', 'failed'] },
    },
  },
};

/**
 * Kshetra Live Media Exchange (LMX) API
 */
export async function lmxRoutes(app: FastifyInstance) {
  /** 1. GET /api/v1/lmx/status — exchange + AI availability */
  app.get('/api/v1/lmx/status', async (_request, reply) => {
    const publishAvailable = isSupabaseConfigured && (await isHostedLiveReady());
    reply.header('Cache-Control', 'no-store');
    return reply.send({
      status: isSupabaseConfigured ? 'operational' : 'offline',
      mediaPlane: publishAvailable ? 'self_hosted' : 'unavailable',
      publishAvailable,
      aiService: 'inactive',
      supabase: isSupabaseConfigured ? 'connected' : 'offline',
    });
  });

  app.addContentTypeParser(
    'application/sdp',
    { parseAs: 'string', bodyLimit: 64 * 1024 },
    (_request, body, done) => done(null, body),
  );

  app.get<{ Params: { id: string } }>(`${liveStudioPath}/:id`, async (request, reply) => {
    const { id } = request.params;
    if (!getHostedLiveConfig() || !liveEventIdPattern.test(id)) return reply.code(404).send();
    return reply
      .type('text/html')
      .header('Cache-Control', 'no-store')
      .header('Referrer-Policy', 'no-referrer')
      .header('Permissions-Policy', 'camera=(self), microphone=(self)')
      .header(
        'Content-Security-Policy',
        "default-src 'none'; media-src blob:; connect-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; frame-ancestors 'none'",
      )
      .send(renderStudioHtml(`${liveStudioPath}/${id}`));
  });

  app.post<{ Params: { id: string }; Body: string }>(
    `${liveStudioPath}/:id/publish`,
    async (request, reply) => {
      const { id } = request.params;
      const config = getHostedLiveConfig();
      if (!config || !liveEventIdPattern.test(id)) return reply.code(404).send();
      if (!isStudioTicketValid(config, id, request.headers.authorization))
        return reply.code(401).send();
      const { data, error } = await supabase
        .from('live_events')
        .select('status,created_at')
        .eq('id', id)
        .maybeSingle();
      if (error) return reply.code(503).send();
      if (data?.status !== 'preparing' || Date.now() - Date.parse(data.created_at) > 10 * 60_000) {
        return reply.code(409).send();
      }
      if (typeof request.body !== 'string' || !request.body.startsWith('v=0'))
        return reply.code(400).send();
      try {
        const response = await mediaRequest(config, 'ingest', `/ingest/${id}/whip`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/sdp' },
          body: request.body,
        });
        const location = response.headers.get('location');
        if (!response.ok || !location) return reply.code(502).send();
        // MediaMTX returns a relative URL for the specific WHIP publishing session.
        const resource = location.split('/').at(-1);
        if (
          !resource ||
          !liveEventIdPattern.test(resource) ||
          location !== `/ingest/${id}/whip/${resource}`
        ) {
          return reply.code(502).send();
        }
        return reply
          .code(201)
          .type('application/sdp')
          .header('Location', `${liveStudioPath}/${id}/publish/${resource}`)
          .send(hostedWhipAnswer(config, await response.text()));
      } catch {
        return reply.code(503).send();
      }
    },
  );

  app.post<{ Params: { id: string } }>(`${liveStudioPath}/:id/ready`, async (request, reply) => {
    const { id } = request.params;
    const config = getHostedLiveConfig();
    if (!config || !liveEventIdPattern.test(id)) return reply.code(404).send();
    if (!isStudioTicketValid(config, id, request.headers.authorization))
      return reply.code(401).send();
    if (!(await isHostedStreamReady(config, id))) return reply.code(409).send();
    const { data, error } = await supabase
      .from('live_events')
      .select('id,status,buffer_state')
      .eq('id', id)
      .maybeSingle();
    if (error) return reply.code(503).send();
    if (data?.status === 'live') return { published: data.buffer_state === 'cleared' };
    if (data?.status !== 'preparing') return reply.code(409).send();
    const now = new Date().toISOString();
    const saved = await supabase
      .from('live_events')
      .update({ status: 'live', started_at: now, updated_at: now })
      .eq('id', id)
      .eq('status', 'preparing')
      .select('id')
      .maybeSingle();
    if (saved.error) return reply.code(503).send();
    if (!saved.data) return reply.code(409).send();
    return { published: false };
  });

  app.delete<{ Params: { id: string; resource: string } }>(
    `${liveStudioPath}/:id/publish/:resource`,
    async (request, reply) => {
      const { id, resource } = request.params;
      const config = getHostedLiveConfig();
      if (!config || !liveEventIdPattern.test(id) || !liveEventIdPattern.test(resource))
        return reply.code(404).send();
      if (!isStudioTicketValid(config, id, request.headers.authorization))
        return reply.code(401).send();
      try {
        const response = await mediaRequest(config, 'ingest', `/ingest/${id}/whip/${resource}`, {
          method: 'DELETE',
        });
        if (!response.ok && response.status !== 404) return reply.code(503).send();
        const now = new Date().toISOString();
        let recording = await hostedRecordingQuery(config, id);
        for (let attempt = 0; !recording && attempt < 3; attempt++) {
          await new Promise((resolve) => setTimeout(resolve, 500));
          recording = await hostedRecordingQuery(config, id);
        }
        const { error } = await supabase
          .from('live_events')
          .update({
            status: 'ended',
            ended_at: now,
            updated_at: now,
            raw_recording_url: recording
              ? `${config.studioOrigin}${liveWatchPath}/${id}/replay.mp4`
              : null,
            retention_expiry: recording
              ? new Date(Date.now() + 90 * 86_400_000).toISOString()
              : null,
          })
          .eq('id', id)
          .in('status', ['preparing', 'live']);
        return reply.code(error ? 503 : 204).send();
      } catch {
        return reply.code(503).send();
      }
    },
  );

  app.get<{ Params: { id: string; segment: string }; Querystring: { session?: string } }>(
    `${liveWatchPath}/:id/:segment`,
    async (request, reply) => {
      const { id, segment } = request.params;
      const config = getHostedLiveConfig();
      if (!config || !liveEventIdPattern.test(id)) return reply.code(404).send();
      if (segment === 'review') {
        return reply
          .type('text/html')
          .header('Cache-Control', 'no-store')
          .header('Referrer-Policy', 'no-referrer')
          .header(
            'Content-Security-Policy',
            "default-src 'none'; media-src blob:; connect-src 'self'; script-src 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'unsafe-inline'; frame-ancestors 'none'",
          )
          .send(renderReviewPreviewHtml(`${liveWatchPath}/${id}/index.m3u8`));
      }
      if (!/^[\w-]+\.(?:m3u8|mp4|m4s)$/.test(segment)) {
        return reply.code(404).send();
      }
      const replay = segment === 'replay.mp4';
      const review =
        !replay && isStudioTicketValid(config, id, request.headers.authorization, 'review');
      let query = supabase
        .from('live_events')
        .select('id,status,raw_recording_url,retention_expiry')
        .eq('id', id)
        .in('status', replay ? ['ended', 'archived'] : ['live'])
        .eq('visibility_mode', 'public');
      query = query.in(
        'buffer_state',
        review ? ['buffering', 'cleared', 'held'] : ['cleared', 'bypassed'],
      );
      const { data, error } = await query.maybeSingle();
      if (error) return reply.code(503).send();
      if (!data) return reply.code(404).send();
      try {
        if (
          replay &&
          (!data.raw_recording_url || !(Date.parse(data.retention_expiry) > Date.now()))
        ) {
          return reply.code(404).send();
        }
        const recording = replay ? await hostedRecordingQuery(config, id) : null;
        if (replay && !recording) return reply.code(404).send();
        if (recording) recording.set('format', 'mp4');
        const session = request.query.session;
        const playbackQuery = new URLSearchParams({ cookieCheck: '1' });
        if (typeof session === 'string' && liveEventIdPattern.test(session)) {
          playbackQuery.set('session', session);
        }
        const response = recording
          ? await mediaRequest(config, 'recordings', `/get?${recording}`)
          : await mediaRequest(config, 'playback', `/watch/${id}/${segment}?${playbackQuery}`);
        if (!response.ok || !response.body)
          return reply.code(response.status === 404 ? 404 : 502).send();
        return reply
          .header('Cache-Control', 'no-store')
          .header('Access-Control-Allow-Origin', '*')
          .header('Cross-Origin-Resource-Policy', review ? 'same-origin' : 'cross-origin')
          .type(segment.endsWith('.m3u8') ? 'application/vnd.apple.mpegurl' : 'video/mp4')
          .send(Readable.fromWeb(response.body as Parameters<typeof Readable.fromWeb>[0]));
      } catch {
        return reply.code(503).send();
      }
    },
  );

  app.get('/api/v1/lmx/review', async (request, reply) => {
    if (!(await resolveAdminActor(request, reply))) return;
    const config = getHostedLiveConfig();
    if (!config) return reply.code(503).send();
    const { data, error } = await supabase
      .from('live_events')
      .select(
        'id,stream_id,reporter_name,issue_category,accreditation_tier,state_code,started_at,status,buffer_state',
      )
      .eq('status', 'live')
      .eq('visibility_mode', 'public')
      .in('buffer_state', ['buffering', 'cleared', 'held'])
      .order('started_at', { ascending: false })
      .limit(50);
    if (error) return reply.code(503).send();
    const visible = await listHostedLivePaths(config);
    return reply
      .header('Cache-Control', 'no-store')
      .send((data ?? []).filter((event) => visible.has(event.id)));
  });

  app.post<{ Params: { id: string } }>('/api/v1/lmx/review/:id/preview', async (request, reply) => {
    if (!(await resolveAdminActor(request, reply))) return;
    const { id } = request.params;
    const config = getHostedLiveConfig();
    if (!config || !liveEventIdPattern.test(id) || !(await isHostedStreamReady(config, id)))
      return reply.code(404).send();
    const { data, error } = await supabase
      .from('live_events')
      .select('id')
      .eq('id', id)
      .eq('status', 'live')
      .eq('visibility_mode', 'public')
      .in('buffer_state', ['buffering', 'cleared', 'held'])
      .maybeSingle();
    if (error) return reply.code(503).send();
    if (!data) return reply.code(404).send();
    return reply.header('Cache-Control', 'no-store').send({
      previewUrl: `${config.studioOrigin}${liveWatchPath}/${id}/review#${studioTicket(config, id, 'review')}`,
    });
  });

  /** 2. GET /api/v1/lmx/live — public Live tab feed */
  app.get<{
    Querystring: {
      category?: string;
      state?: string;
      status?: 'live' | 'ended' | 'archive' | 'all';
    };
  }>('/api/v1/lmx/live', { schema: lmxLiveQuerySchema }, async (request, reply) => {
    if (!isSupabaseConfigured) {
      return reply.send([]);
    }

    try {
      const { category, state, status } = request.query;
      let query = supabase
        .from('live_events')
        .select('*, live_event_ai(*)')
        .in('buffer_state', ['cleared', 'bypassed'])
        .eq('visibility_mode', 'public')
        .order(status === 'archive' ? 'ended_at' : 'started_at', { ascending: false })
        .order('priority_score', { ascending: false })
        .limit(50);

      if (category && category !== 'all') query = query.eq('issue_category', category);
      if (state) query = query.eq('state_code', state);
      if (status === 'live') {
        query = query.eq('status', 'live');
      } else if (status === 'ended') {
        query = query.eq('status', 'ended');
      } else if (status === 'archive') {
        const cutoff = getContentArchiveCutoff();
        query = query.or(
          `status.eq.archived,and(status.eq.ended,ended_at.lt.${cutoff}),and(status.eq.ended,ended_at.is.null,started_at.lt.${cutoff})`,
        );
      }

      const { data, error } = await query;
      if (error) {
        return sendApiError(reply, request, 500, 'Internal Server Error', error.message, {
          code: 'DATABASE_ERROR',
        });
      }
      const config = getHostedLiveConfig();
      if (!config) return reply.send(data ?? []);
      const livePaths = await listHostedLivePaths(config);
      return reply.header('Cache-Control', 'no-store').send(
        (data ?? [])
          .filter((item) => {
            if (item.status === 'live') return livePaths.has(item.id);
            return (
              (item.status === 'ended' || item.status === 'archived') &&
              item.raw_recording_url &&
              Date.parse(item.retention_expiry) > Date.now()
            );
          })
          .map(({ gps_lat, gps_lng, media_ingest_url, ...item }) => item),
      );
    } catch (err: any) {
      return sendApiError(
        reply,
        request,
        500,
        'Internal Server Error',
        err?.message || 'Failed to fetch live events',
        {
          code: 'DATABASE_ERROR',
        },
      );
    }
  });

  /** 3. GET /api/v1/lmx/live/:streamId — single Live Event Object */
  app.get<{ Params: { streamId: string } }>(
    '/api/v1/lmx/live/:streamId',
    { schema: lmxStreamIdParamSchema },
    async (request, reply) => {
      if (!isSupabaseConfigured) {
        return sendApiError(reply, request, 404, 'Not Found', 'Stream not found', {
          code: 'NOT_FOUND',
        });
      }

      try {
        const { streamId } = request.params;
        const { data, error } = await supabase
          .from('live_events')
          .select('*, live_event_ai(*), lmx_department_alerts(*)')
          .eq('id', streamId)
          .single();

        if (error || !data) {
          return sendApiError(reply, request, 404, 'Not Found', 'Stream not found', {
            code: 'NOT_FOUND',
          });
        }
        const config = getHostedLiveConfig();
        if (
          (isProductionRuntime() || config) &&
          (data.visibility_mode !== 'public' ||
            !['cleared', 'bypassed'].includes(data.buffer_state))
        ) {
          return reply.code(404).send();
        }
        if (
          config &&
          (data.status === 'live'
            ? !(await isHostedStreamReady(config, data.id))
            : !['ended', 'archived'].includes(data.status) ||
              !data.raw_recording_url ||
              !(Date.parse(data.retention_expiry) > Date.now()))
        ) {
          return reply.code(404).send();
        }
        if (!config && !isProductionRuntime()) return reply.send(data);
        const { gps_lat, gps_lng, media_ingest_url, lmx_department_alerts, ...item } = data;
        return reply.header('Cache-Control', 'no-store').send(item);
      } catch {
        return sendApiError(reply, request, 404, 'Not Found', 'Stream not found', {
          code: 'NOT_FOUND',
        });
      }
    },
  );

  /** 4. POST /api/v1/lmx/live — create (go-live) Live Event Object with server-side gating */
  app.post<{ Body: Record<string, any> }>(
    '/api/v1/lmx/live',
    { schema: createLiveEventBodySchema },
    async (request, reply) => {
      const body = request.body || {};
      const hosted = getHostedLiveConfig();

      // 1. Authenticate user from session token or non-prod x-user-id header
      const authHeader = request.headers.authorization;
      let userId: string | null = null;
      let emailConfirmed = false;

      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.replace('Bearer ', '').trim();
        try {
          const {
            data: { user },
            error: authErr,
          } = await supabase.auth.getUser(token);
          if (!authErr && user) {
            userId = user.id;
            emailConfirmed = Boolean(user.email_confirmed_at);
          }
        } catch {
          // Auth lookup failed
        }
      }

      // Accept explicit x-user-id header only in non-production environments
      if (
        !userId &&
        !hosted &&
        !isProductionRuntime() &&
        typeof request.headers['x-user-id'] === 'string'
      ) {
        userId = request.headers['x-user-id'];
      }

      if (!userId) {
        return sendApiError(
          reply,
          request,
          401,
          'Unauthorized',
          'Unauthorized: Authentication required to create a live broadcast.',
          {
            code: 'UNAUTHORIZED',
          },
        );
      }
      if (hosted && !emailConfirmed) {
        return sendApiError(
          reply,
          request,
          403,
          'Forbidden',
          'Confirm your email address to broadcast.',
          {
            code: 'UNVERIFIED_EMAIL',
          },
        );
      }

      // 2. Query user's real profile from Supabase user_profiles table
      let profile: { role?: string; verification_status?: string; display_name?: string } | null =
        null;
      try {
        const { data, error: profileErr } = await supabase
          .from('user_profiles')
          .select('role, verification_status, display_name')
          .eq('user_id', userId)
          .maybeSingle();

        if (profileErr || !data) {
          return sendApiError(
            reply,
            request,
            403,
            'Forbidden',
            'Forbidden: User profile not found.',
            {
              code: 'PROFILE_NOT_FOUND',
            },
          );
        }
        profile = data;
      } catch {
        return sendApiError(
          reply,
          request,
          403,
          'Forbidden',
          'Forbidden: User profile not found.',
          {
            code: 'PROFILE_NOT_FOUND',
          },
        );
      }

      // 3. Role & KYC verification gating
      const allowedRoles = ['aspirant', 'politician', 'party', 'journalist', 'admin'];
      if (!profile.role || !allowedRoles.includes(profile.role)) {
        return sendApiError(
          reply,
          request,
          403,
          'Forbidden',
          'Forbidden: Live broadcasting is restricted to candidates, parties, and accredited journalists.',
          {
            code: 'INELIGIBLE_ROLE',
          },
        );
      }

      if (!hosted && profile.verification_status !== 'verified') {
        return sendApiError(
          reply,
          request,
          403,
          'Forbidden',
          'Forbidden: Live broadcasting requires a verified contributor profile (KYC verification).',
          {
            code: 'UNVERIFIED',
          },
        );
      }

      const hosts = getMediaHosts();
      if (hosted) {
        const { data: verification, error } = await supabase
          .from('creator_kyc_records')
          .select('status')
          .eq('user_id', userId)
          .maybeSingle();
        if (error) {
          return sendApiError(
            reply,
            request,
            503,
            'Service Unavailable',
            'Could not check contributor verification.',
            {
              code: 'VERIFICATION_UNAVAILABLE',
            },
          );
        }
        if (verification?.status !== 'verified') {
          return sendApiError(
            reply,
            request,
            403,
            'Forbidden',
            'Verify your contributor profile to broadcast.',
            {
              code: 'UNVERIFIED',
            },
          );
        }
      }
      if (
        (hosted && !(await isHostedLiveReady(hosted))) ||
        (!hosted && isProductionRuntime() && !isMediaPipelineConfigured(hosts))
      ) {
        return sendApiError(
          reply,
          request,
          503,
          'Service Unavailable',
          'Live broadcasting is unavailable because the media pipeline is not configured.',
          { code: 'MEDIA_PIPELINE_UNAVAILABLE' },
        );
      }

      const pipeline = selectPipeline(
        {
          streamId: body.stream_id,
          issueCategory: body.issue_category || 'general',
          alertDepartments: body.alert_departments || [],
          visibilityMode: body.visibility_mode || 'public',
        },
        hosts,
      );
      const safeBody = { ...body };
      for (const field of [
        'media_ingest_url',
        'media_playback_hls',
        'media_playback_webrtc',
        'credibility_score',
        'buffer_state',
        'buffer_seconds',
        'human_decision',
        'status',
        'priority_score',
        'viewer_count',
        'peak_viewers',
      ]) {
        delete safeBody[field];
      }

      try {
        const id = hosted ? randomUUID() : undefined;
        const playback =
          hosted && id
            ? `${hosted.studioOrigin}${liveWatchPath}/${id}/index.m3u8`
            : pipeline.playbackHls;
        const { data, error } = await supabase
          .from('live_events')
          .insert({
            ...safeBody,
            ...(id
              ? {
                  id,
                  stream_id: `KX-${id}`,
                  gps_lat: null,
                  gps_lng: null,
                  visibility_mode: 'public',
                  alert_departments: [],
                  affiliation_id: null,
                  active_brand_kit_id: null,
                  accreditation_tier: profile.role === 'journalist' ? 'accredited' : 'citizen',
                }
              : {}),
            reporter_id: userId,
            reporter_name: profile.display_name || body.reporter_name,
            credibility_score: hosted ? null : 50,
            media_ingest_url: hosted ? null : pipeline.ingestUrl,
            media_playback_hls: playback,
            media_playback_webrtc: hosted ? null : pipeline.playbackWebrtc,
            buffer_state: 'buffering',
            buffer_seconds: hosted ? null : 20,
            human_decision: null,
            status: hosted ? 'preparing' : 'live',
            priority_score: 0,
            viewer_count: hosted ? null : 0,
            peak_viewers: hosted ? null : 0,
          })
          .select()
          .single();

        if (error) {
          return sendApiError(reply, request, 500, 'Internal Server Error', error.message, {
            code: 'DATABASE_ERROR',
          });
        }
        const studioUrl =
          hosted && id
            ? `${hosted.studioOrigin}${liveStudioPath}/${id}#${studioTicket(hosted, id)}`
            : undefined;
        return reply
          .status(201)
          .header('Cache-Control', 'no-store')
          .send({ ...data, studio_url: studioUrl });
      } catch (err: any) {
        return sendApiError(
          reply,
          request,
          500,
          'Internal Server Error',
          err?.message || 'Failed to create live event',
          {
            code: 'DATABASE_ERROR',
          },
        );
      }
    },
  );

  /** 5. POST /api/v1/lmx/live/:streamId/moderate — moderator action (allow/mute/cut/escalate) */
  app.post<{
    Params: { streamId: string };
    Body: {
      decision: 'allow' | 'mute' | 'cut' | 'escalate';
      reason?: string;
      moderatorId?: string;
    };
  }>(
    '/api/v1/lmx/live/:streamId/moderate',
    { schema: moderateStreamSchema },
    async (request, reply) => {
      if (!(await resolveAdminActor(request, reply))) return;
      const { streamId } = request.params;
      const { decision } = request.body;
      const hosted = getHostedLiveConfig();
      if (
        hosted &&
        (!liveEventIdPattern.test(streamId) ||
          (decision === 'allow' && !(await isHostedStreamReady(hosted, streamId))))
      ) {
        return reply.code(409).send();
      }

      const updates: Record<string, any> = {
        buffer_state: decision === 'cut' ? 'cut' : decision === 'allow' ? 'cleared' : 'held',
        human_decision: decision,
        human_decision_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (decision === 'cut') {
        updates.status = 'ended';
        updates.ended_at = new Date().toISOString();
      }

      try {
        const change = supabase.from('live_events').update(updates).eq('id', streamId);
        const result = hosted
          ? await change.eq('status', 'live').select('id').maybeSingle()
          : await change;
        const { error } = result;
        if (hosted && !error && !result.data) return reply.code(409).send();

        if (error) {
          return sendApiError(reply, request, 500, 'Internal Server Error', error.message, {
            code: 'DATABASE_ERROR',
          });
        }

        if (hosted && decision === 'cut') {
          try {
            await stopHostedStream(hosted, streamId);
          } catch {
            request.log.warn(
              'Public playback was cut; the publisher connection could not be closed immediately',
            );
          }
        }
        return reply.send({
          success: true,
          streamId,
          decision,
          message: `Stream buffer decision applied: ${decision}`,
        });
      } catch (err: any) {
        return sendApiError(
          reply,
          request,
          500,
          'Internal Server Error',
          err?.message || 'Failed to apply moderation decision',
          {
            code: 'DATABASE_ERROR',
          },
        );
      }
    },
  );

  /** 6. POST /api/v1/lmx/live/:streamId/end — close out live event */
  app.post<{
    Params: { streamId: string };
    Body: { content_hash?: string };
  }>('/api/v1/lmx/live/:streamId/end', { schema: endStreamSchema }, async (request, reply) => {
    const actor = await resolveAuthenticatedUser(request, reply);
    if (!actor) return;
    const { streamId } = request.params;
    const { content_hash } = request.body || {};

    try {
      const { data, error } = await supabase
        .from('live_events')
        .update({
          status: 'ended',
          ended_at: new Date().toISOString(),
          content_hash: content_hash ?? null,
          retention_expiry: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq('id', streamId)
        .eq('reporter_id', actor.userId)
        .select('id')
        .maybeSingle();

      if (error) {
        return sendApiError(reply, request, 500, 'Internal Server Error', error.message, {
          code: 'DATABASE_ERROR',
        });
      }

      if (!data) return reply.code(404).send();
      return reply.send({ success: true });
    } catch (err: any) {
      return sendApiError(
        reply,
        request,
        500,
        'Internal Server Error',
        err?.message || 'Failed to end stream',
        {
          code: 'DATABASE_ERROR',
        },
      );
    }
  });

  /** 7. GET /api/v1/lmx/departments — subscribed department registry */
  app.get<{
    Querystring: { type?: string; state?: string };
  }>('/api/v1/lmx/departments', { schema: lmxDepartmentsQuerySchema }, async (request) => {
    const { type, state } = request.query;
    return { departments: [], total: 0, filters: { type, state } };
  });

  /** 8. POST /api/v1/lmx/departments — department subscribes (onboarding) */
  app.post<{
    Body: { departmentType: string; officeName: string; stateCode?: string };
  }>('/api/v1/lmx/departments', { schema: createDepartmentBodySchema }, async (_request, reply) => {
    return reply.status(201).send({
      success: true,
      subscriptionStatus: 'pending',
      message: 'Department subscription received — pending verification.',
    });
  });

  /** 9. POST /api/v1/lmx/alerts — dispatch reporter-initiated department alert(s) */
  app.post<{ Body: Record<string, any> }>(
    '/api/v1/lmx/alerts',
    { schema: createAlertBodySchema },
    async (request, reply) => {
      const body = request.body;
      try {
        const { data, error } = await supabase
          .from('lmx_department_alerts')
          .insert(body)
          .select()
          .single();

        if (error) {
          return sendApiError(reply, request, 500, 'Internal Server Error', error.message, {
            code: 'DATABASE_ERROR',
          });
        }
        return reply.status(201).send(data);
      } catch (err: any) {
        return sendApiError(
          reply,
          request,
          500,
          'Internal Server Error',
          err?.message || 'Failed to create department alert',
          {
            code: 'DATABASE_ERROR',
          },
        );
      }
    },
  );

  /** 10. POST /api/v1/lmx/alerts/:id/acknowledge — dept acknowledges alert */
  app.post<{
    Params: { id: string };
    Body: { acknowledgment: string; acknowledged_by: string };
  }>(
    '/api/v1/lmx/alerts/:id/acknowledge',
    { schema: acknowledgeAlertSchema },
    async (request, reply) => {
      const { id } = request.params;
      const { acknowledgment, acknowledged_by } = request.body;

      try {
        const { error } = await supabase
          .from('lmx_department_alerts')
          .update({
            acknowledgment,
            acknowledged_at: new Date().toISOString(),
            acknowledged_by,
            delivery_status: 'delivered',
          })
          .eq('id', id);

        if (error) {
          return sendApiError(reply, request, 500, 'Internal Server Error', error.message, {
            code: 'DATABASE_ERROR',
          });
        }

        return reply.send({ success: true });
      } catch (err: any) {
        return sendApiError(
          reply,
          request,
          500,
          'Internal Server Error',
          err?.message || 'Failed to acknowledge alert',
          {
            code: 'DATABASE_ERROR',
          },
        );
      }
    },
  );

  /** 11. POST /api/v1/lmx/distribution — add output branch */
  app.post<{ Body: Record<string, any> }>(
    '/api/v1/lmx/distribution',
    { schema: createDistributionSchema },
    async (request, reply) => {
      const body = request.body;
      try {
        const { data, error } = await supabase
          .from('lmx_distribution_destinations')
          .insert(body)
          .select()
          .single();

        if (error) {
          return sendApiError(reply, request, 500, 'Internal Server Error', error.message, {
            code: 'DATABASE_ERROR',
          });
        }
        return reply.status(201).send(data);
      } catch (err: any) {
        return sendApiError(
          reply,
          request,
          500,
          'Internal Server Error',
          err?.message || 'Failed to add distribution destination',
          {
            code: 'DATABASE_ERROR',
          },
        );
      }
    },
  );

  /** 12. POST /api/v1/lmx/credibility — update reporter credibility (Class B Method 52) */
  app.post<{ Body: Record<string, any> }>(
    '/api/v1/lmx/credibility',
    {
      schema: {
        body: {
          type: 'object',
          required: ['reporter_id'],
          properties: {
            reporter_id: { type: 'string' },
            score: { type: 'number' },
            tier: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const body = request.body;
      if (!isSupabaseConfigured) {
        return sendApiError(
          reply,
          request,
          503,
          'Service Unavailable',
          'Database service is currently unconfigured or unavailable',
          {
            code: 'SERVICE_UNAVAILABLE',
          },
        );
      }
      try {
        const { error } = await supabase.from('lmx_credibility').upsert(body);
        if (error) {
          app.log.error({ err: error.message }, 'Failed to persist credibility update');
          return sendApiError(
            reply,
            request,
            500,
            'Internal Server Error',
            'Database error updating credibility',
            {
              code: 'DATABASE_ERROR',
            },
          );
        }
      } catch (err: any) {
        app.log.error({ err: err?.message }, 'Exception persisting credibility update');
        return sendApiError(
          reply,
          request,
          500,
          'Internal Server Error',
          'Database error updating credibility',
          {
            code: 'DATABASE_ERROR',
          },
        );
      }
      return reply.send({ success: true, reporterId: body.reporter_id, updated: true });
    },
  );

  /** 13. POST /api/v1/lmx/live/:id/viewers — increment viewer count (Class B Method 55) */
  app.post<{ Params: { id: string }; Body: { delta: number } }>(
    '/api/v1/lmx/live/:id/viewers',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        body: {
          type: 'object',
          required: ['delta'],
          properties: { delta: { type: 'integer' } },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const { delta } = request.body;
      let viewerCount = Math.max(0, delta);

      if (!isSupabaseConfigured) {
        return sendApiError(
          reply,
          request,
          503,
          'Service Unavailable',
          'Database service is currently unconfigured or unavailable',
          {
            code: 'SERVICE_UNAVAILABLE',
          },
        );
      }

      try {
        const { data: current, error: fetchErr } = await supabase
          .from('live_events')
          .select('viewer_count, peak_viewers')
          .eq('id', id)
          .single();

        if (fetchErr) {
          app.log.error(
            { err: fetchErr.message, id },
            'Failed to fetch live event for viewers update',
          );
          return sendApiError(
            reply,
            request,
            500,
            'Internal Server Error',
            'Database error updating viewer count',
            {
              code: 'DATABASE_ERROR',
            },
          );
        }

        if (current) {
          viewerCount = Math.max(0, (current.viewer_count ?? 0) + delta);
          const newPeak = Math.max(current.peak_viewers ?? 0, viewerCount);
          const { error: updateErr } = await supabase
            .from('live_events')
            .update({ viewer_count: viewerCount, peak_viewers: newPeak })
            .eq('id', id);

          if (updateErr) {
            app.log.error({ err: updateErr.message, id }, 'Failed to update viewer count in DB');
            return sendApiError(
              reply,
              request,
              500,
              'Internal Server Error',
              'Database error updating viewer count',
              {
                code: 'DATABASE_ERROR',
              },
            );
          }
        }
      } catch (err: any) {
        app.log.error({ err: err?.message, id }, 'Exception updating viewer count in DB');
        return sendApiError(
          reply,
          request,
          500,
          'Internal Server Error',
          'Database error updating viewer count',
          {
            code: 'DATABASE_ERROR',
          },
        );
      }

      return reply.send({ success: true, eventId: id, viewerCount });
    },
  );

  /** 14. POST /api/v1/lmx/moderation-events — log moderation event (Class B Method 54) */
  app.post<{ Body: Record<string, any> }>(
    '/api/v1/lmx/moderation-events',
    async (request, reply) => {
      const event = request.body || {};
      if (!isSupabaseConfigured) {
        return sendApiError(
          reply,
          request,
          503,
          'Service Unavailable',
          'Database service is currently unconfigured or unavailable',
          {
            code: 'SERVICE_UNAVAILABLE',
          },
        );
      }
      try {
        const { error } = await supabase.from('lmx_moderation_events').insert(event);
        if (error) {
          app.log.error({ err: error.message }, 'Failed to log moderation event in DB');
          return sendApiError(
            reply,
            request,
            500,
            'Internal Server Error',
            'Database error recording moderation event',
            {
              code: 'DATABASE_ERROR',
            },
          );
        }
      } catch (err: any) {
        app.log.error({ err: err?.message }, 'Exception logging moderation event in DB');
        return sendApiError(
          reply,
          request,
          500,
          'Internal Server Error',
          'Database error recording moderation event',
          {
            code: 'DATABASE_ERROR',
          },
        );
      }
      return reply.status(201).send({ success: true, loggedAt: new Date().toISOString() });
    },
  );

  /** 15. POST /api/v1/lmx/alerts/content — create content alert (Class B Method 50) */
  app.post<{ Body: Record<string, any> }>('/api/v1/lmx/alerts/content', async (request, reply) => {
    const alert = request.body || {};
    let id = `alert_${Date.now()}`;
    if (!isSupabaseConfigured) {
      return sendApiError(
        reply,
        request,
        503,
        'Service Unavailable',
        'Database service is currently unconfigured or unavailable',
        {
          code: 'SERVICE_UNAVAILABLE',
        },
      );
    }
    try {
      const { data, error } = await supabase
        .from('content_alerts')
        .insert(alert)
        .select('id')
        .single();

      if (error) {
        app.log.error({ err: error.message }, 'Failed to insert content alert in DB');
        return sendApiError(
          reply,
          request,
          500,
          'Internal Server Error',
          'Database error creating content alert',
          {
            code: 'DATABASE_ERROR',
          },
        );
      }

      if (data?.id) id = data.id;
    } catch (err: any) {
      app.log.error({ err: err?.message }, 'Exception inserting content alert in DB');
      return sendApiError(
        reply,
        request,
        500,
        'Internal Server Error',
        'Database error creating content alert',
        {
          code: 'DATABASE_ERROR',
        },
      );
    }
    return reply.status(201).send({ id, success: true });
  });

  /** 16. POST /api/v1/lmx/alerts/content/:id/acknowledge — acknowledge content alert (Class B Method 51) */
  app.post<{ Params: { id: string }; Body: { acknowledgedBy: string; actionTaken: string } }>(
    '/api/v1/lmx/alerts/content/:id/acknowledge',
    async (request, reply) => {
      const { id } = request.params;
      const { acknowledgedBy, actionTaken } = request.body || {};
      const now = new Date().toISOString();

      if (!isSupabaseConfigured) {
        return sendApiError(
          reply,
          request,
          503,
          'Service Unavailable',
          'Database service is currently unconfigured or unavailable',
          {
            code: 'SERVICE_UNAVAILABLE',
          },
        );
      }

      try {
        const { error } = await supabase
          .from('content_alerts')
          .update({
            acknowledged: true,
            acknowledged_by: acknowledgedBy || null,
            acknowledged_at: now,
            action_taken: actionTaken || 'resolved',
          })
          .eq('id', id);

        if (error) {
          app.log.error({ err: error.message, id }, 'Failed to acknowledge content alert in DB');
          return sendApiError(
            reply,
            request,
            500,
            'Internal Server Error',
            'Database error acknowledging content alert',
            {
              code: 'DATABASE_ERROR',
            },
          );
        }
      } catch (err: any) {
        app.log.error({ err: err?.message, id }, 'Exception acknowledging content alert in DB');
        return sendApiError(
          reply,
          request,
          500,
          'Internal Server Error',
          'Database error acknowledging content alert',
          {
            code: 'DATABASE_ERROR',
          },
        );
      }

      return reply.send({ success: true, alertId: id, acknowledgedAt: now });
    },
  );
}
