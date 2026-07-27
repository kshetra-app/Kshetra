import type { FastifyInstance } from 'fastify';
import { selectPipeline, getMediaHosts } from '../lib/mediaPipeline';

/**
 * Kshetra Live Media Exchange (LMX) API — doc Sections 3, 7, 12.
 *
 * The session-orchestrator boundary: this owned-code layer talks to the managed
 * media stack (AWS MediaLive/MediaConnect etc.) and the Supabase Live Event
 * Object. Media-plane provisioning (ingest/transcode/CDN/SRT nodes) is external
 * infrastructure — these routes expose the control plane and are protocol
 * agnostic so a new protocol is a new adapter, not a redesign.
 *
 * AI enrichment is OPTIONAL: `aiEnabled` reflects whether a model is configured.
 * Every endpoint works whether or not AI is present (doc Section 3, 14).
 */
export async function lmxRoutes(app: FastifyInstance) {
  const aiEnabled = !!process.env.OPENAI_API_KEY;

  /** GET /api/v1/lmx/status — exchange + AI availability */
  app.get('/api/v1/lmx/status', async () => {
    return {
      exchange: 'online',
      aiEnrichment: aiEnabled ? 'enabled' : 'disabled',
      aiModelProvider: aiEnabled ? 'openai' : null,
      protocols: ['hls', 'dash', 'webrtc', 'srt', 'rtmp', 'mpegts', 'ndi', 'embed'],
      ingestRegion: process.env.LMX_INGEST_REGION ?? 'ap-south-1',
      mediaPlane: {
        mode: getMediaHosts().mode,
        tiers: ['mediamtx', 'ovenmediaengine', 'srs', 'livekit'],
        note: 'Self-hosted stack in infra/media/; selectPipeline() auto-routes per event.',
      },
      note: 'Media-plane (ingest/transcode/CDN) is self-hostable (infra/media/) or managed; connect Supabase for live data.',
    };
  });

  /** GET /api/v1/lmx/live — public Live tab feed (cleared, public streams) */
  app.get('/api/v1/lmx/live', async (request) => {
    const { state, category, verified } = request.query as {
      state?: string;
      category?: string;
      verified?: string;
    };
    return {
      events: [],
      total: 0,
      filters: { state, category, verifiedOnly: verified === 'true' },
      message: 'Live feed endpoint — connect to Supabase (lmx_live_tab_feed view) for live data.',
    };
  });

  /** GET /api/v1/lmx/live/:streamId — a single Live Event Object */
  app.get('/api/v1/lmx/live/:streamId', async (request, reply) => {
    const { streamId } = request.params as { streamId: string };
    return reply.code(404).send({
      error: `Stream ${streamId} not found — connect to Supabase live_events table.`,
    });
  });

  /** POST /api/v1/lmx/live — create (go-live) a Live Event Object */
  app.post('/api/v1/lmx/live', async (request, reply) => {
    const body = request.body as {
      reporterId?: string;
      visibilityMode?: string;
      alertDepartments?: string[];
      issueCategory?: string;
      gps?: { lat: number; lng: number };
    };
    if (!body?.reporterId) {
      return reply.code(400).send({ error: 'reporterId is required' });
    }
    const visibilityMode = body.visibilityMode ?? 'public';
    const alertDepartments = body.alertDepartments ?? [];
    const streamId = `KX-${Date.now().toString(36)}`;
    // Auto-route to the right self-hosted media tier (mirrors the mobile store).
    const pipeline = selectPipeline({
      streamId,
      issueCategory: body.issueCategory ?? 'general',
      alertDepartments,
      visibilityMode,
    });
    return reply.code(201).send({
      streamId,
      mediaTier: pipeline.tier,
      routingReason: pipeline.reason,
      ingestUrl: pipeline.ingestUrl,
      playbackHls: pipeline.playbackHls,
      playbackWebrtc: pipeline.playbackWebrtc,
      visibilityMode,
      alertDepartments,
      aiEnrichment: aiEnabled ? 'enabled' : 'disabled',
      message: 'Live Event Object created (stub). Persist to Supabase + provision media plane.',
    });
  });

  /** POST /api/v1/lmx/live/:streamId/end — close out + finalize audit */
  app.post('/api/v1/lmx/live/:streamId/end', async (request) => {
    const { streamId } = request.params as { streamId: string };
    return {
      success: true,
      streamId,
      contentHash: `sha-stub-${streamId}`,
      retentionExpiryDays: 90,
      message: 'Stream ended (stub) — archive + content hash finalized on persistence.',
    };
  });

  /** GET /api/v1/lmx/departments — subscribed department registry */
  app.get('/api/v1/lmx/departments', async (request) => {
    const { type, state } = request.query as { type?: string; state?: string };
    return { departments: [], total: 0, filters: { type, state } };
  });

  /** POST /api/v1/lmx/departments — department subscribes (onboarding) */
  app.post('/api/v1/lmx/departments', async (request, reply) => {
    const body = request.body as { departmentType?: string; officeName?: string; stateCode?: string };
    if (!body?.departmentType || !body?.officeName) {
      return reply.code(400).send({ error: 'departmentType and officeName are required' });
    }
    return reply.code(201).send({
      success: true,
      subscriptionStatus: 'pending',
      message: 'Department subscription received — pending verification.',
    });
  });

  /** POST /api/v1/lmx/alerts — dispatch reporter-initiated department alert(s) */
  app.post('/api/v1/lmx/alerts', async (request, reply) => {
    const body = request.body as {
      streamId?: string;
      reporterId?: string;
      departmentTypes?: string[];
      gps?: { lat: number; lng: number };
    };
    if (!body?.streamId || !body?.reporterId || !body?.departmentTypes?.length) {
      return reply.code(400).send({
        error: 'streamId, reporterId and at least one departmentType are required',
      });
    }
    if (!body.gps) {
      return reply.code(400).send({ error: 'gps is required to resolve jurisdiction' });
    }
    // Jurisdiction resolution + registry lookup happens against Supabase.
    return reply.code(202).send({
      success: true,
      dispatched: body.departmentTypes.map((t) => ({ departmentType: t, deliveryStatus: 'dispatched' })),
      aiContextAttached: aiEnabled,
      message: 'Alerts dispatched (stub) — resolve jurisdiction + registry on persistence.',
    });
  });

  /** POST /api/v1/lmx/alerts/:id/acknowledge — dept acknowledges (feeds credibility) */
  app.post('/api/v1/lmx/alerts/:id/acknowledge', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { acknowledgment } = request.body as { acknowledgment?: string };
    const valid = ['genuine', 'false', 'unable_to_verify'];
    if (!acknowledgment || !valid.includes(acknowledgment)) {
      return reply.code(400).send({ error: `acknowledgment must be one of ${valid.join(', ')}` });
    }
    return { success: true, alertId: id, acknowledgment, message: 'Acknowledgment recorded — feeds reporter credibility.' };
  });

  /** POST /api/v1/lmx/distribution — add an output branch (relay/embed/srt) */
  app.post('/api/v1/lmx/distribution', async (request, reply) => {
    const body = request.body as { streamId?: string; protocol?: string; streamKey?: string };
    if (!body?.streamId || !body?.protocol) {
      return reply.code(400).send({ error: 'streamId and protocol are required' });
    }
    return reply.code(201).send({
      success: true,
      protocol: body.protocol,
      message: `Distribution branch (${body.protocol}) added on the protocol-agnostic hub.`,
    });
  });
}
