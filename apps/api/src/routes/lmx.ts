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
  const aiEnabled = !!process.env.OPENAI_API_KEY;

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

  /** POST /api/v1/lmx/live — create (go-live) a Live Event Object */
  app.post('/api/v1/lmx/live', async (request, reply) => {
    const body = request.body as any;
    const { data, error } = await supabase
      .from('live_events')
      .insert(body)
      .select()
      .single();
    if (error) return reply.status(500).send({ error: error.message });
    reply.status(201).send(data);
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
