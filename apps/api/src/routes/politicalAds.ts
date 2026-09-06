import type { FastifyPluginAsync } from 'fastify';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

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

// In-memory cache/fallback for non-database test environments
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

export const politicalAdsRoutes: FastifyPluginAsync = async (app) => {
  /**
   * Helper: Resolve authenticated user and verify role against real DB record.
   * Never trusts client-sent roles or permissions.
   */
  async function resolveAuthUser(request: any): Promise<{ userId: string; role: string } | null> {
    let userId: string | null = null;
    const authHeader = request.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '').trim();
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (!error && user) {
        userId = user.id;
      }
    }

    if (!userId && process.env.NODE_ENV !== 'production' && (request.headers['x-user-id'] as string)) {
      userId = request.headers['x-user-id'] as string;
    }

    if (!userId) return null;

    if (!isSupabaseConfigured) {
      // In test mode, allow x-user-role header only if NODE_ENV === 'test'
      const testRole = process.env.NODE_ENV === 'test' ? (request.headers['x-user-role'] as string) : undefined;
      return { userId, role: testRole || 'citizen' };
    }

    // Always query database user_profiles for real role
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

  /**
   * POST /api/v1/pages/:pageId/political-ads
   * Page owner submits a post + MCMC certificate reference.
   * Strict compliance: ALWAYS starts as 'pending_certification'. Never auto-certifies.
   */
  app.post<{
    Params: { pageId: string };
    Body: {
      postId: string;
      mcmcCertificateId: string;
      amountPaid: number;
      targetScope: 'state' | 'constituency';
      targetValue?: string;
    };
  }>('/api/v1/pages/:pageId/political-ads', async (request, reply) => {
    const { pageId } = request.params;
    const { postId, mcmcCertificateId, amountPaid, targetScope, targetValue } = request.body || {};

    if (!postId || !mcmcCertificateId || typeof amountPaid !== 'number' || amountPaid < 0 || !targetScope) {
      return reply.status(400).send({
        error: 'Missing required ad parameters: postId, mcmcCertificateId, amountPaid, targetScope',
      });
    }

    if (targetScope !== 'state' && targetScope !== 'constituency') {
      return reply.status(400).send({ error: 'targetScope must be either "state" or "constituency"' });
    }

    const auth = await resolveAuthUser(request);
    if (!auth) {
      return reply.status(401).send({ error: 'Authentication required to submit political ads' });
    }

    // Verify page ownership in DB
    if (isSupabaseConfigured) {
      const { data: page, error: pageErr } = await supabase
        .from('pages')
        .select('id, owner_id')
        .eq('id', pageId)
        .maybeSingle();

      if (pageErr || !page) {
        return reply.status(404).send({ error: 'Page not found' });
      }

      if (page.owner_id !== auth.userId && auth.role !== 'admin') {
        return reply.status(403).send({ error: 'Only the Page owner may submit ads for this Page' });
      }

      // Insert ad with strict initial status: 'pending_certification'
      const { data: newAd, error: insertErr } = await supabase
        .from('political_ads')
        .insert({
          page_id: pageId,
          post_id: postId,
          mcmc_certificate_id: mcmcCertificateId.trim(),
          status: 'pending_certification',
          amount_paid: Math.round(amountPaid),
          target_scope: targetScope,
          target_value: targetValue?.trim() || null,
          impressions: 0,
        })
        .select('*')
        .single();

      if (insertErr || !newAd) {
        return reply.status(500).send({ error: `Failed to create political ad: ${insertErr?.message}` });
      }

      return reply.status(201).send({ success: true, ad: newAd });
    }

    // Non-DB fallback
    const newAd: PoliticalAdRow = {
      id: `pad-${Date.now()}`,
      page_id: pageId,
      post_id: postId,
      mcmc_certificate_id: mcmcCertificateId.trim(),
      status: 'pending_certification',
      amount_paid: Math.round(amountPaid),
      target_scope: targetScope,
      target_value: targetValue?.trim(),
      impressions: 0,
      created_at: new Date().toISOString(),
    };
    MEMORY_ADS.push(newAd);

    return reply.status(201).send({ success: true, ad: newAd });
  });

  /**
   * GET /api/v1/admin/political-ads/review-queue
   * Compliance review queue screen data.
   * Access restricted to DB-verified 'admin' or 'moderator'.
   */
  app.get('/api/v1/admin/political-ads/review-queue', async (request, reply) => {
    const auth = await resolveAuthUser(request);
    if (!auth) {
      return reply.status(401).send({ error: 'Authentication required' });
    }

    if (auth.role !== 'admin' && auth.role !== 'moderator') {
      return reply.status(403).send({ error: 'Unauthorized: Review queue requires admin or moderator role' });
    }

    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('political_ads')
        .select(`
          id, page_id, post_id, mcmc_certificate_id, status, amount_paid,
          target_scope, target_value, impressions, created_at,
          pages:page_id ( id, title, handle, role, avatar_url )
        `)
        .eq('status', 'pending_certification')
        .order('created_at', { ascending: false });

      if (error) {
        return reply.status(500).send({ error: `Database error: ${error.message}` });
      }

      return reply.send({ success: true, queue: data ?? [] });
    }

    const queue = MEMORY_ADS.filter((a) => a.status === 'pending_certification');
    return reply.send({ success: true, queue });
  });

  /**
   * POST /api/v1/admin/political-ads/:adId/certify
   * Compliance human-only action button endpoint.
   * The ONLY way an ad can become 'certified' or 'rejected'.
   * Automated certification is strictly prohibited.
   */
  app.post<{
    Params: { adId: string };
    Body: { action: 'certify' | 'reject'; reason?: string };
  }>('/api/v1/admin/political-ads/:adId/certify', async (request, reply) => {
    const { adId } = request.params;
    const { action, reason } = request.body || {};

    if (action !== 'certify' && action !== 'reject') {
      return reply.status(400).send({ error: 'action must be either "certify" or "reject"' });
    }

    const auth = await resolveAuthUser(request);
    if (!auth) {
      return reply.status(401).send({ error: 'Authentication required' });
    }

    // Role MUST be verified against database
    if (auth.role !== 'admin' && auth.role !== 'moderator') {
      return reply.status(403).send({ error: 'Unauthorized: Only human admin or moderator can certify political ads' });
    }

    const newStatus = action === 'certify' ? 'active' : 'rejected';
    const now = new Date().toISOString();

    if (isSupabaseConfigured) {
      const { data: updated, error } = await supabase
        .from('political_ads')
        .update({
          status: newStatus,
          reviewed_by: auth.userId,
          reviewed_at: now,
        })
        .eq('id', adId)
        .select('*')
        .single();

      if (error || !updated) {
        return reply.status(500).send({ error: `Failed to update ad status: ${error?.message}` });
      }

      return reply.send({
        success: true,
        ad: updated,
        message: `Political ad ${action === 'certify' ? 'certified and activated' : 'rejected'} by reviewer ${auth.userId}`,
      });
    }

    const target = MEMORY_ADS.find((a) => a.id === adId);
    if (!target) {
      return reply.status(404).send({ error: 'Political ad not found' });
    }

    target.status = newStatus;
    target.reviewed_by = auth.userId;
    target.reviewed_at = now;

    return reply.send({
      success: true,
      ad: target,
      message: `Political ad ${action === 'certify' ? 'certified and activated' : 'rejected'} by reviewer ${auth.userId}`,
    });
  });

  /**
   * GET /api/v1/political-ads/active
   * Distribution query for active political ads to show in Feed.
   */
  app.get<{
    Querystring: { state?: string; constituency?: string };
  }>('/api/v1/political-ads/active', async (request, reply) => {
    const { state, constituency } = request.query;

    if (isSupabaseConfigured) {
      let query = supabase
        .from('political_ads')
        .select(`
          id, page_id, post_id, mcmc_certificate_id, amount_paid,
          target_scope, target_value, impressions, created_at,
          pages:page_id ( id, title, handle, avatar_url )
        `)
        .eq('status', 'active');

      const { data, error } = await query;
      if (error) {
        return reply.status(500).send({ error: error.message });
      }

      // Filter by scope if provided
      let ads = data ?? [];
      if (state || constituency) {
        ads = ads.filter((ad: any) => {
          if (ad.target_scope === 'state' && (!ad.target_value || ad.target_value === state)) return true;
          if (ad.target_scope === 'constituency' && (!ad.target_value || ad.target_value === constituency)) return true;
          return false;
        });
      }

      return reply.send({ success: true, ads });
    }

    const ads = MEMORY_ADS.filter((a) => a.status === 'active');
    return reply.send({ success: true, ads });
  });

  /**
   * GET /api/v1/political-ads/library
   * Public unauthenticated JSON API for all certified / active / ended ads.
   */
  app.get('/api/v1/political-ads/library', async (request, reply) => {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('political_ads')
        .select(`
          id, page_id, post_id, mcmc_certificate_id, status, amount_paid,
          target_scope, target_value, impressions, created_at, reviewed_at,
          pages:page_id ( id, title, handle, avatar_url )
        `)
        .in('status', ['active', 'ended'])
        .order('created_at', { ascending: false });

      if (error) {
        return reply.status(500).send({ error: error.message });
      }

      return reply.send({ success: true, ads: data ?? [] });
    }

    const ads = MEMORY_ADS.filter((a) => a.status === 'active' || a.status === 'ended');
    return reply.send({ success: true, ads });
  });

  /**
   * GET /ad-library
   * Standalone Public Ad Library Web Page
   * Completely unauthenticated: zero login, no cookies required.
   * Can be inspected in a fresh incognito window.
   */
  app.get('/ad-library', async (request, reply) => {
    reply.header('Content-Type', 'text/html; charset=utf-8');
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kshetra — Public Political Ad Transparency Library</title>
  <style>
    :root {
      --primary: #1E3A8A;
      --amber: #D97706;
      --amber-light: #FEF3C7;
      --bg: #F8FAFC;
      --card-bg: #FFFFFF;
      --text: #0F172A;
      --text-muted: #64748B;
      --border: #E2E8F0;
      --success: #16A34A;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { background-color: var(--bg); color: var(--text); padding-bottom: 60px; }
    header { background-color: var(--primary); color: #fff; padding: 20px 32px; display: flex; justify-content: space-between; align-items: center; }
    .brand { font-size: 20px; font-weight: 800; }
    .header-badge { background: #D97706; color: #fff; font-size: 11px; padding: 4px 10px; border-radius: 6px; font-weight: 700; text-transform: uppercase; margin-left: 10px; }
    .container { max-width: 1060px; margin: 32px auto; padding: 0 20px; }
    .hero { margin-bottom: 28px; }
    .hero h1 { font-size: 26px; color: var(--primary); margin-bottom: 8px; }
    .hero p { color: var(--text-muted); font-size: 14px; line-height: 1.5; }
    .search-bar { width: 100%; padding: 12px 16px; font-size: 14px; border: 1px solid var(--border); border-radius: 8px; margin-bottom: 24px; background: #fff; }
    .card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; }
    .ad-card { background: var(--card-bg); border-radius: 12px; border: 1.5px solid var(--border); padding: 20px; box-shadow: 0 1px 4px rgba(0,0,0,0.05); }
    .ad-badge { display: inline-flex; align-items: center; gap: 4px; background: var(--amber-light); color: #92400E; font-size: 11px; font-weight: 700; padding: 4px 8px; border-radius: 6px; margin-bottom: 12px; }
    .payer-name { font-size: 16px; font-weight: 700; color: var(--text); }
    .payer-handle { font-size: 13px; color: var(--text-muted); margin-bottom: 12px; }
    .meta-row { display: flex; justify-content: space-between; font-size: 13px; padding: 6px 0; border-bottom: 1px solid #F1F5F9; }
    .meta-label { color: var(--text-muted); }
    .meta-value { font-weight: 600; color: var(--text); }
    .mcmc-box { background: #ECFDF5; border: 1px solid #A7F3D0; color: #065F46; padding: 8px 12px; border-radius: 6px; font-size: 12px; font-weight: 700; margin-top: 14px; }
    .unauth-pill { background: #DCFCE7; color: #166534; font-size: 11px; font-weight: 700; padding: 4px 8px; border-radius: 20px; }
  </style>
</head>
<body>
  <header>
    <div class="brand">KSHETRA <span class="header-badge">Ad Transparency Library</span></div>
    <div class="unauth-pill">Public Access · Zero Login Required</div>
  </header>

  <div class="container">
    <div class="hero">
      <h1>Political Ad Library</h1>
      <p>ECI / MCMC transparency record for all paid political promotions running across Kshetra constituencies. Open to public audit without an account.</p>
    </div>

    <input type="text" id="searchInput" class="search-bar" placeholder="Filter by Page name, MCMC Certificate ID, or constituency..." oninput="renderAds()">

    <div id="cardsGrid" class="card-grid">
      <!-- Dynamically populated -->
    </div>
  </div>

  <script>
    let adsData = [];

    async function loadAds() {
      try {
        const res = await fetch('/api/v1/political-ads/library');
        const data = await res.json();
        if (data && data.ads) {
          adsData = data.ads;
        }
      } catch (err) {
        console.error('Failed to load ad library data', err);
      }
      renderAds();
    }

    function renderAds() {
      const query = (document.getElementById('searchInput').value || '').toLowerCase().trim();
      const grid = document.getElementById('cardsGrid');

      const filtered = adsData.filter(ad => {
        const title = (ad.pages?.title || ad.page_id || '').toLowerCase();
        const mcmc = (ad.mcmc_certificate_id || '').toLowerCase();
        const target = (ad.target_value || '').toLowerCase();
        return title.includes(query) || mcmc.includes(query) || target.includes(query);
      });

      if (filtered.length === 0) {
        grid.innerHTML = '<p style=\"grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 40px;\">No certified political ads matching your search query.</p>';
        return;
      }

      grid.innerHTML = filtered.map(ad => {
        const pageTitle = ad.pages?.title || ad.page_id || 'Political Campaign';
        const pageHandle = ad.pages?.handle ? ('@' + ad.pages.handle) : 'Official Page';
        const amountFormatted = '₹' + (ad.amount_paid / 100).toLocaleString('en-IN');
        const createdDate = new Date(ad.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

        return '<div class=\"ad-card\">' +
          '<div class=\"ad-badge\">⚖️ Political Ad · Paid Promotion</div>' +
          '<div class=\"payer-name\">' + pageTitle + '</div>' +
          '<div class=\"payer-handle\">' + pageHandle + '</div>' +
          '<div class=\"meta-row\"><span class=\"meta-label\">Amount Spent:</span><span class=\"meta-value\">' + amountFormatted + '</span></div>' +
          '<div class=\"meta-row\"><span class=\"meta-label\">Target Scope:</span><span class=\"meta-value\">' + (ad.target_scope || '').toUpperCase() + (ad.target_value ? ' (' + ad.target_value + ')' : '') + '</span></div>' +
          '<div class=\"meta-row\"><span class=\"meta-label\">Impressions:</span><span class=\"meta-value\">' + (ad.impressions || 0).toLocaleString('en-IN') + '</span></div>' +
          '<div class=\"meta-row\"><span class=\"meta-label\">Promoted Date:</span><span class=\"meta-value\">' + createdDate + '</span></div>' +
          '<div class=\"mcmc-box\">MCMC Certificate: ' + (ad.mcmc_certificate_id || 'PENDING') + '</div>' +
        '</div>';
      }).join('');
    }

    loadAds();
  </script>
</body>
</html>`;
  });
};
