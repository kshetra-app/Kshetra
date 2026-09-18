/**
 * Test-Only Mock Providers
 * W009-B2: Bounded Provider Abstraction (Razorpay & Voice OBD)
 *
 * IMPORTANT:
 * These mocks are strictly for automated testing and simulation environments.
 * They are protected with guard assertions to PREVENT use as production fallbacks.
 */

import crypto from 'node:crypto';
import type {
  PaymentOrderParams,
  PaymentOrderResult,
  PaymentVerificationInput,
  PaymentVerificationResult,
  PaymentProvider,
  VoiceObdProvider,
  TraiWindowCheckResult,
  ObdDispatchParams,
  ObdDispatchResult,
  ObdDeliveryReport,
} from './types';

function assertNotProduction(context: string): void {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`SECURITY_VIOLATION: Mock provider '${context}' cannot be instantiated or used in production environment!`);
  }
}

export class MockPaymentProvider implements PaymentProvider {
  private secret: string;
  public simulateConfigError: boolean = false;
  public simulateInvalidSignature: boolean = false;

  constructor(secret: string = 'mock_secret_key_12345') {
    assertNotProduction('MockPaymentProvider');
    this.secret = secret;
  }

  isConfigured(): boolean {
    return !this.simulateConfigError;
  }

  getPublicKey(): string {
    return 'rzp_mock_key_id';
  }

  async createOrder(params: PaymentOrderParams): Promise<PaymentOrderResult> {
    assertNotProduction('createOrder');
    const amountINR = params.amountINR;
    return {
      orderId: `mock_order_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      amountINR,
      amountPaise: amountINR * 100,
      currency: params.currency || 'INR',
      key: this.getPublicKey(),
      isSandbox: true,
      billingCycle: params.billingCycle,
      description: `Mock Order ₹${amountINR}`,
      prefill: {
        name: 'Mock User',
        contact: '9999999999',
      },
    };
  }

  async verifyPaymentSignature(input: PaymentVerificationInput): Promise<PaymentVerificationResult> {
    assertNotProduction('verifyPaymentSignature');
    if (this.simulateConfigError) {
      throw new Error('PROVIDER_CONFIG_ERROR: Payment verification service configuration missing (RAZORPAY_KEY_SECRET)');
    }

    if (input.sandboxBypass) {
      return {
        valid: true,
        orderId: input.orderId,
        paymentId: input.paymentId,
      };
    }

    if (!input.signature) {
      return {
        valid: false,
        orderId: input.orderId,
        paymentId: input.paymentId,
        reason: 'MISSING_SIGNATURE',
      };
    }

    if (this.simulateInvalidSignature) {
      return {
        valid: false,
        orderId: input.orderId,
        paymentId: input.paymentId,
        reason: 'INVALID_SIGNATURE',
      };
    }

    const expected = crypto
      .createHmac('sha256', this.secret)
      .update(`${input.orderId}|${input.paymentId}`)
      .digest('hex');

    const valid = expected === input.signature;
    return {
      valid,
      orderId: input.orderId,
      paymentId: input.paymentId,
      reason: valid ? undefined : 'INVALID_SIGNATURE',
    };
  }

  verifyWebhookSignature(rawBody: string | Buffer, signature: string, secretOverride?: string): boolean {
    assertNotProduction('verifyWebhookSignature');
    const secret = secretOverride || this.secret;
    const expected = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');
    return expected === signature;
  }
}

export class MockVoiceObdProvider implements VoiceObdProvider {
  public simulatedISTHour?: number;
  public simulateTimeout: boolean = false;
  public simulateCarrierError: boolean = false;

  constructor() {
    assertNotProduction('MockVoiceObdProvider');
  }

  isWithinTraiCallingWindow(referenceTime?: Date): TraiWindowCheckResult {
    assertNotProduction('isWithinTraiCallingWindow');
    let currentISTHour: number;
    if (this.simulatedISTHour !== undefined) {
      currentISTHour = this.simulatedISTHour;
    } else {
      const now = referenceTime || new Date();
      const istMinutes = (now.getUTCHours() * 60 + now.getUTCMinutes() + 330) % 1440;
      currentISTHour = Math.floor(istMinutes / 60);
    }

    const permitted = currentISTHour >= 8 && currentISTHour < 21;
    return {
      permitted,
      currentISTHour,
      message: permitted
        ? undefined
        : `TRAI regulations restrict automated political calls to 8:00 AM – 9:00 PM IST (Current IST hour: ${currentISTHour}:00). Calls will be scheduled for delivery at 8:00 AM tomorrow.`,
    };
  }

  async dispatchBroadcast(params: ObdDispatchParams): Promise<ObdDispatchResult> {
    assertNotProduction('dispatchBroadcast');
    const traiCheck = this.isWithinTraiCallingWindow();
    if (!traiCheck.permitted) {
      return {
        success: false,
        error: 'OUTSIDE_TRAI_WINDOW',
        warning: traiCheck.message,
      };
    }

    if (this.simulateTimeout) {
      return {
        success: false,
        error: 'CARRIER_TIMEOUT: Carrier response timed out after 10000ms',
      };
    }

    if (this.simulateCarrierError) {
      return {
        success: false,
        error: 'CARRIER_ERROR: Gateway rejected outbound connect request',
      };
    }

    return {
      success: true,
      callSid: `mock_call_${Date.now().toString(36)}`,
      providerRef: `mock_exo_${params.campaignId}`,
    };
  }

  validateWebhook(request: { headers: Record<string, any>; body: any }): boolean {
    assertNotProduction('validateWebhook');
    return Boolean(request.body && typeof request.body === 'object');
  }

  parseDeliveryReport(body: Record<string, any>): ObdDeliveryReport {
    assertNotProduction('parseDeliveryReport');
    const digits = body.Digits;
    let status: ObdDeliveryReport['status'] = 'other';
    if (body.Status === 'completed') status = 'completed';
    else if (body.Status === 'busy') status = 'busy';
    else if (body.Status === 'failed') status = 'unreachable';
    else if (body.Status === 'in-progress') status = 'answered';

    return {
      raw: body,
      callSid: body.CallSid,
      broadcastId: body.CustomField,
      callerPhone: body.From || body.To,
      status,
      duration: body.Duration ? Number(body.Duration) : undefined,
      digits,
      isOptOut: digits === '9',
      isIvrResponse: Boolean(digits && ['1', '2'].includes(digits)),
    };
  }
}
