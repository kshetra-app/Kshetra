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

export class PaymentProviderError extends Error {
  constructor(
    public readonly code: string,
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'PaymentProviderError';
  }
}

const RAZORPAY_ORDERS_URL = 'https://api.razorpay.com/v1/orders';
const RAZORPAY_PAYMENTS_URL = 'https://api.razorpay.com/v1/payments';
const PROVIDER_REQUEST_TIMEOUT_MS = 10_000;

export class RazorpayProvider implements PaymentProvider {
  private explicitKeyId?: string;
  private explicitKeySecret?: string;

  constructor(keyId?: string, keySecret?: string) {
    this.explicitKeyId = keyId;
    this.explicitKeySecret = keySecret;
  }

  private getKeyId(): string {
    return this.explicitKeyId ?? process.env.RAZORPAY_KEY_ID ?? '';
  }

  private getKeySecret(): string {
    return this.explicitKeySecret ?? process.env.RAZORPAY_KEY_SECRET ?? '';
  }

  isConfigured(): boolean {
    return Boolean(this.getKeyId() && this.getKeySecret());
  }

  getPublicKey(): string {
    return this.getKeyId();
  }

  async createOrder(params: PaymentOrderParams): Promise<PaymentOrderResult> {
    const keyId = this.getKeyId();
    const keySecret = this.getKeySecret();
    if (!keyId || !keySecret) {
      throw new PaymentProviderError(
        'PROVIDER_CONFIG_ERROR',
        503,
        'Payment provider is not configured.',
      );
    }

    const amountINR = params.amountINR;
    const amountPaise = Math.round(amountINR * 100);
    if (
      !Number.isFinite(amountINR) ||
      amountINR <= 0 ||
      !Number.isSafeInteger(amountPaise) ||
      Math.abs(amountINR - amountPaise / 100) > 1e-9
    ) {
      throw new PaymentProviderError(
        'PAYMENT_AMOUNT_INVALID',
        400,
        'Payment amount must be a positive INR amount with at most two decimal places.',
      );
    }

    const currency = (params.currency || 'INR').trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) {
      throw new PaymentProviderError(
        'PAYMENT_CURRENCY_INVALID',
        400,
        'Payment currency must be a three-letter currency code.',
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PROVIDER_REQUEST_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(RAZORPAY_ORDERS_URL, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amountPaise,
          currency,
          ...(params.receipt ? { receipt: params.receipt } : {}),
          ...(params.notes ? { notes: params.notes } : {}),
        }),
        signal: controller.signal,
      });
    } catch (error) {
      const timedOut = (error as Error)?.name === 'AbortError';
      throw new PaymentProviderError(
        timedOut ? 'PAYMENT_PROVIDER_TIMEOUT' : 'PAYMENT_PROVIDER_UNAVAILABLE',
        503,
        timedOut
          ? 'Payment provider did not respond in time.'
          : 'Payment provider is currently unavailable.',
      );
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      throw new PaymentProviderError(
        'PAYMENT_PROVIDER_ERROR',
        502,
        'Payment provider rejected the order request.',
      );
    }

    let razorpayOrder: {
      id?: unknown;
      amount?: unknown;
      currency?: unknown;
      status?: unknown;
    };
    try {
      razorpayOrder = await response.json();
    } catch {
      throw new PaymentProviderError(
        'PAYMENT_PROVIDER_INVALID_RESPONSE',
        502,
        'Payment provider returned an invalid order response.',
      );
    }

    if (
      typeof razorpayOrder.id !== 'string' ||
      !razorpayOrder.id.startsWith('order_') ||
      razorpayOrder.amount !== amountPaise ||
      typeof razorpayOrder.currency !== 'string' ||
      razorpayOrder.currency.toUpperCase() !== currency ||
      razorpayOrder.status !== 'created'
    ) {
      throw new PaymentProviderError(
        'PAYMENT_PROVIDER_INVALID_RESPONSE',
        502,
        'Payment provider returned an invalid order response.',
      );
    }

    return {
      orderId: razorpayOrder.id,
      amountINR,
      amountPaise,
      currency,
      key: keyId,
      isSandbox: keyId.startsWith('rzp_test_'),
      billingCycle: params.billingCycle,
      description: params.pageId
        ? `Kshetra Page Pro (${params.billingCycle || 'monthly'}): ₹${amountINR.toLocaleString('en-IN')}`
        : `Kshetra Campaign Wallet Recharge: ₹${amountINR.toLocaleString('en-IN')}`,
    };
  }

  async verifyPaymentSignature(
    input: PaymentVerificationInput,
  ): Promise<PaymentVerificationResult> {
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

    const secret = this.getKeySecret();
    const keyId = this.getKeyId();
    if (!keyId || !secret) {
      throw new PaymentProviderError(
        'PROVIDER_CONFIG_ERROR',
        503,
        'Payment verification service is not configured.',
      );
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

    if (!valid) {
      return {
        valid: false,
        orderId: input.orderId,
        paymentId: input.paymentId,
        reason: 'INVALID_SIGNATURE',
      };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PROVIDER_REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(
        `${RAZORPAY_PAYMENTS_URL}/${encodeURIComponent(input.paymentId)}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Basic ${Buffer.from(`${keyId}:${secret}`).toString('base64')}`,
            Accept: 'application/json',
          },
          signal: controller.signal,
        },
      );

      if (response.status === 404) {
        return {
          valid: false,
          orderId: input.orderId,
          paymentId: input.paymentId,
          reason: 'PAYMENT_NOT_FOUND',
        };
      }

      if (!response.ok) {
        throw new PaymentProviderError(
          response.status >= 500 || response.status === 429
            ? 'PAYMENT_PROVIDER_UNAVAILABLE'
            : 'PAYMENT_PROVIDER_ERROR',
          response.status >= 500 || response.status === 429 ? 503 : 502,
          'Payment provider could not confirm the payment status.',
        );
      }

      let payment: {
        id?: unknown;
        order_id?: unknown;
        amount?: unknown;
        amount_refunded?: unknown;
        currency?: unknown;
        status?: unknown;
        captured?: unknown;
      };
      try {
        payment = await response.json();
      } catch (error) {
        if ((error as Error)?.name === 'AbortError') {
          throw new PaymentProviderError(
            'PAYMENT_PROVIDER_TIMEOUT',
            503,
            'Payment provider did not respond in time.',
          );
        }
        throw new PaymentProviderError(
          'PAYMENT_PROVIDER_INVALID_RESPONSE',
          502,
          'Payment provider returned an invalid payment response.',
        );
      }

      const expectedCurrency = (input.expectedCurrency || 'INR').toUpperCase();
      if (
        typeof payment.id !== 'string' ||
        payment.id !== input.paymentId ||
        typeof payment.order_id !== 'string' ||
        payment.order_id !== input.orderId ||
        !Number.isSafeInteger(payment.amount) ||
        (input.expectedAmountPaise !== undefined && payment.amount !== input.expectedAmountPaise) ||
        typeof payment.currency !== 'string' ||
        payment.currency.toUpperCase() !== expectedCurrency
      ) {
        return {
          valid: false,
          orderId: input.orderId,
          paymentId: input.paymentId,
          reason: payment.order_id !== input.orderId
            ? 'ORDER_MISMATCH'
            : input.expectedAmountPaise !== undefined && payment.amount !== input.expectedAmountPaise
              ? 'AMOUNT_MISMATCH'
              : typeof payment.currency === 'string' && payment.currency.toUpperCase() !== expectedCurrency
                ? 'CURRENCY_MISMATCH'
                : 'PAYMENT_DETAILS_MISMATCH',
        };
      }

      if (Number(payment.amount_refunded || 0) > 0) {
        return {
          valid: false,
          orderId: input.orderId,
          paymentId: input.paymentId,
          reason: 'PAYMENT_REFUNDED',
        };
      }

      if (payment.status !== 'captured' || payment.captured !== true) {
        return {
          valid: false,
          orderId: input.orderId,
          paymentId: input.paymentId,
          reason: 'PAYMENT_NOT_CAPTURED',
        };
      }

      return {
        valid: true,
        orderId: input.orderId,
        paymentId: input.paymentId,
      };
    } catch (error) {
      if (error instanceof PaymentProviderError) throw error;
      const timedOut = (error as Error)?.name === 'AbortError';
      throw new PaymentProviderError(
        timedOut ? 'PAYMENT_PROVIDER_TIMEOUT' : 'PAYMENT_PROVIDER_UNAVAILABLE',
        503,
        timedOut
          ? 'Payment provider did not respond in time.'
          : 'Payment provider is currently unavailable.',
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  verifyWebhookSignature(
    rawBody: string | Buffer,
    signature: string,
    secretOverride?: string,
  ): boolean {
    const secret = secretOverride || process.env.RAZORPAY_WEBHOOK_SECRET || this.getKeySecret();
    if (!secret || !signature) {
      return false;
    }

    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

    const expectedBuffer = Buffer.from(expected, 'utf-8');
    const actualBuffer = Buffer.from(signature, 'utf-8');

    if (expectedBuffer.length !== actualBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
  }
}
