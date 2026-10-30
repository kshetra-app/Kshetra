/**
 * Developer Platform & B2B SaaS Service (JOB 062)
 *
 * Authority: Master Product Blueprint (Jobs 062-066), DEC-188, DEC-189
 * Features:
 * - Multi-tenant Developer Organizations & RBAC
 * - Cryptographic API Key Lifecycle (pk_live_..., SHA-256 hash, scopes, revocation)
 * - Tiered Quotas & Rate Limiting Enforcement
 * - Usage Telemetry & Ledger
 * - OpenAPI 3.1 Specification Generation
 * - Subscription Billing Checkout Integration
 */

import { createHash, randomBytes } from 'crypto';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  DEVELOPER_TIER_CONFIGS,
  type DeveloperOrgTier,
  type DeveloperOrgMemberRole,
  type DeveloperApiKeyEnvironment,
  type DeveloperOrganizationDTO,
  type CreateDeveloperOrgRequest,
  type DeveloperOrgMemberDTO,
  type AddDeveloperOrgMemberRequest,
  type DeveloperApiKeyDTO,
  type CreateDeveloperApiKeyRequest,
  type CreateDeveloperApiKeyResponse,
  type DeveloperUsageSummaryDTO,
  type DeveloperUsageBucketDTO,
  type DeveloperBillingCheckoutRequest,
  type DeveloperBillingCheckoutResponse,
} from '@kshetra/shared';

export class DeveloperPlatformService {
  // In-memory fallback stores for deterministic offline/test mode
  private static mockOrgs = new Map<string, DeveloperOrganizationDTO>();
  private static mockMembers = new Map<string, DeveloperOrgMemberDTO[]>(); // orgId -> members
  private static mockKeys = new Map<string, DeveloperApiKeyDTO>(); // keyId -> key
  private static mockKeyHashes = new Map<string, string>(); // hash -> keyId
  private static mockUsageLedger: Array<{
    organizationId: string;
    apiKeyId?: string;
    endpoint: string;
    method: string;
    statusCode: number;
    latencyMs: number;
    hourBucket: string;
    recordedAt: string;
  }> = [];

  static resetForTesting(): void {
    this.mockOrgs.clear();
    this.mockMembers.clear();
    this.mockKeys.clear();
    this.mockKeyHashes.clear();
    this.mockUsageLedger = [];
  }

  // --- 1. ORGANIZATION MANAGEMENT ---

  static async createOrganization(req: CreateDeveloperOrgRequest): Promise<DeveloperOrganizationDTO> {
    const orgId = `org_${Date.now()}_${randomBytes(4).toString('hex')}`;
    const slug = req.slug || req.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const tier: DeveloperOrgTier = req.tier || 'free';
    const now = new Date().toISOString();

    const orgDto: DeveloperOrganizationDTO = {
      id: orgId,
      name: req.name,
      slug,
      tier,
      billingEmail: req.billingEmail,
      billingStatus: 'active',
      websiteUrl: req.websiteUrl || null,
      logoUrl: null,
      metadata: {},
      createdAt: now,
      updatedAt: now,
    };

    this.mockOrgs.set(orgId, orgDto);

    // Add initial admin member
    const memberDto: DeveloperOrgMemberDTO = {
      id: `mem_${Date.now()}_${randomBytes(3).toString('hex')}`,
      organizationId: orgId,
      userId: req.adminUserId,
      role: 'admin',
      joinedAt: now,
    };
    this.mockMembers.set(orgId, [memberDto]);

    if (isSupabaseConfigured) {
      try {
        await supabase.from('developer_organizations').insert({
          id: orgId,
          name: orgDto.name,
          slug: orgDto.slug,
          tier: orgDto.tier,
          billing_email: orgDto.billingEmail,
          billing_status: orgDto.billingStatus,
          website_url: orgDto.websiteUrl,
          created_at: now,
          updated_at: now,
        });

        await supabase.from('developer_organization_members').insert({
          id: memberDto.id,
          organization_id: orgId,
          user_id: memberDto.userId,
          role: memberDto.role,
          joined_at: now,
        });
      } catch (err) {
        // Fallback to in-memory state
      }
    }

    return orgDto;
  }

