/**
 * apps/api/src/modules/saasOnboarding/billingService.ts
 *
 * Milestone W051 — B2B Political SaaS Customer Acquisition & Developer Portal
 * Commercial plan catalog, payment provider checkout, signature verification, and webhook handling.
 */

import crypto from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  SaasBillingPlan,
  SaasBillingCheckoutResponse,
  SaasBillingVerifyResponse,
  SaasTenantTier,
  SaasTierRateLimits,
} from '@kshetra/shared';
import { SAAS_TIER_LIMITS, SAAS_TIER_KEY_LIMITS } from '@kshetra/shared';
import { supabase } from '../../lib/supabase';
import { RazorpayProvider } from '../../providers/razorpayProvider';
import type { CheckoutBody, VerifyPaymentBody } from './schemas';

const SAAS_PLANS: SaasBillingPlan[] = [
  {
    id: 'free',
    name: 'Community / Developer',
    tagline: 'Ideal for civic developers, academic researchers, and prototyping.',
    priceINR: 0,
    priceUSD: 0,
    billingCycles: ['monthly'],
    annualDiscountPercentage: 0,
    rateLimits: SAAS_TIER_LIMITS.free,
    maxActiveKeys: SAAS_TIER_KEY_LIMITS.free,
    features: [
      'Read-only access to statutory electoral geography (36 States & UTs)',
      'Canonical political parties & organization profiles (107 parties)',
      'Assembly and Parliamentary constituency statutory seat boundaries',
      'Standard burst rate limiting (60 requests per minute)',
      '10,000 monthly request quota',
      'Community issue tracker & documentation support',
    ],
  },
  {
    id: 'pro',
    name: 'Professional / Media / Civic Tech',
    tagline: 'Built for newsrooms, political analysts, campaign analytics, and active civic platforms.',
    priceINR: 4999,
    priceUSD: 59,
    billingCycles: ['monthly', 'annual'],
    annualDiscountPercentage: 17, // ₹49,990/yr instead of ₹59,988
    rateLimits: SAAS_TIER_LIMITS.pro,
    maxActiveKeys: SAAS_TIER_KEY_LIMITS.pro,
    isPopular: true,
    features: [
      'Full national electoral geography (543 PCs, 4,123 ACs, statutory mappings)',
      'Canonical persons (9,083) and candidacies (11,298)',
      'Form 26 candidate affidavits & disclosures (4,523 official records)',
      'Constituency demographics & census statistics across all 4,123 ACs',
      'Assam 2008 -> 2023 statutory delimitation succession lineage',
      'Outbound webhook events dispatching with cryptographic HMAC signing',
      'High-throughput burst capacity (600 requests per minute)',
      '500,000 monthly request quota',
      'Priority email & developer technical support',
    ],
  },
  {
    id: 'enterprise',
    name: 'Institutional / Broadcasters',
    tagline: 'Mission-critical scale for television networks, national think tanks, and large organizations.',
    priceINR: 49999,
    priceUSD: 599,
    billingCycles: ['monthly', 'annual'],
    annualDiscountPercentage: 17, // ₹499,990/yr instead of ₹599,988
    rateLimits: SAAS_TIER_LIMITS.enterprise,
    maxActiveKeys: SAAS_TIER_KEY_LIMITS.enterprise,
    features: [
      'Everything included in the Professional plan',
      'Governed Delimitation Simulation Engine (Hare-Niemeyer constitutional models)',
      'Real-time Delimitation Watch Engine 8-stage lifecycle feeds',
      'Ultra high-throughput burst capacity (3,000 requests per minute)',
      '10,000,000 monthly request quota',
      'Up to 20 active cryptographic API keys with granular scope segregation',
      'Custom webhook retry tuning, dedicated delivery pools & IP pinning',
      'Dedicated technical account manager & 99.9% uptime SLA',
    ],
  },
];

export class BillingService {
  private paymentProvider: RazorpayProvider;
  private dbClient: any = supabase;

  constructor(paymentProvider?: RazorpayProvider) {
    this.paymentProvider = paymentProvider || new RazorpayProvider();
  }

  setDbClient(client: any): void {
    this.dbClient = client;
  }

  /**
   * Returns public catalog of available tiers, pricing, and features.
   */
  getPlans(): SaasBillingPlan[] {
    return SAAS_PLANS;
  }

  /**
   * Generates a payment order / checkout session for upgrading to Pro or Enterprise.
   */
  async createCheckoutSession(
    tenantId: string,
    params: CheckoutBody,
    client: any = this.dbClient,
  ): Promise<SaasBillingCheckoutResponse> {
    const { targetTier, billingCycle } = params;

    // 1. Fetch Tenant Context
    const { data: tenant, error } = await client
      .from('saas_tenants')
      .select('id, name, slug, tier, status, contact_email')
      .eq('id', tenantId)
      .single();

    if (error || !tenant) {
      throw new Error(`Tenant not found: ${error?.message || 'Invalid tenant context'}`);
    }

    if (tenant.tier === targetTier) {
      const err: any = new Error(`Tenant organization is already subscribed to the '${targetTier}' tier.`);
      err.statusCode = 400;
      err.code = 'ALREADY_SUBSCRIBED';
      throw err;
    }

    // 2. Compute Amount
    let amountINR = 4999;
    if (targetTier === 'pro') {
      amountINR = billingCycle === 'annual' ? 49990 : 4999;
    } else if (targetTier === 'enterprise') {
      amountINR = billingCycle === 'annual' ? 499990 : 49999;
    }

    // 3. Create Provider Order
    const receipt = `rcpt_${tenant.slug.slice(0, 16)}_${Date.now()}`;
    const orderResult = await this.paymentProvider.createOrder({
      amountINR,
      currency: 'INR',
      billingCycle,
      receipt,
      notes: {
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
        targetTier,
        billingCycle,
      },
    });

    return {
      orderId: orderResult.orderId,
      targetTier,
      billingCycle,
      amountINR: orderResult.amountINR,
      amountPaise: orderResult.amountPaise,
      currency: orderResult.currency,
      razorpayKeyId: orderResult.key,
      isSandbox: orderResult.isSandbox,
      tenantSlug: tenant.slug,
      notes: {
        tenantId: tenant.id,
        targetTier,
        billingCycle,
      },
    };
  }

