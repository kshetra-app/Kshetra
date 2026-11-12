import { isIsolatedTestRuntime, isProductionLikeRuntime } from '../lib/runtimeEnvironment';
/**
 * Political Advertising & Statutory Transparency Ledger Routes
 * Master Product Blueprint — Domain 6 (JOB 057)
 * Representation of the People Act 1951 (Section 127A) & ECI MCMC Guidelines
 * Ratified under DEC-186
 */

import type { FastifyPluginAsync } from 'fastify';
import {
  publicSupabase,
  isPublicSupabaseConfigured,
  supabase,
  isSupabaseConfigured,
} from '../lib/supabase';
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

// Isolated nonproduction compatibility store for legacy submission tests.
// Production public reads use Supabase; writes, review, and delivery remain gated.
const MEMORY_ADS: PoliticalAdRow[] = [];

/**
 * This projection is deliberately limited to columns introduced by the
 * original political_ads table contract (migration 034). The Domain 6
 * campaign-ad columns were added later and may not yet be present in every
 * reconciled environment. Public reads must therefore remain compatible with
 * the stable legacy schema and rely on its active/ended RLS policy.
 */
const PUBLIC_POLITICAL_AD_COLUMNS =
  'id,page_id,post_id,mcmc_certificate_id,status,amount_paid,target_scope,target_value,impressions,created_at,reviewed_at';

type PublicPoliticalAd = Omit<PoliticalAdRow, 'reviewed_by'>;

interface PublicAdListOptions {
  page: number;
  limit: number;
  status?: 'active';
  state?: string;
  constituency?: string;
  search?: string;
}

async function listPersistedPublicAds(options: PublicAdListOptions): Promise<{
  ads: PublicPoliticalAd[];
  total: number;
}> {
  if (!isPublicSupabaseConfigured) {
    throw new Error('POLITICAL_AD_STORAGE_UNAVAILABLE');
  }

  let query = publicSupabase
    .from('political_ads')
    .select(PUBLIC_POLITICAL_AD_COLUMNS, { count: 'exact' })
    .in('status', options.status ? [options.status] : ['active', 'ended']);

  if (options.state) {
    query = query.eq('target_scope', 'state').eq('target_value', options.state);
  }
  if (options.constituency) {
    query = query.eq('target_scope', 'constituency').eq('target_value', options.constituency);
  }
  if (options.search) {
    // Restrict the search token to identifier characters before building a
    // PostgREST expression. A UUID searches page_id exactly; other terms search
    // certificate numbers. page_id is UUID-typed, so it must not use ILIKE.
    const search = options.search.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 100);
    if (search) {
      if (
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(search)
      ) {
        query = query.eq('page_id', search);
      } else {
        query = query.ilike('mcmc_certificate_id', `%${search}%`);
      }
    }
  }

  const offset = (options.page - 1) * options.limit;
  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + options.limit - 1);

  if (error || typeof count !== 'number' || !Array.isArray(data)) {
    throw new Error('POLITICAL_AD_STORAGE_UNAVAILABLE');
  }

  return { ads: data as PublicPoliticalAd[], total: count };
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderPublicPoliticalAdLibrary(
  ads: PublicPoliticalAd[],
  total: number,
  page: number,
  limit: number,
): string {
  const formatAmount = (amount: unknown): string => {
    if (amount === null || amount === undefined || amount === '') return 'Not recorded';
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed < 0) return 'Unavailable';
    return parsed === 0
      ? 'No payment amount recorded'
      : `₹${parsed.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  };

  const formatImpressions = (impressions: unknown): string => {
    if (impressions === null || impressions === undefined || impressions === '') {
      return 'Unavailable';
    }
    const parsed = Number(impressions);
    if (!Number.isSafeInteger(parsed) || parsed < 0) return 'Unavailable';
    return parsed === 0 ? 'No impressions recorded' : parsed.toLocaleString('en-IN');
  };

  const formatDate = (date: unknown): string => {
    const parsed = typeof date === 'string' ? new Date(date) : null;
    return parsed && !Number.isNaN(parsed.getTime())
      ? parsed.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })
      : 'Not recorded';
  };

  const cards = ads.length
    ? ads
        .map(
          (ad) => `<article class="ad-card">
  <div class="ad-header"><span class="status">${escapeHtml(ad.status)}</span><span class="date">${escapeHtml(formatDate(ad.created_at))}</span></div>
  <h2>Political advertisement</h2>
  <dl>
    <dt>MCMC certificate</dt><dd>${escapeHtml(ad.mcmc_certificate_id || 'Not recorded')}</dd>
    <dt>Sponsor page ID</dt><dd>${escapeHtml(ad.page_id || 'Not recorded')}</dd>
    <dt>Sponsored post ID</dt><dd>${escapeHtml(ad.post_id || 'Not recorded')}</dd>
    <dt>Target</dt><dd>${escapeHtml(ad.target_scope)}: ${escapeHtml(ad.target_value || 'Not recorded')}</dd>
    <dt>Recorded amount</dt><dd>${escapeHtml(formatAmount(ad.amount_paid))}</dd>
    <dt>Recorded impressions</dt><dd>${escapeHtml(formatImpressions(ad.impressions))}</dd>
    <dt>Reviewed</dt><dd>${escapeHtml(formatDate(ad.reviewed_at))}</dd>
  </dl>
</article>`,
        )
        .join('\n')
    : '<p class="empty">No public political advertisements are recorded.</p>';
  const firstRecord = total === 0 ? 0 : (page - 1) * limit + 1;
  const lastRecord = Math.min(total, (page - 1) * limit + ads.length);
  const previousPage = page > 1 ? page - 1 : null;
  const nextPage = page * limit < total ? page + 1 : null;
  const pagination =
    previousPage || nextPage
      ? `<nav class="pagination" aria-label="Ad library pages">
  ${previousPage ? `<a href="?page=${previousPage}&amp;limit=${limit}" rel="prev">Previous</a>` : '<span></span>'}
  <span>Page ${page}</span>
  ${nextPage ? `<a href="?page=${nextPage}&amp;limit=${limit}" rel="next">Next</a>` : '<span></span>'}
</nav>`
      : '';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Political Ad Library · Poligram</title>
  <style>
    :root{color-scheme:light dark;font-family:system-ui,sans-serif;background:#0b1220;color:#e5e7eb}
    body{max-width:960px;margin:0 auto;padding:24px 16px}
    h1{font-size:1.7rem;margin:0 0 8px}.intro,.summary{color:#aab4c4;line-height:1.5}
    .summary{margin:20px 0}.ad-card{border:1px solid #334155;border-radius:14px;padding:18px;margin:14px 0;background:#111827}
    .ad-header{display:flex;justify-content:space-between;gap:12px;color:#aab4c4;font-size:.85rem;text-transform:capitalize}
    .status{color:#fbbf24;font-weight:700}.ad-card h2{font-size:1rem;margin:14px 0}
    dl{display:grid;grid-template-columns:minmax(140px,220px) 1fr;gap:8px 16px;margin:0}
    dt{color:#aab4c4}dd{margin:0;overflow-wrap:anywhere}.empty{padding:24px;border:1px dashed #475569;border-radius:12px;color:#cbd5e1}
    .pagination{display:flex;justify-content:space-between;align-items:center;margin:20px 0}.pagination a{color:#fbbf24}
    @media(max-width:520px){dl{grid-template-columns:1fr;gap:2px}dd{margin-bottom:10px}}
  </style>
</head>
<body>
  <h1>Political Ad Library</h1>
  <p class="intro">Public records of active and ended political advertisements. Values are shown as recorded in the ad database; the record alone does not verify payment settlement or delivery.</p>
  <p class="summary">${total.toLocaleString('en-IN')} public record${total === 1 ? '' : 's'} found. Showing ${firstRecord}–${lastRecord}.</p>
  <main>${cards}</main>
  ${pagination}
</body>
</html>`;
}

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

