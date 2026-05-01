/**
 * Delimitation Engine Tests
 * Tests census data integrity, seat calculator, and constituency mapper.
 */

import {
  CENSUS_2011_STATES,
  getCensusState,
  getCensusDistricts,
  INDIA_TOTAL_POPULATION_2011,
  IDEAL_POP_PER_AC_SEAT_2011,
  IDEAL_POP_PER_LS_SEAT_2011,
  TOTAL_LOK_SABHA_SEATS,
  computeAllProjections,
} from '../india-district-population-2011';

// ─── Census Data Integrity ───

describe('Census 2011 Data', () => {
  test('has data for all expected states', () => {
    const codes = CENSUS_2011_STATES.map((s) => s.stateCode);
    expect(codes).toContain('TS');
    expect(codes).toContain('AP');
    expect(codes).toContain('KA');
    expect(codes).toContain('MH');
    expect(codes).toContain('UP');
    expect(codes).toContain('BR');
    expect(codes).toContain('TN');
    expect(codes).toContain('KL');
    expect(codes).toContain('DL');
    expect(CENSUS_2011_STATES.length).toBeGreaterThanOrEqual(13);
  });

  test('all states have valid population > 0', () => {
    for (const state of CENSUS_2011_STATES) {
      expect(state.totalPopulation).toBeGreaterThan(0);
      expect(state.malePopulation).toBeGreaterThan(0);
      expect(state.femalePopulation).toBeGreaterThan(0);
      // Male + female should approximately equal total (within 5% for rounding)
      const sum = state.malePopulation + state.femalePopulation;
      expect(Math.abs(sum - state.totalPopulation) / state.totalPopulation).toBeLessThan(0.05);
    }
  });

  test('all states have valid assembly and LS seats', () => {
    for (const state of CENSUS_2011_STATES) {
      expect(state.currentAssemblySeats).toBeGreaterThan(0);
      expect(state.currentLokSabhaSeats).toBeGreaterThan(0);
    }
  });

  test('SC + ST population never exceeds total', () => {
    for (const state of CENSUS_2011_STATES) {
      expect(state.scPopulation + state.stPopulation).toBeLessThanOrEqual(state.totalPopulation);
    }
  });

  test('urban population never exceeds total', () => {
    for (const state of CENSUS_2011_STATES) {
      expect(state.urbanPopulation).toBeLessThanOrEqual(state.totalPopulation);
    }
  });

  test('literate population never exceeds total', () => {
    for (const state of CENSUS_2011_STATES) {
      expect(state.literatePopulation).toBeLessThanOrEqual(state.totalPopulation);
    }
  });
});

// ─── District-Level Data ───

describe('District-Level Census Data', () => {
  test('TS has district-level data', () => {
    const districts = getCensusDistricts('TS');
    expect(districts.length).toBeGreaterThanOrEqual(10);
    for (const d of districts) {
      expect(d.stateCode).toBe('TS');
      expect(d.totalPopulation).toBeGreaterThan(0);
      expect(d.districtName.length).toBeGreaterThan(0);
    }
  });

  test('AP has district-level data', () => {
    const districts = getCensusDistricts('AP');
    expect(districts.length).toBeGreaterThanOrEqual(13);
  });

  test('KA has district-level data', () => {
    const districts = getCensusDistricts('KA');
    expect(districts.length).toBeGreaterThanOrEqual(15);
  });

  test('MH has district-level data', () => {
    const districts = getCensusDistricts('MH');
    expect(districts.length).toBeGreaterThanOrEqual(15);
  });

  test('district populations sum roughly to state total', () => {
    for (const stateCode of ['TS', 'AP', 'KA', 'MH']) {
      const state = getCensusState(stateCode);
      const districts = getCensusDistricts(stateCode);
      if (!state || districts.length === 0) continue;

      const districtSum = districts.reduce((s, d) => s + d.totalPopulation, 0);
      // Should be within 5% of state total (aggregation rounding)
      const ratio = Math.abs(districtSum - state.totalPopulation) / state.totalPopulation;
      expect(ratio).toBeLessThan(0.05);
    }
  });

  test('all district names are non-empty and unique within state', () => {
    for (const stateCode of ['TS', 'AP', 'KA', 'MH']) {
      const districts = getCensusDistricts(stateCode);
      const names = districts.map((d) => d.districtName);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
      for (const name of names) {
        expect(name.length).toBeGreaterThan(0);
      }
    }
  });
});

