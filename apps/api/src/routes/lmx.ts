import type { FastifyInstance } from 'fastify';
import { selectPipeline, getMediaHosts } from '../lib/mediaPipeline';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

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
  const aiEnabled = !!process.env.GEMINI_API_KEY || !!process.env.OPENAI_API_KEY;

  /** GET /api/v1/lmx/status — exchange + AI availability */
  app.get('/api/v1/lmx/status', async (request, reply) => {
    const aiServiceEnabled = false; // AI is parked
    reply.send({
      status: 'operational',
      mediaPlane: 'self_hosted',
      aiService: aiServiceEnabled ? 'active' : 'inactive',
      supabase: isSupabaseConfigured ? 'connected' : 'offline',
    });
  });

  /** GET /api/v1/lmx/live — public Live tab feed (cleared, public streams) */
  app.get('/api/v1/lmx/live', async (request, reply) => {
    const { category, state, status } = request.query as any;
    let query = supabase
      .from('live_events')
      .select('*, live_event_ai(*)')
      .in('buffer_state', ['cleared', 'bypassed'])
      .eq('visibility_mode', 'public')
      .order('status', { ascending: true })
      .order('priority_score', { ascending: false })
      .limit(50);
    if (category && category !== 'all') query = query.eq('issue_category', category);
    if (state) query = query.eq('state_code', state);
    if (status && status !== 'all') query = query.eq('status', status === 'live' ? 'live' : 'ended');
    const { data, error } = await query;
    if (error) return reply.status(500).send({ error: error.message });
    reply.send(data ?? []);
  });

  /** GET /api/v1/lmx/live/:streamId — a single Live Event Object */
  app.get('/api/v1/lmx/live/:streamId', async (request, reply) => {
    const { streamId } = request.params as any;
    const { data, error } = await supabase
      .from('live_events')
      .select('*, live_event_ai(*), lmx_department_alerts(*)')
      .eq('id', streamId)
      .single();
    if (error || !data) return reply.status(404).send({ error: 'Stream not found' });
    reply.send(data);
  });

  /** POST /api/v1/lmx/live — create (go-live) a Live Event Object with server-side gating */
  app.post('/api/v1/lmx/live', async (request, reply) => {
    const body = request.body as any;

    // 1. Authenticate user from session token or authorization header
    const authHeader = request.headers.authorization;
    let userId: string | null = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '').trim();
      const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
      if (!authErr && user) {
        userId = user.id;
      }
    }
    // Also accept explicit x-user-id header only in non-production environments (dev/test/staging)
    if (!userId && process.env.NODE_ENV !== 'production' && (request.headers['x-user-id'] as string)) {
      userId = request.headers['x-user-id'] as string;
    }

    if (!userId) {
      return reply.status(401).send({
        error: 'Unauthorized: Authentication required to create a live broadcast.',
        code: 'UNAUTHORIZED',
      });
    }

    // 2. Query user's real profile from Supabase user_profiles table (never trust client request body)
    const { data: profile, error: profileErr } = await supabase
      .from('user_profiles')
      .select('role, verification_status')
      .eq('user_id', userId)
      .maybeSingle();

    if (profileErr || !profile) {
      return reply.status(403).send({
        error: 'Forbidden: User profile not found.',
        code: 'PROFILE_NOT_FOUND',
      });
    }

    // 3. Server-side role & verification gating against real database record
    const allowedRoles = ['aspirant', 'politician', 'party', 'journalist', 'admin'];
    if (!profile.role || !allowedRoles.includes(profile.role)) {
      return reply.status(403).send({
        error: 'Forbidden: Live broadcasting is restricted to candidates, parties, and accredited journalists.',
        code: 'INELIGIBLE_ROLE',
      });
    }

    if (profile.verification_status !== 'verified') {
      return reply.status(403).send({
        error: 'Forbidden: Live broadcasting requires a verified contributor profile (KYC verification).',
        code: 'UNVERIFIED',
      });
    }

    const { creator_role: _cr, role: _r, verification_status: _vs, ...safeBody } = body || {};

    const { data, error } = await supabase
      .from('live_events')
      .insert({
        ...safeBody,
        creator_id: userId,
        creator_role: profile.role,
        buffer_state: body?.buffer_state || 'buffered',
        priority_score: body?.priority_score || 50,
      })
      .select()
      .single();
    if (error) return reply.status(500).send({ error: error.message });
    reply.status(201).send(data);
  });

  /** POST /api/v1/lmx/live/:streamId/moderate — moderator action (allow/mute/cut/escalate) */
  app.post('/api/v1/lmx/live/:streamId/moderate', async (request, reply) => {
    const { streamId } = request.params as any;
    const { decision, reason, moderatorId } = request.body as any;

    if (!['allow', 'mute', 'cut', 'escalate'].includes(decision)) {
      return reply.status(400).send({ error: 'Invalid moderation decision' });
    }

    const updates: Record<string, any> = {
      buffer_state: decision === 'cut' ? 'rejected' : decision === 'allow' ? 'cleared' : 'buffered',
      updated_at: new Date().toISOString(),
    };

    if (decision === 'cut') {
      updates.status = 'ended';
      updates.ended_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('live_events')
      .update(updates)
      .eq('id', streamId);

    if (error) return reply.status(500).send({ error: error.message });

    return reply.send({
      success: true,
      streamId,
      decision,
      message: `Stream buffer decision applied: ${decision}`,
    });
  });

  /** POST /api/v1/lmx/live/:streamId/end — close out + finalize audit */
  app.post('/api/v1/lmx/live/:streamId/end', async (request, reply) => {
    const { streamId } = request.params as any;
    const { content_hash } = request.body as any;
    const { error } = await supabase
      .from('live_events')
      .update({
        status: 'ended',
        ended_at: new Date().toISOString(),
        content_hash: content_hash ?? null,
        retention_expiry: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .eq('id', streamId);
    if (error) return reply.status(500).send({ error: error.message });
    reply.send({ success: true });
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
    const body = request.body as any;
    const { data, error } = await supabase
      .from('lmx_department_alerts')
      .insert(body)
      .select()
      .single();
    if (error) return reply.status(500).send({ error: error.message });
    reply.status(201).send(data);
  });

  /** POST /api/v1/lmx/alerts/:id/acknowledge — dept acknowledges (feeds credibility) */
  app.post('/api/v1/lmx/alerts/:id/acknowledge', async (request, reply) => {
    const { id } = request.params as any;
    const { acknowledgment, acknowledged_by } = request.body as any;
    const { error } = await supabase
      .from('lmx_department_alerts')
      .update({
        acknowledgment,
        acknowledged_at: new Date().toISOString(),
        acknowledged_by,
        delivery_status: 'delivered',
      })
      .eq('id', id);
    if (error) return reply.status(500).send({ error: error.message });
    reply.send({ success: true });
  });

  /** POST /api/v1/lmx/distribution — add an output branch (relay/embed/srt) */
  app.post('/api/v1/lmx/distribution', async (request, reply) => {
    const body = request.body as any;
    const { data, error } = await supabase
      .from('lmx_distribution_destinations')
      .insert(body)
      .select()
      .single();
    if (error) return reply.status(500).send({ error: error.message });
    reply.status(201).send(data);
  });
}
