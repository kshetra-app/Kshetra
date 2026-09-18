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

describe('W009-B2 Provider Abstraction & Security Gates', () => {
  let app: FastifyInstance;
  const originalSecret = process.env.RAZORPAY_KEY_SECRET;
  const originalKey = process.env.RAZORPAY_KEY_ID;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
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
