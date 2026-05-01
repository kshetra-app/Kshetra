/**
 * Regression tests for Sprint 29 — New state seed data files.
 * Covers Tamil Nadu (234), Kerala (140), West Bengal (293), Uttar Pradesh (401).
 */
import { TN_CONSTITUENCIES, getTNConstituency, type TNConstituencySeed } from '../tamil-nadu-constituencies';
import { KL_CONSTITUENCIES, getKLConstituency, type KLConstituencySeed } from '../kerala-constituencies';
import { WB_CONSTITUENCIES, getWBConstituency, type WBConstituencySeed } from '../west-bengal-constituencies';
import { UP_CONSTITUENCIES, getUPConstituency, type UPConstituencySeed } from '../uttar-pradesh-constituencies';

// ── Helper ──────────────────────────────────────────────────────────────────
function validateSeedArray(
  label: string,
  arr: Array<{ acNo: number; name: string; district: string; type: string }>,
  expectedMin: number,
) {
  describe(`${label} — basic shape`, () => {
    it(`should have at least ${expectedMin} entries`, () => {
      expect(arr.length).toBeGreaterThanOrEqual(expectedMin);
    });

    it('every entry should have required fields', () => {
      for (const c of arr) {
        expect(c.acNo).toBeGreaterThan(0);
        expect(c.name.length).toBeGreaterThan(0);
        expect(c.district.length).toBeGreaterThan(0);
        expect(['GEN', 'SC', 'ST']).toContain(c.type);
      }
    });

    it('acNo should be unique', () => {
      const acNos = arr.map((c) => c.acNo);
      expect(new Set(acNos).size).toBe(arr.length);
    });

    it('acNo should be sorted ascending', () => {
      for (let i = 1; i < arr.length; i++) {
        expect(arr[i].acNo).toBeGreaterThan(arr[i - 1].acNo);
      }
    });
  });
}

// ── Tamil Nadu 2021 ─────────────────────────────────────────────────────────

describe('Tamil Nadu Constituencies', () => {
  validateSeedArray('TN', TN_CONSTITUENCIES, 234);

  it('should have exactly 234 seats', () => {
    expect(TN_CONSTITUENCIES).toHaveLength(234);
  });

  it('acNo range should be 1–234', () => {
    expect(TN_CONSTITUENCIES[0].acNo).toBe(1);
    expect(TN_CONSTITUENCIES[TN_CONSTITUENCIES.length - 1].acNo).toBe(234);
  });

  it('every entry should have 2021 election data', () => {
    for (const c of TN_CONSTITUENCIES) {
      expect(c.winner2021.length).toBeGreaterThan(0);
      expect(c.winnerName2021.length).toBeGreaterThan(0);
      expect(c.winnerVotes2021).toBeGreaterThan(0);
      expect(c.runnerUp2021.length).toBeGreaterThan(0);
      expect(c.margin2021).toBeGreaterThanOrEqual(0);
      expect(c.currentParty.length).toBeGreaterThan(0);
    }
  });

  it('DMK should have won ~133 seats', () => {
    const dmkWins = TN_CONSTITUENCIES.filter((c) => c.winner2021 === 'DMK').length;
    expect(dmkWins).toBe(133);
  });

  it('getTNConstituency should return correct constituency', () => {
    const c = getTNConstituency(1);
    expect(c).toBeDefined();
    expect(c!.name).toBe('Gummidipoondi');
  });

  it('getTNConstituency should return undefined for invalid acNo', () => {
    expect(getTNConstituency(999)).toBeUndefined();
  });
});

// ── Kerala 2021 ─────────────────────────────────────────────────────────────

