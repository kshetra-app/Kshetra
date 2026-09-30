/**
 * apps/api/src/__tests__/delimitation.test.ts
 *
 * Milestone W020-G5 — Delimitation API Fastify Route Integration Tests
 * Specification: PLAN-W020-G5-REV-1.2.md (Phases 3 & 4)
 *
 * Verifies all 14 delimitation endpoints against live Fastify instance:
 * 1.  GET  /api/v1/delimitation/projections
 * 2.  GET  /api/v1/delimitation/projections/:stateCode
 * 3.  GET  /api/v1/delimitation/timeline
 * 4.  GET  /api/v1/delimitation/status
 * 5.  GET  /api/v1/delimitation/gainers-losers
 * 6.  POST /api/v1/delimitation/monitor-webhook
 * 7.  GET  /api/v1/delimitation/impact/:pinCode
 * 8.  GET  /api/v1/delimitation/simulate/:stateCode
 * 9.  GET  /api/v1/delimitation/reservation
 * 10. GET  /api/v1/delimitation/reservation/:stateCode
 * 11. GET  /api/v1/delimitation/compare
 * 12. GET  /api/v1/delimitation/mla-impact/:stateCode
 * 13. GET  /api/v1/delimitation/party-projections/:stateCode
 * 14. GET  /api/v1/delimitation/methodology
 *
 * Invariant Assurances:
 * - All success responses conform to ECC-001 ApiSuccessEnvelope<T>
 * - Ingress safety limits: MAX_SAFE_REQUESTED_SEATS = 10000 enforced
 * - Fail-closed monitor webhook authentication (401 on missing/wrong token)
 * - Structured 404 UNSUPPORTED_GEOGRAPHY for unmapped states
 * - Article 332 mathematical conservation bitwise assertions
 * - Scenario enclosure completeness (10 mandatory attributes)
 */

import { buildApp } from '../server';
import type { FastifyInstance } from 'fastify';
import { MAX_SAFE_REQUESTED_SEATS } from '../services/delimitationService';