  static async getOrganization(orgId: string): Promise<DeveloperOrganizationDTO | null> {
    const memoryOrg = this.mockOrgs.get(orgId);
    if (memoryOrg) return memoryOrg;

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('developer_organizations')
          .select('*')
          .eq('id', orgId)
          .single();
        if (data && !error) {
          const dto: DeveloperOrganizationDTO = {
            id: data.id,
            name: data.name,
            slug: data.slug,
            tier: data.tier,
            billingEmail: data.billing_email,
            billingStatus: data.billing_status,
            websiteUrl: data.website_url,
            logoUrl: data.logo_url,
            metadata: data.metadata || {},
            createdAt: data.created_at,
            updatedAt: data.updated_at,
          };
          this.mockOrgs.set(orgId, dto);
          return dto;
        }
      } catch (err) {
        // Ignore
      }
    }

    return null;
  }

  static async addOrganizationMember(
    orgId: string,
    req: AddDeveloperOrgMemberRequest
  ): Promise<DeveloperOrgMemberDTO> {
    const now = new Date().toISOString();
    const memberDto: DeveloperOrgMemberDTO = {
      id: `mem_${Date.now()}_${randomBytes(3).toString('hex')}`,
      organizationId: orgId,
      userId: req.userId,
      role: req.role,
      joinedAt: now,
    };

    const existing = this.mockMembers.get(orgId) || [];
    existing.push(memberDto);
    this.mockMembers.set(orgId, existing);

    if (isSupabaseConfigured) {
      try {
        await supabase.from('developer_organization_members').insert({
          id: memberDto.id,
          organization_id: orgId,
          user_id: memberDto.userId,
          role: memberDto.role,
          joined_at: now,
        });
      } catch (err) {
        // Ignore
      }
    }

    return memberDto;
  }

  static async listOrganizationMembers(orgId: string): Promise<DeveloperOrgMemberDTO[]> {
    return this.mockMembers.get(orgId) || [];
  }

  // --- 2. CRYPTOGRAPHIC API KEY LIFECYCLE ---

  static async createApiKey(req: CreateDeveloperApiKeyRequest): Promise<CreateDeveloperApiKeyResponse> {
    const org = await this.getOrganization(req.organizationId);
    if (!org) {
      throw new Error(`Organization '${req.organizationId}' not found.`);
    }

    const tierLimits = DEVELOPER_TIER_CONFIGS[org.tier];
    const existingKeys = await this.listApiKeys(req.organizationId);
    const activeCount = existingKeys.filter((k) => k.status === 'active').length;
    if (activeCount >= tierLimits.maxKeys) {
      throw new Error(
        `Tier key limit reached for '${org.tier}' (${activeCount}/${tierLimits.maxKeys}). Upgrade organization tier to create more keys.`
      );
    }

    const env: DeveloperApiKeyEnvironment = req.environment || 'live';
    const prefix = env === 'live' ? 'pk_live_' : 'pk_test_';
    const secretRandom = randomBytes(24).toString('hex');
    const rawKey = `${prefix}${secretRandom}`;
    const keyHint = secretRandom.slice(-4);
    const keyHash = createHash('sha256').update(rawKey).digest('hex');

    const keyId = `key_${Date.now()}_${randomBytes(4).toString('hex')}`;
    const now = new Date().toISOString();

    const keyDto: DeveloperApiKeyDTO = {
      id: keyId,
      organizationId: req.organizationId,
      name: req.name,
      keyPrefix: prefix,
      keyHint,
      environment: env,
      scopes: req.scopes || ['read:geography', 'read:elections', 'read:civic'],
      status: 'active',
      rateLimitPerMinute: tierLimits.requestsPerMinute,
      monthlyQuota: tierLimits.monthlyCeiling,
      lastUsedAt: null,
      expiresAt: null,
      revokedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    this.mockKeys.set(keyId, keyDto);
    this.mockKeyHashes.set(keyHash, keyId);

    if (isSupabaseConfigured) {
      try {
        await supabase.from('developer_api_keys').insert({
          id: keyId,
          organization_id: req.organizationId,
          name: keyDto.name,
          key_prefix: prefix,
          key_hint: keyHint,
          key_hash: keyHash,
          environment: env,
          scopes: keyDto.scopes,
          status: 'active',
          rate_limit_per_minute: keyDto.rateLimitPerMinute,
          monthly_quota: keyDto.monthlyQuota,
          created_at: now,
          updated_at: now,
        });
      } catch (err) {
        // Ignore
      }
    }

    return {
      key: keyDto,
      rawKey,
      notice:
        'Please save this raw API key immediately. For security reasons, it cannot be viewed again.',
    };
  }

  static async listApiKeys(orgId: string): Promise<DeveloperApiKeyDTO[]> {
    const list: DeveloperApiKeyDTO[] = [];
    for (const key of this.mockKeys.values()) {
      if (key.organizationId === orgId) {
        list.push(key);
      }
    }
    return list;
  }

  static async revokeApiKey(keyId: string, orgId: string): Promise<boolean> {
    const key = this.mockKeys.get(keyId);
    if (!key || key.organizationId !== orgId) {
      return false;
    }

    key.status = 'revoked';
    key.revokedAt = new Date().toISOString();
    key.updatedAt = key.revokedAt;
    this.mockKeys.set(keyId, key);

    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('developer_api_keys')
          .update({
            status: 'revoked',
            revoked_at: key.revokedAt,
            updated_at: key.updatedAt,
          })
          .eq('id', keyId);
      } catch (err) {
        // Ignore
      }
    }

    return true;
  }

  static async verifyApiKey(
    rawKey: string
  ): Promise<{ valid: boolean; key?: DeveloperApiKeyDTO; org?: DeveloperOrganizationDTO; error?: string }> {
    if (!rawKey || (!rawKey.startsWith('pk_live_') && !rawKey.startsWith('pk_test_'))) {
      return { valid: false, error: 'INVALID_API_KEY_FORMAT' };
    }

    const keyHash = createHash('sha256').update(rawKey).digest('hex');
    const keyId = this.mockKeyHashes.get(keyHash);
    let key: DeveloperApiKeyDTO | undefined;

    if (keyId) {
      key = this.mockKeys.get(keyId);
    }

    if (!key && isSupabaseConfigured) {
      try {
        const { data } = await supabase
          .from('developer_api_keys')
          .select('*')
          .eq('key_hash', keyHash)
          .eq('status', 'active')
          .single();
        if (data) {
          key = {
            id: data.id,
            organizationId: data.organization_id,
            name: data.name,
            keyPrefix: data.key_prefix,
            keyHint: data.key_hint,
            environment: data.environment,
            scopes: data.scopes || [],
            status: data.status,
            rateLimitPerMinute: data.rate_limit_per_minute,
            monthlyQuota: data.monthly_quota,
            lastUsedAt: data.last_used_at,
            expiresAt: data.expires_at,
            revokedAt: data.revoked_at,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
          };
          this.mockKeys.set(data.id, key);
          this.mockKeyHashes.set(keyHash, data.id);
        }
      } catch (err) {
        // Ignore
      }
    }

    if (!key) {
      return { valid: false, error: 'API_KEY_NOT_FOUND' };
    }

    if (key.status !== 'active') {
      return { valid: false, error: `API_KEY_${key.status.toUpperCase()}` };
    }

    const org = await this.getOrganization(key.organizationId);
    if (!org) {
      return { valid: false, error: 'ORGANIZATION_NOT_FOUND' };
    }

    if (org.billingStatus !== 'active') {
      return { valid: false, error: 'ORGANIZATION_BILLING_SUSPENDED' };
    }

    // Update last used
    key.lastUsedAt = new Date().toISOString();

    return { valid: true, key, org };
  }

  // --- 3. USAGE TELEMETRY & LEDGER ---

  static async recordUsage(params: {
    organizationId: string;
    apiKeyId?: string;
    endpoint: string;
    method: string;
    statusCode: number;
    latencyMs: number;
    ip?: string;
  }): Promise<void> {
    const now = new Date();
    const hourBucket = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(
      now.getUTCDate()
    ).padStart(2, '0')}-${String(now.getUTCHours()).padStart(2, '0')}`;

    this.mockUsageLedger.push({
      organizationId: params.organizationId,
      apiKeyId: params.apiKeyId,
      endpoint: params.endpoint,
      method: params.method,
      statusCode: params.statusCode,
      latencyMs: params.latencyMs,
      hourBucket,
      recordedAt: now.toISOString(),
    });

    if (isSupabaseConfigured) {
      try {
        const ipHash = params.ip
          ? createHash('sha256').update(`${params.ip}-dpdp-salt-v1`).digest('hex')
          : null;

        await supabase.from('developer_usage_ledger').insert({
          organization_id: params.organizationId,
          api_key_id: params.apiKeyId || null,
          endpoint: params.endpoint,
          method: params.method,
          status_code: params.statusCode,
          latency_ms: params.latencyMs,
          ip_hash: ipHash,
          hour_bucket: hourBucket,
          recorded_at: now.toISOString(),
        });
      } catch (err) {
        // Ignore
      }
    }
  }

  static async getUsageSummary(orgId: string): Promise<DeveloperUsageSummaryDTO> {
    const org = await this.getOrganization(orgId);
    if (!org) {
      throw new Error(`Organization '${orgId}' not found.`);
    }

    const tierLimits = DEVELOPER_TIER_CONFIGS[org.tier];
    const records = this.mockUsageLedger.filter((r) => r.organizationId === orgId);
    const used = records.length;
    const remaining = Math.max(0, tierLimits.monthlyCeiling - used);
    const percentUsed = Number(((used / tierLimits.monthlyCeiling) * 100).toFixed(2));

    // Aggregate by hour bucket
    const bucketMap = new Map<string, { requests: number; errors: number; totalLatency: number }>();
    for (const r of records) {
      const b = bucketMap.get(r.hourBucket) || { requests: 0, errors: 0, totalLatency: 0 };
      b.requests += 1;
      if (r.statusCode >= 400) b.errors += 1;
      b.totalLatency += r.latencyMs;
      bucketMap.set(r.hourBucket, b);
    }

    const trends: DeveloperUsageBucketDTO[] = Array.from(bucketMap.entries()).map(([hourBucket, data]) => ({
      hourBucket,
      requestCount: data.requests,
      errorCount: data.errors,
      avgLatencyMs: Math.round(data.totalLatency / (data.requests || 1)),
    }));

    return {
      organizationId: orgId,
      tier: org.tier,
      monthlyQuota: {
        ceiling: tierLimits.monthlyCeiling,
        used,
        remaining,
        percentUsed,
      },
      rateLimitPerMinute: tierLimits.requestsPerMinute,
      trends,
      serverTimestamp: new Date().toISOString(),
    };
  }

  // --- 4. BILLING CHECKOUT ---

  static async createBillingCheckout(
    req: DeveloperBillingCheckoutRequest
  ): Promise<DeveloperBillingCheckoutResponse> {
    const org = await this.getOrganization(req.organizationId);
    if (!org) {
      throw new Error(`Organization '${req.organizationId}' not found.`);
    }

    const targetConfig = DEVELOPER_TIER_CONFIGS[req.targetTier];
    const multiplier = req.billingCycle === 'annual' ? 10 : 1; // 2 months discount for annual
    const amountINR = targetConfig.priceINRPerMonth * multiplier;

    const orderId = `order_${Date.now()}_${randomBytes(4).toString('hex')}`;

    return {
      orderId,
      organizationId: req.organizationId,
      targetTier: req.targetTier,
      amountINR,
      currency: 'INR',
      razorpayKeyId: 'rzp_test_developer_b2b_v1',
      isSandbox: true,
    };
  }

  // --- 5. OPENAPI 3.1 SPECIFICATION GENERATION ---

  static getOpenApiSpec(): Record<string, any> {
    return {
      openapi: '3.1.0',
      info: {
        title: 'Poligram Sovereign Civic & Delimitation Developer API',
        version: '1.0.0',
        description:
          'Official Developer API for Poligram providing programmatic access to sovereign Indian electoral geography, 2026 delimitation scenario models, representative profiles, and live civic statistics across 4,123 Assembly Constituencies.',
        contact: {
          name: 'Poligram Developer Support',
          email: 'developers@poligram.in',
          url: 'https://poligram.in/developers',
        },
        license: {
          name: 'Proprietary Commercial & Open Civic License',
          url: 'https://poligram.in/terms/api',
        },
      },
      servers: [
        {
          url: 'https://api.poligram.in',
          description: 'Production Sovereign API Gateway',
        },
        {
          url: 'http://localhost:3000',
          description: 'Local Development Gateway',
        },
      ],
      security: [
        {
          ApiKeyAuth: [],
        },
      ],
      components: {
        securitySchemes: {
          ApiKeyAuth: {
            type: 'apiKey',
            in: 'header',
            name: 'x-api-key',
            description: 'Cryptographic API Key starting with pk_live_ or pk_test_',
          },
        },
        schemas: {
          StateOverview: {
            type: 'object',
            properties: {
              stateCode: { type: 'string', example: 'TS' },
              name: { type: 'string', example: 'Telangana' },
              capital: { type: 'string', example: 'Hyderabad' },
              totalAssemblyConstituencies: { type: 'integer', example: 119 },
              totalParliamentaryConstituencies: { type: 'integer', example: 17 },
              rulingParty: { type: 'string', example: 'INC' },
            },
          },
          ConstituencyProfile: {
            type: 'object',
            properties: {
              acId: { type: 'string', example: 'TS-AC-61' },
              acNo: { type: 'integer', example: 61 },
              name: { type: 'string', example: 'Jubilee Hills' },
              stateCode: { type: 'string', example: 'TS' },
              districtName: { type: 'string', example: 'Hyderabad' },
              reservedCategory: { type: 'string', enum: ['GEN', 'SC', 'ST'] },
            },
          },
        },
      },
      paths: {
        '/api/v1/public/states/{stateCode}': {
          get: {
            summary: 'Get State Overview & Delimitation Preview',
            tags: ['Geography'],
            parameters: [
              {
                name: 'stateCode',
                in: 'path',
                required: true,
                schema: { type: 'string' },
              },
            ],
            responses: {
              '200': {
                description: 'State profile successfully retrieved',
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/StateOverview' },
                  },
                },
              },
            },
          },
        },
        '/api/v1/public/constituency/{acId}': {
          get: {
            summary: 'Get Assembly Constituency Profile & 2026 Delimitation Shift',
            tags: ['Geography'],
            parameters: [
              {
                name: 'acId',
                in: 'path',
                required: true,
                schema: { type: 'string' },
              },
            ],
            responses: {
              '200': {
                description: 'Constituency profile successfully retrieved',
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/ConstituencyProfile' },
                  },
                },
              },
            },
          },
        },
        '/api/v1/analytics/events': {
          post: {
            summary: 'Ingest Universal Analytics Events',
            tags: ['Analytics'],
            responses: {
              '200': {
                description: 'Batch of analytics events successfully ingested',
              },
            },
          },
        },
      },
    };
  }
}

export const developerPlatformService = DeveloperPlatformService;
