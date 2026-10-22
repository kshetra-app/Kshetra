/**
 * Mobile Client Analytics & Session Routes
 * Fastify route handler for client sessions and analytics
 * Master Execution Framework — W021.5-H-04 (Class B Strangler Migration)
 */

import type { FastifyInstance } from 'fastify';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { sendApiError } from '../lib/replyHelper';

export async function analyticsRoutes(app: FastifyInstance) {
  /**
   * 1. POST /api/v1/analytics/sessions
   * Start, record, or end a client session (Class B Methods 41 & 42: recordSession, endSession)
   */
  app.post<{
    Body: {
      userId?: string;
      sessionId?: string;
      action?: 'start' | 'end' | 'heartbeat';
      deviceBrand?: string | null;
      deviceModel?: string | null;
      deviceOs?: string | null;
      deviceOsVersion?: string | null;
      networkType?: string | null;
      durationSeconds?: number;
      [key: string]: any;
    };
  }>('/api/v1/analytics/sessions', {
    schema: {
      body: {
        type: 'object',
        properties: {
          userId: { type: 'string' },
          sessionId: { type: 'string' },
          action: { type: 'string', enum: ['start', 'end', 'heartbeat'] },
          durationSeconds: { type: 'number' },
        },
      },
    },
  }, async (request, reply) => {
    const userId = (request.headers['x-user-id'] as string) || request.body?.userId || 'anonymous';
    const body = request.body || {};
    const sessionId = body.sessionId || `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const action = body.action || 'start';
    const now = new Date().toISOString();

    if (isSupabaseConfigured) {
      try {
        if (action === 'start') {
          await supabase.from('client_sessions').insert({
            session_id: sessionId,
            user_id: userId,
            device_brand: body.deviceBrand ?? null,
            device_model: body.deviceModel ?? null,
            device_os: body.deviceOs ?? null,
            device_os_version: body.deviceOsVersion ?? null,
            network_type: body.networkType ?? null,
            started_at: now,
          });
        } else if (action === 'end') {
          await supabase.from('client_sessions').update({
            ended_at: now,
            duration_seconds: body.durationSeconds ?? null,
          }).eq('session_id', sessionId);
        }
      } catch (err: any) {
        app.log.warn({ err: err?.message, sessionId, action }, 'Failed to record session in DB');
      }
    }

    return reply.status(action === 'start' ? 201 : 200).send({
      success: true,
      sessionId,
      userId,
      action,
      timestamp: now,
    });
  });
}
