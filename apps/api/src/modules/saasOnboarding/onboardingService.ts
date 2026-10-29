/**
 * apps/api/src/modules/saasOnboarding/onboardingService.ts
 *
 * Milestone W051 — B2B Political SaaS Customer Acquisition & Developer Portal
 * Self-service partner signup, tenant & application provisioning, and API key lifecycle.
 */

import crypto from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  SaasSignupRequest,
  SaasSignupResponse,
  SaasApiKeyCreateRequest,
  SaasApiKeyCreateResponse,
  SaasApiKeyListItem,
  SaasApiKeyRevokeResponse,
  SaasTenantTier,
} from '@kshetra/shared';
import { SAAS_TIER_KEY_LIMITS } from '@kshetra/shared';
import { supabase } from '../../lib/supabase';
import { generateCryptographicApiKey } from '../../lib/saasCrypto';
import type { SignupBody, CreateApiKeyBody } from './schemas';

export class OnboardingService {
  private dbClient: any = supabase;

  /**
   * Sets the database client (useful for unit testing or transaction context).
   */
  setDbClient(client: any): void {
    this.dbClient = client;
  }

  /**
   * Helper to normalize organization name into a URL-friendly lowercase slug.
   */
  private generateSlug(name: string): string {
    const cleaned = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return cleaned.slice(0, 40) || 'partner';
  }

  /**
   * Generates a unique tenant slug, appending a short random hex suffix if collision occurs.
   */
  private async resolveUniqueSlug(baseSlug: string, client: any): Promise<string> {
    const { data } = await client.from('saas_tenants').select('id').eq('slug', baseSlug).maybeSingle();
    if (!data) {
      return baseSlug;
    }
    const suffix = crypto.randomBytes(2).toString('hex');
    return `${baseSlug}-${suffix}`;
  }

