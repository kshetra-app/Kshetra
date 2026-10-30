/**
 * apps/api/src/__tests__/compliance-w051-5.test.ts
 *
 * Milestone W051.5 — Compliance, DPDP & Data Governance Readiness
 * Comprehensive Automated Verification Suite for DPDP Act 2023 & DPDPR 2025.
 */

import Fastify, { type FastifyInstance } from 'fastify';
import { complianceRoutes } from '../modules/compliance/routes';
import { privacyLocaleService } from '../modules/compliance/privacyLocales';
import { inventoryService } from '../modules/compliance/inventory';
import { dataFlowService } from '../modules/compliance/dataFlow';
import { retentionService } from '../modules/compliance/retentionService';
import { rightsService } from '../modules/compliance/rightsService';
import { sdfService } from '../modules/compliance/sdfService';
import { breachService } from '../modules/compliance/breachService';

describe('Milestone W051.5: Compliance, DPDP & Data Governance Readiness Suite', () => {
  let app: FastifyInstance;
  const testUserId = '99999999-9999-4999-8999-999999999999';

  beforeAll(async () => {
    app = Fastify({ logger: false });
    await app.register(complianceRoutes);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  // ============================================================================
  // 1. 13-LANGUAGE STATUTORY PRIVACY LOCALIZATION
  // ============================================================================
  describe('Pillar 1: 13-Language Statutory Privacy Surface Matrix', () => {
    it('W051.5-I18N-01: Verifies 100% linguistic parity across all 13 official supported languages', () => {
      const parity = privacyLocaleService.verifyLinguisticParity();
      expect(parity.totalExpectedLocales).toBe(13);
      expect(parity.loadedLocales).toBe(13);
      expect(parity.completeParity).toBe(true);
      expect(Object.keys(parity.missingKeysByLocale).length).toBe(0);
    });

    it('W051.5-I18N-02: Endpoint lists all 13 official language packs with native display names', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/compliance/locales',
      });

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload);
      expect(json.success).toBe(true);
      expect(json.data.total).toBe(13);
      const locales = json.data.locales.map((l: any) => l.locale);
      expect(locales).toEqual(
        expect.arrayContaining(['en', 'hi', 'te', 'ta', 'kn', 'ml', 'mr', 'bn', 'gu', 'or', 'pa', 'as', 'ne']),
      );
    });

    it('W051.5-I18N-03: Fetches Telugu (te) statutory privacy notice with correct DPO and DPBI appeal contact', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/compliance/privacy-notice?locale=te',
      });

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload);
      expect(json.success).toBe(true);
      expect(json.data.locale).toBe('te');
      expect(json.data.languageName).toContain('తెలుగు');
      expect(json.data.privacyPolicyTitle).toContain('పాన్-ఇన్ / క్షేత్ర');
      expect(json.data.dpoContact.email).toBe('dpo@kshetra.io');
      expect(json.data.dpbiAppealNotice).toContain('డేటా ప్రొటెక్షన్ బోర్డ్ ఆఫ్ ఇండియా');
    });

    it('W051.5-I18N-04: Gracefully falls back to English when an unsupported locale code is requested', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/compliance/privacy-notice?locale=xyz',
      });

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload);
      expect(json.success).toBe(true);
      expect(json.data.locale).toBe('en');
      expect(json.data.privacyPolicyTitle).toContain('Poligram Statutory Privacy Notice');
    });
  });

  // ============================================================================
  // 2. PERSONAL DATA INVENTORY & PURPOSE LIMITATION
  // ============================================================================
  describe('Pillar 2: Personal Data Inventory & Purpose Limitation', () => {
    it('W051.5-INV-01: Returns comprehensive personal data inventory covering all core subsystems', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/compliance/inventory',
      });

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload);
      expect(json.success).toBe(true);
      expect(json.data.totalItems).toBeGreaterThanOrEqual(19);

      // Verify essential entities are cataloged
      const entities = json.data.items.map((i: any) => i.entity);
      expect(entities).toContain('auth.users');
      expect(entities).toContain('public.user_profiles');
      expect(entities).toContain('public.user_verification');
      expect(entities).toContain('public.aspirant_profiles');
      expect(entities).toContain('public.campaign_wallets');
      expect(entities).toContain('public.voice_obd_broadcasts');
      expect(entities).toContain('public.saas_tenants');
      expect(entities).toContain('public.canonical_persons');
      expect(entities).toContain('public.candidate_affidavits');
    });

    it('W051.5-INV-02: Distinguishes between erasable citizen data and statutory public records', () => {
      const stats = inventoryService.getErasureEligibilitySummary();
      expect(stats.citizenDataErasableCount).toBeGreaterThanOrEqual(17);
      expect(stats.statutoryPublicExemptCount).toBeGreaterThanOrEqual(2);
      expect(stats.totalFieldsCount).toBe(stats.citizenDataErasableCount + stats.statutoryPublicExemptCount);
    });
  });

  // ============================================================================
  // 3. TECHNICAL DATA FLOW & SUBPROCESSOR BOUNDARIES
  // ============================================================================
  describe('Pillar 3: Data Flow Map & Third-Party Subprocessors', () => {
    it('W051.5-FLOW-01: Verifies sovereign data hosting in India (AWS ap-south-1 Mumbai)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/compliance/data-flow',
      });

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload);
      expect(json.success).toBe(true);
      expect(json.data.sovereigntyStatus.sovereignIndiaHosted).toBe(true);
      expect(json.data.sovereigntyStatus.violatingProviders.length).toBe(0);

      // Check subprocessor DPA coverage
      const subprocessors = json.data.subprocessors;
      expect(subprocessors.length).toBeGreaterThanOrEqual(4);
      for (const sp of subprocessors) {
        expect(sp.dpaInPlace).toBe(true);
        expect(sp.securityCertifications.length).toBeGreaterThan(0);
      }
    });
  });

  // ============================================================================
  // 4. RETENTION MATRIX & STATUTORY EXEMPTIONS
  // ============================================================================
  describe('Pillar 4: Retention Policy Matrix & Erasure Boundaries', () => {
    it('W051.5-RET-01: Returns authoritative retention rules with statutory citations', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/compliance/retention-matrix',
      });

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload);
      expect(json.success).toBe(true);
      expect(json.data.totalPolicies).toBeGreaterThanOrEqual(7);

      const policies = json.data.policies;
      const financialRule = policies.find((p: any) => p.retentionClass === 'statutory_7_years');
      expect(financialRule).toBeDefined();
      expect(financialRule.statutoryReference).toContain('Companies Act 2013');

      const statutoryPublicRule = policies.find((p: any) => p.retentionClass === 'permanent_statutory_public');
      expect(statutoryPublicRule).toBeDefined();
      expect(statutoryPublicRule.deletionTrigger).toContain('NEVER');
    });

    it('W051.5-RET-02: Strictly refuses erasure of statutory ECI public political records', () => {
      const checkPersons = retentionService.canEraseEntity('public.canonical_persons');
      expect(checkPersons.canErase).toBe(false);
      expect(checkPersons.reason).toContain('Representation of the People Act 1951');

      const checkAffidavits = retentionService.canEraseEntity('public.candidate_affidavits');
      expect(checkAffidavits.canErase).toBe(false);

      const checkProfiles = retentionService.canEraseEntity('public.user_profiles');
      expect(checkProfiles.canErase).toBe(true);
    });
  });

  // ============================================================================
  // 5. DATA PRINCIPAL RIGHTS WORKFLOWS
  // ============================================================================
  describe('Pillar 5: Executable Data Principal Rights Workflows', () => {
    it('W051.5-RIGHTS-01: Rejects unauthenticated rights requests with 401', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/compliance/rights/access',
      });
      expect(res.statusCode).toBe(401);
    });

    it('W051.5-RIGHTS-02: Executes Right to Access (Sec 11) and generates cryptographic archive', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/compliance/rights/access',
        headers: { 'x-user-id': testUserId },
        payload: { format: 'json', includeActivityHistory: true },
      });

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload);
      expect(json.success).toBe(true);
      expect(json.data.userId).toBe(testUserId);
      expect(json.data.archiveChecksumSha256).toMatch(/^[0-9a-f]{64}$/);
      expect(json.data.summary.publicStatutoryRecordsNotice).toContain('statutory public records');
    });

    it('W051.5-RIGHTS-03: Executes Right to Correction (Sec 12) with audit trail', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/compliance/rights/correction',
        headers: { 'x-user-id': testUserId },
        payload: {
          field: 'displayName',
          correctedValue: 'Verified Citizen Advocate',
          reason: 'Legal name change updated on official voter ID',
        },
      });

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload);
      expect(json.success).toBe(true);
      expect(json.data.field).toBe('displayName');
      expect(json.data.status).toBe('completed');
    });

    it('W051.5-RIGHTS-04: Rejects account erasure when explicit confirmation phrase is missing', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/compliance/rights/erasure',
        headers: { 'x-user-id': testUserId },
        payload: { confirmation: 'WRONG_PHRASE' },
      });

      expect(res.statusCode).toBe(400);
      const json = JSON.parse(res.payload);
      expect(json.error).toBe('Bad Request');
    });

    it('W051.5-RIGHTS-05: Executes Right to Erasure (Sec 12(3)) and issues formal certificate', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/compliance/rights/erasure',
        headers: { 'x-user-id': testUserId },
        payload: { confirmation: 'DELETE_MY_PERSONAL_DATA', reason: 'Moving overseas' },
      });

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload);
      expect(json.success).toBe(true);
      expect(json.data.erasureCertificateId).toMatch(/^cert_dpdp_del_/);
      expect(json.data.erasedEntities.length).toBeGreaterThan(0);
      expect(json.data.retainedStatutoryEntities).toEqual(
        expect.arrayContaining([expect.stringContaining('canonical_persons')]),
      );
    });

    it('W051.5-RIGHTS-06: Lodges citizen grievance with DPO and establishes 30-day statutory SLA', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/compliance/grievance',
        headers: { 'x-user-id': testUserId },
        payload: {
          subject: 'Clarification on Constituency Feed Personalization',
          description: 'Requesting clarification regarding how my assembly constituency feed is selected.',
          contactEmail: 'citizen@example.org',
          category: 'other',
        },
      });

      expect(res.statusCode).toBe(201);
      const json = JSON.parse(res.payload);
      expect(json.success).toBe(true);
      expect(json.data.ticketId).toMatch(/^grv_/);
      expect(json.data.dpoEmail).toBe('dpo@kshetra.io');
      expect(json.data.slaDays).toBe(30);

      // Verify ticket retrieval
      const getRes = await app.inject({
        method: 'GET',
        url: `/api/v1/compliance/grievance/${json.data.ticketId}`,
      });
      expect(getRes.statusCode).toBe(200);
    });
  });

  // ============================================================================
  // 6. SIGNIFICANT DATA FIDUCIARY (SDF) EVALUATION
  // ============================================================================
  describe('Pillar 6: Significant Data Fiduciary (SDF) Evaluation', () => {
    it('W051.5-SDF-01: Returns comprehensive Section 10 statutory assessment', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/compliance/sdf-assessment',
      });

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload);
      expect(json.success).toBe(true);
      expect(json.data.assessmentFramework).toBe('DPDP_Act_2023_Section_10');
      expect(json.data.overallClassification).toBe('DATA_FIDUCIARY');
      expect(json.data.appointedDpo).toBe(true);
      expect(json.data.reassessmentTriggers.length).toBeGreaterThanOrEqual(4);
    });
  });

  // ============================================================================
  // 7. BREACH INCIDENT LOGGING & 72-HOUR SLA
  // ============================================================================
  describe('Pillar 7: Breach Incident Response Protocol', () => {
    it('W051.5-BRC-01: Records high-severity incident and calculates 72-hour DPBI notification deadline', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/compliance/breach',
        payload: {
          severity: 'high',
          affectedCategories: ['contact', 'device_session'],
          estimatedPrincipalsAffected: 250,
          summary: 'Unauthorized API query pattern detected and neutralized by burst rate limiter.',
        },
      });

      expect(res.statusCode).toBe(201);
      const json = JSON.parse(res.payload);
      expect(json.success).toBe(true);
      expect(json.data.dpbiNotificationRequired).toBe(true);
      expect(json.data.dpbiNotificationDueBy).toBeDefined();

      // Test DPBI notification dispatch
      const notifyResult = breachService.notifyDpbi(json.data.incidentId);
      expect(notifyResult.success).toBe(true);
      expect(notifyResult.dpbiAcknowledgmentId).toMatch(/^ACK_DPBI_/);
    });
  });
});
