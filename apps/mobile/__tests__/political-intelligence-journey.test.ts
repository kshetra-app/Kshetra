/**
 * apps/mobile/__tests__/political-intelligence-journey.test.ts
 *
 * Automated Regression Test Suite for Milestone W021.5 / CTO Directive 083:
 * "Core Political Intelligence Vertical Slice and Release-Critical Integration"
 *
 * Connected Product Journey:
 * Discover a constituency → inspect its political and electoral intelligence →
 * open a representative or candidate profile → examine election history and
 * affidavit disclosures → understand the provenance and completeness of information.
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import { globalSearch } from '../lib/globalSearch';
import {
  getUnifiedConstituenciesForState,
  getAvailableStates,
  getConstituenciesForState,
  getConstituencyBrief,
  getAvailableYearsForState,
} from '../lib/stateDataAdapter';
import {
  formatINR,
  resolveBreakdownState,
} from '../components/legislator/FinancialBreakdownCard';
import { useAffidavitStore } from '../stores/affidavits';
import { SequenceGuard } from '../lib/staleResponseGuard';
import { apiClient } from '../lib/api';
import { ConstituenciesEndpoint, validateConstituencyBrief, validateConstituencyDetail, validateConstituenciesListResponse } from '../lib/api/endpoints/constituencies';
import { ElectionsEndpoint } from '../lib/api/endpoints/elections';
import { ApiValidationError } from '../lib/api/errors';
import { STATES } from '@kshetra/shared';

describe('CTO Directive 083 — Political Intelligence Vertical Slice', () => {

  // ══════════════════════════════════════════════════════════════════════════
  // 1. Constituency Discovery and Canonical Identity (§2.A)
  // ══════════════════════════════════════════════════════════════════════════
  describe('1. Constituency Discovery & Canonical Identity', () => {
    it('finds constituency by name and returns canonical route and identifier', () => {
      const results = globalSearch('Kodangal');
      expect(results.length).toBeGreaterThan(0);

      const match = results.find((r) => r.type === 'constituency' && r.id === 'TS-AC-72');
      expect(match).toBeDefined();
      expect(match?.id).toBe('TS-AC-72');
      expect(match?.route).toBe('/constituency/TS-AC-72');
      expect(match?.meta?.stateCode).toBe('TS');
      expect(match?.meta?.acNo).toBe(72);
    });

    it('matches exact canonical ID format with top score', () => {
      const results = globalSearch('ts-ac-72');
      expect(results.length).toBeGreaterThan(0);
      const top = results[0];
      expect(top.id).toBe('TS-AC-72');
      expect(top.score).toBe(100);
      expect(top.route).toBe('/constituency/TS-AC-72');
    });

    it('finds MLA by name and provides direct legislator profile navigation', () => {
      const results = globalSearch('Revanth');
      expect(results.length).toBeGreaterThan(0);

      const mlaResult = results.find((r) => r.type === 'mla' && r.title.includes('Revanth'));
      expect(mlaResult).toBeDefined();
      expect(mlaResult?.meta?.stateCode).toBe('TS');
      expect(mlaResult?.meta?.acNo).toBe(72);
      expect(mlaResult?.route).toBe('/legislator/MLA_TS_2023_Kodangal_72');
    });

    it('supports national architecture across 31 available states/UTs without single-state hardcoding', () => {
      const availableStates = getAvailableStates();
      expect(availableStates.length).toBeGreaterThanOrEqual(31);

      // Verify coverage of southern, western, northern, and eastern states
      expect(availableStates).toContain('TS');
      expect(availableStates).toContain('AP');
      expect(availableStates).toContain('KA');
      expect(availableStates).toContain('MH');
      expect(availableStates).toContain('UP');
      expect(availableStates).toContain('DL');

      // Verify cross-state discovery in globalSearch
      const apRes = globalSearch('Gajuwaka');
      expect(apRes.some((r) => r.id === 'AP-AC-25' && r.meta?.stateCode === 'AP')).toBe(true);

      const mhRes = globalSearch('Shirdi');
      expect(mhRes.some((r) => r.id === 'MH-AC-38' && r.meta?.stateCode === 'MH')).toBe(true);

      const kaRes = globalSearch('Varuna');
      expect(kaRes.some((r) => r.id === 'KA-AC-173' && r.meta?.stateCode === 'KA')).toBe(true);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 2. Political and Electoral Intelligence (§2.B)
  // ══════════════════════════════════════════════════════════════════════════
  describe('2. Political & Electoral Intelligence Contracts', () => {
    it('resolves unified constituency with accurate election year, winner, runner-up and margin', () => {
      const tsConstituencies = getUnifiedConstituenciesForState('TS');
      const kodangal = tsConstituencies.find((c) => c.acNo === 72);
      expect(kodangal).toBeDefined();
      expect(kodangal?.name).toBe('Kodangal');
      expect(kodangal?.electionYear).toBe(2023);
      expect(kodangal?.winnerParty).toBe('INC');
      expect(kodangal?.winnerName).toBe('Anumula Revanth Reddy');
      expect(kodangal?.winnerVotes).toBe(108547);
      expect(kodangal?.runnerUp).toBe('BRS');
      expect(kodangal?.margin).toBe(57814);
      expect(kodangal?.currentParty).toBe('INC');
    });

    it('preserves state-specific election years across the national timeline', () => {
      expect(getAvailableYearsForState('TS')).toEqual([2014, 2018, 2023]);
      expect(getAvailableYearsForState('AP')).toEqual([2019, 2024]);
      expect(getAvailableYearsForState('KA')).toEqual([2018, 2023]);
      expect(getAvailableYearsForState('MH')).toEqual([2019, 2024]);
      expect(getAvailableYearsForState('UP')).toEqual([2017, 2022]);
    });

    it('maps correctly to shared ConstituencyBrief contract', () => {
      const brief = getConstituencyBrief('TS', 72);
      expect(brief).toBeDefined();
      expect(brief?.id).toBe('TS-AC-72');
      expect(brief?.name).toBe('Kodangal');
      expect(brief?.acNo).toBe(72);
      expect(brief?.stateCode).toBe('TS');
      expect(brief?.district).toBe('Vikarabad');
      expect(brief?.reservationStatus).toBe('GEN');
      expect(brief?.currentParty).toBe('INC');
      expect(brief?.currentMLA).toBe('Anumula Revanth Reddy');
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 3. Representative, Candidate and Financial Disclosures (§2.C)
  // ══════════════════════════════════════════════════════════════════════════
  describe('3. Representative, Candidate & Financial Disclosures', () => {
    it('Case 1: Positive assets and liabilities with complete itemization and accurate net worth', () => {
      const store = useAffidavitStore.getState();
      const revanth = store.getWinnerAffidavit('TS', 65, 2023);
      expect(revanth).toBeDefined();
      expect(revanth?.candidateName).toBe('Anumula Revanth Reddy');
      expect(revanth?.totalAssets).toBe(74_00_00_000);
      expect(revanth?.totalLiabilities).toBe(5_00_00_000);
      expect(revanth?.criminalCases).toBe(2);

      const record = {
        electionYear: 2023,
        selfMovableAssets: revanth!.selfMovableAssets,
        selfImmovableAssets: revanth!.selfImmovableAssets,
        spouseMovableAssets: revanth!.spouseMovableAssets,
        spouseImmovableAssets: revanth!.spouseImmovableAssets,
        totalAssets: revanth!.totalAssets,
        totalLiabilities: revanth!.totalLiabilities,
        netWorth: revanth!.totalAssets! - revanth!.totalLiabilities!,
      };

      const breakdown = resolveBreakdownState(record);
      expect(breakdown.hasCompleteBreakdown).toBe(true);
      expect(breakdown.isZeroTotal).toBe(false);
      expect(breakdown.statusNotice).toBe('Complete itemization');
      expect(breakdown.percentages).not.toBeNull();
      expect(formatINR(record.totalAssets)).toBe('₹74.0 Cr');
      expect(formatINR(record.totalLiabilities)).toBe('₹5.0 Cr');
      expect(formatINR(record.netWorth)).toBe('₹69.0 Cr');
    });

    it('Case 2: Genuine affirmative zero assets or liabilities preserved without coercion', () => {
      const zeroRecord = {
        electionYear: 2024,
        selfMovableAssets: 0,
        selfImmovableAssets: 0,
        spouseMovableAssets: 0,
        spouseImmovableAssets: 0,
        totalAssets: 0,
        totalLiabilities: 0,
        netWorth: 0,
      };

      const breakdown = resolveBreakdownState(zeroRecord);
      expect(breakdown.totalAssetsDisclosed).toBe(true);
      expect(breakdown.isZeroTotal).toBe(true);
      expect(breakdown.statusNotice).toBe('Affirmative zero assets disclosed');
      expect(formatINR(0)).toBe('₹0');
      expect(formatINR(zeroRecord.totalAssets)).toBe('₹0');
      expect(formatINR(zeroRecord.totalLiabilities)).toBe('₹0');
      expect(formatINR(zeroRecord.netWorth)).toBe('₹0');
    });

    it('Case 3: Missing disclosures strictly preserved as null without coercion to zero', () => {
      const missingRecord = {
        electionYear: 2024,
        selfMovableAssets: null,
        selfImmovableAssets: null,
        spouseMovableAssets: null,
        spouseImmovableAssets: null,
        totalAssets: null,
        totalLiabilities: null,
        netWorth: null,
      };

      const breakdown = resolveBreakdownState(missingRecord);
      expect(breakdown.totalAssetsDisclosed).toBe(false);
      expect(breakdown.hasAnyDisclosedComponent).toBe(false);
      expect(breakdown.allComponentsUndisclosed).toBe(true);
      expect(breakdown.statusNotice).toBe('Assets not disclosed in filing');
      expect(formatINR(null)).toBe('Not Disclosed');
      expect(formatINR(undefined)).toBe('Not Disclosed');
      expect(missingRecord.netWorth).toBeNull();
    });

    it('Case 4: Partial itemization displays filed items without fabricating missing items', () => {
      const partialRecord = {
        electionYear: 2024,
        selfMovableAssets: 35_00_000,
        selfImmovableAssets: null,
        spouseMovableAssets: null,
        spouseImmovableAssets: null,
        totalAssets: 70_00_000,
        totalLiabilities: null,
        netWorth: null,
      };

      const breakdown = resolveBreakdownState(partialRecord);
      expect(breakdown.hasCompleteBreakdown).toBe(false);
      expect(breakdown.hasAnyDisclosedComponent).toBe(true);
      expect(breakdown.totalAssetsDisclosed).toBe(true);
      expect(breakdown.statusNotice).toBe('Partial itemization — complete component breakdown not disclosed in filing');
      expect(formatINR(partialRecord.selfMovableAssets)).toBe('₹35.0 L');
      expect(formatINR(partialRecord.selfImmovableAssets)).toBe('Not Disclosed');
      expect(formatINR(partialRecord.totalLiabilities)).toBe('Not Disclosed');
    });

    it('Case 5: Unverified / missing disclosures return clean non-blocking status', () => {
      const store = useAffidavitStore.getState();
      const unverified = store.getWinnerAffidavit('TS', 999, 2023);
      expect(unverified).toBeNull();

      // Financial breakdown card handles empty records array gracefully
      const emptyState = resolveBreakdownState({ electionYear: 2024 });
      expect(emptyState.allComponentsUndisclosed).toBe(true);
      expect(emptyState.statusNotice).toBe('Assets not disclosed in filing');
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 4. Mobile API Client Endpoints & Validation (§2.D)
  // ══════════════════════════════════════════════════════════════════════════
  describe('4. Mobile API Client Endpoints & Schemas', () => {
    it('apiClient exposes constituencies and elections endpoints', () => {
      expect(apiClient.constituencies).toBeInstanceOf(ConstituenciesEndpoint);
      expect(apiClient.elections).toBeInstanceOf(ElectionsEndpoint);
      expect(typeof apiClient.constituencies.listConstituencies).toBe('function');
      expect(typeof apiClient.constituencies.getConstituency).toBe('function');
      expect(typeof apiClient.constituencies.searchConstituencies).toBe('function');
      expect(typeof apiClient.elections.listElections).toBe('function');
      expect(typeof apiClient.elections.getElection).toBe('function');
      expect(typeof apiClient.elections.listContests).toBe('function');
      expect(typeof apiClient.elections.getContestDetail).toBe('function');
      expect(typeof apiClient.elections.getPersonElections).toBe('function');
    });

    it('validateConstituencyBrief validates correct brief and rejects malformed payloads', () => {
      const valid = {
        id: 'TS-AC-65',
        name: 'Kodangal',
        acNo: 65,
        stateCode: 'TS',
        district: 'Vikarabad',
        reservationStatus: 'GEN',
        currentParty: 'INC',
        currentMLA: 'Anumula Revanth Reddy',
      };
      expect(validateConstituencyBrief(valid, 'test')).toEqual(valid);

      expect(() => validateConstituencyBrief(null, 'test')).toThrow(ApiValidationError);
      expect(() => validateConstituencyBrief({ ...valid, acNo: 'invalid' }, 'test')).toThrow(ApiValidationError);
      expect(() => validateConstituencyBrief({ ...valid, reservationStatus: 'INVALID' }, 'test')).toThrow(ApiValidationError);
      expect(() => validateConstituencyBrief({ ...valid, stateCode: '' }, 'test')).toThrow(ApiValidationError);
    });

    it('validateConstituencyDetail preserves election2023 returns without manufactured values', () => {
      const detail = {
        id: 'TS-AC-65',
        name: 'Kodangal',
        acNo: 65,
        stateCode: 'TS',
        district: 'Vikarabad',
        reservationStatus: 'GEN',
        currentParty: 'INC',
        currentMLA: 'Anumula Revanth Reddy',
        election2023: {
          winner: 'INC',
          winnerName: 'Anumula Revanth Reddy',
          winnerVotes: 107429,
          runnerUp: 'BRS',
          margin: 32532,
          marginPercent: 30.3,
        },
      };

      const res = validateConstituencyDetail(detail, 'test');
      expect(res.id).toBe('TS-AC-65');
      expect(res.election2023?.winner).toBe('INC');
      expect(res.election2023?.winnerVotes).toBe(107429);
      expect(res.election2023?.margin).toBe(32532);
      expect(res.election2023?.marginPercent).toBe(30.3);
    });

    it('validateConstituenciesListResponse validates list array payload', () => {
      const payload = {
        state: 'TS',
        count: 1,
        data: [
          {
            id: 'TS-AC-65',
            name: 'Kodangal',
            acNo: 65,
            stateCode: 'TS',
            district: 'Vikarabad',
            reservationStatus: 'GEN',
            currentParty: 'INC',
            currentMLA: 'Anumula Revanth Reddy',
          },
        ],
      };

      const res = validateConstituenciesListResponse(payload);
      expect(res.state).toBe('TS');
      expect(res.count).toBe(1);
      expect(res.data.length).toBe(1);
      expect(res.data[0].id).toBe('TS-AC-65');

      expect(() => validateConstituenciesListResponse('invalid')).toThrow(ApiValidationError);
      expect(() => validateConstituenciesListResponse({ state: 'TS', data: 'not-array' })).toThrow(ApiValidationError);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 5. Stale Response Prevention on Rapid Selection Changes (§2.D)
  // ══════════════════════════════════════════════════════════════════════════
  describe('5. Stale Response Prevention on Rapid Navigation', () => {
    it('SequenceGuard discards out-of-order resolution from rapid constituency switching', () => {
      const guard = new SequenceGuard<string>();

      // User selects constituency 1 (TS-AC-65)
      const token1 = guard.startRequest('TS-AC-65');
      expect(token1.isStale()).toBe(false);
      expect(guard.isLatest(token1)).toBe(true);

      // User rapidly selects constituency 2 (TS-AC-40) before request 1 completes
      const token2 = guard.startRequest('TS-AC-40');
      expect(token2.isStale()).toBe(false);
      expect(guard.isLatest(token2)).toBe(true);

      // Request 1 now finishes LATER than request 2 was initiated
      expect(token1.isStale()).toBe(true);
      expect(guard.isLatest(token1)).toBe(false);

      // Request 2 completes
      expect(token2.isStale()).toBe(false);
      expect(guard.isLatest(token2)).toBe(true);
    });

    it('SequenceGuard reset immediately invalidates all active requests', () => {
      const guard = new SequenceGuard<string>();
      const token = guard.startRequest('AP-AC-1');
      expect(token.isStale()).toBe(false);

      guard.reset();
      expect(token.isStale()).toBe(true);
      expect(guard.isLatest(token)).toBe(false);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 6. Invariants & Lineage Integrity (§5)
  // ══════════════════════════════════════════════════════════════════════════
  describe('6. Governance, Lineage & Population Invariants', () => {
    it('Delhi assembly seats are strictly 70; DL-AC-071 through DL-AC-087 do not exist as verified assembly seats', () => {
      const dlConstituencies = getUnifiedConstituenciesForState('DL');
      expect(dlConstituencies.length).toBe(70);
      for (const c of dlConstituencies) {
        expect(c.acNo).toBeLessThanOrEqual(70);
      }
    });

    it('Telangana assembly seats are strictly 119 with Kodangal AC#72 confirmed', () => {
      const tsConstituencies = getUnifiedConstituenciesForState('TS');
      expect(tsConstituencies.length).toBe(119);
      const ac72 = tsConstituencies.find((c) => c.acNo === 72);
      expect(ac72?.name).toBe('Kodangal');
    });
  });
});
