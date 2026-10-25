/**
 * apps/api/src/modules/webhooks/webhookService.ts
 *
 * Milestone W022 — B2B SaaS Outbound Webhooks & Event Dispatching Engine
 * Multi-Tenant Subscription Lifecycle, Secret Management & Rotation,
 * and Deterministic Test Dispatches.
 */

import crypto from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import {
  generateWebhookSecret,
  encryptSecret,
  decryptSecret,
  extractSecretHint,
  canonicalizeJson,
  computePayloadSha256,
  encodePostgresBytea,
  decodePostgresBytea,
} from './crypto';
import { validateAndPinEgressTarget } from './antiSsrfGuard';
import { dispatchWebhook } from './webhookDispatcher';
import {
  type WebhookSubscriptionModel,
  type WebhookDeliveryModel,
  validateEventPayload,
} from './schemas';
import {
  type WebhookQueueProvider,
  InMemoryQueueProvider,
  PostgresQueueProvider,
} from './queueProvider';

function sanitizeSubscription(sub: any): WebhookSubscriptionModel {
  return {
    id: sub.id,
    tenantId: sub.tenantId,
    applicationId: sub.applicationId,
    endpointUrl: sub.endpointUrl,
    secretHint: sub.secretHint,
    secretHash: sub.secretHash,
    subscribedEvents: [...sub.subscribedEvents],
    status: sub.status,
    consecutiveFailureCount: sub.consecutiveFailureCount || 0,
    createdAt: sub.createdAt,
    updatedAt: sub.updatedAt,
  };
}

export class WebhookService {
  private queueProvider: WebhookQueueProvider;

  constructor(
    private readonly client: SupabaseClient = supabase,
    queueProvider?: WebhookQueueProvider
  ) {
    if (queueProvider) {
      this.queueProvider = queueProvider;
    } else if (process.env.NODE_ENV === 'test' || process.env.WEBHOOK_QUEUE_PROVIDER === 'memory') {
      this.queueProvider = new InMemoryQueueProvider();
    } else {
      this.queueProvider = new PostgresQueueProvider(client);
    }
  }

  getQueueProvider(): WebhookQueueProvider {
    return this.queueProvider;
  }

  setQueueProvider(provider: WebhookQueueProvider) {
    this.queueProvider = provider;
  }