describe('Kerala Constituencies', () => {
  validateSeedArray('KL', KL_CONSTITUENCIES, 140);

  it('should have exactly 140 seats', () => {
    expect(KL_CONSTITUENCIES).toHaveLength(140);
  });

  it('acNo range should be 1–140', () => {
    expect(KL_CONSTITUENCIES[0].acNo).toBe(1);
    expect(KL_CONSTITUENCIES[KL_CONSTITUENCIES.length - 1].acNo).toBe(140);
  });

  it('every entry should have 2021 election data', () => {
    for (const c of KL_CONSTITUENCIES) {
      expect(c.winner2021.length).toBeGreaterThan(0);
      expect(c.winnerName2021.length).toBeGreaterThan(0);
      expect(c.winnerVotes2021).toBeGreaterThan(0);
      expect(c.runnerUp2021.length).toBeGreaterThan(0);
      expect(c.margin2021).toBeGreaterThanOrEqual(0);
      expect(c.currentParty.length).toBeGreaterThan(0);
    }
  });

  it('CPIM should have won 62 seats', () => {
    const cpimWins = KL_CONSTITUENCIES.filter((c) => c.winner2021 === 'CPIM').length;
    expect(cpimWins).toBe(62);
  });

  it('INC should have won 21 seats', () => {
    const incWins = KL_CONSTITUENCIES.filter((c) => c.winner2021 === 'INC').length;
    expect(incWins).toBe(21);
  });

  it('should have 14 districts', () => {
    const districts = new Set(KL_CONSTITUENCIES.map((c) => c.district));
    expect(districts.size).toBe(14);
  });

  it('getKLConstituency should return correct constituency', () => {
    const c = getKLConstituency(1);
    expect(c).toBeDefined();
    expect(c!.name).toBe('Manjeshwaram');
    expect(c!.district).toBe('Kasaragod');
  });

  it('getKLConstituency should return undefined for invalid acNo', () => {
    expect(getKLConstituency(999)).toBeUndefined();
  });
});

// ── West Bengal 2021 ────────────────────────────────────────────────────────

describe('West Bengal Constituencies', () => {
  validateSeedArray('WB', WB_CONSTITUENCIES, 290);

  it('should have at least 293 seats (294 - 1 by-election)', () => {
    expect(WB_CONSTITUENCIES.length).toBeGreaterThanOrEqual(293);
  });

  it('every entry should have 2021 election data', () => {
    for (const c of WB_CONSTITUENCIES) {
      expect(c.winner2021.length).toBeGreaterThan(0);
      expect(c.winnerName2021.length).toBeGreaterThan(0);
      expect(c.winnerVotes2021).toBeGreaterThan(0);
      expect(c.runnerUp2021.length).toBeGreaterThan(0);
      expect(c.margin2021).toBeGreaterThanOrEqual(0);
      expect(c.currentParty.length).toBeGreaterThan(0);
    }
  });

  it('AITC should have won 215 seats', () => {
    const aitcWins = WB_CONSTITUENCIES.filter((c) => c.winner2021 === 'AITC').length;
    expect(aitcWins).toBe(215);
  });

  it('BJP should have won 77 seats', () => {
    const bjpWins = WB_CONSTITUENCIES.filter((c) => c.winner2021 === 'BJP').length;
    expect(bjpWins).toBe(77);
  });

  it('should have SC and ST reserved seats', () => {
    const scSeats = WB_CONSTITUENCIES.filter((c) => c.type === 'SC').length;
    const stSeats = WB_CONSTITUENCIES.filter((c) => c.type === 'ST').length;
    expect(scSeats).toBeGreaterThan(50);
    expect(stSeats).toBeGreaterThan(10);
  });

  it('should have 22+ districts', () => {
    const districts = new Set(WB_CONSTITUENCIES.map((c) => c.district));
    expect(districts.size).toBeGreaterThanOrEqual(22);
  });

  it('getWBConstituency should return correct constituency', () => {
    const c = getWBConstituency(1);
    expect(c).toBeDefined();
    expect(c!.name).toBe('Mekliganj');
    expect(c!.type).toBe('SC');
  });

  it('getWBConstituency should return undefined for invalid acNo', () => {
    expect(getWBConstituency(999)).toBeUndefined();
  });
});

// ── Uttar Pradesh 2022 ─────────────────────────────────────────────────────

