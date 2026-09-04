import { buildApp } from '../server';
import type { FastifyInstance } from 'fastify';

describe('Tickets 0.4 & 0.5: Web Page Manager & Grievance Policy Routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Ticket 0.4: Web Page Manager Shell', () => {
    it('GET /manage serves the HTML Page Manager shell', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/manage',
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('text/html');
      expect(response.payload).toContain('Page Manager');
      expect(response.payload).toContain('Kshetra Page Pro');
      expect(response.payload).toContain('Razorpay');
    });

    it('GET /api/v1/pages/:pageId/entitlement returns free plan initially', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/pages/test-page-1/entitlement',
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.success).toBe(true);
      expect(data.pageId).toBe('test-page-1');
      expect(data.isPro).toBe(false);
      expect(data.plan).toBe('free');
    });

    it('POST /api/v1/pages/:pageId/pro/order creates a payment order', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/pages/test-page-1/pro/order',
        payload: { amount: 199900 },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.success).toBe(true);
      expect(data.orderId).toBeDefined();
      expect(data.currency).toBe('INR');
    });

    it('POST /api/v1/pages/:pageId/pro/verify activates Page Pro entitlement', async () => {
      const verifyRes = await app.inject({
        method: 'POST',
        url: '/api/v1/pages/test-page-1/pro/verify',
        payload: {
          razorpay_order_id: 'order_test_123',
          razorpay_payment_id: 'pay_test_123',
          sandboxBypass: true,
        },
      });

      expect(verifyRes.statusCode).toBe(200);
      const verifyData = JSON.parse(verifyRes.payload);
      expect(verifyData.success).toBe(true);
      expect(verifyData.entitlement.isPro).toBe(true);
      expect(verifyData.entitlement.plan).toBe('pro');

      // Check entitlement query reflects unlocked status
      const entitlementRes = await app.inject({
        method: 'GET',
        url: '/api/v1/pages/test-page-1/entitlement',
      });
      const entData = JSON.parse(entitlementRes.payload);
      expect(entData.isPro).toBe(true);
      expect(entData.plan).toBe('pro');
    });
  });

  describe('Ticket 0.5: Grievance Officer & Content Policy', () => {
    it('GET /policy/grievance serves statutory grievance officer and redressal details', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/policy/grievance',
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('text/html');
      expect(response.payload).toContain('Srikanth Varma');
      expect(response.payload).toContain('grievance@kshetra.app');
      expect(response.payload).toContain('24 hours');
      expect(response.payload).toContain('15 days');
    });

    it('GET /policy/community-guidelines serves community guidelines', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/policy/community-guidelines',
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('text/html');
      expect(response.payload).toContain('Community Guidelines');
    });

    it('POST /api/v1/grievances/intake logs complaint and returns ticket number', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/grievances/intake',
        payload: {
          complainantName: 'A. Citizen',
          email: 'citizen@example.com',
          category: 'defamation',
          contentUrl: 'https://kshetra.app/posts/test-post-1',
          description: 'This post contains unsubstantiated defamatory claims.',
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.success).toBe(true);
      expect(data.ticketNumber).toMatch(/^GRV-/);
      expect(data.grievanceOfficer.name).toBe('Srikanth Varma');
    });
  });
});