const publicLibraryViewQuerySchema = {
  querystring: {
    type: 'object',
    additionalProperties: false,
    properties: {
      page: { type: 'integer', minimum: 1, maximum: 100000 },
      limit: { type: 'integer', minimum: 1, maximum: 100 },
    },
  },
};

export const politicalAdsRoutes: FastifyPluginAsync = async (app) => {
  // Mutations, review decisions, ad delivery, and analytics still use
  // process-memory services. The public legacy-table read is off by default;
  // enable it only after the environment's RLS policy and schema are verified.
  const isProductionRuntime = () => isProductionLikeRuntime();
  app.addHook('preHandler', async (request, reply) => {
    const pathname = request.url.split('?')[0];
    const publicReadPath =
      request.method === 'GET' &&
      (pathname === '/api/v1/political-ads/active' ||
        pathname === '/api/v1/political-ads/library' ||
        pathname === '/political-ads/library/view');
    const durablePublicRead =
      publicReadPath &&
      process.env.POLITICAL_AD_PUBLIC_LIBRARY_ENABLED?.trim().toLowerCase() === 'true' &&
      isPublicSupabaseConfigured;

    if (isProductionRuntime() && !durablePublicRead) {
      return sendApiError(
        reply,
        request,
        503,
        'Service Unavailable',
        'Political advertising storage, compliance review, and delivery are not connected',
        { code: 'POLITICAL_AD_SERVICE_UNAVAILABLE' },
      );
    }
  });

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

    if (!userId && !isProductionLikeRuntime() && (request.headers['x-user-id'] as string)) {
      userId = request.headers['x-user-id'] as string;
    }

    if (!userId) return null;

    if (!isProductionLikeRuntime() && (request.headers['x-user-role'] as string)) {
      return { userId, role: request.headers['x-user-role'] as string };
    }

    if (!isSupabaseConfigured) {
      const testRole =
        (request.headers['x-user-role'] as string) ||
        (isIsolatedTestRuntime() ? 'citizen' : undefined);
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
  app.post<{ Body: CreatePoliticalAdInput }>('/api/v1/political-ads', async (request, reply) => {
    try {
      const ad = await adService.createPoliticalAd(request.body);
      return reply.code(201).send(ad);
    } catch (err: any) {
      return sendApiError(reply, request, 400, 'BadRequest', err.message);
    }
  });

  // Review Political Ad (Adaptive Gating: Fast-track vs Strict MCMC)
  app.post<{
    Params: { id: string };
    Body: { decision: 'approved' | 'rejected'; reviewerId?: string };
  }>('/api/v1/political-ads/:id/review', async (request, reply) => {
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
  });

  // Public Ad Transparency Ledger (Section 127A RPA 1951)
  app.get<{
    Querystring: {
      constituencyId?: string;
      category?: PoliticalAdCategory;
      sponsorName?: string;
    };
  }>('/api/v1/political-ads/transparency', async (request, reply) => {
    try {
      const ads = await adService.getPublicTransparencyLedger(request.query);
      return reply.send({ ads, total: ads.length });
    } catch (err: any) {
      return sendApiError(reply, request, 500, 'InternalError', err.message);
    }
  });

  // Set Electoral Window State for AC (e.g. ROUTINE_CIVIC vs MCC_ACTIVE)
  app.post<{
    Params: { constituencyId: string };
    Body: { state: ElectoralWindowState };
  }>('/api/v1/political-ads/electoral-state/:constituencyId', async (request, reply) => {
    try {
      adService.setConstituencyElectoralState(request.params.constituencyId, request.body.state);
      return reply.send({
        constituencyId: request.params.constituencyId.toUpperCase(),
        electoralState: request.body.state,
      });
    } catch (err: any) {
      return sendApiError(reply, request, 400, 'BadRequest', err.message);
    }
  });

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
  }>('/api/v1/political-ads/active', { schema: activeAdsQuerySchema }, async (request, reply) => {
    const { state, constituency, limit = 20 } = request.query;

    if (isProductionRuntime()) {
      try {
        const result = await listPersistedPublicAds({
          page: 1,
          limit,
          status: 'active',
          state,
          constituency,
        });
        return reply.send({ ads: result.ads });
      } catch {
        return sendApiError(
          reply,
          request,
          503,
          'Service Unavailable',
          'Political advertisement records are temporarily unavailable.',
          { code: 'POLITICAL_AD_STORAGE_UNAVAILABLE' },
        );
      }
    }

    let ads = MEMORY_ADS.filter((a) => a.status === 'active');
    if (state) {
      ads = ads.filter((a) => a.target_scope === 'state' && a.target_value === state);
    }
    if (constituency) {
      ads = ads.filter((a) => a.target_scope === 'constituency' && a.target_value === constituency);
    }
    return reply.send({ ads: ads.slice(0, limit) });
  });

  // GET /api/v1/political-ads/library
  app.get<{
    Querystring: { search?: string; state?: string; page?: number; limit?: number };
  }>('/api/v1/political-ads/library', { schema: libraryAdsQuerySchema }, async (request, reply) => {
    const { search, state, page = 1, limit = 20 } = request.query;

    if (isProductionRuntime()) {
      try {
        const result = await listPersistedPublicAds({ page, limit, search, state });
        return reply.send({ ...result, page, limit });
      } catch {
        return sendApiError(
          reply,
          request,
          503,
          'Service Unavailable',
          'Political advertisement records are temporarily unavailable.',
          { code: 'POLITICAL_AD_STORAGE_UNAVAILABLE' },
        );
      }
    }

    let ads = MEMORY_ADS.filter((a) => a.status === 'active' || a.status === 'ended');
    if (search) {
      const s = search.toLowerCase();
      ads = ads.filter(
        (a) =>
          a.mcmc_certificate_id.toLowerCase().includes(s) || a.page_id.toLowerCase().includes(s),
      );
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
  });

  // GET /political-ads/library/view (Public HTML View)
  app.get<{
    Querystring: { page?: number; limit?: number };
  }>(
    '/political-ads/library/view',
    { schema: publicLibraryViewQuerySchema },
    async (request, reply) => {
      if (isProductionRuntime()) {
        try {
          const page = request.query.page ?? 1;
          const limit = request.query.limit ?? 20;
          const result = await listPersistedPublicAds({ page, limit });
          reply.type('text/html; charset=utf-8');
          return renderPublicPoliticalAdLibrary(result.ads, result.total, page, limit);
        } catch {
          return sendApiError(
            reply,
            request,
            503,
            'Service Unavailable',
            'Political advertisement records are temporarily unavailable.',
            { code: 'POLITICAL_AD_STORAGE_UNAVAILABLE' },
          );
        }
      }

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
    },
  );
};

export const politicalAdRoutes = politicalAdsRoutes;
