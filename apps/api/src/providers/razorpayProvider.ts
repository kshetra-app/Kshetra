/**
 * Razorpay Payment Provider Implementation
 * W009-B2: Bounded Provider Abstraction (Razorpay & Voice OBD)
 */

import crypto from 'node:crypto';
import type {
  PaymentOrderParams,
  PaymentOrderResult,
  PaymentVerificationInput,
  PaymentVerificationResult,
  PaymentProvider,
} from './types';

export class RazorpayProvider implements PaymentProvider {
  private keyId: string;
  private keySecret: string;

  constructor(keyId?: string, keySecret?: string) {
    this.keyId = keyId ?? process.env.RAZORPAY_KEY_ID ?? '';
    this.keySecret = keySecret ?? process.env.RAZORPAY_KEY_SECRET ?? '';
  }

  isConfigured(): boolean {
    return Boolean(this.keyId && this.keySecret);
  }

  getPublicKey(): string {
    return this.keyId || 'rzp_test_placeholderKey123';
  }

  async createOrder(params: PaymentOrderParams): Promise<PaymentOrderResult> {
    const amountINR = params.amountINR;
    const amountPaise = amountINR * 100;
    const currency = params.currency || 'INR';
    const orderId = `order_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    return {
      orderId,
      amountINR,
      amountPaise,
      currency,
      key: this.getPublicKey(),
      isSandbox: !this.keyId,
      billingCycle: params.billingCycle,
      description: params.pageId
        ? `Kshetra Page Pro (${params.billingCycle || 'monthly'}): ₹${amountINR.toLocaleString('en-IN')}`
        : `Kshetra Campaign Wallet Recharge: ₹${amountINR.toLocaleString('en-IN')}`,
      prefill: {
        name: 'Campaign Manager',
        contact: '9848012345',
      },
    };
  }

  async verifyPaymentSignature(input: PaymentVerificationInput): Promise<PaymentVerificationResult> {
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

    const secret = this.keySecret || process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      throw new Error('PROVIDER_CONFIG_ERROR: Payment verification service configuration missing (RAZORPAY_KEY_SECRET)');
    }

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${input.orderId}|${input.paymentId}`)
      .digest('hex');

    const expectedBuffer = Buffer.from(expectedSignature, 'utf-8');
    const actualBuffer = Buffer.from(input.signature, 'utf-8');

    let valid = false;
    if (expectedBuffer.length === actualBuffer.length) {
      valid = crypto.timingSafeEqual(expectedBuffer, actualBuffer);
    }

    return {
      valid,
      orderId: input.orderId,
      paymentId: input.paymentId,
      reason: valid ? undefined : 'INVALID_SIGNATURE',
    };
  }

  verifyWebhookSignature(rawBody: string | Buffer, signature: string, secretOverride?: string): boolean {
    const secret = secretOverride || process.env.RAZORPAY_WEBHOOK_SECRET || this.keySecret;
    if (!secret || !signature) {
      return false;
    }

    const expected = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    const expectedBuffer = Buffer.from(expected, 'utf-8');
    const actualBuffer = Buffer.from(signature, 'utf-8');

    if (expectedBuffer.length !== actualBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
  }
}
