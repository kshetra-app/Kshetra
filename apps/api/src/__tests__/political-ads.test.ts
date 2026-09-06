import { buildApp } from '../server';
import type { FastifyInstance } from 'fastify';

describe('PHASE4-B2: Political Ad Infrastructure & Compliance Verification', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('1. Unauthenticated Public Ad Library', () => {
    it('GET /ad-library loads successfully with ZERO authentication (status 200, HTML)', async () => {
      // Simulating a fresh incognito window with no cookies and no Authorization header
      const res = await app.inject({
        method: 'GET',
        url: '/ad-library',
      });

      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toContain('text/html');
      expect(res.payload).toContain('Political Ad Library');
      expect(res.payload).toContain('ECI / MCMC transparency record');
      expect(res.payload).toContain('Zero Login Required');
    });

    it('GET /api/v1/political-ads/library returns public ad records without login', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/political-ads/library',
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.payload);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.ads)).toBe(true);
      // Active ads must be in the list
      const activeAd = data.ads.find((a: any) => a.id === 'pad-demo-1');
      expect(activeAd).toBeDefined();
      expect(activeAd.status).toBe('active');
      expect(activeAd.mcmc_certificate_id).toBe('ECI/MCMC/2026/TS/0891');
    });
  });

  describe('2. Submission flow & Initial Status', () => {
    it('Rejects unauthenticated submission', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/pages/demo-page/political-ads',
        payload: {
          postId: 'post-103',
          mcmcCertificateId: 'ECI/MCMC/2026/TS/0893',
          amountPaid: 300000,
          targetScope: 'constituency',
          targetValue: 'TS-AC-67',
        },
      });

      expect(res.statusCode).toBe(401);
    });

    it('Page owner submits ad: status is ALWAYS pending_certification (never auto-certified)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/pages/demo-page/political-ads',
        headers: {
          'x-user-id': 'demo-leader-user',
          'x-user-role': 'politician',
        },
        payload: {
          postId: 'post-test-401',
          mcmcCertificateId: 'ECI/MCMC/2026/TS/0999',
          amountPaid: 450000,
          targetScope: 'constituency',
          targetValue: 'TS-AC-67',
        },
      });

      expect(res.statusCode).toBe(201);
      const data = JSON.parse(res.payload);
      expect(data.success).toBe(true);
      expect(data.ad.status).toBe('pending_certification');
      expect(data.ad.mcmc_certificate_id).toBe('ECI/MCMC/2026/TS/0999');
      expect(data.ad.impressions).toBe(0);
    });
  });

  describe('3. Human-Only Review Queue & Certification', () => {
    it('Review queue blocks non-admin/moderator users (403)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/political-ads/review-queue',
        headers: {
          'x-user-id': 'regular-citizen',
          'x-user-role': 'citizen',
        },
      });

      expect(res.statusCode).toBe(403);
    });

    it('Review queue accessible by admin/moderator and returns pending ads', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/political-ads/review-queue',
        headers: {
          'x-user-id': 'admin-compliance-1',
          'x-user-role': 'admin',
        },
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.payload);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.queue)).toBe(true);
      // All items in review queue must be pending_certification
      data.queue.forEach((item: any) => {
        expect(item.status).toBe('pending_certification');
      });
    });

    it('Certification rejects unauthorized attempt by non-reviewer (403)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/political-ads/pad-demo-2/certify',
        headers: {
          'x-user-id': 'regular-citizen',
          'x-user-role': 'citizen',
        },
        payload: { action: 'certify' },
      });

      expect(res.statusCode).toBe(403);
    });

    it('Human reviewer action certifies and activates ad', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/political-ads/pad-demo-2/certify',
        headers: {
          'x-user-id': 'compliance-officer-99',
          'x-user-role': 'moderator',
        },
        payload: { action: 'certify' },
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.payload);
      expect(data.success).toBe(true);
      expect(data.ad.status).toBe('active');
      expect(data.ad.reviewed_by).toBe('compliance-officer-99');
      expect(data.ad.reviewed_at).toBeDefined();
    });
  });

  describe('4. In-Feed Active Distribution', () => {
    it('GET /api/v1/political-ads/active returns only certified active ads', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/political-ads/active?state=TS',
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.payload);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.ads)).toBe(true);
      data.ads.forEach((ad: any) => {
        expect(ad.status).toBe('active');
      });
    });
  });
});
