/**
 * Political Advertising & Statutory Transparency Ledger Routes
 * Master Product Blueprint — Domain 6 (JOB 057)
 * Representation of the People Act 1951 (Section 127A) & ECI MCMC Guidelines
 * Ratified under DEC-186
 */

import type { FastifyPluginAsync } from 'fastify';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { sendApiError } from '../lib/replyHelper';
import { adService } from '../services/adService';
import type {
  CreatePoliticalAdInput,
  PoliticalAdCategory,
  ElectoralWindowState,
} from '@kshetra/shared';

interface PoliticalAdRow {
  id: string;
  page_id: string;
  post_id: string;
  mcmc_certificate_id: string;
  status: 'pending_certification' | 'certified' | 'rejected' | 'active' | 'ended';
  amount_paid: number;
  target_scope: 'state' | 'constituency';
  target_value?: string;
  impressions: number;
  created_at: string;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
}

// In-memory cache/fallback for legacy non-database test environments
const MEMORY_ADS: PoliticalAdRow[] = [
  {
    id: 'pad-demo-1',
    page_id: 'demo-page',
    post_id: 'post-101',
    mcmc_certificate_id: 'ECI/MCMC/2026/TS/0891',
    status: 'active',
    amount_paid: 250000, // ₹2,500
    target_scope: 'constituency',
    target_value: 'TS-AC-67',
    impressions: 1420,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    reviewed_by: 'admin-1',
    reviewed_at: new Date(Date.now() - 82800000).toISOString(),
  },
  {
    id: 'pad-demo-2',
    page_id: 'demo-page',
    post_id: 'post-102',
    mcmc_certificate_id: 'ECI/MCMC/2026/TS/0892',
    status: 'pending_certification',
    amount_paid: 500000, // ₹5,000
    target_scope: 'state',
    target_value: 'TS',
    impressions: 0,
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
];

const submitPoliticalAdSchema = {
  params: {
    type: 'object',
    required: ['pageId'],
    properties: {
      pageId: { type: 'string', minLength: 1, maxLength: 64 },
    },
  },
  body: {
    type: 'object',
    required: ['postId', 'mcmcCertificateId', 'amountPaid', 'targetScope'],
    additionalProperties: false,
    properties: {
      postId: { type: 'string', minLength: 1, maxLength: 64 },
      mcmcCertificateId: { type: 'string', minLength: 1, maxLength: 100 },
      amountPaid: { type: 'number', minimum: 1, maximum: 10000000 },
      targetScope: { type: 'string', enum: ['state', 'constituency'] },
      targetValue: { type: 'string', maxLength: 64 },
    },
  },
};

const certifyPoliticalAdSchema = {
  params: {
    type: 'object',
    required: ['adId'],
    properties: {
      adId: { type: 'string', minLength: 1, maxLength: 64 },
    },
  },
  body: {
    type: 'object',
    required: ['action'],
    additionalProperties: false,
    properties: {
      action: { type: 'string', enum: ['certify', 'reject'] },
      reason: { type: 'string', maxLength: 500 },
    },
  },
};

const activeAdsQuerySchema = {
  querystring: {
    type: 'object',
    additionalProperties: false,
    properties: {
      state: { type: 'string', pattern: '^[A-Z]{2}$' },
      constituency: { type: 'string', maxLength: 64 },
      limit: { type: 'integer', minimum: 1, maximum: 100 },
    },
  },
};

const libraryAdsQuerySchema = {
  querystring: {
    type: 'object',
    additionalProperties: false,
    properties: {
      search: { type: 'string', maxLength: 100 },
      state: { type: 'string', pattern: '^[A-Z]{2}$' },
      page: { type: 'integer', minimum: 1 },
      limit: { type: 'integer', minimum: 1, maximum: 100 },
    },
  },
};

export const politicalAdsRoutes: FastifyPluginAsync = async (app) => {
  // Helper: Resolve authenticated user
  async function resolveAuthUser(request: any): Promise<{ userId: string; role: string } | null> {
    let userId: string | null = null;
    const authHeader = request.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '').trim();
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser(token);
      if (!error && user) {
        userId = user.id;
      }
    }

    if (
      !userId &&
      process.env.NODE_ENV !== 'production' &&
      (request.headers['x-user-id'] as string)
    ) {
      userId = request.headers['x-user-id'] as string;
    }

    if (!userId) return null;

    if (process.env.NODE_ENV !== 'production' && (request.headers['x-user-role'] as string)) {
      return { userId, role: request.headers['x-user-role'] as string };
    }

    if (!isSupabaseConfigured) {
      const testRole =
        (request.headers['x-user-role'] as string) ||
        (process.env.NODE_ENV === 'test' ? 'citizen' : undefined);
      return { userId, role: testRole || 'citizen' };
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();

    return {
      userId,
      role: profile?.role ?? 'citizen',
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // CANONICAL DOMAIN 6 ENDPOINTS (JOB 057)
  // ─────────────────────────────────────────────────────────────────────────────

  // Create Political Ad (JOB 057)
  app.post<{ Body: CreatePoliticalAdInput }>(
    '/api/v1/political-ads',
    async (request, reply) => {
      try {
        const ad = await adService.createPoliticalAd(request.body);
        return reply.code(201).send(ad);
      } catch (err: any) {
        return sendApiError(reply, request, 400, 'BadRequest', err.message);
      }
    },
  );

  // Review Political Ad (Adaptive Gating: Fast-track vs Strict MCMC)
  app.post<{
    Params: { id: string };
    Body: { decision: 'approved' | 'rejected'; reviewerId?: string };
  }>(
    '/api/v1/political-ads/:id/review',
    async (request, reply) => {
      try {
        const ad = await adService.reviewPoliticalAd(
          request.params.id,
          request.body.decision,
          request.body.reviewerId,
        );
        return reply.send(ad);
      } catch (err: any) {
        return sendApiError(reply, request, 400, 'BadRequest', err.message);
      }
    },
  );

  // Public Ad Transparency Ledger (Section 127A RPA 1951)
  app.get<{
    Querystring: {
      constituencyId?: string;
      category?: PoliticalAdCategory;
      sponsorName?: string;
    };
  }>(
    '/api/v1/political-ads/transparency',
    async (request, reply) => {
      try {
        const ads = await adService.getPublicTransparencyLedger(request.query);
        return reply.send({ ads, total: ads.length });
      } catch (err: any) {
        return sendApiError(reply, request, 500, 'InternalError', err.message);
      }
    },
  );

  // Set Electoral Window State for AC (e.g. ROUTINE_CIVIC vs MCC_ACTIVE)
  app.post<{
    Params: { constituencyId: string };
    Body: { state: ElectoralWindowState };
  }>(
    '/api/v1/political-ads/electoral-state/:constituencyId',
    async (request, reply) => {
      try {
        adService.setConstituencyElectoralState(
          request.params.constituencyId,
          request.body.state,
        );
        return reply.send({
          constituencyId: request.params.constituencyId.toUpperCase(),
          electoralState: request.body.state,
        });
      } catch (err: any) {
        return sendApiError(reply, request, 400, 'BadRequest', err.message);
      }
    },
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // LEGACY ENDPOINTS (FOR COMPLETE BACKWARD COMPATIBILITY)
  // ─────────────────────────────────────────────────────────────────────────────

  // POST /api/v1/pages/:pageId/political-ads
  app.post<{
    Params: { pageId: string };
    Body: {
      postId: string;
      mcmcCertificateId: string;
      amountPaid: number;
      targetScope: 'state' | 'constituency';
      targetValue?: string;
    };
  }>(
    '/api/v1/pages/:pageId/political-ads',
    { schema: submitPoliticalAdSchema },
    async (request, reply) => {
      const auth = await resolveAuthUser(request);
      if (!auth) {
        return sendApiError(reply, request, 401, 'Unauthorized', 'Authentication required');
      }

      const { pageId } = request.params;
      const { postId, mcmcCertificateId, amountPaid, targetScope, targetValue } = request.body;

      if (!mcmcCertificateId || mcmcCertificateId.trim().length === 0) {
        return sendApiError(reply, request, 400, 'BadRequest', 'MCMC certificate ID is mandatory');
      }

      const newAd: PoliticalAdRow = {
        id: `pad-${Date.now()}`,
        page_id: pageId,
        post_id: postId,
        mcmc_certificate_id: mcmcCertificateId.trim(),
        status: 'pending_certification',
        amount_paid: amountPaid,
        target_scope: targetScope,
        target_value: targetValue,
        impressions: 0,
        created_at: new Date().toISOString(),
      };

      MEMORY_ADS.push(newAd);
      return reply.code(201).send(newAd);
    },
  );

  // POST /api/v1/political-ads/admin/:adId/certify
  app.post<{
    Params: { adId: string };
    Body: { action: 'certify' | 'reject'; reason?: string };
  }>(
    '/api/v1/political-ads/admin/:adId/certify',
    { schema: certifyPoliticalAdSchema },
    async (request, reply) => {
      const auth = await resolveAuthUser(request);
      if (!auth) {
        return sendApiError(reply, request, 401, 'Unauthorized', 'Authentication required');
      }
      if (auth.role !== 'admin' && auth.role !== 'moderator') {
        return sendApiError(reply, request, 403, 'Forbidden', 'Admin privileges required');
      }

      const { adId } = request.params;
      const { action } = request.body;
      const ad = MEMORY_ADS.find((a) => a.id === adId);
      if (!ad) {
        return sendApiError(reply, request, 404, 'NotFound', 'Ad not found');
      }

      ad.status = action === 'certify' ? 'active' : 'rejected';
      ad.reviewed_by = auth.userId;
      ad.reviewed_at = new Date().toISOString();

      return reply.send(ad);
    },
  );

  // GET /api/v1/political-ads/active
  app.get<{
    Querystring: { state?: string; constituency?: string; limit?: number };
  }>(
    '/api/v1/political-ads/active',
    { schema: activeAdsQuerySchema },
    async (request, reply) => {
      const { state, constituency, limit = 20 } = request.query;
      let ads = MEMORY_ADS.filter((a) => a.status === 'active');
      if (state) {
        ads = ads.filter((a) => a.target_scope === 'state' && a.target_value === state);
      }
      if (constituency) {
        ads = ads.filter((a) => a.target_scope === 'constituency' && a.target_value === constituency);
      }
      return reply.send({ ads: ads.slice(0, limit) });
    },
  );

  // GET /api/v1/political-ads/library
  app.get<{
    Querystring: { search?: string; state?: string; page?: number; limit?: number };
  }>(
    '/api/v1/political-ads/library',
    { schema: libraryAdsQuerySchema },
    async (request, reply) => {
      const { search, state, page = 1, limit = 20 } = request.query;
      let ads = MEMORY_ADS.filter((a) => a.status === 'active' || a.status === 'certified' || a.status === 'ended');
      if (search) {
        const s = search.toLowerCase();
        ads = ads.filter((a) => a.mcmc_certificate_id.toLowerCase().includes(s) || a.page_id.toLowerCase().includes(s));
      }
      if (state) {
        ads = ads.filter((a) => a.target_scope === 'state' && a.target_value === state);
      }
      const offset = (page - 1) * limit;
      return reply.send({
        ads: ads.slice(offset, offset + limit),
        total: ads.length,
        page,
        limit,
      });
    },
  );

  // GET /political-ads/library/view (Public HTML View)
  app.get('/political-ads/library/view', async (_request, reply) => {
    reply.type('text/html');
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>KSHETRA · Political Ad Transparency Library</title>
</head>
<body>
  <h1>Political Ad Library</h1>
</body>
</html>`;
  });
};

export const politicalAdRoutes = politicalAdsRoutes;
