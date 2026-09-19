/**
 * W009-B2: Bounded Provider Abstraction Test Suite
 * Tests:
 * - TEST-W009-B2-01: PaymentProvider order creation and signature verification
 * - TEST-W009-B2-02: Fail-closed on missing RAZORPAY_KEY_SECRET (500)
 * - TEST-W009-B2-03: Rejection of invalid / empty signatures (400)
 * - TEST-W009-B2-04: Voice OBD dispatch during permitted window (08:00–21:00 IST)
 * - TEST-W009-B2-05: Rejection outside permitted window (400 OUTSIDE_TRAI_WINDOW)
 * - TEST-W009-B2-06: Webhook validation, delivery report parsing, and carrier timeout handling
 * - TEST-W009-B2-07: MockProvider production safety guard violation
 * - TEST-W009-B2-08: Pages Pro order & signature verification via provider
 */

import crypto from 'node:crypto';
import { RazorpayProvider } from '../providers/razorpayProvider';
import { TelecomProvider } from '../providers/telecomProvider';
import { MockPaymentProvider, MockVoiceObdProvider } from '../providers/mockProvider';
import { buildApp } from '../server';
import type { FastifyInstance } from 'fastify';
import {
  setTestAuthResolver,
  setTestPageAuthorityResolver,
  resetPagesTestResolvers,
  PRO_ORDER_REGISTRY,
} from '../routes/pages';
import { setSupabaseConfiguredForTesting } from '../lib/supabase';