  /**
   * Registers a new webhook subscription for an authenticated tenant application.
   * Returns plaintext secret ONLY once upon creation.
   */
  async createSubscription(params: {
    tenantId: string;
    applicationId: string;
    endpointUrl: string;
    subscribedEvents?: string[];
    allowLocalhostInTest?: boolean;
  }): Promise<{ subscription: WebhookSubscriptionModel; secret: string }> {
    const { tenantId, applicationId, endpointUrl, subscribedEvents = ['*'], allowLocalhostInTest } = params;

    // 1. SSRF preflight validation
    await validateAndPinEgressTarget(endpointUrl, { allowLocalhostInTest });

    // 2. Generate and encrypt signing secret
    const secret = generateWebhookSecret();
    const subscriptionId = crypto.randomUUID();
    const encrypted = encryptSecret(secret, tenantId, subscriptionId);

    // 3. Persist record
    if (this.queueProvider instanceof InMemoryQueueProvider) {
      const sub: WebhookSubscriptionModel = {
        id: subscriptionId,
        tenantId,
        applicationId,
        endpointUrl,
        secretHint: encrypted.hint,
        secretHash: encrypted.hash,
        subscribedEvents,
        status: 'active',
        consecutiveFailureCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      // Store encrypted binary record internally for dispatching
      (sub as any)._encryptedSecret = encrypted;
      (sub as any)._rawSecret = secret;
      this.queueProvider.subscriptions.set(subscriptionId, sub);

      return { subscription: sanitizeSubscription(sub), secret };
    }

    const { data, error } = await this.client
      .from('webhook_subscriptions')
      .insert({
        id: subscriptionId,
        tenant_id: tenantId,
        application_id: applicationId,
        endpoint_url: endpointUrl,
        secret_ciphertext: encodePostgresBytea(encrypted.ciphertext),
        secret_iv: encodePostgresBytea(encrypted.iv),
        secret_tag: encodePostgresBytea(encrypted.tag),
        secret_key_version: encrypted.version,
        secret_hash: encrypted.hash,
        secret_hint: encrypted.hint,
        subscribed_events: subscribedEvents,
        status: 'active',
      })
      .select('id, tenant_id, application_id, endpoint_url, secret_hint, secret_hash, subscribed_events, status, consecutive_failure_count, created_at, updated_at')
      .single();

    if (error || !data) {
      throw new Error(`DATABASE_INSERT_ERROR: Failed to create webhook subscription: ${error?.message}`);
    }

    const subscription: WebhookSubscriptionModel = {
      id: data.id,
      tenantId: data.tenant_id,
      applicationId: data.application_id,
      endpointUrl: data.endpoint_url,
      secretHint: data.secret_hint,
      secretHash: data.secret_hash,
      subscribedEvents: data.subscribed_events,
      status: data.status,
      consecutiveFailureCount: data.consecutive_failure_count || 0,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    return { subscription, secret };
  }

  /**
   * Lists webhook subscriptions owned by the authenticated tenant & application.
   */
  async listSubscriptions(tenantId: string, applicationId: string): Promise<WebhookSubscriptionModel[]> {
    if (this.queueProvider instanceof InMemoryQueueProvider) {
      const list: WebhookSubscriptionModel[] = [];
      for (const sub of this.queueProvider.subscriptions.values()) {
        if (sub.tenantId === tenantId && sub.applicationId === applicationId) {
          list.push(sanitizeSubscription(sub));
        }
      }
      return list;
    }

    const { data, error } = await this.client
      .from('webhook_subscriptions')
      .select('id, tenant_id, application_id, endpoint_url, secret_hint, secret_hash, subscribed_events, status, consecutive_failure_count, created_at, updated_at')
      .eq('tenant_id', tenantId)
      .eq('application_id', applicationId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`DATABASE_QUERY_ERROR: ${error.message}`);
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      tenantId: row.tenant_id,
      applicationId: row.application_id,
      endpointUrl: row.endpoint_url,
      secretHint: row.secret_hint,
      secretHash: row.secret_hash,
      subscribedEvents: row.subscribed_events,
      status: row.status,
      consecutiveFailureCount: row.consecutive_failure_count || 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  /**
   * Retrieves a single subscription by ID with strict tenant and application ownership enforcement.
   */
  async getSubscription(tenantId: string, applicationId: string, subscriptionId: string): Promise<WebhookSubscriptionModel | null> {
    if (this.queueProvider instanceof InMemoryQueueProvider) {
      const sub = this.queueProvider.subscriptions.get(subscriptionId);
      if (sub && sub.tenantId === tenantId && sub.applicationId === applicationId) {
        return sanitizeSubscription(sub);
      }
      return null;
    }

    const { data, error } = await this.client
      .from('webhook_subscriptions')
      .select('id, tenant_id, application_id, endpoint_url, secret_hint, secret_hash, subscribed_events, status, consecutive_failure_count, created_at, updated_at')
      .eq('tenant_id', tenantId)
      .eq('application_id', applicationId)
      .eq('id', subscriptionId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      tenantId: data.tenant_id,
      applicationId: data.application_id,
      endpointUrl: data.endpoint_url,
      secretHint: data.secret_hint,
      secretHash: data.secret_hash,
      subscribedEvents: data.subscribed_events,
      status: data.status,
      consecutiveFailureCount: data.consecutive_failure_count || 0,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  /**
   * Updates an existing subscription endpoint URL, subscribed events, or status.
   */
  async updateSubscription(params: {
    tenantId: string;
    applicationId: string;
    subscriptionId: string;
    endpointUrl?: string;
    subscribedEvents?: string[];
    status?: 'active' | 'paused' | 'disabled';
    allowLocalhostInTest?: boolean;
  }): Promise<WebhookSubscriptionModel | null> {
    const { tenantId, applicationId, subscriptionId, endpointUrl, subscribedEvents, status, allowLocalhostInTest } = params;

    const existing = await this.getSubscription(tenantId, applicationId, subscriptionId);
    if (!existing) return null;

    if (endpointUrl) {
      await validateAndPinEgressTarget(endpointUrl, { allowLocalhostInTest });
    }

    if (this.queueProvider instanceof InMemoryQueueProvider) {
      const stored = this.queueProvider.subscriptions.get(subscriptionId);
      if (stored) {
        if (endpointUrl) stored.endpointUrl = endpointUrl;
        if (subscribedEvents) stored.subscribedEvents = subscribedEvents;
        if (status) stored.status = status;
        stored.updatedAt = new Date().toISOString();
        return sanitizeSubscription(stored);
      }
      return null;
    }

    const updateFields: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (endpointUrl) updateFields.endpoint_url = endpointUrl;
    if (subscribedEvents) updateFields.subscribed_events = subscribedEvents;
    if (status) updateFields.status = status;

    const { data, error } = await this.client
      .from('webhook_subscriptions')
      .update(updateFields)
      .eq('tenant_id', tenantId)
      .eq('application_id', applicationId)
      .eq('id', subscriptionId)
      .select('id, tenant_id, application_id, endpoint_url, secret_hint, secret_hash, subscribed_events, status, consecutive_failure_count, created_at, updated_at')
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      tenantId: data.tenant_id,
      applicationId: data.application_id,
      endpointUrl: data.endpoint_url,
      secretHint: data.secret_hint,
      secretHash: data.secret_hash,
      subscribedEvents: data.subscribed_events,
      status: data.status,
      consecutiveFailureCount: data.consecutive_failure_count || 0,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  /**
   * Disables a webhook subscription.
   */
  async disableSubscription(tenantId: string, applicationId: string, subscriptionId: string): Promise<WebhookSubscriptionModel | null> {
    return this.updateSubscription({
      tenantId,
      applicationId,
      subscriptionId,
      status: 'disabled',
    });
  }

  /**
   * Rotates signing secret with a 24-hour dual-secret transition window.
   * Returns newly generated secret (one-time disclosure).
   */
  async rotateSecret(tenantId: string, applicationId: string, subscriptionId: string): Promise<{ newSecret: string; secretHint: string; gracePeriodExpiresAt: string } | null> {
    const existing = await this.getSubscription(tenantId, applicationId, subscriptionId);
    if (!existing) return null;
    const newSecret = generateWebhookSecret();
    const newEncrypted = encryptSecret(newSecret, tenantId, subscriptionId);
    const gracePeriodExpiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    if (this.queueProvider instanceof InMemoryQueueProvider) {
      const sub = this.queueProvider.subscriptions.get(subscriptionId) as any;
      if (!sub || sub.tenantId !== tenantId || sub.applicationId !== applicationId) return null;
      sub._previousSecret = sub._rawSecret;
      sub._previousSecretExpiresAt = gracePeriodExpiresAt;
      sub._rawSecret = newSecret;
      sub.secretHint = newEncrypted.hint;
      sub.secretHash = newEncrypted.hash;
      sub.updatedAt = new Date().toISOString();
      return { newSecret, secretHint: newEncrypted.hint, gracePeriodExpiresAt };
    }
    const { data, error } = await this.client.rpc('fn_rotate_webhook_secret', {
      p_tenant_id: tenantId, p_application_id: applicationId, p_subscription_id: subscriptionId,
      p_secret_ciphertext: encodePostgresBytea(newEncrypted.ciphertext),
      p_secret_iv: encodePostgresBytea(newEncrypted.iv), p_secret_tag: encodePostgresBytea(newEncrypted.tag),
      p_secret_key_version: newEncrypted.version, p_secret_hash: newEncrypted.hash,
      p_secret_hint: newEncrypted.hint, p_previous_secret_expires_at: gracePeriodExpiresAt,
    });
    if (error) throw new Error(`SECRET_ROTATION_FAILED: ${error.message}`);
    if (data !== true) throw new Error('SECRET_ROTATION_FAILED: Subscription was not updated.');
    return { newSecret, secretHint: newEncrypted.hint, gracePeriodExpiresAt };
  }

  /**
   * Dispatches a synchronous test ping delivery to an active subscription endpoint.
   */
  async testDelivery(tenantId: string, applicationId: string, subscriptionId: string, options: { allowLocalhostInTest?: boolean } = {}): Promise<any> {
    const sub = await this.getSubscription(tenantId, applicationId, subscriptionId);
    if (!sub) return null;
    if (sub.status !== 'active') throw new Error('WEBHOOK_SUBSCRIPTION_NOT_ACTIVE');
    const eventId = crypto.randomUUID();
    const deliveryId = crypto.randomUUID();
    const testPayload = { event_id: eventId, timestamp: new Date().toISOString(), message: 'PanIN SaaS Webhook Verification Test Ping' };
    const payloadRaw = canonicalizeJson(testPayload);
    const payloadSha256 = computePayloadSha256(payloadRaw);
    let rawSecret: string;
    let previousSecret: string | null = null;
    if (this.queueProvider instanceof InMemoryQueueProvider) {
      const inMem = this.queueProvider.subscriptions.get(subscriptionId) as any;
      rawSecret = inMem?._rawSecret;
      if (!rawSecret) throw new Error('WEBHOOK_SECRET_UNAVAILABLE');
      if (inMem?._previousSecret && inMem?._previousSecretExpiresAt && Date.parse(inMem._previousSecretExpiresAt) > Date.now()) {
        previousSecret = inMem._previousSecret;
      }
    } else {
      const { data, error } = await this.client.rpc('fn_get_webhook_secret_material', {
        p_tenant_id: tenantId, p_application_id: applicationId, p_subscription_id: subscriptionId,
      });
      const material = Array.isArray(data) ? data[0] : null;
      if (error || !material) throw new Error(`WEBHOOK_SECRET_UNAVAILABLE: ${error?.message ?? 'Subscription secret not found'}`);
      try {
        rawSecret = decryptSecret({
          ciphertext: decodePostgresBytea(material.secret_ciphertext),
          iv: decodePostgresBytea(material.secret_iv),
          tag: decodePostgresBytea(material.secret_tag),
        }, tenantId, subscriptionId);
        if (material.previous_secret_ciphertext && material.previous_secret_expires_at &&
            Number.isFinite(Date.parse(material.previous_secret_expires_at)) && Date.parse(material.previous_secret_expires_at) > Date.now()) {
          previousSecret = decryptSecret({
            ciphertext: decodePostgresBytea(material.previous_secret_ciphertext),
            iv: decodePostgresBytea(material.previous_secret_iv),
            tag: decodePostgresBytea(material.previous_secret_tag),
          }, tenantId, subscriptionId);
        }
      } catch { throw new Error('WEBHOOK_SECRET_DECRYPTION_FAILED'); }
    }
    const result = await dispatchWebhook({
      endpointUrl: sub.endpointUrl, secret: rawSecret, previousSecret, eventId, deliveryId,
      payloadRaw, payloadSha256, allowLocalhostInTest: options.allowLocalhostInTest,
    });
    return {
      eventId, deliveryId, endpointUrl: sub.endpointUrl, success: result.success, httpStatus: result.httpStatus,
      executionDurationMs: result.executionDurationMs, responseBodySample: result.responseBodySample, errorMessage: result.errorMessage,
    };
  }

  /**
   * Publishes a domain event, validates schema against allowlist, and enqueues deliveries atomically.
   */
  async publishEvent(params: {
    tenantId: string;
    eventType: string;
    idempotencyKey?: string;
    payload: Record<string, unknown>;
  }): Promise<{ eventId: string; deduplicated: boolean; enqueuedDeliveries: number }> {
    const { tenantId, eventType, idempotencyKey, payload } = params;

    // 1. Validate payload against allowlist (additionalProperties: false)
    const validation = validateEventPayload(eventType, payload);
    if (!validation.valid) {
      throw new Error(`VALIDATION_ERROR: ${validation.error}`);
    }

    // 2. Canonical serialization
    const payloadRaw = canonicalizeJson(payload);
    const payloadSha256 = computePayloadSha256(payloadRaw);

    // 3. Atomically enqueue
    return this.queueProvider.enqueueEvent({
      tenantId,
      eventType,
      idempotencyKey,
      payload,
      payloadRaw,
      payloadSha256,
    });
  }
}

export const webhookService = new WebhookService();
