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
  encodePostgrestBytea,
  decodePostgrestBytea,
} from './crypto';
import { validateAndPinEgressTarget } from './antiSsrfGuard';
import { dispatchWebhook, type DispatchResult } from './webhookDispatcher';
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
    } else if (
      process.env.NODE_ENV === 'test' ||
      (process.env.WEBHOOK_QUEUE_PROVIDER === 'in-memory' && process.env.NODE_ENV !== 'production')
    ) {
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
        secret_ciphertext: encodePostgrestBytea(encrypted.ciphertext),
        secret_iv: encodePostgrestBytea(encrypted.iv),
        secret_tag: encodePostgrestBytea(encrypted.tag),
        secret_key_version: encrypted.version,
        secret_hash: encrypted.hash,
        secret_hint: encrypted.hint,
        subscribed_events: subscribedEvents,
        status: 'active',
      })
      .select('*')
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
      .select('*')
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
      const sub = this.queueProvider.subscriptions.get(subscriptionId);
      if (sub) {
        sub.secretHint = newEncrypted.hint;
        sub.secretHash = newEncrypted.hash;
        sub.updatedAt = new Date().toISOString();
        (sub as any)._previousSecret = (sub as any)._rawSecret;
        (sub as any)._previousSecretExpiresAt = gracePeriodExpiresAt;
        (sub as any)._rawSecret = newSecret;
      }
      return {
        newSecret,
        secretHint: newEncrypted.hint,
        gracePeriodExpiresAt,
      };
    }

    // In PostgreSQL: Move current secret fields to previous_secret_* and save new
    const { data: current, error: currentError } = await this.client
      .from('webhook_subscriptions')
      .select('secret_ciphertext, secret_iv, secret_tag')
      .eq('tenant_id', tenantId)
      .eq('application_id', applicationId)
      .eq('id', subscriptionId)
      .single();

    if (currentError || !current?.secret_ciphertext || !current?.secret_iv || !current?.secret_tag) {
      throw new Error('SECRET_ROTATION_FAILED: Existing encrypted secret could not be retrieved.');
    }

    const { error } = await this.client
      .from('webhook_subscriptions')
      .update({
        previous_secret_ciphertext: current.secret_ciphertext,
        previous_secret_iv: current.secret_iv,
        previous_secret_tag: current.secret_tag,
        previous_secret_expires_at: gracePeriodExpiresAt,
        secret_ciphertext: encodePostgrestBytea(newEncrypted.ciphertext),
        secret_iv: encodePostgrestBytea(newEncrypted.iv),
        secret_tag: encodePostgrestBytea(newEncrypted.tag),
        secret_key_version: newEncrypted.version,
        secret_hash: newEncrypted.hash,
        secret_hint: newEncrypted.hint,
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId)
      .eq('application_id', applicationId)
      .eq('id', subscriptionId);

    if (error) {
      throw new Error(`SECRET_ROTATION_FAILED: ${error.message}`);
    }

    return {
      newSecret,
      secretHint: newEncrypted.hint,
      gracePeriodExpiresAt,
    };
  }

  /**
   * Dispatches a synchronous test ping delivery to an active subscription endpoint.
   */
  async testDelivery(tenantId: string, applicationId: string, subscriptionId: string, options: { allowLocalhostInTest?: boolean } = {}): Promise<any> {
    const sub = await this.getSubscription(tenantId, applicationId, subscriptionId);
    if (!sub) return null;

    const eventId = crypto.randomUUID();
    const deliveryId = crypto.randomUUID();
    const testPayload = {
      event_id: eventId,
      timestamp: new Date().toISOString(),
      message: 'PanIN SaaS Webhook Verification Test Ping',
    };

    const payloadRaw = canonicalizeJson(testPayload);
    const payloadSha256 = computePayloadSha256(payloadRaw);

    // Fail closed: never dispatch using a synthetic or default signing secret.
    let rawSecret: string;
    let previousSecret: string | null = null;

    if (this.queueProvider instanceof InMemoryQueueProvider) {
      const inMem = this.queueProvider.subscriptions.get(subscriptionId) as any;
      if (!inMem || typeof inMem._rawSecret !== 'string' || inMem._rawSecret.length === 0) {
        throw new Error('WEBHOOK_SECRET_UNAVAILABLE: Stored signing secret is missing.');
      }
      rawSecret = inMem._rawSecret;
      if (
        typeof inMem._previousSecret === 'string' &&
        typeof inMem._previousSecretExpiresAt === 'string' &&
        Date.parse(inMem._previousSecretExpiresAt) > Date.now()
      ) previousSecret = inMem._previousSecret;
    } else {
      const { data, error } = await this.client
        .from('webhook_subscriptions')
        .select('secret_ciphertext, secret_iv, secret_tag, previous_secret_ciphertext, previous_secret_iv, previous_secret_tag, previous_secret_expires_at')
        .eq('tenant_id', tenantId)
        .eq('application_id', applicationId)
        .eq('id', subscriptionId)
        .single();

      if (error || !data?.secret_ciphertext || !data?.secret_iv || !data?.secret_tag) {
        throw new Error('WEBHOOK_SECRET_UNAVAILABLE: Stored signing secret could not be retrieved.');
      }
      rawSecret = decryptSecret({
        ciphertext: decodePostgrestBytea(data.secret_ciphertext),
        iv: decodePostgrestBytea(data.secret_iv),
        tag: decodePostgrestBytea(data.secret_tag),
      }, tenantId, subscriptionId);

      if (
        data.previous_secret_ciphertext && data.previous_secret_iv && data.previous_secret_tag &&
        data.previous_secret_expires_at && Date.parse(String(data.previous_secret_expires_at)) > Date.now()
      ) {
        previousSecret = decryptSecret({
          ciphertext: decodePostgrestBytea(data.previous_secret_ciphertext),
          iv: decodePostgrestBytea(data.previous_secret_iv),
          tag: decodePostgrestBytea(data.previous_secret_tag),
        }, tenantId, subscriptionId);
      }
    }

    const result = await dispatchWebhook({
      endpointUrl: sub.endpointUrl,
      secret: rawSecret,
      previousSecret,
      eventId,
      deliveryId,
      payloadRaw,
      payloadSha256,
      allowLocalhostInTest: options.allowLocalhostInTest,
    });

    return {
      eventId,
      deliveryId,
      endpointUrl: sub.endpointUrl,
      success: result.success,
      httpStatus: result.httpStatus,
      executionDurationMs: result.executionDurationMs,
      responseBodySample: result.responseBodySample,
      errorMessage: result.errorMessage,
    };
  }

  /**
   * Claims and dispatches one bounded batch. Missing signing material always fails closed.
   * Completion updates are persisted through a lease-token-fenced atomic database RPC.
   */
  async dispatchPendingBatch(batchSize = 10): Promise<{ claimed: number; updated: number; stale: number }> {
    if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 100) {
      throw new Error('INVALID_BATCH_SIZE: Batch size must be between 1 and 100.');
    }
    const jobs = await this.queueProvider.claimBatch(batchSize);
    let updated = 0;
    let stale = 0;
    for (const job of jobs) {
      let result: DispatchResult;
      if (!job.secret) {
        result = {
          success: false, httpStatus: null, executionDurationMs: 0,
          requestHeaders: {}, responseHeaders: {}, responseBodySample: '',
          errorMessage: 'WEBHOOK_SECRET_UNAVAILABLE: No signing secret could be decrypted.',
        };
      } else {
        try {
          result = await dispatchWebhook({
            endpointUrl: job.subscription.endpointUrl, secret: job.secret,
            previousSecret: job.previousSecret ?? null, eventId: job.event.id,
            deliveryId: job.delivery.id, payloadRaw: job.event.payloadRaw,
            payloadSha256: job.event.payloadSha256,
          });
        } catch (err: unknown) {
          result = {
            success: false, httpStatus: null, executionDurationMs: 0,
            requestHeaders: {}, responseHeaders: {}, responseBodySample: '',
            errorMessage: err instanceof Error ? err.message.slice(0, 1024) : 'WEBHOOK_DISPATCH_FAILED',
          };
        }
      }
      const completion = await this.queueProvider.completeDelivery(job.delivery.id, job.leaseToken, result);
      if (completion.updated) updated++;
      else stale++;
    }
    return { claimed: jobs.length, updated, stale };
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