describe('Delimitation Engine Foundation Routes (W020-G5)', () => {
  let app: FastifyInstance;
  const testSecret = 'test-kshetra-monitor-secret-token-xyz';

  beforeAll(async () => {
    process.env.KSHETRA_MONITOR_SECRET = testSecret;
    app = await buildApp();
  });

  afterAll(async () => {
    delete process.env.KSHETRA_MONITOR_SECRET;
    await app.close();
  });

  describe('Route 1: GET /api/v1/delimitation/projections', () => {
    it('returns 200 with standard ECC-001 envelope and state projections', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/delimitation/projections',
      });

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload);
      expect(json.success).toBe(true);
      expect(json.requestId).toBeDefined();
      expect(json.timestamp).toBeDefined();
      expect(json.data).toBeDefined();
      expect(json.data.projections.length).toBeGreaterThan(20);
      expect(json.data.provenance).toBeDefined();
      expect(json.data.provenance.outputClassification).toBe('DETERMINISTIC_DERIVED');
      expect(json.data.provenance.dataStatus).toBe('DERIVED');
    });

    it('supports ?model=expansion_safe query parameter', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/delimitation/projections?model=expansion_safe',
      });

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload);
      expect(json.success).toBe(true);
      expect(json.data.model).toBe('expansion_safe');
    });
  });

  describe('Route 2: GET /api/v1/delimitation/projections/:stateCode', () => {
    it('returns 200 for governed jurisdiction Telangana (TS)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/delimitation/projections/TS',
      });

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload);
      expect(json.success).toBe(true);
      expect(json.data.projection.stateCode).toBe('TS');
      expect(json.data.projection.currentSeats).toBe(119);
      expect(json.data.provenance.outputClassification).toBe('DETERMINISTIC_DERIVED');
      expect(json.data.provenance.dataStatus).toBe('DERIVED');
    });

    it('returns structured 404 UNSUPPORTED_GEOGRAPHY for unknown jurisdiction', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/delimitation/projections/ZZ',
      });

      expect(res.statusCode).toBe(404);
      const json = JSON.parse(res.payload);
      expect(json.code).toBe('UNSUPPORTED_GEOGRAPHY');
      expect(json.message).toContain('ZZ');
    });
  });

  describe('Route 3: GET /api/v1/delimitation/timeline', () => {
    it('returns 200 with the 5-stage verified legal chain in events', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/delimitation/timeline',
      });

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload);
      expect(json.success).toBe(true);
      expect(json.data.totalEvents).toBeGreaterThanOrEqual(8);
      expect(json.data.events).toBeDefined();
      expect(json.data.events.length).toBeGreaterThanOrEqual(8);

      // Verify Stage 3: G.S.R. 311(E), 23 April 2015
      const gsr = json.data.events.find((s: any) => s.id === 'LEG-2015-01');
      expect(gsr).toBeDefined();
      expect(gsr.instrument).toContain('G.S.R. 311(E)');
      expect(gsr.date).toBe('2015-04-23');

      // Verify Stage 4: Notification 282/AP/2018(DEL), 22 Sept 2018
      const notif = json.data.events.find((s: any) => s.id === 'LEG-2018-01');
      expect(notif).toBeDefined();
      expect(notif.instrument).toContain('282/AP/2018(DEL)');
      expect(notif.date).toBe('2018-09-22');
    });
  });

  describe('Route 4: GET /api/v1/delimitation/status', () => {
    it('returns 200 with national and census tracking status', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/delimitation/status',
      });

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload);
      expect(json.success).toBe(true);
      expect(json.data.nationalStatus).toBe('pre_census');
      expect(json.data.censusTracking).toBeDefined();
      expect(json.data.censusTracking.finalPopulationAvailable).toBe(false);
      expect(json.data.provenance.outputClassification).toBe('STATUTORY_FACT');
      expect(json.data.provenance.dataStatus).toBe('OFFICIAL');
    });
  });

  describe('Route 5: GET /api/v1/delimitation/gainers-losers', () => {
    it('returns 200 with gainers and losers arrays', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/delimitation/gainers-losers',
      });

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload);
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data.gainers)).toBe(true);
      expect(Array.isArray(json.data.losers)).toBe(true);
      expect(json.data.provenance.outputClassification).toBe('DETERMINISTIC_DERIVED');
    });
  });

  describe('Route 6: POST /api/v1/delimitation/monitor-webhook', () => {
    const validPayload = {
      type: 'census_gazette_alert',
      entries: [
        {
          id: 'alert-001',
          title: 'Gazette notification on census digital portal',
          date: '2026-09-30',
          relevanceScore: 75,
        },
      ],
      timestamp: new Date().toISOString(),
    };

    it('returns 401 when Authorization header is missing (fail-closed)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/delimitation/monitor-webhook',
        headers: {
          'content-type': 'application/json',
        },
        payload: validPayload,
      });

      expect(res.statusCode).toBe(401);
      const json = JSON.parse(res.payload);
      expect(json.code).toBe('UNAUTHORIZED');
    });

    it('returns 401 when Authorization header contains invalid token', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/delimitation/monitor-webhook',
        headers: {
          authorization: 'Bearer wrong-secret-token',
          'content-type': 'application/json',
        },
        payload: validPayload,
      });

      expect(res.statusCode).toBe(401);
      const json = JSON.parse(res.payload);
      expect(json.code).toBe('UNAUTHORIZED');
    });

    it('returns 200 with processed count when valid Bearer token provided', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/delimitation/monitor-webhook',
        headers: {
          authorization: `Bearer ${testSecret}`,
          'content-type': 'application/json',
        },
        payload: validPayload,
      });

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload);
      expect(json.success).toBe(true);
      expect(json.data.received).toBe(true);
      expect(json.data.processed).toBe(1);
      expect(json.data.highRelevance).toBe(1);
    });
  });

  describe('Route 7: GET /api/v1/delimitation/impact/:pinCode', () => {
    it('returns 200 with spatial caveat and provenance for Hyderabad PIN 500001', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/delimitation/impact/500001',
      });

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload);
      expect(json.success).toBe(true);
      expect(json.data.location.stateCode).toBe('TS');
      expect(json.data.impactAnalysis.spatialCaveat).toBeDefined();
      expect(json.data.provenance.outputClassification).toBe('GEOGRAPHIC_APPROXIMATION');
      expect(json.data.provenance.dataStatus).toBe('ESTIMATE');
    });

    it('returns 400 for malformed PIN code (less than 6 digits)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/delimitation/impact/123',
      });

      expect(res.statusCode).toBe(400);
    });
  });

  describe('Route 8: GET /api/v1/delimitation/simulate/:stateCode', () => {
    it('returns 200 with full scenario enclosure and Hamilton district distribution for TS', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/delimitation/simulate/TS?seats=119&mode=equal_population',
      });

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload);
      expect(json.success).toBe(true);
      expect(json.data.targetSeats).toBe(119);
      expect(json.data.scenarioEnclosure).toBeDefined();

      // Check mandatory scenario enclosure attributes
      const enc = json.data.scenarioEnclosure;
      expect(enc.isScenario).toBe(true);
      expect(enc.scenarioId).toBeDefined();
      expect(enc.scenarioName).toBeDefined();
      expect(enc.scenarioAuthor).toBeDefined();
      expect(enc.scenarioDescription).toBeDefined();
      expect(enc.statutoryBasisDisclaimer).toBeDefined();
      expect(enc.hypotheticalParameters).toBeDefined();
      expect(enc.baselineDatasetVersion).toBeDefined();
      expect(enc.modelType).toBeDefined();
      expect(enc.provenance).toBeDefined();
      expect(enc.provenance.legalStatus).toBe('SCENARIO_PROPOSED_REGIME');
      expect(enc.provenance.outputClassification).toBe('SCENARIO_PROJECTION');
      expect(enc.provenance.dataStatus).toBe('SCENARIO');
      expect(enc.provenance.inputDatasetVersions.length).toBeGreaterThan(0);

      // Check Article 332 Conservation
      const resv = json.data.reservation;
      expect(resv.scReserved + resv.stReserved + resv.general).toBe(119);

      // Check district breakdown conservation
      const districtSeatsSum = json.data.districtBreakdown.reduce((s: number, d: any) => s + d.projectedSeats, 0);
      expect(districtSeatsSum).toBe(119);
    });

    it('rejects seats exceeding MAX_SAFE_REQUESTED_SEATS (10000) with 400', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/delimitation/simulate/TS?seats=10001',
      });

      expect(res.statusCode).toBe(400);
      const json = JSON.parse(res.payload);
      expect(json.error).toBe('Bad Request');
    });

    it('rejects seats below MIN_SAFE_REQUESTED_SEATS (1) with 400', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/delimitation/simulate/TS?seats=0',
      });

      expect(res.statusCode).toBe(400);
    });

    it('returns structured 404 UNSUPPORTED_GEOGRAPHY for unknown state', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/delimitation/simulate/ZZ',
      });

      expect(res.statusCode).toBe(404);
      const json = JSON.parse(res.payload);
      expect(json.code).toBe('UNSUPPORTED_GEOGRAPHY');
    });
  });

  describe('Route 9: GET /api/v1/delimitation/reservation', () => {
    it('returns 200 with national reservation analysis and provenance', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/delimitation/reservation',
      });

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload);
      expect(json.success).toBe(true);
      expect(json.data.summary.totalSeats).toBeGreaterThan(0);
      expect(json.data.provenance.outputClassification).toBe('DETERMINISTIC_DERIVED');
      expect(json.data.provenance.dataStatus).toBe('DERIVED');
    });
  });

  describe('Route 10: GET /api/v1/delimitation/reservation/:stateCode', () => {
    it('returns 200 for Telangana with distinct statutory baseline (19 SC, 12 ST) and Census 2011 derivation (18 SC, 10 ST)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/delimitation/reservation/TS',
      });

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload);
      expect(json.success).toBe(true);
      expect(json.data.stateCode).toBe('TS');

      // 1. Authoritative Statutory Baseline (Delimitation Order 2008 & APRA 2014)
      const current = json.data.current;
      expect(current.total).toBe(119);
      expect(current.scReserved).toBe(19);
      expect(current.stReserved).toBe(12);
      expect(current.general).toBe(88);
      expect(current.scReserved + current.stReserved + current.general).toBe(119);
      expect(current.outputClassification).toBe('STATUTORY_FACT');
      expect(current.dataStatus).toBe('OFFICIAL');
      expect(current.censusBasis).toContain('Census 2001');

      // 2. PANIN Census 2011 Mathematical Derivation (Hamilton sequence on 2011 demographics)
      const derived = json.data.census2011MathematicalDerivation;
      expect(derived).toBeDefined();
      expect(derived.total).toBe(119);
      expect(derived.scReserved).toBe(18);
      expect(derived.stReserved).toBe(10);
      expect(derived.general).toBe(91);
      expect(derived.scReserved + derived.stReserved + derived.general).toBe(119);
      expect(derived.outputClassification).toBe('DETERMINISTIC_DERIVED');
      expect(derived.dataStatus).toBe('DERIVED');
      expect(derived.disclaimer).toContain('PANIN academic mathematical derivation');

      // Verify mathematical derivation is NOT exposed as statutory fact
      expect(derived.outputClassification).not.toBe('STATUTORY_FACT');
      expect(derived.dataStatus).not.toBe('OFFICIAL');
    });

    it('returns 404 UNSUPPORTED_GEOGRAPHY for unregistered state', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/delimitation/reservation/ZZ',
      });

      expect(res.statusCode).toBe(404);
      const json = JSON.parse(res.payload);
      expect(json.code).toBe('UNSUPPORTED_GEOGRAPHY');
    });
  });

  describe('Route 11: GET /api/v1/delimitation/compare', () => {
    it('returns 200 for comparing TS and AP', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/delimitation/compare?states=TS,AP',
      });

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload);
      expect(json.success).toBe(true);
      expect(json.data.statesCompared).toBe(2);
      expect(json.data.comparison.length).toBe(2);
    });

    it('returns 400 when states query parameter is missing', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/delimitation/compare',
      });

      expect(res.statusCode).toBe(400);
    });

    it('returns 404 UNSUPPORTED_GEOGRAPHY when all queried states are invalid', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/delimitation/compare?states=ZZ,YY',
      });

      expect(res.statusCode).toBe(404);
      const json = JSON.parse(res.payload);
      expect(json.code).toBe('UNSUPPORTED_GEOGRAPHY');
    });
  });

  describe('Route 12: GET /api/v1/delimitation/mla-impact/:stateCode', () => {
    it('returns 200 with heuristic provenance for Telangana MLAs', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/delimitation/mla-impact/TS',
      });

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload);
      expect(json.success).toBe(true);
      expect(json.data.totalMLAsAnalyzed).toBe(119);
      expect(json.data.provenance.outputClassification).toBe('POLITICAL_HEURISTIC');
      expect(json.data.provenance.dataStatus).toBe('INFERRED');
    });

    it('returns 404 UNSUPPORTED_GEOGRAPHY for unknown jurisdiction', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/delimitation/mla-impact/ZZ',
      });

      expect(res.statusCode).toBe(404);
      const json = JSON.parse(res.payload);
      expect(json.code).toBe('UNSUPPORTED_GEOGRAPHY');
    });
  });

  describe('Route 13: GET /api/v1/delimitation/party-projections/:stateCode', () => {
    it('returns 200 for Telangana party seat shares', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/delimitation/party-projections/TS',
      });

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload);
      expect(json.success).toBe(true);
      expect(json.data.currentAssemblySeats).toBe(119);
      expect(json.data.parties.length).toBeGreaterThan(0);
      expect(json.data.provenance.outputClassification).toBe('POLITICAL_HEURISTIC');
      expect(json.data.provenance.dataStatus).toBe('INFERRED');
    });

    it('returns 404 UNSUPPORTED_GEOGRAPHY for unknown jurisdiction', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/delimitation/party-projections/ZZ',
      });

      expect(res.statusCode).toBe(404);
      const json = JSON.parse(res.payload);
      expect(json.code).toBe('UNSUPPORTED_GEOGRAPHY');
    });
  });

  describe('Route 14: GET /api/v1/delimitation/methodology', () => {
    it('returns 200 with statutory articles and computational safety disclosure', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/delimitation/methodology',
      });

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload);
      expect(json.success).toBe(true);
      expect(json.data.constitutionalArticles.length).toBe(4);
      expect(json.data.computationalSafetyPolicy.maxSafeRequestedSeats).toBe(MAX_SAFE_REQUESTED_SEATS);
      expect(json.data.computationalSafetyPolicy.statement).toContain('NO constitutional, statutory, electoral, geographic, or legal meaning');
      expect(json.data.provenance.outputClassification).toBe('STATUTORY_FACT');
      expect(json.data.provenance.dataStatus).toBe('OFFICIAL');
    });
  });
});
