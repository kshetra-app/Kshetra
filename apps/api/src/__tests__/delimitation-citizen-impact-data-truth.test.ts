/**
 * apps/api/src/__tests__/delimitation-citizen-impact-data-truth.test.ts
 *
 * Dedicated Test Battery for CTO Directive 122 Workstream A:
 * Electoral Data-Truth Remediation & Canonical Lookup Integrity
 *
 * Enforces the 10 Mandatory Domain Invariants:
 * 1. A valid PIN does not automatically imply a valid Assembly Constituency.
 * 2. Modulo arithmetic on PIN digits is never used to select a constituency.
 * 3. Missing mappings do not silently fall back to Telangana (404 PIN_NOT_FOUND).
 * 4. Missing constituency data does not produce synthetic political records.
 * 5. Missing incumbent information does not produce fabricated names or parties.
 * 6. Unverified reservation changes are not presented as facts (explicit scenario labeling).
 * 7. Unsupported voter-impact percentages are not presented as factual estimates.
 * 8. Ambiguous postal-to-constituency relationships remain ambiguous (candidateConstituencies).
 * 9. Legitimate scenario calculations remain available when inputs and assumptions are properly established.
 * 10. The API response strictly follows its declared CitizenImpactDTO contract.
 */

import { buildApp } from '../server';
import type { FastifyInstance } from 'fastify';
import {
  delimitationService,
  POSTAL_DIRECTORY_CLASSIFICATION,
  CURATED_PROVISIONAL_PIN_DIRECTORY,
  PIN_PREFIX_MAPPING,
} from '../services/delimitationService';
import { getConstituency, getConstituencies } from '../services/stateData';