  /**
   * Self-service partner signup:
   * 1. Inserts into public.saas_tenants (Free Tier, Active status).
   * 2. Creates a default Sandbox application in public.saas_applications.
   * 3. Generates an initial 256-bit test API key and stores its SHA-256 hash.
   * 4. Returns the tenant, application, and raw key secret (shown exactly once).
   */
  async signup(params: SignupBody, client: any = this.dbClient): Promise<SaasSignupResponse> {
    const baseSlug = params.slug || this.generateSlug(params.organizationName);
    const slug = await this.resolveUniqueSlug(baseSlug, client);

    // 1. Create Tenant
    const { data: tenant, error: tenantError } = await client
      .from('saas_tenants')
      .insert({
        name: params.organizationName,
        slug,
        tier: 'free',
        status: 'active',
        contact_email: params.email,
        metadata: {
          contactName: params.name,
          useCase: params.useCase || 'individual',
          onboardedAt: new Date().toISOString(),
          billing: {
            currentPeriodStart: new Date().toISOString(),
            status: 'free_evaluation',
          },
        },
      })
      .select('id, name, slug, tier, status, contact_email, created_at')
      .single();

    if (tenantError || !tenant) {
      throw new Error(`Failed to create tenant organization: ${tenantError?.message || 'Unknown database error'}`);
    }

    // 2. Create Default Sandbox Application
    const { data: application, error: appError } = await client
      .from('saas_applications')
      .insert({
        tenant_id: tenant.id,
        name: `${params.organizationName} Default Sandbox`,
        environment: 'test',
      })
      .select('id, name, environment, created_at')
      .single();

    if (appError || !application) {
      throw new Error(`Failed to provision default application: ${appError?.message || 'Unknown database error'}`);
    }

    // 3. Generate Initial Cryptographic Test API Key
    const keyData = generateCryptographicApiKey('test');
    const defaultScopes = ['geo:read', 'elections:read', 'entities:read', 'delim:read'];

    const { data: apiKeyRecord, error: keyError } = await client
      .from('saas_api_keys')
      .insert({
        tenant_id: tenant.id,
        application_id: application.id,
        name: 'Initial Test Key',
        key_prefix: keyData.keyPrefix,
        key_hint: keyData.keyHint,
        key_hash: keyData.keyHash,
        scopes: defaultScopes,
        status: 'active',
      })
      .select('id, name, key_prefix, key_hint, scopes, created_at')
      .single();

    if (keyError || !apiKeyRecord) {
      throw new Error(`Failed to provision initial API key: ${keyError?.message || 'Unknown database error'}`);
    }

    return {
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        tier: tenant.tier as SaasTenantTier,
        status: tenant.status,
        contactEmail: tenant.contact_email,
        createdAt: tenant.created_at,
      },
      application: {
        id: application.id,
        name: application.name,
        environment: application.environment,
        createdAt: application.created_at,
      },
      apiKey: {
        id: apiKeyRecord.id,
        name: apiKeyRecord.name,
        keyPrefix: apiKeyRecord.key_prefix,
        keyHint: apiKeyRecord.key_hint,
        environment: 'test',
        scopes: apiKeyRecord.scopes,
        rawKey: keyData.rawKey,
        notice: 'Store this secret key securely. For security reasons, this raw key cannot be retrieved again.',
      },
    };
  }

  /**
   * Lists all API keys for an authenticated tenant.
   * Strips all hash/secret data; returns safe audit metadata.
   */
  async listApiKeys(tenantId: string, client: any = this.dbClient): Promise<SaasApiKeyListItem[]> {
    const { data: keys, error } = await client
      .from('saas_api_keys')
      .select('id, name, key_prefix, key_hint, scopes, status, application_id, last_used_at, created_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to query tenant API keys: ${error.message}`);
    }

    if (!keys || keys.length === 0) {
      return [];
    }

    // Determine environment from prefix
    return keys.map((k: any) => {
      const isLive = k.key_prefix.includes('_live_');
      return {
        id: k.id,
        name: k.name,
        keyPrefix: k.key_prefix,
        keyHint: k.key_hint,
        environment: isLive ? 'live' : 'test',
        scopes: k.scopes || [],
        status: k.status,
        applicationId: k.application_id,
        lastUsedAt: k.last_used_at,
        createdAt: k.created_at,
      };
    });
  }

  /**
   * Generates a new cryptographic API key for an authenticated tenant.
   * Enforces tier limits on active keys.
   */
  async createApiKey(
    tenantId: string,
    params: CreateApiKeyBody,
    client: any = this.dbClient,
  ): Promise<SaasApiKeyCreateResponse> {
    // 1. Fetch current tenant tier
    const { data: tenant, error: tenantError } = await client
      .from('saas_tenants')
      .select('id, tier, status')
      .eq('id', tenantId)
      .single();

    if (tenantError || !tenant) {
      throw new Error(`Tenant not found: ${tenantError?.message || 'Invalid tenant context'}`);
    }

    if (tenant.status !== 'active') {
      const err: any = new Error(`Cannot create keys for ${tenant.status} tenant organization`);
      err.statusCode = 403;
      err.code = 'TENANT_NOT_ACTIVE';
      throw err;
    }

    const tier = (tenant.tier as SaasTenantTier) || 'free';
    const maxKeys = SAAS_TIER_KEY_LIMITS[tier] || 2;

    // 2. Enforce active key ceiling
    const { count, error: countError } = await client
      .from('saas_api_keys')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', 'active');

    if (countError) {
      throw new Error(`Failed to check key limits: ${countError.message}`);
    }

    if ((count || 0) >= maxKeys) {
      const err: any = new Error(
        `Active API key ceiling reached for tier '${tier}' (limit: ${maxKeys}). Please revoke an inactive key or upgrade your subscription.`,
      );
      err.statusCode = 403;
      err.code = 'KEY_LIMIT_REACHED';
      throw err;
    }

    // 3. Resolve target application
    let targetAppId = params.applicationId;
    if (!targetAppId) {
      const { data: defaultApp } = await client
        .from('saas_applications')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('environment', params.environment)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (defaultApp) {
        targetAppId = defaultApp.id;
      } else {
        // Create matching application if none exists
        const { data: newApp, error: createAppErr } = await client
          .from('saas_applications')
          .insert({
            tenant_id: tenantId,
            name: `${params.environment.toUpperCase()} Application`,
            environment: params.environment,
          })
          .select('id')
          .single();

        if (createAppErr || !newApp) {
          throw new Error(`Failed to resolve application for key: ${createAppErr?.message}`);
        }
        targetAppId = newApp.id;
      }
    } else {
      // Validate that the provided application belongs to this tenant
      const { data: appRecord } = await client
        .from('saas_applications')
        .select('id')
        .eq('id', targetAppId)
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (!appRecord) {
        const err: any = new Error('Application ID not found or does not belong to this tenant.');
        err.statusCode = 404;
        err.code = 'APPLICATION_NOT_FOUND';
        throw err;
      }
    }

    // 4. Generate 256-bit CSPRNG API Key
    const keyData = generateCryptographicApiKey(params.environment);
    const scopes = params.scopes || ['geo:read', 'elections:read', 'entities:read', 'delim:read'];

    const { data: newKeyRecord, error: insertError } = await client
      .from('saas_api_keys')
      .insert({
        tenant_id: tenantId,
        application_id: targetAppId,
        name: params.name,
        key_prefix: keyData.keyPrefix,
        key_hint: keyData.keyHint,
        key_hash: keyData.keyHash,
        scopes,
        status: 'active',
      })
      .select('id, name, key_prefix, key_hint, scopes, created_at')
      .single();

    if (insertError || !newKeyRecord) {
      throw new Error(`Failed to persist API key: ${insertError?.message || 'Database error'}`);
    }

    return {
      id: newKeyRecord.id,
      name: newKeyRecord.name,
      keyPrefix: newKeyRecord.key_prefix,
      keyHint: newKeyRecord.key_hint,
      environment: params.environment,
      scopes: newKeyRecord.scopes,
      rawKey: keyData.rawKey,
      createdAt: newKeyRecord.created_at,
      notice: 'Store this secret key securely. For security reasons, this raw key cannot be retrieved again.',
    };
  }

  /**
   * Revokes an existing API key for the authenticated tenant.
   */
  async revokeApiKey(
    tenantId: string,
    apiKeyId: string,
    client: any = this.dbClient,
  ): Promise<SaasApiKeyRevokeResponse> {
    const { data, error } = await client
      .from('saas_api_keys')
      .update({ status: 'revoked' })
      .eq('id', apiKeyId)
      .eq('tenant_id', tenantId)
      .select('id, status')
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to revoke API key: ${error.message}`);
    }

    if (!data) {
      const err: any = new Error('API key not found or does not belong to the authenticated tenant.');
      err.statusCode = 404;
      err.code = 'KEY_NOT_FOUND';
      throw err;
    }

    return {
      id: data.id,
      status: 'revoked',
      revokedAt: new Date().toISOString(),
    };
  }

  /**
   * Fetches tenant profile and status.
   */
  async getTenantProfile(tenantId: string, client: any = supabase) {
    const { data: tenant, error } = await client
      .from('saas_tenants')
      .select('id, name, slug, tier, status, contact_email, metadata, created_at, updated_at')
      .eq('id', tenantId)
      .single();

    if (error || !tenant) {
      const err: any = new Error('Tenant organization not found.');
      err.statusCode = 404;
      err.code = 'TENANT_NOT_FOUND';
      throw err;
    }

    return tenant;
  }
}

export const onboardingService = new OnboardingService();