describe('W009-B2 Provider Abstraction & Security Gates', () => {
  let app: FastifyInstance;
  const originalSecret = process.env.RAZORPAY_KEY_SECRET;
  const originalKey = process.env.RAZORPAY_KEY_ID;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    resetPagesTestResolvers();
    setSupabaseConfiguredForTesting(false);
    process.env.RAZORPAY_KEY_SECRET = originalSecret;
    process.env.RAZORPAY_KEY_ID = originalKey;
    await app.close();
  });

  describe('PaymentProvider (Razorpay)', () => {
    const testSecret = 'test_secret_key_abcdef123456';
    const testKey = 'rzp_test_key_123';

    it('TEST-W009-B2-01a: createOrder generates valid order structure and public key', async () => {
      const provider = new RazorpayProvider(testKey, testSecret);
      expect(provider.isConfigured()).toBe(true);
      expect(provider.getPublicKey()).toBe(testKey);

      const order = await provider.createOrder({
        amountINR: 1500,
        currency: 'INR',
        politicianId: 'pol_123',
      });

      expect(order.orderId).toMatch(/^order_/);
      expect(order.amountINR).toBe(1500);
      expect(order.amountPaise).toBe(150000);
      expect(order.currency).toBe('INR');
      expect(order.key).toBe(testKey);
      expect(order.isSandbox).toBe(false);
    });

    it('TEST-W009-B2-01b: verifyPaymentSignature correctly verifies valid HMAC-SHA256 signature', async () => {
      const provider = new RazorpayProvider(testKey, testSecret);
      const orderId = 'order_test_123';
      const paymentId = 'pay_test_456';
      const validSignature = crypto
        .createHmac('sha256', testSecret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      const result = await provider.verifyPaymentSignature({
        orderId,
        paymentId,
        signature: validSignature,
      });

      expect(result.valid).toBe(true);
      expect(result.orderId).toBe(orderId);
      expect(result.paymentId).toBe(paymentId);
      expect(result.reason).toBeUndefined();
    });

    it('TEST-W009-B2-02: verifyPaymentSignature fails closed when RAZORPAY_KEY_SECRET is missing', async () => {
      delete process.env.RAZORPAY_KEY_SECRET;
      const unconfiguredProvider = new RazorpayProvider(testKey, '');

      await expect(
        unconfiguredProvider.verifyPaymentSignature({
          orderId: 'order_123',
          paymentId: 'pay_123',
          signature: 'some_sig',
        })
      ).rejects.toThrow('PROVIDER_CONFIG_ERROR');
    });

    it('TEST-W009-B2-03a: verifyPaymentSignature rejects invalid signature', async () => {
      const provider = new RazorpayProvider(testKey, testSecret);
      const result = await provider.verifyPaymentSignature({
        orderId: 'order_123',
        paymentId: 'pay_123',
        signature: 'invalid_hex_signature_deadbeef',
      });

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('INVALID_SIGNATURE');
    });

    it('TEST-W009-B2-03b: verifyPaymentSignature rejects empty or missing signature', async () => {
      const provider = new RazorpayProvider(testKey, testSecret);
      const result = await provider.verifyPaymentSignature({
        orderId: 'order_123',
        paymentId: 'pay_123',
        signature: '',
      });

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('MISSING_SIGNATURE');
    });

    it('TEST-W009-B2-01c: verifyWebhookSignature validates authentic webhook payloads', () => {
      const provider = new RazorpayProvider(testKey, testSecret);
      const webhookPayload = JSON.stringify({ event: 'payment.captured', id: 'evt_123' });
      const webhookSig = crypto
        .createHmac('sha256', testSecret)
        .update(webhookPayload)
        .digest('hex');

      expect(provider.verifyWebhookSignature(webhookPayload, webhookSig, testSecret)).toBe(true);
      expect(provider.verifyWebhookSignature(webhookPayload, 'wrong_sig', testSecret)).toBe(false);
    });
  });

  describe('VoiceObdProvider (Telecom & TRAI Statutory Window)', () => {
    const provider = new TelecomProvider();

    it('TEST-W009-B2-04: permits calling inside TRAI window (08:00–21:00 IST)', () => {
      // 08:30 IST is 03:00 UTC
      const dateMorning = new Date('2026-09-18T03:00:00.000Z');
      const checkMorning = provider.isWithinTraiCallingWindow(dateMorning);
      expect(checkMorning.permitted).toBe(true);
      expect(checkMorning.currentISTHour).toBe(8);

      // 14:00 IST is 08:30 UTC
      const dateAfternoon = new Date('2026-09-18T08:30:00.000Z');
      const checkAfternoon = provider.isWithinTraiCallingWindow(dateAfternoon);
      expect(checkAfternoon.permitted).toBe(true);
      expect(checkAfternoon.currentISTHour).toBe(14);

      // 20:59 IST is 15:29 UTC
      const dateEvening = new Date('2026-09-18T15:29:00.000Z');
      const checkEvening = provider.isWithinTraiCallingWindow(dateEvening);
      expect(checkEvening.permitted).toBe(true);
      expect(checkEvening.currentISTHour).toBe(20);
    });

    it('TEST-W009-B2-05: rejects calling outside TRAI window (before 08:00 IST or at/after 21:00 IST)', () => {
      // 07:30 IST is 02:00 UTC
      const earlyMorning = new Date('2026-09-18T02:00:00.000Z');
      const checkEarly = provider.isWithinTraiCallingWindow(earlyMorning);
      expect(checkEarly.permitted).toBe(false);
      expect(checkEarly.currentISTHour).toBe(7);
      expect(checkEarly.message).toContain('TRAI regulations restrict automated political calls to 8:00 AM – 9:00 PM IST');

      // 21:15 IST is 15:45 UTC
      const lateNight = new Date('2026-09-18T15:45:00.000Z');
      const checkLate = provider.isWithinTraiCallingWindow(lateNight);
      expect(checkLate.permitted).toBe(false);
      expect(checkLate.currentISTHour).toBe(21);
      expect(checkLate.message).toContain('TRAI regulations restrict automated political calls to 8:00 AM – 9:00 PM IST');

      // 01:00 IST is 19:30 UTC (prev day)
      const midnight = new Date('2026-09-18T19:30:00.000Z');
      const checkMidnight = provider.isWithinTraiCallingWindow(midnight);
      expect(checkMidnight.permitted).toBe(false);
      expect(checkMidnight.currentISTHour).toBe(1);
    });

    it('TEST-W009-B2-06a: parseDeliveryReport correctly parses answered, busy, unreachable, and IVR opt-outs', () => {
      // Opt-out Press 9
      const optOutReport = provider.parseDeliveryReport({
        CallSid: 'call_1',
        CustomField: 'c1',
        From: '919848012345',
        Digits: '9',
        Status: 'completed',
      });
      expect(optOutReport.isOptOut).toBe(true);
      expect(optOutReport.isIvrResponse).toBe(false);
      expect(optOutReport.status).toBe('completed');

      // IVR digit 1
      const ivrReport = provider.parseDeliveryReport({
        CallSid: 'call_2',
        CustomField: 'c1',
        From: '919848012345',
        Digits: '1',
        Status: 'completed',
        Duration: 25,
      });
      expect(ivrReport.isOptOut).toBe(false);
      expect(ivrReport.isIvrResponse).toBe(true);
      expect(ivrReport.duration).toBe(25);

      // Busy status
      const busyReport = provider.parseDeliveryReport({
        CallSid: 'call_3',
        Status: 'busy',
      });
      expect(busyReport.status).toBe('busy');

      // Failed / unreachable status
      const unreachableReport = provider.parseDeliveryReport({
        CallSid: 'call_4',
        Status: 'no-answer',
      });
      expect(unreachableReport.status).toBe('unreachable');
    });

    it('TEST-W009-B2-06b: validateWebhook validates structured request objects', () => {
      expect(provider.validateWebhook({ headers: {}, body: { CallSid: '123' } })).toBe(true);
      expect(provider.validateWebhook({ headers: {}, body: null })).toBe(false);
    });
  });

  describe('MockProvider Safety & Controllability', () => {
    it('TEST-W009-B2-07a: MockProvider throws if instantiated in production environment', () => {
      const origEnv = process.env.NODE_ENV;
      try {
        process.env.NODE_ENV = 'production';
        expect(() => new MockPaymentProvider()).toThrow('SECURITY_VIOLATION');
        expect(() => new MockVoiceObdProvider()).toThrow('SECURITY_VIOLATION');
      } finally {
        process.env.NODE_ENV = origEnv;
      }
    });

    it('TEST-W009-B2-07b: MockVoiceObdProvider simulated TRAI window and carrier timeout', async () => {
      const mockObd = new MockVoiceObdProvider();

      // Simulate outside window
      mockObd.simulatedISTHour = 22; // 10 PM IST
      const outsideCheck = mockObd.isWithinTraiCallingWindow();
      expect(outsideCheck.permitted).toBe(false);

      const outsideDispatch = await mockObd.dispatchBroadcast({
        campaignId: 'c1',
        politicianId: 'pol_1',
        title: 'Late call',
        audioUrl: 'https://audio.mp3',
        ratePerCallINR: 0.9,
        targetSegment: { type: 'ward', voterCount: 100 },
      });
      expect(outsideDispatch.success).toBe(false);
      expect(outsideDispatch.error).toBe('OUTSIDE_TRAI_WINDOW');

      // Simulate inside window but carrier timeout
      mockObd.simulatedISTHour = 11; // 11 AM IST
      mockObd.simulateTimeout = true;
      const timeoutDispatch = await mockObd.dispatchBroadcast({
        campaignId: 'c1',
        politicianId: 'pol_1',
        title: 'Morning call',
        audioUrl: 'https://audio.mp3',
        ratePerCallINR: 0.9,
        targetSegment: { type: 'ward', voterCount: 100 },
      });
      expect(timeoutDispatch.success).toBe(false);
      expect(timeoutDispatch.error).toContain('CARRIER_TIMEOUT');
    });
  });

  describe('Route Consumption (Pages Pro & Campaign Voice OBD)', () => {
    it('TEST-W009-B2-08a: POST /api/v1/pages/:pageId/pro/order uses provider order structure', async () => {
      setTestAuthResolver(async () => ({ userId: 'test-owner-1', role: 'politician' }));
      setTestPageAuthorityResolver(async (auth, pageId) => ({
        authorized: true,
        notFound: false,
        page: { id: pageId, owner_id: auth.userId },
      }));

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/pages/my-page/pro/order',
        payload: { billingCycle: 'annual' },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.orderId).toMatch(/^order_/);
      expect(body.amount).toBe(499900);
      expect(body.billingCycle).toBe('annual');
      expect(body.currency).toBe('INR');
      expect(body.key).toBeDefined();
    });

    it('TEST-W009-B2-08b: POST /api/v1/pages/:pageId/pro/verify rejects invalid signature with 400', async () => {
      process.env.RAZORPAY_KEY_SECRET = 'test_secret_for_pages';
      setTestAuthResolver(async () => ({ userId: 'test-owner-1', role: 'politician' }));
      setTestPageAuthorityResolver(async (auth, pageId) => ({
        authorized: true,
        notFound: false,
        page: { id: pageId, owner_id: auth.userId },
      }));

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/pages/my-page/pro/verify',
        payload: {
          razorpay_order_id: 'order_page_123',
          razorpay_payment_id: 'pay_page_456',
          razorpay_signature: 'invalid_signature_hex',
        },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('INVALID_SIGNATURE');
    });

    it('TEST-W009-B2-08c: POST /api/v1/pages/:pageId/pro/verify fails closed (500) if RAZORPAY_KEY_SECRET missing', async () => {
      delete process.env.RAZORPAY_KEY_SECRET;
      setTestAuthResolver(async () => ({ userId: 'test-owner-1', role: 'politician' }));
      setTestPageAuthorityResolver(async (auth, pageId) => ({
        authorized: true,
        notFound: false,
        page: { id: pageId, owner_id: auth.userId },
      }));

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/pages/my-page/pro/verify',
        payload: {
          razorpay_order_id: 'order_page_123',
          razorpay_payment_id: 'pay_page_456',
          razorpay_signature: 'any_signature_hex',
        },
      });

      // Provider throws PROVIDER_CONFIG_ERROR, route responds 500
      expect(res.statusCode).toBe(500);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('PROVIDER_CONFIG_ERROR');
    });

    describe('DEF-B5-PAY-01 & DEF-B5-PAY-02: Security Verification Suite (Round 2)', () => {
      const secSecret = 'test_sec_secret_pages_12345';

      beforeEach(() => {
        resetPagesTestResolvers();
        process.env.RAZORPAY_KEY_SECRET = secSecret;
      });

      afterEach(() => {
        resetPagesTestResolvers();
      });

      // --- Remediation A & B: Header-Spoofing Resistance & Trust Boundary Isolation ---

      it('TEST-B5-R2-01: Request contains x-user-id but no valid authentication -> 401 UNAUTHORIZED, no order creation', async () => {
        resetPagesTestResolvers();
        const ordersBefore = PRO_ORDER_REGISTRY.size;

        const res = await app.inject({
          method: 'POST',
          url: '/api/v1/pages/sec-test-page/pro/order',
          headers: { 'x-user-id': 'spoofed-attacker-id' },
          payload: { billingCycle: 'monthly' },
        });

        expect(res.statusCode).toBe(401);
        const body = JSON.parse(res.payload);
        expect(body.code).toBe('UNAUTHORIZED');
        expect(PRO_ORDER_REGISTRY.size).toBe(ordersBefore);
      });

      it('TEST-B5-R2-02: Request contains x-user-id + x-user-role: admin but no valid authentication -> 401 UNAUTHORIZED, no order creation', async () => {
        resetPagesTestResolvers();
        const ordersBefore = PRO_ORDER_REGISTRY.size;

        const res = await app.inject({
          method: 'POST',
          url: '/api/v1/pages/sec-test-page/pro/order',
          headers: { 'x-user-id': 'spoofed-attacker-id', 'x-user-role': 'admin' },
          payload: { billingCycle: 'monthly' },
        });

        expect(res.statusCode).toBe(401);
        const body = JSON.parse(res.payload);
        expect(body.code).toBe('UNAUTHORIZED');
        expect(PRO_ORDER_REGISTRY.size).toBe(ordersBefore);
      });

      it('TEST-B5-R2-03: Request contains x-page-owner-id but no valid authentication -> 401 UNAUTHORIZED', async () => {
        resetPagesTestResolvers();

        const res = await app.inject({
          method: 'POST',
          url: '/api/v1/pages/sec-test-page/pro/verify',
          headers: { 'x-page-owner-id': 'spoofed-owner-id' },
          payload: {
            razorpay_order_id: 'order_sec_1',
            razorpay_payment_id: 'pay_sec_1',
            razorpay_signature: 'sig_sec_1',
          },
        });

        expect(res.statusCode).toBe(401);
        const body = JSON.parse(res.payload);
        expect(body.code).toBe('UNAUTHORIZED');
      });

      it('TEST-B5-R2-04: Supabase/authentication infrastructure is unavailable. Attempt to authenticate using spoofed identity headers -> NOT authenticated, NO payment order, NO entitlement, NO page mutation', async () => {
        resetPagesTestResolvers();
        setSupabaseConfiguredForTesting(false);
        const pageId = 'sec-page-unavail-test';

        // Initial state: not pro
        const initRes = await app.inject({
          method: 'GET',
          url: `/api/v1/pages/${pageId}/entitlement`,
        });
        expect(initRes.statusCode).toBe(200);
        expect(JSON.parse(initRes.payload).isPro).toBe(false);

        // Attempt order creation with spoofed headers
        const orderRes = await app.inject({
          method: 'POST',
          url: `/api/v1/pages/${pageId}/pro/order`,
          headers: {
            'x-user-id': 'spoofed-user',
            'x-user-role': 'admin',
            'x-page-owner-id': 'spoofed-user',
          },
          payload: { billingCycle: 'annual' },
        });
        expect(orderRes.statusCode).toBe(401);

        // Attempt verification with spoofed headers
        const verifyRes = await app.inject({
          method: 'POST',
          url: `/api/v1/pages/${pageId}/pro/verify`,
          headers: {
            'x-user-id': 'spoofed-user',
            'x-user-role': 'admin',
            'x-page-owner-id': 'spoofed-user',
          },
          payload: {
            razorpay_order_id: 'order_spoofed_123',
            razorpay_payment_id: 'pay_spoofed_123',
            razorpay_signature: 'sig_spoofed_123',
          },
        });
        expect(verifyRes.statusCode).toBe(401);

        // Final state: entitlement remains false, zero mutation
        const finalRes = await app.inject({
          method: 'GET',
          url: `/api/v1/pages/${pageId}/entitlement`,
        });
        expect(finalRes.statusCode).toBe(200);
        const finalBody = JSON.parse(finalRes.payload);
        expect(finalBody.isPro).toBe(false);
        expect(finalBody.plan).toBe('free');
      });

      it('TEST-B5-R2-05: Authenticated non-owner attempts Pages Pro order/verification -> 403 FORBIDDEN', async () => {
        setTestAuthResolver(async () => ({ userId: 'non-owner-user', role: 'citizen' }));
        setTestPageAuthorityResolver(async () => ({ authorized: false, notFound: false }));

        const resOrder = await app.inject({
          method: 'POST',
          url: '/api/v1/pages/victim-page-1/pro/order',
          payload: { billingCycle: 'monthly' },
        });
        expect(resOrder.statusCode).toBe(403);
        expect(JSON.parse(resOrder.payload).code).toBe('FORBIDDEN');

        const resVerify = await app.inject({
          method: 'POST',
          url: '/api/v1/pages/victim-page-1/pro/verify',
          payload: {
            razorpay_order_id: 'order_1',
            razorpay_payment_id: 'pay_1',
            razorpay_signature: 'sig_1',
          },
        });
        expect(resVerify.statusCode).toBe(403);
        expect(JSON.parse(resVerify.payload).code).toBe('FORBIDDEN');
      });

      it('TEST-B5-R2-06: Authenticated owner performs legitimate order/verification through canonical/authorized path -> success', async () => {
        const ownerId = 'legit_owner_user';
        const pageId = 'legit-page-06';
        setTestAuthResolver(async () => ({ userId: ownerId, role: 'politician' }));
        setTestPageAuthorityResolver(async (auth, pId) => ({
          authorized: true,
          notFound: false,
          page: { id: pId, owner_id: auth.userId },
        }));

        // 1. Legitimate order creation
        const orderRes = await app.inject({
          method: 'POST',
          url: `/api/v1/pages/${pageId}/pro/order`,
          payload: { billingCycle: 'annual' },
        });
        expect(orderRes.statusCode).toBe(200);
        const orderBody = JSON.parse(orderRes.payload);
        expect(orderBody.success).toBe(true);
        const orderId = orderBody.orderId;
        expect(orderId).toBeDefined();

        // 2. Legitimate payment verification with cryptographically valid HMAC
        const paymentId = 'pay_legit_success_06';
        const validSig = crypto
          .createHmac('sha256', secSecret)
          .update(`${orderId}|${paymentId}`)
          .digest('hex');

        const verifyRes = await app.inject({
          method: 'POST',
          url: `/api/v1/pages/${pageId}/pro/verify`,
          payload: {
            razorpay_order_id: orderId,
            razorpay_payment_id: paymentId,
            razorpay_signature: validSig,
            billingCycle: 'annual',
          },
        });
        expect(verifyRes.statusCode).toBe(200);
        const verifyBody = JSON.parse(verifyRes.payload);
        expect(verifyBody.success).toBe(true);
        expect(verifyBody.entitlement.isPro).toBe(true);
        expect(verifyBody.entitlement.plan).toBe('pro');

        // 3. Entitlement lookup reflects pro status
        const entRes = await app.inject({
          method: 'GET',
          url: `/api/v1/pages/${pageId}/entitlement`,
        });
        expect(entRes.statusCode).toBe(200);
        const entBody = JSON.parse(entRes.payload);
        expect(entBody.isPro).toBe(true);
        expect(entBody.plan).toBe('pro');
      });

      // --- Remediation C: Payment/Order/Page Association Binding Tests ---

      it('TEST-B5-R2-07: Payment order cannot be verified for unrelated pageId (PAGE_ORDER_MISMATCH) -> 400', async () => {
        setTestAuthResolver(async () => ({ userId: 'owner_shared', role: 'politician' }));
        setTestPageAuthorityResolver(async () => ({ authorized: true, notFound: false }));

        // Create order for page-A
        const orderRes = await app.inject({
          method: 'POST',
          url: '/api/v1/pages/page-A/pro/order',
          payload: { billingCycle: 'monthly' },
        });
        const orderId = JSON.parse(orderRes.payload).orderId;
        const paymentId = 'pay_unrelated_page_test';
        const validSig = crypto
          .createHmac('sha256', secSecret)
          .update(`${orderId}|${paymentId}`)
          .digest('hex');

        // Attempt verify on page-B using order from page-A
        const verifyRes = await app.inject({
          method: 'POST',
          url: '/api/v1/pages/page-B/pro/verify',
          payload: {
            razorpay_order_id: orderId,
            razorpay_payment_id: paymentId,
            razorpay_signature: validSig,
          },
        });
        expect(verifyRes.statusCode).toBe(400);
        const body = JSON.parse(verifyRes.payload);
        expect(body.code).toBe('PAGE_ORDER_MISMATCH');
      });

      it('TEST-B5-R2-08: Payment order cannot be verified by unrelated principal (ORDER_PRINCIPAL_MISMATCH) -> 403', async () => {
        // Create order as legitimate user
        setTestAuthResolver(async () => ({ userId: 'legit_user_8', role: 'politician' }));
        setTestPageAuthorityResolver(async () => ({ authorized: true, notFound: false }));

        const orderRes = await app.inject({
          method: 'POST',
          url: '/api/v1/pages/page-8/pro/order',
          payload: { billingCycle: 'monthly' },
        });
        const orderId = JSON.parse(orderRes.payload).orderId;
        const paymentId = 'pay_principal_mismatch_8';
        const validSig = crypto
          .createHmac('sha256', secSecret)
          .update(`${orderId}|${paymentId}`)
          .digest('hex');

        // Switch to different user trying to claim the order
        setTestAuthResolver(async () => ({ userId: 'different_user_8', role: 'politician' }));
        const verifyRes = await app.inject({
          method: 'POST',
          url: '/api/v1/pages/page-8/pro/verify',
          payload: {
            razorpay_order_id: orderId,
            razorpay_payment_id: paymentId,
            razorpay_signature: validSig,
          },
        });
        expect(verifyRes.statusCode).toBe(403);
        const body = JSON.parse(verifyRes.payload);
        expect(body.code).toBe('ORDER_PRINCIPAL_MISMATCH');
      });

      it('TEST-B5-R2-09: Payment order cannot be re-verified with different payment id (ORDER_ALREADY_CONSUMED) -> 400', async () => {
        setTestAuthResolver(async () => ({ userId: 'owner_9', role: 'politician' }));
        setTestPageAuthorityResolver(async () => ({ authorized: true, notFound: false }));

        const orderRes = await app.inject({
          method: 'POST',
          url: '/api/v1/pages/page-9/pro/order',
          payload: { billingCycle: 'monthly' },
        });
        const orderId = JSON.parse(orderRes.payload).orderId;
        const paymentId1 = 'pay_consumed_1';
        const validSig1 = crypto
          .createHmac('sha256', secSecret)
          .update(`${orderId}|${paymentId1}`)
          .digest('hex');

        // First verification succeeds
        const res1 = await app.inject({
          method: 'POST',
          url: '/api/v1/pages/page-9/pro/verify',
          payload: {
            razorpay_order_id: orderId,
            razorpay_payment_id: paymentId1,
            razorpay_signature: validSig1,
          },
        });
        expect(res1.statusCode).toBe(200);

        // Second verification with different payment ID rejected
        const paymentId2 = 'pay_consumed_2';
        const validSig2 = crypto
          .createHmac('sha256', secSecret)
          .update(`${orderId}|${paymentId2}`)
          .digest('hex');

        const res2 = await app.inject({
          method: 'POST',
          url: '/api/v1/pages/page-9/pro/verify',
          payload: {
            razorpay_order_id: orderId,
            razorpay_payment_id: paymentId2,
            razorpay_signature: validSig2,
          },
        });
        expect(res2.statusCode).toBe(400);
        expect(JSON.parse(res2.payload).code).toBe('ORDER_ALREADY_CONSUMED');
      });

      // --- Existing Security Invariant Tests ---

      it('TEST-W009-B5-SEC-01: Unauthenticated order -> 401 UNAUTHORIZED', async () => {
        const res = await app.inject({
          method: 'POST',
          url: '/api/v1/pages/sec-test-page/pro/order',
          payload: { billingCycle: 'monthly' },
        });

        expect(res.statusCode).toBe(401);
        const body = JSON.parse(res.payload);
        expect(body.code).toBe('UNAUTHORIZED');
      });

      it('TEST-W009-B5-SEC-02: Unauthenticated verify -> 401 UNAUTHORIZED', async () => {
        const res = await app.inject({
          method: 'POST',
          url: '/api/v1/pages/sec-test-page/pro/verify',
          payload: {
            razorpay_order_id: 'order_sec_1',
            razorpay_payment_id: 'pay_sec_1',
            razorpay_signature: 'sig_sec_1',
          },
        });

        expect(res.statusCode).toBe(401);
        const body = JSON.parse(res.payload);
        expect(body.code).toBe('UNAUTHORIZED');
      });

      it('TEST-W009-B5-SEC-05: Missing signature -> 400 MISSING_SIGNATURE', async () => {
        setTestAuthResolver(async () => ({ userId: 'authorized_owner', role: 'politician' }));
        setTestPageAuthorityResolver(async (auth, pageId) => ({
          authorized: true,
          notFound: false,
          page: { id: pageId, owner_id: auth.userId },
        }));

        const res = await app.inject({
          method: 'POST',
          url: '/api/v1/pages/sec-test-page/pro/verify',
          payload: {
            razorpay_order_id: 'order_sec_missing_sig',
            razorpay_payment_id: 'pay_sec_missing_sig',
          },
        });

        expect(res.statusCode).toBe(400);
        const body = JSON.parse(res.payload);
        expect(body.code).toBe('MISSING_SIGNATURE');
      });

      it('TEST-W009-B5-SEC-06: Invalid signature -> 400 INVALID_SIGNATURE', async () => {
        setTestAuthResolver(async () => ({ userId: 'authorized_owner', role: 'politician' }));
        setTestPageAuthorityResolver(async (auth, pageId) => ({
          authorized: true,
          notFound: false,
          page: { id: pageId, owner_id: auth.userId },
        }));

        const res = await app.inject({
          method: 'POST',
          url: '/api/v1/pages/sec-test-page/pro/verify',
          payload: {
            razorpay_order_id: 'order_sec_invalid_sig',
            razorpay_payment_id: 'pay_sec_invalid_sig',
            razorpay_signature: 'bad_signature_hex_value',
          },
        });

        expect(res.statusCode).toBe(400);
        const body = JSON.parse(res.payload);
        expect(body.code).toBe('INVALID_SIGNATURE');
      });

      it('TEST-W009-B5-SEC-08: Missing Razorpay secret -> 500 PROVIDER_CONFIG_ERROR', async () => {
        delete process.env.RAZORPAY_KEY_SECRET;
        setTestAuthResolver(async () => ({ userId: 'authorized_owner', role: 'politician' }));
        setTestPageAuthorityResolver(async (auth, pageId) => ({
          authorized: true,
          notFound: false,
          page: { id: pageId, owner_id: auth.userId },
        }));

        const res = await app.inject({
          method: 'POST',
          url: '/api/v1/pages/sec-test-page/pro/verify',
          payload: {
            razorpay_order_id: 'order_sec_no_secret',
            razorpay_payment_id: 'pay_sec_no_secret',
            razorpay_signature: 'any_signature',
          },
        });

        expect(res.statusCode).toBe(500);
        const body = JSON.parse(res.payload);
        expect(body.code).toBe('PROVIDER_CONFIG_ERROR');
      });

      it('TEST-W009-B5-SEC-09: Invalid signature never mutates pages.is_pro / entitlement', async () => {
        const pageId = 'sec-page-never-mutated-invalid';
        setTestAuthResolver(async () => ({ userId: 'owner_sec_9', role: 'politician' }));
        setTestPageAuthorityResolver(async (auth, pId) => ({
          authorized: true,
          notFound: false,
          page: { id: pId, owner_id: auth.userId },
        }));

        // Check initial entitlement is free
        const initRes = await app.inject({
          method: 'GET',
          url: `/api/v1/pages/${pageId}/entitlement`,
        });
        expect(initRes.statusCode).toBe(200);
        expect(JSON.parse(initRes.payload).isPro).toBe(false);

        // Attempt verify with invalid signature
        const verifyRes = await app.inject({
          method: 'POST',
          url: `/api/v1/pages/${pageId}/pro/verify`,
          payload: {
            razorpay_order_id: 'order_sec_9',
            razorpay_payment_id: 'pay_sec_9',
            razorpay_signature: 'forged_signature_hex',
          },
        });
        expect(verifyRes.statusCode).toBe(400);

        // Check entitlement remains unmutated (free)
        const afterRes = await app.inject({
          method: 'GET',
          url: `/api/v1/pages/${pageId}/entitlement`,
        });
        expect(afterRes.statusCode).toBe(200);
        const afterBody = JSON.parse(afterRes.payload);
        expect(afterBody.isPro).toBe(false);
        expect(afterBody.plan).toBe('free');
      });

      it('TEST-W009-B5-SEC-10: Missing signature never mutates pages.is_pro / entitlement', async () => {
        const pageId = 'sec-page-never-mutated-missing';
        setTestAuthResolver(async () => ({ userId: 'owner_sec_10', role: 'politician' }));
        setTestPageAuthorityResolver(async (auth, pId) => ({
          authorized: true,
          notFound: false,
          page: { id: pId, owner_id: auth.userId },
        }));

        // Check initial entitlement is free
        const initRes = await app.inject({
          method: 'GET',
          url: `/api/v1/pages/${pageId}/entitlement`,
        });
        expect(initRes.statusCode).toBe(200);
        expect(JSON.parse(initRes.payload).isPro).toBe(false);

        // Attempt verify with missing signature
        const verifyRes = await app.inject({
          method: 'POST',
          url: `/api/v1/pages/${pageId}/pro/verify`,
          payload: {
            razorpay_order_id: 'order_sec_10',
            razorpay_payment_id: 'pay_sec_10',
          },
        });
        expect(verifyRes.statusCode).toBe(400);
        expect(JSON.parse(verifyRes.payload).code).toBe('MISSING_SIGNATURE');

        // Check entitlement remains unmutated (free)
        const afterRes = await app.inject({
          method: 'GET',
          url: `/api/v1/pages/${pageId}/entitlement`,
        });
        expect(afterRes.statusCode).toBe(200);
        const afterBody = JSON.parse(afterRes.payload);
        expect(afterBody.isPro).toBe(false);
        expect(afterBody.plan).toBe('free');
      });
    });

    it('TEST-W009-B2-05b: POST /api/v1/campaign/obd/dispatch rejects outside TRAI window with 400 OUTSIDE_TRAI_WINDOW', async () => {
      // Mock Date to 22:00 IST (16:30 UTC)
      const realDate = global.Date;
      const mockNow = new Date('2026-09-18T16:30:00.000Z'); // 22:00 IST
      global.Date = class extends realDate {
        constructor(...args: any[]) {
          super();
          if (args.length > 0) {
            return new (realDate as any)(...args);
          }
          return mockNow;
        }
      } as any;

      try {
        const res = await app.inject({
          method: 'POST',
          url: '/api/v1/campaign/obd/dispatch',
          headers: { 'x-user-id': 'pp1', 'x-user-role': 'politician' },
          payload: {
            campaignId: 'c1',
            politicianId: 'pp1',
            targetSegment: { voterCount: 500, type: 'ward', wardNo: 12 },
          },
        });

        expect(res.statusCode).toBe(400);
        const body = JSON.parse(res.payload);
        expect(body.code).toBe('OUTSIDE_TRAI_WINDOW');
        expect(body.message).toContain('TRAI regulations');
      } finally {
        global.Date = realDate;
      }
    });

    it('TEST-W009-B2-06c: POST /api/v1/webhooks/voice/exotel validates webhook and parses delivery report', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/webhooks/voice/exotel',
        payload: {
          CallSid: 'call_test_123',
          CustomField: 'c1',
          From: '919848012345',
          Status: 'completed',
          Digits: '9',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.status).toBe('acknowledged');
      expect(body.reportParsed).toBe(true);
      expect(body.action).toBe('opt_out_recorded');
    });
  });
});