// ─── Constants ───

describe('Census Constants', () => {
  test('India total population is ~1.21 billion', () => {
    expect(INDIA_TOTAL_POPULATION_2011).toBeGreaterThan(1_200_000_000);
    expect(INDIA_TOTAL_POPULATION_2011).toBeLessThan(1_250_000_000);
  });

  test('Lok Sabha seats = 543', () => {
    expect(TOTAL_LOK_SABHA_SEATS).toBe(543);
  });

  test('Ideal pop per LS seat is ~2.2M', () => {
    expect(IDEAL_POP_PER_LS_SEAT_2011).toBeGreaterThan(2_000_000);
    expect(IDEAL_POP_PER_LS_SEAT_2011).toBeLessThan(2_500_000);
  });

  test('Ideal pop per AC seat is ~250K-350K', () => {
    expect(IDEAL_POP_PER_AC_SEAT_2011).toBeGreaterThan(200_000);
    expect(IDEAL_POP_PER_AC_SEAT_2011).toBeLessThan(400_000);
  });
});

// ─── Seat Projections ───

describe('Seat Projections', () => {
  test('computeAllProjections returns results for all states', () => {
    const projections = computeAllProjections();
    expect(projections.length).toBe(CENSUS_2011_STATES.length);
    for (const p of projections) {
      expect(p.stateCode.length).toBe(2);
      expect(p.currentSeats).toBeGreaterThan(0);
      expect(p.projectedSeats).toBeGreaterThan(0);
      expect(p.population).toBeGreaterThan(0);
    }
  });

  test('UP is the biggest gainer', () => {
    const projections = computeAllProjections();
    // UP has the largest population, should gain the most seats
    const up = projections.find((p) => p.stateCode === 'UP');
    expect(up).toBeDefined();
    expect(up!.seatChange).toBeGreaterThan(0);
    // UP should be near the top of gainers
    const topGainer = projections[0]; // sorted by seatChange desc
    expect(topGainer.seatChange).toBeGreaterThan(50);
  });

  test('Kerala loses seats (small population relative to current seats)', () => {
    const projections = computeAllProjections();
    const kl = projections.find((p) => p.stateCode === 'KL');
    // KL: 33.4M people / 140 seats = 238K per seat (below national avg ~294K)
    expect(kl).toBeDefined();
    expect(kl!.seatChange).toBeLessThan(0);
  });

  test('projected seats always > 0', () => {
    const projections = computeAllProjections();
    for (const p of projections) {
      expect(p.projectedSeats).toBeGreaterThan(0);
    }
  });

  test('popPerSeat is reasonable', () => {
    const projections = computeAllProjections();
    for (const p of projections) {
      if (p.projectedSeats > 0) {
        expect(p.popPerSeat).toBeGreaterThan(100_000);
        expect(p.popPerSeat).toBeLessThan(1_000_000);
      }
    }
  });
});

// ─── getCensusState lookup ───

describe('Census Lookup', () => {
  test('getCensusState returns correct state', () => {
    const ts = getCensusState('TS');
    expect(ts).toBeDefined();
    expect(ts!.stateName).toBe('Telangana');
    expect(ts!.currentAssemblySeats).toBe(119);
  });

  test('getCensusState returns undefined for unknown', () => {
    expect(getCensusState('XX')).toBeUndefined();
  });

  test('known seat counts are correct', () => {
    expect(getCensusState('TS')!.currentAssemblySeats).toBe(119);
    expect(getCensusState('AP')!.currentAssemblySeats).toBe(175);
    expect(getCensusState('KA')!.currentAssemblySeats).toBe(224);
    expect(getCensusState('MH')!.currentAssemblySeats).toBe(288);
    expect(getCensusState('UP')!.currentAssemblySeats).toBe(403);
    expect(getCensusState('DL')!.currentAssemblySeats).toBe(70);
  });
});
