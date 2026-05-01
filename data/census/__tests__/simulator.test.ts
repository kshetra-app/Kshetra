/**
 * Delimitation Simulator — Comprehensive Test Suite
 *
 * Tests for:
 * 1. Population aggregator (ward generation, constituency assembly)
 * 2. Boundary simulator (simulation modes, quality scoring)
 * 3. Reservation analyzer (SC/ST analysis, hotspot detection)
 * 4. Integration tests (end-to-end state simulation)
 */

// We need to resolve the imports relative to the test location
// The algorithms live in apps/mobile/lib/delimitation/

import {
  generateSyntheticWards,
  generateStateWards,
  aggregateToConstituencies,
  aggregateState,
  quickDistrictAggregation,
} from '../../../apps/mobile/lib/delimitation/populationAggregator';

import {
  simulateState,
  simulateStateQuick,
  simulateNational,
} from '../../../apps/mobile/lib/delimitation/boundarySimulator';

import {
  analyzeStateReservation,
  analyzeNationalReservation,
  analyzeReservationPoliticalImpact,
} from '../../../apps/mobile/lib/delimitation/reservationAnalyzer';

import {
  computeAllSeatAllocations,
  computeStateSeatAllocation,
  computeDistrictSeatDistribution,
  getGainersAndLosers,
  validateAllocation,
} from '../../../apps/mobile/lib/delimitation/seatCalculator';

import {
  CENSUS_2011_STATES,
  INDIA_TOTAL_POPULATION_2011,
  IDEAL_POP_PER_AC_SEAT_2011,
} from '../india-district-population-2011';

// ─── POPULATION AGGREGATOR TESTS ───

describe('Population Aggregator', () => {
  describe('generateSyntheticWards', () => {
    test('generates wards for a district', () => {
      const tsDistrict = CENSUS_2011_STATES.find((s) => s.stateCode === 'TS')?.districts[0];
      if (!tsDistrict) throw new Error('No TS district data');

      const wards = generateSyntheticWards(tsDistrict, 4, 119, 35003674);
      expect(wards.length).toBeGreaterThan(0);
      expect(wards[0].stateCode).toBe('TS');
      expect(wards[0].districtName).toBe(tsDistrict.districtName);
    });

    test('ward populations sum to district population', () => {
      const tsDistrict = CENSUS_2011_STATES.find((s) => s.stateCode === 'TS')?.districts[0];
      if (!tsDistrict) throw new Error('No TS district data');

      const wards = generateSyntheticWards(tsDistrict, 4, 119, 35003674);
      const totalPop = wards.reduce((s, w) => s + w.population, 0);
      expect(totalPop).toBe(tsDistrict.totalPopulation);
    });

    test('every ward has adjacency info', () => {
      const tsDistrict = CENSUS_2011_STATES.find((s) => s.stateCode === 'TS')?.districts[0];
      if (!tsDistrict) throw new Error('No TS district data');

      const wards = generateSyntheticWards(tsDistrict, 4, 119, 35003674);
      for (const w of wards) {
        expect(w.adjacentIds).toBeDefined();
        expect(Array.isArray(w.adjacentIds)).toBe(true);
      }
    });
  });

  describe('generateStateWards', () => {
    test('generates wards for Telangana', () => {
      const wards = generateStateWards('TS');
      expect(wards.length).toBeGreaterThan(0);

      const totalPop = wards.reduce((s, w) => s + w.population, 0);
      const tsCensus = CENSUS_2011_STATES.find((s) => s.stateCode === 'TS');
      expect(totalPop).toBe(tsCensus!.totalPopulation);
    });

    test('returns empty for unknown state', () => {
      const wards = generateStateWards('ZZ');
      expect(wards).toHaveLength(0);
    });
  });

  describe('aggregateToConstituencies', () => {
    test('aggregates Telangana wards into ~119 constituencies', () => {
      const wards = generateStateWards('TS');
      const proposed = aggregateToConstituencies(wards, 119, 'TS');

      // Should be close to 119 (greedy may produce slightly fewer)
      expect(proposed.length).toBeGreaterThanOrEqual(100);
      expect(proposed.length).toBeLessThanOrEqual(130);
    });

    test('all wards are assigned (no orphans)', () => {
      const wards = generateStateWards('TS');
      const proposed = aggregateToConstituencies(wards, 119, 'TS');
      const totalAssigned = proposed.reduce((s, ac) => s + ac.wardIds.length, 0);
      expect(totalAssigned).toBe(wards.length);
    });

    test('total population matches', () => {
      const wards = generateStateWards('TS');
      const proposed = aggregateToConstituencies(wards, 119, 'TS');
      const totalPop = proposed.reduce((s, ac) => s + ac.totalPopulation, 0);
      const tsCensus = CENSUS_2011_STATES.find((s) => s.stateCode === 'TS');
      expect(totalPop).toBe(tsCensus!.totalPopulation);
    });
  });

  describe('aggregateState', () => {
    test('full aggregation for TS', () => {
      const result = aggregateState('TS');
      expect(result).not.toBeNull();
      expect(result!.stateCode).toBe('TS');
      expect(result!.totalPopulation).toBeGreaterThan(0);
      expect(result!.proposedACs.length).toBeGreaterThan(0);
      expect(result!.validation).toBeDefined();
    });

    test('returns null for unknown state', () => {
      expect(aggregateState('ZZ')).toBeNull();
    });
  });

  describe('quickDistrictAggregation', () => {
    test('quick aggregation for TS', () => {
      const result = quickDistrictAggregation('TS');
      expect(result).not.toBeNull();
      expect(result!.districts.length).toBeGreaterThan(0);
      expect(result!.totalSeats).toBeGreaterThan(0);

      // Each district should have at least 1 seat
      for (const d of result!.districts) {
        expect(d.projectedSeats).toBeGreaterThanOrEqual(1);
        expect(d.population).toBeGreaterThan(0);
      }
    });

    test('quick aggregation for KA', () => {
      const result = quickDistrictAggregation('KA');
      expect(result).not.toBeNull();
      expect(result!.districts.length).toBe(15); // 15 Karnataka districts with data
    });

    test('returns null for state without districts', () => {
      // UP has state-level data only, no districts
      const result = quickDistrictAggregation('UP');
      expect(result).toBeNull();
    });
  });
});