describe('Uttar Pradesh Constituencies', () => {
  validateSeedArray('UP', UP_CONSTITUENCIES, 400);

  it('should have at least 401 seats (403 - 2 postponed)', () => {
    expect(UP_CONSTITUENCIES.length).toBeGreaterThanOrEqual(401);
  });

  it('every entry should have 2022 election data', () => {
    for (const c of UP_CONSTITUENCIES) {
      expect(c.winner2022.length).toBeGreaterThan(0);
      expect(c.winnerName2022.length).toBeGreaterThan(0);
      expect(c.winnerVotes2022).toBeGreaterThan(0);
      expect(c.runnerUp2022.length).toBeGreaterThan(0);
      expect(c.margin2022).toBeGreaterThanOrEqual(0);
      expect(c.currentParty.length).toBeGreaterThan(0);
    }
  });

  it('BJP should have won 255 seats', () => {
    const bjpWins = UP_CONSTITUENCIES.filter((c) => c.winner2022 === 'BJP').length;
    expect(bjpWins).toBe(255);
  });

  it('SP should have won 111 seats', () => {
    const spWins = UP_CONSTITUENCIES.filter((c) => c.winner2022 === 'SP').length;
    expect(spWins).toBe(111);
  });

  it('should have SC and ST reserved seats', () => {
    const scSeats = UP_CONSTITUENCIES.filter((c) => c.type === 'SC').length;
    const stSeats = UP_CONSTITUENCIES.filter((c) => c.type === 'ST').length;
    expect(scSeats).toBeGreaterThan(70);
    expect(stSeats).toBeGreaterThanOrEqual(2);
  });

  it('should have 70+ districts', () => {
    const districts = new Set(UP_CONSTITUENCIES.map((c) => c.district));
    expect(districts.size).toBeGreaterThanOrEqual(70);
  });

  it('getUPConstituency should return correct constituency', () => {
    const c = getUPConstituency(1);
    expect(c).toBeDefined();
    expect(c!.name).toBe('Behat');
    expect(c!.district).toBe('Saharanpur');
  });

  it('getUPConstituency should return undefined for invalid acNo', () => {
    expect(getUPConstituency(999)).toBeUndefined();
  });
});

// ── Cross-state sanity checks ───────────────────────────────────────────────

describe('Cross-state sanity', () => {
  it('total seats across 4 new states should be ~1068', () => {
    const total =
      TN_CONSTITUENCIES.length +
      KL_CONSTITUENCIES.length +
      WB_CONSTITUENCIES.length +
      UP_CONSTITUENCIES.length;
    expect(total).toBeGreaterThanOrEqual(1068);
    expect(total).toBeLessThanOrEqual(1071); // 234+140+294+403
  });

  it('no constituency name should be empty in any state', () => {
    const all = [
      ...TN_CONSTITUENCIES,
      ...KL_CONSTITUENCIES,
      ...WB_CONSTITUENCIES,
      ...UP_CONSTITUENCIES,
    ];
    for (const c of all) {
      expect(c.name.trim().length).toBeGreaterThan(0);
    }
  });

  it('no district should be empty in any state', () => {
    const all = [
      ...TN_CONSTITUENCIES,
      ...KL_CONSTITUENCIES,
      ...WB_CONSTITUENCIES,
      ...UP_CONSTITUENCIES,
    ];
    for (const c of all) {
      expect(c.district.trim().length).toBeGreaterThan(0);
    }
  });

  it('winner votes should always be positive', () => {
    const allVotes = [
      ...TN_CONSTITUENCIES.map((c) => c.winnerVotes2021),
      ...KL_CONSTITUENCIES.map((c) => c.winnerVotes2021),
      ...WB_CONSTITUENCIES.map((c) => c.winnerVotes2021),
      ...UP_CONSTITUENCIES.map((c) => c.winnerVotes2022),
    ];
    for (const v of allVotes) {
      expect(v).toBeGreaterThan(0);
    }
  });
});
