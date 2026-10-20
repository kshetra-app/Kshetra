import crypto from 'node:crypto';
import { MockPaymentProvider, MockVoiceObdProvider } from '../providers/mockProvider';
import { TelecomProvider } from '../providers/telecomProvider';
import * as obdTelecomService from '../services/outreach/obdTelecomService';
import type { ObdDispatchParams } from '../providers/types';

function makeDispatchParams(overrides: Partial<ObdDispatchParams> = {}): ObdDispatchParams {
  return {
    campaignId: 'cmp_1',
    politicianId: 'pol_1',
    title: 'Test Broadcast',
    audioUrl: 'https://cdn.example.com/audio.mp3',
    targetSegment: {
      type: 'ward',
      voterCount: 100,
      phoneNumbers: ['9876543210'],
    },
    ratePerCallINR: 1.5,
    ...overrides,
  };
}

describe('Providers Comprehensive Unit Tests', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('MockPaymentProvider', () => {
    it('throws SECURITY_VIOLATION in production environment', () => {
      process.env.NODE_ENV = 'production';
      expect(() => new MockPaymentProvider()).toThrow('SECURITY_VIOLATION: Mock provider');
    });

    it('reports configured state correctly and toggles with simulateConfigError', () => {
      process.env.NODE_ENV = 'test';
      const provider = new MockPaymentProvider('test-secret');
      expect(provider.isConfigured()).toBe(true);
      expect(provider.getPublicKey()).toBe('rzp_mock_key_id');

      provider.simulateConfigError = true;
      expect(provider.isConfigured()).toBe(false);
    });

    it('creates mock order with correct parameters and currency fallback', async () => {
      process.env.NODE_ENV = 'test';
      const provider = new MockPaymentProvider('test-secret');
      const order = await provider.createOrder({
        amountINR: 500,
        billingCycle: 'monthly',
      });

      expect(order.orderId).toMatch(/^mock_order_/);
      expect(order.amountINR).toBe(500);
      expect(order.amountPaise).toBe(50000);
      expect(order.currency).toBe('INR');
      expect(order.billingCycle).toBe('monthly');
      expect(order.isSandbox).toBe(true);
      expect(order.key).toBe('rzp_mock_key_id');
      expect(order.description).toContain('₹500');
    });

    it('verifies payment signature with sandbox bypass', async () => {
      process.env.NODE_ENV = 'test';
      const provider = new MockPaymentProvider('test-secret');
      const result = await provider.verifyPaymentSignature({
        orderId: 'ord_1',
        paymentId: 'pay_1',
        sandboxBypass: true,
      });

      expect(result.valid).toBe(true);
      expect(result.orderId).toBe('ord_1');
      expect(result.paymentId).toBe('pay_1');
    });

    it('rejects verification when signature is missing', async () => {
      process.env.NODE_ENV = 'test';
      const provider = new MockPaymentProvider('test-secret');
      const result = await provider.verifyPaymentSignature({
        orderId: 'ord_1',
        paymentId: 'pay_1',
      });

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('MISSING_SIGNATURE');
    });

    it('throws error when simulateConfigError is true during verification', async () => {
      process.env.NODE_ENV = 'test';
      const provider = new MockPaymentProvider('test-secret');
      provider.simulateConfigError = true;

      await expect(
        provider.verifyPaymentSignature({
          orderId: 'ord_1',
          paymentId: 'pay_1',
          signature: 'sig',
        })
      ).rejects.toThrow('PROVIDER_CONFIG_ERROR');
    });

    it('rejects verification when simulateInvalidSignature is true', async () => {
      process.env.NODE_ENV = 'test';
      const provider = new MockPaymentProvider('test-secret');
      provider.simulateInvalidSignature = true;

      const result = await provider.verifyPaymentSignature({
        orderId: 'ord_1',
        paymentId: 'pay_1',
        signature: 'any-sig',
      });

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('INVALID_SIGNATURE');
    });

    it('validates authentic signature and rejects altered signature', async () => {
      process.env.NODE_ENV = 'test';
      const secret = 'mock_secret_key_12345';
      const provider = new MockPaymentProvider(secret);
      const orderId = 'ord_match';
      const paymentId = 'pay_match';

      const validSig = crypto
        .createHmac('sha256', secret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      const okResult = await provider.verifyPaymentSignature({
        orderId,
        paymentId,
        signature: validSig,
      });
      expect(okResult.valid).toBe(true);
      expect(okResult.reason).toBeUndefined();

      const badResult = await provider.verifyPaymentSignature({
        orderId,
        paymentId,
        signature: 'deadbeef_invalid_signature',
      });
      expect(badResult.valid).toBe(false);
      expect(badResult.reason).toBe('INVALID_SIGNATURE');
    });

    it('verifies webhook signatures with and without secret override', () => {
      process.env.NODE_ENV = 'test';
      const defaultSecret = 'def-secret';
      const overrideSecret = 'override-secret';
      const provider = new MockPaymentProvider(defaultSecret);
      const payload = '{"event":"payment.captured"}';

      const sigDefault = crypto.createHmac('sha256', defaultSecret).update(payload).digest('hex');
      const sigOverride = crypto.createHmac('sha256', overrideSecret).update(payload).digest('hex');

      expect(provider.verifyWebhookSignature(payload, sigDefault)).toBe(true);
      expect(provider.verifyWebhookSignature(payload, 'wrong')).toBe(false);
      expect(provider.verifyWebhookSignature(payload, sigOverride, overrideSecret)).toBe(true);
    });
  });

  describe('MockVoiceObdProvider', () => {
    it('throws SECURITY_VIOLATION in production environment', () => {
      process.env.NODE_ENV = 'production';
      expect(() => new MockVoiceObdProvider()).toThrow('SECURITY_VIOLATION: Mock provider');
    });

    it('evaluates TRAI calling window with simulatedISTHour and fallback to current time', () => {
      process.env.NODE_ENV = 'test';
      const provider = new MockVoiceObdProvider();

      provider.simulatedISTHour = 10;
      const dayCheck = provider.isWithinTraiCallingWindow();
      expect(dayCheck.permitted).toBe(true);
      expect(dayCheck.currentISTHour).toBe(10);
      expect(dayCheck.message).toBeUndefined();

      provider.simulatedISTHour = 22;
      const nightCheck = provider.isWithinTraiCallingWindow();
      expect(nightCheck.permitted).toBe(false);
      expect(nightCheck.currentISTHour).toBe(22);
      expect(nightCheck.message).toContain('TRAI regulations restrict automated political calls');

      // Test fallback when simulatedISTHour is undefined
      provider.simulatedISTHour = undefined;
      const fallbackCheck = provider.isWithinTraiCallingWindow(new Date('2026-10-21T06:00:00Z'));
      expect(typeof fallbackCheck.permitted).toBe('boolean');
      expect(typeof fallbackCheck.currentISTHour).toBe('number');
    });

    it('dispatches broadcast or rejects based on simulation flags', async () => {
      process.env.NODE_ENV = 'test';
      const provider = new MockVoiceObdProvider();

      // Case 1: Outside TRAI window
      provider.simulatedISTHour = 4;
      const outsideResult = await provider.dispatchBroadcast(makeDispatchParams({
        campaignId: 'cmp_1',
      }));
      expect(outsideResult.success).toBe(false);
      expect(outsideResult.error).toBe('OUTSIDE_TRAI_WINDOW');

      // Case 2: Inside window, simulateTimeout
      provider.simulatedISTHour = 12;
      provider.simulateTimeout = true;
      const timeoutResult = await provider.dispatchBroadcast(makeDispatchParams({
        campaignId: 'cmp_1',
      }));
      expect(timeoutResult.success).toBe(false);
      expect(timeoutResult.error).toContain('CARRIER_TIMEOUT');

      // Case 3: Inside window, simulateCarrierError
      provider.simulateTimeout = false;
      provider.simulateCarrierError = true;
      const carrierErrResult = await provider.dispatchBroadcast(makeDispatchParams({
        campaignId: 'cmp_1',
      }));
      expect(carrierErrResult.success).toBe(false);
      expect(carrierErrResult.error).toContain('CARRIER_ERROR');

      // Case 4: Inside window, normal success
      provider.simulateCarrierError = false;
      const successResult = await provider.dispatchBroadcast(makeDispatchParams({
        campaignId: 'cmp_1',
      }));
      expect(successResult.success).toBe(true);
      expect(successResult.callSid).toMatch(/^mock_call_/);
      expect(successResult.providerRef).toBe('mock_exo_cmp_1');
    });

    it('validates webhook requests properly', () => {
      process.env.NODE_ENV = 'test';
      const provider = new MockVoiceObdProvider();

      expect(provider.validateWebhook({ headers: {}, body: null })).toBe(false);
      expect(provider.validateWebhook({ headers: {}, body: 'string-payload' })).toBe(false);
      expect(provider.validateWebhook({ headers: {}, body: { CallSid: '123' } })).toBe(true);
    });

    it('parses delivery report across diverse statuses and IVR digits', () => {
      process.env.NODE_ENV = 'test';
      const provider = new MockVoiceObdProvider();

      // Busy status
      const busyReport = provider.parseDeliveryReport({
        CallSid: 'call_b',
        CustomField: 'cmp_b',
        To: '919876543210',
        Status: 'busy',
        Duration: '0',
      });
      expect(busyReport.status).toBe('busy');
      expect(busyReport.callerPhone).toBe('919876543210');
      expect(busyReport.duration).toBe(0);

      // Failed status -> unreachable
      const failReport = provider.parseDeliveryReport({
        CallSid: 'call_f',
        From: '919876543211',
        Status: 'failed',
      });
      expect(failReport.status).toBe('unreachable');
      expect(failReport.duration).toBeUndefined();

      // In-progress status -> answered
      const inProgReport = provider.parseDeliveryReport({
        CallSid: 'call_ip',
        From: '919876543212',
        Status: 'in-progress',
        Digits: '2',
      });
      expect(inProgReport.status).toBe('answered');
      expect(inProgReport.isIvrResponse).toBe(true);
      expect(inProgReport.isOptOut).toBe(false);

      // Unknown status -> other
      const otherReport = provider.parseDeliveryReport({
        CallSid: 'call_oth',
        Status: 'ringing',
        Digits: '9',
      });
      expect(otherReport.status).toBe('other');
      expect(otherReport.isOptOut).toBe(true);
    });
  });

  describe('TelecomProvider Coverage Hardening', () => {
    it('validates webhook rejecting null or primitive bodies', () => {
      const provider = new TelecomProvider();
      expect(provider.validateWebhook({ headers: {}, body: null })).toBe(false);
      expect(provider.validateWebhook({ headers: {}, body: 'primitive' })).toBe(false);
      expect(provider.validateWebhook({ headers: {}, body: { CallSid: 'c1' } })).toBe(true);
    });

    it('evaluates TRAI calling window without arguments', () => {
      const provider = new TelecomProvider();
      const check = provider.isWithinTraiCallingWindow();
      expect(typeof check.permitted).toBe('boolean');
      expect(typeof check.currentISTHour).toBe('number');
    });

    it('rejects dispatchBroadcast when outside TRAI window', async () => {
      const provider = new TelecomProvider();
      jest.spyOn(provider, 'isWithinTraiCallingWindow').mockReturnValue({
        permitted: false,
        currentISTHour: 23,
        message: 'TRAI restricted',
      });

      const result = await provider.dispatchBroadcast(makeDispatchParams());
      expect(result.success).toBe(false);
      expect(result.error).toBe('OUTSIDE_TRAI_WINDOW');
    });

    it('returns simulation queued warning when telecom credentials are not configured', async () => {
      const provider = new TelecomProvider({});
      jest.spyOn(provider, 'isWithinTraiCallingWindow').mockReturnValue({
        permitted: true,
        currentISTHour: 10,
      });

      const result = await provider.dispatchBroadcast(makeDispatchParams());
      expect(result.success).toBe(true);
      expect(result.warning).toContain('TELECOM_CREDENTIALS_REQUIRED');
    });

    it('parses delivery report for completed, busy, and in-progress statuses', () => {
      const provider = new TelecomProvider();

      const completed = provider.parseDeliveryReport({ Status: 'completed', CallSid: 'c_comp', Duration: '45' });
      expect(completed.status).toBe('completed');
      expect(completed.duration).toBe(45);

      const busy = provider.parseDeliveryReport({ Status: 'busy', CallSid: 'c_busy' });
      expect(busy.status).toBe('busy');

      const inProg = provider.parseDeliveryReport({ Status: 'in-progress', CallSid: 'c_prog' });
      expect(inProg.status).toBe('answered');
    });

    it('parses delivery report for no-answer status and missing duration', () => {
      const provider = new TelecomProvider();
      const report = provider.parseDeliveryReport({
        CallSid: 'sid_na',
        CustomField: 'cmp_na',
        To: '919999999999',
        Status: 'no-answer',
      });
      expect(report.status).toBe('unreachable');
      expect(report.duration).toBeUndefined();
    });

    it('suppresses call when recipient has opted out', async () => {
      const provider = new TelecomProvider({
        apiKey: 'test-key',
        apiToken: 'test-tok',
        accountSid: 'test-acc',
      });

      jest.spyOn(provider, 'isWithinTraiCallingWindow').mockReturnValue({
        permitted: true,
        currentISTHour: 11,
      });

      jest.spyOn(obdTelecomService, 'isNumberOptedOut').mockResolvedValue(true);

      const result = await provider.dispatchBroadcast(makeDispatchParams({
        campaignId: 'cmp_opt',
        targetSegment: {
          type: 'ward',
          voterCount: 1,
          phoneNumbers: ['919999999999'],
        },
      }));

      expect(result.success).toBe(true);
      expect(result.warning).toContain('Recipient has opted out under TRAI regulations');
    });

    it('successfully dispatches broadcast via mocked fetch', async () => {
      const provider = new TelecomProvider({
        apiKey: 'test-key',
        apiToken: 'test-tok',
        accountSid: 'test-acc',
        statusCallbackUrl: 'https://api.example.com/status',
      });

      jest.spyOn(provider, 'isWithinTraiCallingWindow').mockReturnValue({
        permitted: true,
        currentISTHour: 11,
      });

      jest.spyOn(obdTelecomService, 'isNumberOptedOut').mockResolvedValue(false);

      const fetchSpy = jest.spyOn(global, 'fetch' as any).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          Call: {
            Sid: 'call_exotel_live_999',
          },
        }),
      } as any);

      const result = await provider.dispatchBroadcast(makeDispatchParams({
        campaignId: 'cmp_live',
        targetSegment: {
          type: 'ward',
          voterCount: 1,
          phoneNumbers: ['919876543210'],
        },
      }));

      expect(result.success).toBe(true);
      expect(result.callSid).toBe('call_exotel_live_999');
      expect(fetchSpy).toHaveBeenCalled();
      fetchSpy.mockRestore();
    });

    it('handles HTTP error response from Exotel API', async () => {
      const provider = new TelecomProvider({
        apiKey: 'test-key',
        apiToken: 'test-tok',
        accountSid: 'test-acc',
      });

      jest.spyOn(provider, 'isWithinTraiCallingWindow').mockReturnValue({
        permitted: true,
        currentISTHour: 11,
      });

      jest.spyOn(obdTelecomService, 'isNumberOptedOut').mockResolvedValue(false);

      const fetchSpy = jest.spyOn(global, 'fetch' as any).mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({
          RestException: {
            Message: 'Authentication credentials rejected by carrier',
          },
        }),
      } as any);

      const result = await provider.dispatchBroadcast(makeDispatchParams({
        campaignId: 'cmp_fail',
        targetSegment: {
          type: 'ward',
          voterCount: 0,
          phoneNumbers: [],
        },
      }));

      expect(result.success).toBe(false);
      expect(result.error).toBe('Authentication credentials rejected by carrier');
      fetchSpy.mockRestore();
    });

    it('handles network timeout and AbortError gracefully', async () => {
      const provider = new TelecomProvider({
        apiKey: 'test-key',
        apiToken: 'test-tok',
        accountSid: 'test-acc',
      });

      jest.spyOn(provider, 'isWithinTraiCallingWindow').mockReturnValue({
        permitted: true,
        currentISTHour: 11,
      });

      jest.spyOn(obdTelecomService, 'isNumberOptedOut').mockResolvedValue(false);

      const abortError = new Error('The user aborted a request.');
      abortError.name = 'AbortError';

      const fetchSpy = jest.spyOn(global, 'fetch' as any).mockRejectedValue(abortError);

      const result = await provider.dispatchBroadcast(makeDispatchParams({
        campaignId: 'cmp_timeout',
        targetSegment: {
          type: 'ward',
          voterCount: 1,
          phoneNumbers: ['919876543210'],
        },
      }));

      expect(result.success).toBe(false);
      expect(result.error).toContain('CARRIER_TIMEOUT');
      fetchSpy.mockRestore();
    });
  });
});