// ─── BOUNDARY SIMULATOR TESTS ───

describe('Boundary Simulator', () => {
  describe('simulateState', () => {
    test('simulates Telangana', () => {
      const result = simulateState('TS');
      expect(result).not.toBeNull();
      expect(result!.stateCode).toBe('TS');
      expect(result!.mode).toBe('equal_population');
      expect(result!.constituencies.length).toBeGreaterThan(0);
      expect(result!.qualityScore).toBeGreaterThan(0);
    });

    test('simulates with custom target seats', () => {
      const result = simulateState('TS', { targetSeats: 130 });
      expect(result).not.toBeNull();
      expect(result!.config.targetSeats).toBe(130);
    });

    test('produces valid statistics', () => {
      const result = simulateState('TS');
      expect(result).not.toBeNull();
      const stats = result!.statistics;
      expect(stats.totalSeats).toBeGreaterThan(0);
      expect(stats.totalPopulation).toBeGreaterThan(0);
      expect(stats.idealPopPerSeat).toBeGreaterThan(0);
      expect(stats.scReservedSeats).toBeGreaterThanOrEqual(0);
      expect(stats.stReservedSeats).toBeGreaterThanOrEqual(0);
      expect(stats.generalSeats).toBeGreaterThan(0);
      expect(stats.scReservedSeats + stats.stReservedSeats + stats.generalSeats).toBe(stats.totalSeats);
    });

    test('returns null for unknown state', () => {
      expect(simulateState('ZZ')).toBeNull();
    });
  });

  describe('simulateStateQuick', () => {
    test('quick simulation for MH', () => {
      const result = simulateStateQuick('MH');
      expect(result).not.toBeNull();
      expect(result!.districtBreakdown.length).toBeGreaterThan(0);
      expect(result!.totals.seats).toBeGreaterThan(0);
    });

    test('district seats sum to state total', () => {
      const result = simulateStateQuick('TS');
      expect(result).not.toBeNull();
      const sumSeats = result!.districtBreakdown.reduce((s, d) => s + d.projectedSeats, 0);
      expect(sumSeats).toBe(result!.totals.seats);
    });

    test('reservation breakdown sums correctly', () => {
      const result = simulateStateQuick('TS');
      expect(result).not.toBeNull();
      const { scReserved, stReserved, general, seats } = result!.totals;
      expect(scReserved + stReserved + general).toBe(seats);
    });
  });

  describe('simulateNational', () => {
    test('simulates all states', () => {
      const result = simulateNational();
      expect(result.states.length).toBeGreaterThan(0);
      expect(result.totalCurrentSeats).toBeGreaterThan(0);
      expect(result.totalProjectedSeats).toBeGreaterThan(0);
      expect(result.avgQualityScore).toBeGreaterThan(0);
    });

    test('every state has a quality score', () => {
      const result = simulateNational();
      for (const state of result.states) {
        expect(state.qualityScore).toBeGreaterThanOrEqual(0);
        expect(state.qualityScore).toBeLessThanOrEqual(100);
      }
    });
  });
});

// ─── RESERVATION ANALYZER TESTS ───

