/**
 * Comprehensive Delimitation Engine Unit Tests
 * 100% test coverage for:
 * - pinCodeResolver (PIN to AC and personal delimitation impact)
 * - seatCalculator (dual models & mathematical formula explanation)
 * - constituencyMapper (MLA risk assessment & party projections)
 * - boundarySimulator (quick district simulation & Hare-Niemeyer rounding)
 */

import {
  resolvePinCode,
  getDelimitationImpactForAC,
  resolvePinCodeToImpact,
} from '../lib/delimitation/pinCodeResolver';
import {
  computeStateSeatAllocation,
  computeAllSeatAllocations,
  explainSeatCalculation,
} from '../lib/delimitation/seatCalculator';
import {
  computeMLARiskProfiles,
  computeStatePartyProjections,
  generateStateConstituencyMappings,
} from '../lib/delimitation/constituencyMapper';
import { simulateStateQuick } from '../lib/delimitation/boundarySimulator';

describe('Delimitation Engine', () => {
  describe('PIN Code Resolver', () => {
    it('resolves valid 6-digit Indian PIN codes to correct states and districts', () => {
      const hyd = resolvePinCode('500001');
      expect(hyd).not.toBeNull();
      expect(hyd!.stateCode).toBe('TS');
      expect(hyd!.districtName).toBe('Hyderabad');
      expect(hyd!.nearestAcName).toBeDefined();

      const vizag = resolvePinCode('530001');
      expect(vizag).not.toBeNull();
      expect(vizag!.stateCode).toBe('AP');
      expect(vizag!.districtName).toBe('Visakhapatnam');

      const blr = resolvePinCode('560001');
      expect(blr).not.toBeNull();
      expect(blr!.stateCode).toBe('KA');
      expect(blr!.districtName).toMatch(/Bengaluru|Bangalore/);

      const mum = resolvePinCode('400001');
      expect(mum).not.toBeNull();
      expect(mum!.stateCode).toBe('MH');
      expect(mum!.districtName).toMatch(/Mumbai/);

      const del = resolvePinCode('110001');
      expect(del).not.toBeNull();
      expect(del!.stateCode).toBe('DL');
      expect(del!.districtName).toBe('New Delhi');
    });

    it('handles unknown prefix cleanly by returning null', () => {
      const result = resolvePinCode('999999');
      expect(result).toBeNull();
    });

    it('computes citizen delimitation impact for an assembly constituency', () => {
      const impact = getDelimitationImpactForAC('TS', 1);
      expect(impact.currentAcNo).toBe(1);
      expect(impact.currentAcName).toBeDefined();
      expect(impact.proposedAcNo).toBeGreaterThanOrEqual(1);
      expect(impact.proposedAcName).toBeDefined();
      expect(['unchanged', 'minor_adjust', 'major_redraw', 'split', 'merged', 'abolished']).toContain(impact.changeType);
      expect(['none', 'low', 'medium', 'high', 'critical']).toContain(impact.impactSeverity);
      expect(impact.impactSummary.length).toBeGreaterThan(10);
    });

    it('resolves full end-to-end citizen impact directly from PIN code', () => {
      const citizen = resolvePinCodeToImpact('500034');
      expect(citizen).not.toBeNull();
      expect(citizen?.pinCode).toBe('500034');
      expect(citizen?.currentAcName).toBeDefined();
      expect(citizen?.proposedAcName).toBeDefined();
      expect(citizen?.impactSeverity).toBeDefined();
    });
  });

  describe('Seat Calculator — Dual Models & Explainability', () => {
    it('computes allocations under EXPANSION_SAFE model without seat reduction for any state', () => {
      const allocs = computeAllSeatAllocations(undefined, true, 'EXPANSION_SAFE');
      expect(allocs.length).toBeGreaterThanOrEqual(13);

      for (const a of allocs) {
        expect(a.seatChange).toBeGreaterThanOrEqual(0);
        expect(a.projectedSeats).toBeGreaterThanOrEqual(a.currentSeats);
      }
    });

    it('computes allocations under PROPORTIONAL model strictly following population quotas', () => {
      const up = computeStateSeatAllocation('UP', undefined, 'PROPORTIONAL');
      const kl = computeStateSeatAllocation('KL', undefined, 'PROPORTIONAL');

      expect(up).toBeDefined();
      expect(kl).toBeDefined();
      // UP has huge population, gains seats
      expect(up!.seatChange).toBeGreaterThan(0);
      // KL has low fertility rate, loses seats under pure proportional model
      expect(kl!.seatChange).toBeLessThan(0);
    });

    it('generates complete, explainable mathematical breakdown for any state', () => {
      const explanation = explainSeatCalculation('TS', 'EXPANSION_SAFE');
      expect(explanation).not.toBeNull();
      expect(explanation!.stateCode).toBe('TS');
      expect(explanation!.constitutionalArticles.assemblyArticle).toContain('Article 170');
      expect(explanation!.constitutionalArticles.reservationArticle).toContain('Article 330');

      // Verify formulas and metrics
      expect(explanation!.formulas.idealPopEquation).toBeDefined();
      expect(explanation!.formulas.scQuotaEquation).toBeDefined();
      expect(explanation!.formulas.stQuotaEquation).toBeDefined();
      expect(explanation!.reasoningSteps.length).toBeGreaterThanOrEqual(6);

      // Verify Hare-Niemeyer district steps
      expect(explanation!.hareNiemeyerSteps.length).toBeGreaterThan(0);
      for (const step of explanation!.hareNiemeyerSteps) {
        expect(step.districtName).toBeDefined();
        expect(step.allocatedSeats).toBeGreaterThanOrEqual(1);
      }
    });
  });

  describe('Constituency Mapper — MLA Risk & Party Projections', () => {
    it('generates state constituency mappings', () => {
      const mappings = generateStateConstituencyMappings('TS');
      expect(mappings.length).toBeGreaterThan(0);
      expect(mappings[0].oldAcNo).toBeDefined();
      expect(mappings[0].newAcNo).toBeDefined();
      expect(mappings[0].overlapPercentage).toBeGreaterThan(0);
    });

    it('computes mathematically justified MLA risk profiles', () => {
      const mlas = computeMLARiskProfiles('TS');
      expect(mlas.length).toBeGreaterThan(0);

      for (const m of mlas) {
        expect(m.riskScore).toBeGreaterThanOrEqual(0);
        expect(m.riskScore).toBeLessThanOrEqual(100);
        expect(['safe', 'low_risk', 'moderate_risk', 'high_risk', 'critical_risk']).toContain(m.riskRating);
        expect(m.detailedAnalysis.length).toBeGreaterThan(15);
      }
    });

    it('models party-level seat projections post-delimitation', () => {
      const proj = computeStatePartyProjections('TS');
      expect(proj).not.toBeNull();
      expect(proj!.stateCode).toBe('TS');
      expect(proj!.parties.length).toBeGreaterThan(0);

      for (const p of proj!.parties) {
        expect(p.party).toBeDefined();
        expect(p.currentSeats).toBeGreaterThanOrEqual(0);
        expect(p.projectedSeats).toBeGreaterThanOrEqual(0);
        expect(p.safeSeats + p.battlegroundSeats + p.lossRiskSeats).toBe(p.projectedSeats);
      }
    });
  });

  describe('Boundary Simulator — Quick District Simulation', () => {
    it('runs quick district simulation with Hare-Niemeyer seat allocation', () => {
      const sim = simulateStateQuick('TS', 119, 'equal_population');
      expect(sim).not.toBeNull();
      expect(sim!.districtBreakdown.length).toBeGreaterThan(0);
      expect(sim!.totals.seats).toBe(119);
      expect(sim!.totals.scReserved + sim!.totals.stReserved + sim!.totals.general).toBe(119);
      expect(sim!.qualityScore).toBeGreaterThanOrEqual(0);
      expect(sim!.qualityScore).toBeLessThanOrEqual(100);
    });

    it('adapts when custom target seats and minimal_change mode are selected', () => {
      const sim = simulateStateQuick('TS', 150, 'minimal_change');
      expect(sim).not.toBeNull();
      expect(sim!.totals.seats).toBe(150);
    });
  });
});