describe('CTO Directive 122 — Delimitation Postal Data-Truth & Lookup Invariants', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Invariant 1: A valid PIN does not automatically imply a valid Assembly Constituency', () => {
    it('returns regional location only for valid PINs without curated constituency linkage', () => {
      // 110001 (New Delhi), 400001 (Mumbai), 560001 (Bengaluru), 700001 (Kolkata)
      for (const pin of ['110001', '400001', '560001', '700001']) {
        const result = delimitationService.getCitizenImpact(pin);
        expect(result.available).toBe(true);
        expect(result.currentConstituency).toBeUndefined();
        expect(result.proposedConstituency).toBeUndefined();
        expect(result.impactAnalysis).toBeUndefined();
        expect(result.status).toMatch(/REGIONAL_ONLY|AMBIGUOUS_CANDIDATES/);
      }
    });
  });

  describe('Invariant 2: Modulo arithmetic on PIN digits is never used to select a constituency', () => {
    it('proves different PIN suffixes with the same prefix do NOT cycle through different ACs', () => {
      // 110001, 110002, 110003, 110099 all map to prefix 110 (Delhi)
      const r1 = delimitationService.getCitizenImpact('110001');
      const r2 = delimitationService.getCitizenImpact('110002');
      const r3 = delimitationService.getCitizenImpact('110003');
      const r99 = delimitationService.getCitizenImpact('110099');

      // None of them assign an arbitrary AC based on (suffix % count)
      expect(r1.currentConstituency).toBeUndefined();
      expect(r2.currentConstituency).toBeUndefined();
      expect(r3.currentConstituency).toBeUndefined();
      expect(r99.currentConstituency).toBeUndefined();

      // All return the identical canonical candidate set for New Delhi
      expect(r1.candidateConstituencies).toEqual(r2.candidateConstituencies);
      expect(r2.candidateConstituencies).toEqual(r3.candidateConstituencies);
      expect(r3.candidateConstituencies).toEqual(r99.candidateConstituencies);
    });
  });

  describe('Invariant 3: Missing mappings do not silently fall back to Telangana', () => {
    it('fails closed with 404 PIN_NOT_FOUND for unmapped postal prefixes', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/delimitation/impact/999999',
      });

      expect(res.statusCode).toBe(404);
      const json = JSON.parse(res.payload);
      expect(json.code).toBe('PIN_NOT_FOUND');
      expect(json.message).toContain("prefix '999' is not mapped");
    });

    it('rejects malformed non-6-digit PIN codes with 400 FST_ERR_VALIDATION', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/delimitation/impact/50000', // 5 digits
      });

      expect(res.statusCode).toBe(400);
      const json = JSON.parse(res.payload);
      expect(json.code).toBe('FST_ERR_VALIDATION');
    });
  });

  describe('Invariant 4 & 5: Missing constituency/incumbent data does not produce synthetic records', () => {
    it('proves no mock "Sitting Legislator" or "INC" fallback records are generated', () => {
      // In states where a prefix maps to a district with zero or missing local ACs,
      // it must NEVER invent { id: 'XX-AC-1', name: 'XX Central', winnerName: 'Sitting Legislator', winnerParty: 'INC' }
      const res = delimitationService.getCitizenImpact('403001'); // Goa (GA)
      expect(res.available).toBe(true);
      expect(res.location.stateCode).toBe('GA');
      expect(res.currentConstituency).toBeUndefined();
      expect(res.proposedConstituency).toBeUndefined();
    });

    it('verifies that curated provisional linkages resolve to authentic canonical data', () => {
      const res = delimitationService.getCitizenImpact('500001'); // Goshamahal AC 65
      expect(res.status).toBe('LINKED_PROVISIONAL');
      expect(res.currentConstituency).toBeDefined();
      expect(res.currentConstituency?.acNo).toBe(65);
      expect(res.currentConstituency?.name).toBe('Goshamahal');

      // Canonical stateData lookup verification
      const canonical = getConstituency('TS', 65);
      expect(res.currentConstituency?.name).toBe(canonical?.name);
      expect(res.currentConstituency?.sittingMLA).toBe(canonical?.currentMLA);
      expect(res.currentConstituency?.party).toBe(canonical?.currentParty);
    });
  });

  describe('Invariant 6 & 7: Unverified reservation changes & voter impacts are not presented as facts', () => {
    it('enforces isScenarioEstimate flag and spatial caveat on any impact analysis', () => {
      const res = delimitationService.getCitizenImpact('500026'); // Secunderabad Cantonment AC 71
      expect(res.status).toBe('LINKED_PROVISIONAL');
      expect(res.impactAnalysis).toBeDefined();
      expect(res.impactAnalysis?.isScenarioEstimate).toBe(true);
      expect(res.impactAnalysis?.spatialCaveat).toContain('Provisional locality mapping');
      expect(res.provenance.outputClassification).toBe('GEOGRAPHIC_APPROXIMATION');
      expect(res.provenance.dataStatus).toBe('ESTIMATE');
    });

    it('omits impactAnalysis completely for regional postal lookups without exact boundaries', () => {
      const res = delimitationService.getCitizenImpact('560001'); // Bengaluru
      expect(res.impactAnalysis).toBeUndefined();
      expect(res.linkageNotice).toContain('spanning');
      expect(res.linkageNotice).toContain('cannot be established');
    });
  });

  describe('Invariant 8: Ambiguous postal-to-constituency relationships remain ambiguous', () => {
    it('returns candidateConstituencies list for regional PINs spanning multiple ACs', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/delimitation/impact/110001',
      });

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload);
      expect(json.data.status).toBe('AMBIGUOUS_CANDIDATES');
      expect(json.data.currentConstituency).toBeUndefined();
      expect(Array.isArray(json.data.candidateConstituencies)).toBe(true);
      expect(json.data.candidateConstituencies.length).toBeGreaterThan(1);

      // Verify each candidate has valid metadata
      for (const cand of json.data.candidateConstituencies) {
        expect(cand.acNo).toBeGreaterThan(0);
        expect(cand.name).toBeDefined();
        expect(['GEN', 'SC', 'ST']).toContain(cand.reservation);
      }
    });
  });

  describe('Invariant 9: Legitimate scenario calculations remain available when properly established', () => {
    it('boundary simulation continues to function deterministically with Hare-Niemeyer', () => {
      const sim = delimitationService.simulateBoundaries('TS', { mode: 'equal_population', seats: '130' });
      expect(sim.stateCode).toBe('TS');
      expect(sim.targetSeats).toBe(130);
      expect(sim.districtBreakdown.length).toBeGreaterThan(0);
      expect(sim.scenarioEnclosure.isScenario).toBe(true);
    });
  });

  describe('Invariant 10: API response strictly follows declared CitizenImpactDTO contract', () => {
    it('conforms to ECC-001 ApiSuccessEnvelope<CitizenImpactDTO>', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/delimitation/impact/500001',
      });

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload);
      expect(json.success).toBe(true);
      expect(json.data).toBeDefined();
      expect(typeof json.data.available).toBe('boolean');
      expect(typeof json.data.pinCode).toBe('string');
      expect(json.data.location).toBeDefined();
      expect(json.data.provenance).toBeDefined();
      expect(json.data.provenance.outputClassification).toBeDefined();
      expect(json.data.linkageNotice).toBeDefined();
    });

    it('verifies postal directory classification constant', () => {
      expect(POSTAL_DIRECTORY_CLASSIFICATION).toBe('APPROXIMATE_REGIONAL_CLASSIFICATION');
    });
  });
});
