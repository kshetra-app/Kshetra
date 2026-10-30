/**
 * Domain 7 Comprehensive Test Suite (JOB 062 - JOB 066)
 *
 * Authority: Master Product Blueprint (Jobs 062–066), DEC-188, DEC-189
 * Scope Tested:
 * - JOB 062: API Developer Platform (Orgs, RBAC, Keys, Quotas, Usage, Billing, OpenAPI 3.1)
 * - JOB 063: Public Geography Web Pages, SEO & Twin JSON APIs (States, Districts, ACs, Delimitation, Sitemaps)
 * - JOB 064: Media Embeds & Civic Widgets (7 Widgets, postMessage auto-resize, Web Component, RPA 127A)
 * - JOB 065: Universal Analytics Platform (10-Field Schema, DPDP Salt Hashing, Batch Ingestion, Sink Exporter)
 * - JOB 066: Executive Product Dashboard (Activation, Retention, Engagement, Density, Revenue Mathematical Proof)
 */

import { describe, it, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import { developerPlatformService } from '../apps/api/src/services/developerPlatformService';
import { publicWebService } from '../apps/api/src/services/publicWebService';
import { embedService } from '../apps/api/src/services/embedService';
import { universalAnalyticsService, type AnalyticsSinkExporter } from '../apps/api/src/services/universalAnalyticsService';
import { productDashboardService } from '../apps/api/src/services/productDashboardService';

import { developerPlatformRoutes } from '../apps/api/src/routes/developerPlatform';
import { publicWebRoutes } from '../apps/api/src/routes/publicWeb';
import { embedRoutes } from '../apps/api/src/routes/embeds';
import { universalAnalyticsRoutes } from '../apps/api/src/routes/universalAnalytics';
import { productDashboardRoutes } from '../apps/api/src/routes/productDashboard';
import type { UniversalAnalyticsEventDTO } from '@kshetra/shared';

describe('Domain 7: Developer Platform, Public Web Discovery, SEO & Embeds (JOB 062–066)', () => {
  let app: ReturnType<typeof Fastify>;

  before(async () => {
    app = Fastify({ logger: false });
    await app.register(developerPlatformRoutes);
    await app.register(publicWebRoutes);
    await app.register(embedRoutes);
    await app.register(universalAnalyticsRoutes);
    await app.register(productDashboardRoutes);
    await app.ready();
  });

  beforeEach(() => {
    developerPlatformService.resetForTesting();
    universalAnalyticsService.resetForTesting();
  });

  // ============================================================================
  // JOB 062: API DEVELOPER PLATFORM
  // ============================================================================
  describe('JOB 062: API Developer Platform', () => {
    it('should create an organization with admin member and default tier', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/developer/organizations',
        payload: {
          name: 'Civic Media Labs India',
          billingEmail: 'ops@civicmedia.in',
          adminUserId: 'user-admin-1',
          tier: 'pro',
        },
      });

      assert.strictEqual(res.statusCode, 201);
      const body = res.json();
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.data.name, 'Civic Media Labs India');
      assert.strictEqual(body.data.tier, 'pro');
      assert.strictEqual(body.data.billingStatus, 'active');
      assert.ok(body.data.id.startsWith('org_'));

      // Verify admin member was registered
      const memberRes = await app.inject({
        method: 'GET',
        url: `/api/v1/developer/organizations/${body.data.id}/members`,
      });
      assert.strictEqual(memberRes.statusCode, 200);
      const members = memberRes.json().data;
      assert.strictEqual(members.length, 1);
      assert.strictEqual(members[0].role, 'admin');
      assert.strictEqual(members[0].userId, 'user-admin-1');
    });

    it('should add a team member with role-based permissions', async () => {
      const org = await developerPlatformService.createOrganization({
        name: 'Election Analytics Corp',
        billingEmail: 'finance@electioncorp.in',
        adminUserId: 'user-admin-2',
      });

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/developer/organizations/${org.id}/members`,
        payload: {
          userId: 'user-dev-9',
          role: 'developer',
        },
      });

      assert.strictEqual(res.statusCode, 201);
      const body = res.json();
      assert.strictEqual(body.data.role, 'developer');
      assert.strictEqual(body.data.userId, 'user-dev-9');
    });

    it('should issue cryptographic API keys with pk_live_ prefix and enforce key limits', async () => {
      const org = await developerPlatformService.createOrganization({
        name: 'Free Tier Org',
        billingEmail: 'free@dev.in',
        adminUserId: 'user-free-1',
        tier: 'free', // Max 2 keys
      });

      // 1. Create first key
      const key1Res = await app.inject({
        method: 'POST',
        url: `/api/v1/developer/organizations/${org.id}/keys`,
        payload: { name: 'Production Backend Key', environment: 'live' },
      });
      assert.strictEqual(key1Res.statusCode, 201);
      const key1Data = key1Res.json().data;
      assert.ok(key1Data.rawKey.startsWith('pk_live_'));
      assert.strictEqual(key1Data.key.keyPrefix, 'pk_live_');
      assert.strictEqual(key1Data.key.status, 'active');

      // 2. Create second key
      const key2Res = await app.inject({
        method: 'POST',
        url: `/api/v1/developer/organizations/${org.id}/keys`,
        payload: { name: 'Staging Key', environment: 'test' },
      });
      assert.strictEqual(key2Res.statusCode, 201);
      assert.ok(key2Res.json().data.rawKey.startsWith('pk_test_'));

      // 3. Attempt to create third key (Should fail on Free tier ceiling)
      const key3Res = await app.inject({
        method: 'POST',
        url: `/api/v1/developer/organizations/${org.id}/keys`,
        payload: { name: 'Excess Key' },
      });
      assert.strictEqual(key3Res.statusCode, 403);
      const errBody = key3Res.json();
      assert.ok(
        (errBody.message && errBody.message.includes('Tier key limit reached')) ||
        (errBody.error && errBody.error.includes('Tier key limit reached'))
      );
    });

    it('should verify active API keys and reject revoked keys', async () => {
      const org = await developerPlatformService.createOrganization({
        name: 'News Verification Unit',
        billingEmail: 'desk@newsunit.org',
        adminUserId: 'user-desk-1',
        tier: 'pro',
      });

      const keyCreated = await developerPlatformService.createApiKey({
        organizationId: org.id,
        name: 'News Bot Key',
      });

      // Verify valid raw key
      const verifyActive = await developerPlatformService.verifyApiKey(keyCreated.rawKey);
      assert.strictEqual(verifyActive.valid, true);
      assert.strictEqual(verifyActive.key?.name, 'News Bot Key');
      assert.strictEqual(verifyActive.org?.id, org.id);

      // Revoke key
      const revokeRes = await app.inject({
        method: 'POST',
        url: `/api/v1/developer/organizations/${org.id}/keys/${keyCreated.key.id}/revoke`,
      });
      assert.strictEqual(revokeRes.statusCode, 200);

      // Verify revoked key is rejected fail-closed
      const verifyRevoked = await developerPlatformService.verifyApiKey(keyCreated.rawKey);
      assert.strictEqual(verifyRevoked.valid, false);
      assert.strictEqual(verifyRevoked.error, 'API_KEY_REVOKED');
    });

    it('should record usage telemetry, compute monthly quotas, and generate OpenAPI 3.1 schema', async () => {
      const org = await developerPlatformService.createOrganization({
        name: 'Constituency Monitor Tech',
        billingEmail: 'tech@monitor.org',
        adminUserId: 'user-tech-1',
        tier: 'pro',
      });

      // Record 3 usage requests
      await developerPlatformService.recordUsage({
        organizationId: org.id,
        endpoint: '/api/v1/public/constituency/TS-AC-61',
        method: 'GET',
        statusCode: 200,
        latencyMs: 34,
        ip: '103.21.244.2',
      });
      await developerPlatformService.recordUsage({
        organizationId: org.id,
        endpoint: '/api/v1/public/states/TS',
        method: 'GET',
        statusCode: 200,
        latencyMs: 18,
      });

      const usageRes = await app.inject({
        method: 'GET',
        url: `/api/v1/developer/organizations/${org.id}/usage`,
      });
      assert.strictEqual(usageRes.statusCode, 200);
      const usage = usageRes.json().data;
      assert.strictEqual(usage.tier, 'pro');
      assert.strictEqual(usage.monthlyQuota.used, 2);
      assert.strictEqual(usage.monthlyQuota.ceiling, 500_000);
      assert.strictEqual(usage.monthlyQuota.remaining, 499_998);

      // Verify OpenAPI 3.1 documentation
      const docsRes = await app.inject({
        method: 'GET',
        url: '/api/docs/json',
      });
      assert.strictEqual(docsRes.statusCode, 200);
      const openapi = docsRes.json();
      assert.strictEqual(openapi.openapi, '3.1.0');
      assert.strictEqual(openapi.info.title, 'PANIN Sovereign Civic & Delimitation Developer API');
      assert.ok(openapi.components.securitySchemes.ApiKeyAuth);
    });
  });

  // ============================================================================
  // JOB 063: PUBLIC GEOGRAPHY WEB PAGES & SEO
  // ============================================================================
  describe('JOB 063: Public Geography Web Pages, SEO & Twin JSON APIs', () => {
    it('should render canonical SSR HTML for state landing page with OpenGraph & Schema.org JSON-LD', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/public/states/TS',
      });

      assert.strictEqual(res.statusCode, 200);
      assert.ok(res.headers['content-type']?.includes('text/html'));
      const html = res.body;

      // Verify essential SEO & Social elements
      assert.ok(html.includes('Telangana (TS)') && html.includes('Electoral Geography, Seats'));
      assert.ok(html.includes('<meta property="og:title"'));
      assert.ok(html.includes('<meta property="og:url" content="https://kshetra.in/public/states/TS"'));
      assert.ok(html.includes('<script type="application/ld+json">'));
      assert.ok(html.includes('"@type":"AdministrativeArea"'));
      assert.ok(html.includes('Assembly Constituencies'));
      assert.ok(html.includes('119'));
    });

    it('should render canonical SSR HTML for assembly constituency with 2026 delimitation scenario', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/public/constituency/TS-AC-61',
      });

      assert.strictEqual(res.statusCode, 200);
      const html = res.body;

      assert.ok(html.includes('Jubilee Hills (TS-AC-61)') && html.includes('Assembly Constituency Profile'));
      assert.ok(html.includes('Current MLA'));
      assert.ok(html.includes('Mohammad Azharuddin'));
      assert.ok(html.includes('3,84,200')); // Electors
      assert.ok(html.includes('2026 Delimitation Scenario'));
      assert.ok(html.includes('Section 127A RPA 1951 Disclosed'));
    });

    it('should provide twin headless JSON API mirror for public discovery (DEC-189 Option B)', async () => {
      const stateRes = await app.inject({
        method: 'GET',
        url: '/api/v1/public/states/TS',
      });
      assert.strictEqual(stateRes.statusCode, 200);
      const state = stateRes.json().data;
      assert.strictEqual(state.stateCode, 'TS');
      assert.strictEqual(state.name, 'Telangana');
      assert.strictEqual(state.totalAssemblyConstituencies, 119);

      const acRes = await app.inject({
        method: 'GET',
        url: '/api/v1/public/constituency/TS-AC-61',
      });
      assert.strictEqual(acRes.statusCode, 200);
      const ac = acRes.json().data;
      assert.strictEqual(ac.acId, 'TS-AC-61');
      assert.strictEqual(ac.name, 'Jubilee Hills');
      assert.strictEqual(ac.currentRepresentative.party, 'INC');
    });

    it('should generate valid canonical XML sitemaps', async () => {
      const sitemapRes = await app.inject({
        method: 'GET',
        url: '/sitemap.xml',
      });
      assert.strictEqual(sitemapRes.statusCode, 200);
      assert.ok(sitemapRes.headers['content-type']?.includes('xml'));
      assert.ok(sitemapRes.body.includes('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'));
      assert.ok(sitemapRes.body.includes('https://kshetra.in/public/states/TS'));

      const geoSitemapRes = await app.inject({
        method: 'GET',
        url: '/sitemap-geography.xml',
      });
      assert.strictEqual(geoSitemapRes.statusCode, 200);
      assert.ok(geoSitemapRes.body.includes('https://kshetra.in/public/constituency/TS-AC-61'));
    });
  });

  // ============================================================================
  // JOB 064: MEDIA EMBEDS & CIVIC WIDGETS
  // ============================================================================
  describe('JOB 064: Media Embeds & Civic Widgets', () => {
    it('should serve universal panin-widgets.js loader with postMessage auto-resize & Web Component', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/embed/panin-widgets.js',
      });

      assert.strictEqual(res.statusCode, 200);
      assert.ok(res.headers['content-type']?.includes('javascript'));
      assert.ok(res.body.includes('kshetra:resize'));
      assert.ok(res.body.includes('customElements.define(\'panin-widget\''));
    });

    it('should render all 7 embed widgets with permissive framing headers and Section 127A attribution', async () => {
      const widgetTypes = [
        { type: 'constituency', id: 'TS-AC-61', expectedText: 'Constituency Card' },
        { type: 'delimitation', id: 'TS-AC-61', expectedText: '2026 Delimitation Shift' },
        { type: 'election', id: 'TS-2023', expectedText: 'Election Results Tally' },
        { type: 'candidate', id: 'cand-azhar', expectedText: 'Candidate Profile' },
        { type: 'issue', id: 'iss-drain-1', expectedText: 'Civic Grievance' },
        { type: 'live', id: 'stream-townhall', expectedText: 'Live Townhall Broadcast' },
        { type: 'short', id: 'short-news-1', expectedText: 'Civic Short' },
      ];

      for (const w of widgetTypes) {
        const res = await app.inject({
          method: 'GET',
          url: `/embed/${w.type}/${w.id}`,
        });

        assert.strictEqual(res.statusCode, 200, `Widget ${w.type} failed to render`);
        assert.strictEqual(res.headers['x-frame-options'], 'ALLOWALL');
        assert.strictEqual(res.headers['content-security-policy'], 'frame-ancestors *');
        assert.strictEqual(res.headers['access-control-allow-origin'], '*');
        assert.ok(res.body.includes(w.expectedText), `Widget ${w.type} missing expected text`);
        assert.ok(res.body.includes('Powered by PANIN Civic Tech &middot; RPA 1951 Sec 127A Disclosed'));
        assert.ok(res.body.includes("type: 'kshetra:resize'"));
      }
    });
  });

  // ============================================================================
  // JOB 065: UNIVERSAL ANALYTICS PLATFORM
  // ============================================================================
  describe('JOB 065: Universal Analytics Platform', () => {
    it('should ingest batch events adhering strictly to canonical 10-field schema with DPDP IP salt-hashing', async () => {
      const events: UniversalAnalyticsEventDTO[] = [
        {
          eventName: 'signup_completed',
          userId: 'user-ts-101',
          anonymousId: 'anon-dev-uuid-1',
          sessionId: 'sess-abc-1',
          timestamp: new Date().toISOString(),
          screen: '/signup/complete',
          geography: { stateCode: 'TS', acId: 'TS-AC-61' },
          entity: { entityType: 'user', entityId: 'user-ts-101' },
          metadata: { channel: 'organic', email: 'leak@test.com', phone: '9999999999' }, // Contains PII to test sanitization
          appVersion: 'android-2.1.0',
        },
        {
          eventName: 'constituency_selected',
          userId: 'user-ts-101',
          anonymousId: 'anon-dev-uuid-1',
          sessionId: 'sess-abc-1',
          timestamp: new Date().toISOString(),
          screen: '/onboarding/geography',
          geography: { stateCode: 'TS', acId: 'TS-AC-61' },
          entity: { entityType: 'constituency', entityId: 'TS-AC-61' },
          metadata: { method: 'gps_lookup' },
          appVersion: 'android-2.1.0',
        },
      ];

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/analytics/events',
        headers: {
          'x-forwarded-for': '49.207.214.18', // Client IP
        },
        payload: { events },
      });

      assert.strictEqual(res.statusCode, 201);
      const body = res.json();
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.data.ingestedCount, 2);
      assert.strictEqual(body.data.rejectedCount, 0);

      // Verify DPDP 2023 sanitization in persisted events
      const queried = await universalAnalyticsService.queryEvents({ userId: 'user-ts-101' });
      assert.strictEqual(queried.length, 2);
      const first = queried[0];
      assert.strictEqual(first.metadata.email, undefined, 'Raw email must not be persisted (DPDP)');
      assert.strictEqual(first.metadata.phone, undefined, 'Raw phone must not be persisted (DPDP)');
      assert.ok(first.metadata._clientIpHash, 'Client IP must be salt-hashed');
    });

    it('should reject malformed event payloads missing mandatory canonical fields fail-closed', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/analytics/events',
        payload: {
          events: [
            {
              eventName: 'incomplete_event',
              // missing anonymousId, sessionId, screen, appVersion
            },
          ],
        },
      });

      assert.strictEqual(res.statusCode, 400);
      const body = res.json();
      assert.strictEqual(body.data.rejectedCount, 1);
      assert.strictEqual(body.data.ingestedCount, 0);
      assert.ok(body.data.errors[0].includes('missing required'));
    });

    it('should dual-stream events to registered external sink exporter (DEC-189 Option B)', async () => {
      const exportedBatches: UniversalAnalyticsEventDTO[][] = [];
      const testSink: AnalyticsSinkExporter = {
        async exportEvents(events) {
          exportedBatches.push(events);
        },
      };

      universalAnalyticsService.registerSinkExporter(testSink);

      await app.inject({
        method: 'POST',
        url: '/api/v1/analytics/events',
        payload: {
          eventName: 'widget_embed_load',
          anonymousId: 'anon-reader-88',
          sessionId: 'sess-news-1',
          timestamp: new Date().toISOString(),
          screen: '/embed/constituency/TS-AC-61',
          geography: { acId: 'TS-AC-61' },
          entity: { entityType: 'widget', entityId: 'TS-AC-61' },
          metadata: { hostDomain: 'thehindu.com' },
          appVersion: 'web-embed-1.0.0',
        },
      });

      assert.strictEqual(exportedBatches.length, 1);
      assert.strictEqual(exportedBatches[0][0].eventName, 'widget_embed_load');
    });
  });

  // ============================================================================
  // JOB 066: EXECUTIVE PRODUCT DASHBOARD & MATHEMATICAL RECONSTRUCTION
  // ============================================================================
  describe('JOB 066: Executive Product Dashboard & Independent Reconstruction', () => {
    it('should reconstruct all 5 metric dimensions with exact mathematical equality against raw events', async () => {
      // 1. Seed deterministic event stream
      const testEvents: UniversalAnalyticsEventDTO[] = [
        {
          eventName: 'signup_completed',
          userId: 'usr-1',
          anonymousId: 'anon-1',
          sessionId: 's-1',
          timestamp: new Date().toISOString(),
          screen: '/signup',
          geography: { acId: 'TS-AC-61' },
          entity: {},
          metadata: {},
          appVersion: '1.0.0',
        },
        {
          eventName: 'otp_verified',
          userId: 'usr-1',
          anonymousId: 'anon-1',
          sessionId: 's-1',
          timestamp: new Date().toISOString(),
          screen: '/otp',
          geography: { acId: 'TS-AC-61' },
          entity: {},
          metadata: {},
          appVersion: '1.0.0',
        },
        {
          eventName: 'constituency_selected',
          userId: 'usr-1',
          anonymousId: 'anon-1',
          sessionId: 's-1',
          timestamp: new Date().toISOString(),
          screen: '/geo',
          geography: { acId: 'TS-AC-61' },
          entity: {},
          metadata: {},
          appVersion: '1.0.0',
        },
        {
          eventName: 'issue_created',
          userId: 'usr-1',
          anonymousId: 'anon-1',
          sessionId: 's-1',
          timestamp: new Date().toISOString(),
          screen: '/civic/create',
          geography: { acId: 'TS-AC-61' },
          entity: {},
          metadata: {},
          appVersion: '1.0.0',
        },
        {
          eventName: 'issue_upvoted',
          userId: 'usr-2',
          anonymousId: 'anon-2',
          sessionId: 's-2',
          timestamp: new Date().toISOString(),
          screen: '/civic/feed',
          geography: { acId: 'JH-AC-44' },
          entity: {},
          metadata: {},
          appVersion: '1.0.0',
        },
      ];

      await universalAnalyticsService.ingestBatch({ events: testEvents });

      // 2. Fetch Executive Metrics via API
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/dashboard/metrics',
      });
      assert.strictEqual(res.statusCode, 200);
      const metrics = res.json().data;

      // 3. Verify dimensions
      assert.strictEqual(metrics.activation.totalSignups, 1);
      assert.strictEqual(metrics.activation.verifiedUsers, 1);
      assert.strictEqual(metrics.activation.firstCivicActionCount, 2); // 1 issue created + 1 upvoted
      assert.strictEqual(metrics.retention.dau, 2); // usr-1 and usr-2
      assert.strictEqual(metrics.geographyDensity.totalConstituencies, 4123);
      assert.strictEqual(metrics.geographyDensity.activeConstituencies, 2); // TS-AC-61 and JH-AC-44
      assert.strictEqual(metrics.geographyDensity.topActiveConstituencies.length, 2);

      // 4. Mathematical Reconstruction Proof Endpoint (JOB 066 Evidence)
      const proofRes = await app.inject({
        method: 'POST',
        url: '/api/v1/dashboard/reconstruct',
        payload: { events: testEvents },
      });
      assert.strictEqual(proofRes.statusCode, 200);
      const proofData = proofRes.json().data;
      assert.strictEqual(proofData.verified, true);
      assert.strictEqual(proofData.sourceEventCount, 5);

      // Verify mathematical identity between direct re-computation and API metrics
      assert.strictEqual(proofData.reconstructed.activation.totalSignups, metrics.activation.totalSignups);
      assert.strictEqual(proofData.reconstructed.retention.dau, metrics.retention.dau);
      assert.strictEqual(proofData.reconstructed.geographyDensity.activeConstituencies, metrics.geographyDensity.activeConstituencies);
    });
  });
});