describe('Reservation Analyzer', () => {
  describe('analyzeStateReservation', () => {
    test('analyzes Telangana reservation profile', () => {
      const profile = analyzeStateReservation('TS');
      expect(profile).not.toBeNull();
      expect(profile!.stateCode).toBe('TS');
      expect(profile!.scPercent).toBeGreaterThan(0);
      expect(profile!.current.total).toBe(119);
      expect(profile!.current.scReserved).toBeGreaterThan(0);
      expect(profile!.current.stReserved).toBeGreaterThan(0);
    });

    test('projected reservation breakdown sums to total', () => {
      const profile = analyzeStateReservation('TS');
      expect(profile).not.toBeNull();
      const { scReserved, stReserved, general } = profile!.projected;
      expect(scReserved + stReserved + general).toBe(profile!.projected.total);
    });

    test('change analysis is consistent', () => {
      const profile = analyzeStateReservation('TS');
      expect(profile).not.toBeNull();
      const { scChange, stChange, generalChange } = profile!.change;
      expect(scChange).toBe(profile!.projected.scReserved - profile!.current.scReserved);
      expect(stChange).toBe(profile!.projected.stReserved - profile!.current.stReserved);
    });

    test('districts are analyzed (when available)', () => {
      const profile = analyzeStateReservation('TS');
      expect(profile).not.toBeNull();
      expect(profile!.districts.length).toBeGreaterThan(0);
    });

    test('returns null for unknown state', () => {
      expect(analyzeStateReservation('ZZ')).toBeNull();
    });
  });

  describe('analyzeNationalReservation', () => {
    test('national summary covers all states', () => {
      const summary = analyzeNationalReservation();
      expect(summary.states.length).toBe(CENSUS_2011_STATES.length);
    });

    test('totals are positive', () => {
      const summary = analyzeNationalReservation();
      expect(summary.totals.currentSC).toBeGreaterThan(0);
      expect(summary.totals.currentST).toBeGreaterThan(0);
      expect(summary.totals.projectedSC).toBeGreaterThan(0);
      expect(summary.totals.projectedST).toBeGreaterThan(0);
    });

    test('top SC/ST state lists populated', () => {
      const summary = analyzeNationalReservation();
      expect(summary.topSCStates.length).toBeGreaterThan(0);
      expect(summary.topSTStates.length).toBeGreaterThan(0);
      expect(summary.mostImpacted.length).toBeGreaterThan(0);
    });
  });

  describe('analyzeReservationPoliticalImpact', () => {
    test('generates impact narrative for TS', () => {
      const impact = analyzeReservationPoliticalImpact('TS');
      expect(impact.narrativeSummary).toContain('Telangana');
      expect(impact.scSeatImpact).toBeDefined();
      expect(impact.stSeatImpact).toBeDefined();
      expect(impact.generalSeatImpact).toBeDefined();
    });

    test('handles unknown state gracefully', () => {
      const impact = analyzeReservationPoliticalImpact('ZZ');
      expect(impact.narrativeSummary).toBe('Insufficient data for analysis');
    });
  });
});

// ─── INTEGRATION TESTS ───

describe('End-to-End Integration', () => {
  test('seat allocation → aggregation → simulation pipeline', () => {
    // Step 1: Get seat allocation
    const allocation = computeStateSeatAllocation('TS');
    expect(allocation).not.toBeNull();

    // Step 2: Run aggregation with projected seats
    const aggregation = aggregateState('TS', allocation!.projectedSeats);
    expect(aggregation).not.toBeNull();
    expect(aggregation!.proposedACs.length).toBeGreaterThan(0);

    // Step 3: Run full simulation
    const simulation = simulateState('TS');
    expect(simulation).not.toBeNull();
    expect(simulation!.qualityScore).toBeGreaterThan(0);

    // Step 4: Analyze reservation
    const reservation = analyzeStateReservation('TS');
    expect(reservation).not.toBeNull();
  });

  test('population conservation across pipeline', () => {
    const census = CENSUS_2011_STATES.find((s) => s.stateCode === 'TS');
    expect(census).toBeDefined();

    // Wards should conserve population
    const wards = generateStateWards('TS');
    const wardPop = wards.reduce((s, w) => s + w.population, 0);
    expect(wardPop).toBe(census!.totalPopulation);

    // Aggregation should conserve population
    const proposed = aggregateToConstituencies(wards, 119, 'TS');
    const proposedPop = proposed.reduce((s, ac) => s + ac.totalPopulation, 0);
    expect(proposedPop).toBe(census!.totalPopulation);
  });

  test('multi-state simulation consistency', () => {
    const statesWithDistricts = ['TS', 'AP', 'KA', 'MH'];
    for (const code of statesWithDistricts) {
      const sim = simulateState(code);
      expect(sim).not.toBeNull();
      expect(sim!.stateCode).toBe(code);
      expect(sim!.constituencies.length).toBeGreaterThan(0);
      expect(sim!.statistics.totalPopulation).toBeGreaterThan(0);
    }
  });

  test('reservation percentages are reasonable', () => {
    const summary = analyzeNationalReservation();
    for (const state of summary.states) {
      // SC can't be > 35% (no state has >35% SC population)
      expect(state.scPercent).toBeLessThan(35);
      // ST can't be > 40%
      expect(state.stPercent).toBeLessThan(40);
      // Total reservations can't exceed total seats
      expect(state.projected.scReserved + state.projected.stReserved).toBeLessThanOrEqual(state.projected.total);
    }
  });
});