  /**
   * Verifies client-submitted payment signature and upgrades tenant tier.
   */
  async verifyPayment(
    tenantId: string,
    params: VerifyPaymentBody,
    client: any = this.dbClient,
  ): Promise<SaasBillingVerifyResponse> {
    const { orderId, paymentId, signature, targetTier, billingCycle = 'monthly' } = params;

    // 1. Cryptographic Signature Verification
    const verification = await this.paymentProvider.verifyPaymentSignature({
      orderId,
      paymentId,
      signature,
    });

    if (!verification.valid) {
      const err: any = new Error(
        `Cryptographic payment signature verification failed: ${verification.reason || 'Invalid signature'}`,
      );
      err.statusCode = 400;
      err.code = 'INVALID_PAYMENT_SIGNATURE';
      throw err;
    }

    // 2. Fetch Tenant
    const { data: tenant, error: tenantErr } = await client
      .from('saas_tenants')
      .select('id, slug, tier, metadata')
      .eq('id', tenantId)
      .single();

    if (tenantErr || !tenant) {
      throw new Error(`Tenant not found: ${tenantErr?.message}`);
    }

    const previousTier = (tenant.tier as SaasTenantTier) || 'free';
    const nowIso = new Date().toISOString();
    const periodDays = billingCycle === 'annual' ? 365 : 30;
    const periodEnd = new Date(Date.now() + periodDays * 24 * 60 * 60 * 1000).toISOString();

    const existingMetadata = tenant.metadata || {};
    const existingBilling = existingMetadata.billing || {};
    const paymentHistory = existingBilling.paymentHistory || [];

    paymentHistory.push({
      orderId,
      paymentId,
      amountTier: targetTier,
      billingCycle,
      verifiedAt: nowIso,
    });

    const updatedMetadata = {
      ...existingMetadata,
      billing: {
        ...existingBilling,
        status: 'active',
        currentTier: targetTier,
        billingCycle,
        currentPeriodStart: nowIso,
        currentPeriodEnd: periodEnd,
        lastPaymentId: paymentId,
        lastOrderId: orderId,
        paymentHistory,
      },
    };

    // 3. Atomically Update Tenant Tier in Database
    const { data: updatedTenant, error: updateErr } = await client
      .from('saas_tenants')
      .update({
        tier: targetTier,
        metadata: updatedMetadata,
        updated_at: nowIso,
      })
      .eq('id', tenantId)
      .select('id, slug, tier')
      .single();

    if (updateErr || !updatedTenant) {
      throw new Error(`Failed to update tenant tier in database: ${updateErr?.message}`);
    }

    return {
      success: true,
      tenantId: updatedTenant.id,
      tenantSlug: updatedTenant.slug,
      previousTier,
      currentTier: updatedTenant.tier as SaasTenantTier,
      subscriptionStatus: 'active',
      activatedAt: nowIso,
      updatedRateLimits: SAAS_TIER_LIMITS[targetTier],
    };
  }

  /**
   * Handles inbound webhook event from payment provider (e.g. Razorpay / Stripe).
   */
  async processInboundWebhook(
    rawBody: string | Buffer,
    signature: string,
    payload: any,
    client: any = this.dbClient,
  ) {
    // 1. Verify HMAC Signature
    const isValid = this.paymentProvider.verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      const err: any = new Error('Inbound billing webhook cryptographic signature verification failed');
      err.statusCode = 401;
      err.code = 'INVALID_WEBHOOK_SIGNATURE';
      throw err;
    }

    const event = payload?.event || payload?.type;
    const eventData = payload?.payload?.payment?.entity || payload?.data?.object || {};
    const notes = eventData?.notes || {};
    const tenantId = notes?.tenantId;

    if (!tenantId) {
      return { status: 'ignored', reason: 'No tenantId in payment notes' };
    }

    const nowIso = new Date().toISOString();

    // 2. Handle Subscription / Payment Transitions
    if (event === 'payment.captured' || event === 'order.paid' || event === 'subscription.activated') {
      const targetTier = (notes.targetTier as SaasTenantTier) || 'pro';
      await client
        .from('saas_tenants')
        .update({
          tier: targetTier,
          updated_at: nowIso,
        })
        .eq('id', tenantId);

      return { status: 'processed', event, tenantId, tier: targetTier };
    }

    if (event === 'subscription.cancelled' || event === 'subscription.halted') {
      // Downgrade to Free tier upon cancellation
      await client
        .from('saas_tenants')
        .update({
          tier: 'free',
          updated_at: nowIso,
        })
        .eq('id', tenantId);

      return { status: 'processed', event, tenantId, tier: 'free' };
    }

    return { status: 'received_unhandled', event };
  }
}

export const billingService = new BillingService();
