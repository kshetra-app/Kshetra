import {
  aggregateBoothsToPanchayat,
  aggregatePanchayatsToMandal,
  aggregateMandalsToConstituency,
  aggregateBoothResults,
  buildHierarchyTree,
  validateAggregation,
  computeDataIntegrityScore,
  drillDown,
} from '../analytics/aggregation-engine';
import type {
  PollingBooth,
  GramPanchayat,
  Mandal,
  MandalConstituencyOverlap,
  BoothElectionResult,
} from '../types/hierarchy';

describe('Hierarchy Aggregation Engine', () => {
  const mockBooths: PollingBooth[] = [
    {
      id: 'TS-AC1-B1',
      boothNumber: 1,
      boothName: 'School Room 1',
      pollingStationName: 'ZP High School',
      constituencyId: 'TS-AC-1',
      panchayatId: 'TS-GP-101',
      mandalId: 'TS-MDL-10',
      stateCode: 'TS',
      totalVoters: 1000,
      maleVoters: 500,
      femaleVoters: 495,
      thirdGenderVoters: 5,
      isAuxiliary: false,
    },
    {
      id: 'TS-AC1-B2',
      boothNumber: 2,
      boothName: 'School Room 2',
      pollingStationName: 'ZP High School',
      constituencyId: 'TS-AC-1',
      panchayatId: 'TS-GP-101',
      mandalId: 'TS-MDL-10',
      stateCode: 'TS',
      totalVoters: 1200,
      maleVoters: 600,
      femaleVoters: 600,
      thirdGenderVoters: 0,
      isAuxiliary: false,
    },
    {
      id: 'TS-AC1-B3',
      boothNumber: 3,
      boothName: 'Panchayat Office',
      pollingStationName: 'Gram Panchayat Hall',
      constituencyId: 'TS-AC-1',
      panchayatId: 'TS-GP-102',
      mandalId: 'TS-MDL-10',
      stateCode: 'TS',
      totalVoters: 800,
      maleVoters: 400,
      femaleVoters: 400,
      thirdGenderVoters: 0,
      isAuxiliary: false,
    },
  ];

  const mockPanchayats: GramPanchayat[] = [
    {
      id: 'TS-GP-101',
      name: 'Panchayat A',
      mandalId: 'TS-MDL-10',
      stateCode: 'TS',
      type: 'gram_panchayat',
    },
    {
      id: 'TS-GP-102',
      name: 'Panchayat B',
      mandalId: 'TS-MDL-10',
      stateCode: 'TS',
      type: 'gram_panchayat',
    },
  ];

  const mockMandals: Mandal[] = [
    {
      id: 'TS-MDL-10',
      name: 'Mandal X',
      stateCode: 'TS',
      district: 'District D',
      type: 'mandal',
    },
  ];

  const mockOverlaps: MandalConstituencyOverlap[] = [
    {
      mandalId: 'TS-MDL-10',
      constituencyId: 'TS-AC-1',
      overlapType: 'full',
      overlapPercentage: 100,
      panchayatsInAc: 2,
      votersInAc: 3000,
    },
  ];

  describe('aggregateBoothsToPanchayat', () => {
    it('should aggregate voter counts and booth counts correctly', () => {
      const panchayat1Booths = mockBooths.filter(b => b.panchayatId === 'TS-GP-101');
      const result = aggregateBoothsToPanchayat(panchayat1Booths, 'TS');
      
      expect(result.level).toBe('panchayat');
      expect(result.entityId).toBe('TS-GP-101');
      expect(result.totalVoters).toBe(2200);
      expect(result.maleVoters).toBe(1100);
      expect(result.femaleVoters).toBe(1095);
      expect(result.totalBooths).toBe(2);
    });

    it('should handle empty booths array safely', () => {
      const result = aggregateBoothsToPanchayat([], 'TS');
      expect(result.totalVoters).toBe(0);
      expect(result.totalBooths).toBe(0);
    });
  });

  describe('aggregatePanchayatsToMandal', () => {
    it('should aggregate panchayat-level data up to mandal level', () => {
      const boothsByPanchayat = new Map<string, PollingBooth[]>();
      boothsByPanchayat.set('TS-GP-101', mockBooths.filter(b => b.panchayatId === 'TS-GP-101'));
      boothsByPanchayat.set('TS-GP-102', mockBooths.filter(b => b.panchayatId === 'TS-GP-102'));

      const result = aggregatePanchayatsToMandal(mockPanchayats, boothsByPanchayat, 'TS');

      expect(result.level).toBe('mandal');
      expect(result.entityId).toBe('TS-MDL-10');
      expect(result.totalVoters).toBe(3000);
      expect(result.totalBooths).toBe(3);
      expect(result.totalPanchayats).toBe(2);
    });
  });

  describe('aggregateMandalsToConstituency', () => {
    it('should scale mandal data according to overlap percentages', () => {
      const boothsByPanchayat = new Map<string, PollingBooth[]>();
      boothsByPanchayat.set('TS-GP-101', mockBooths.filter(b => b.panchayatId === 'TS-GP-101'));
      boothsByPanchayat.set('TS-GP-102', mockBooths.filter(b => b.panchayatId === 'TS-GP-102'));

      const mandalDataMap = new Map();
      mandalDataMap.set('TS-MDL-10', aggregatePanchayatsToMandal(mockPanchayats, boothsByPanchayat, 'TS'));

      const result = aggregateMandalsToConstituency(mockOverlaps, mandalDataMap);

      expect(result.level).toBe('constituency');
      expect(result.entityId).toBe('TS-AC-1');
      expect(result.totalVoters).toBe(3000);
      expect(result.totalBooths).toBe(3);
      expect(result.totalMandals).toBe(1);
    });
  });

  describe('aggregateBoothResults', () => {
    const mockResults: BoothElectionResult[] = [
      {
        boothId: 'TS-AC1-B1',
        electionYear: 2023,
        constituencyId: 'TS-AC-1',
        totalVotersInRoll: 1000,
        votesPolled: 800,
        validVotes: 790,
        rejectedVotes: 5,
        notaVotes: 5,
        turnoutPercent: 80.0,
        candidateVotes: [
          { candidateName: 'Cand A', party: 'INC', votes: 400, isWinnerAtBooth: true },
          { candidateName: 'Cand B', party: 'BRS', votes: 390, isWinnerAtBooth: false },
        ],
      },
      {
        boothId: 'TS-AC1-B2',
        electionYear: 2023,
        constituencyId: 'TS-AC-1',
        totalVotersInRoll: 1200,
        votesPolled: 900,
        validVotes: 890,
        rejectedVotes: 5,
        notaVotes: 5,
        turnoutPercent: 75.0,
        candidateVotes: [
          { candidateName: 'Cand A', party: 'INC', votes: 420, isWinnerAtBooth: false },
          { candidateName: 'Cand B', party: 'BRS', votes: 470, isWinnerAtBooth: true },
        ],
      },
    ];

    it('should aggregate election results by grouping entity ID', () => {
      const byGP = aggregateBoothResults(mockResults, 'panchayat', (boothId) => {
        const b = mockBooths.find(x => x.id === boothId);
        return b?.panchayatId ?? 'UNKNOWN';
      });

      const panchayatResult = byGP.get('TS-GP-101');
      expect(panchayatResult).toBeDefined();
      expect(panchayatResult?.totalVotesPolled).toBe(1700);
      expect(panchayatResult?.turnout).toBe(77.27); // (1700 / 2200) * 100
      expect(panchayatResult?.partyVotes.INC).toBe(820);
      expect(panchayatResult?.partyVotes.BRS).toBe(860);
      expect(panchayatResult?.boothsWon.INC).toBe(1);
      expect(panchayatResult?.boothsWon.BRS).toBe(1);
    });
  });

  describe('buildHierarchyTree & drillDown & computeDataIntegrityScore & validateAggregation', () => {
    it('should build hierarchy tree and perform validation', () => {
      const tree = buildHierarchyTree('TS-AC-1', mockMandals, mockPanchayats, mockBooths);
      
      expect(tree.id).toBe('TS-AC-1');
      expect(tree.level).toBe('constituency');
      expect(tree.children?.length).toBe(1); // 1 Mandal
      expect(tree.children?.[0].children?.length).toBe(2); // 2 Panchayats

      const boothsDrill = drillDown('TS-AC-1', 'booth', mockMandals, mockPanchayats, mockBooths);
      expect(boothsDrill.length).toBe(3);

      const integrityScore = computeDataIntegrityScore('TS-AC-1', mockBooths, mockPanchayats, mockMandals, 3000);
      expect(integrityScore).toBeGreaterThan(90);

      const validation = validateAggregation('TS-AC-1', mockBooths, 3000);
      expect(validation.checks.allBoothsMapped).toBe(true);
      expect(validation.checks.voterTotalMatch).toBe(true);
      expect(validation.errors.length).toBe(0);
    });

    it('covers all drillDown target levels', () => {
      const constituencyDrill = drillDown('TS-AC-1', 'constituency', mockMandals, mockPanchayats, mockBooths);
      expect(constituencyDrill.length).toBe(1);
      expect(constituencyDrill[0].id).toBe('TS-AC-1');

      const mandalDrill = drillDown('TS-AC-1', 'mandal', mockMandals, mockPanchayats, mockBooths);
      expect(mandalDrill.length).toBe(1);
      expect(mandalDrill[0].id).toBe('TS-MDL-10');

      const panchayatDrill = drillDown('TS-AC-1', 'panchayat', mockMandals, mockPanchayats, mockBooths);
      expect(panchayatDrill.length).toBe(2);

      const districtDrill = drillDown('TS-AC-1', 'district', mockMandals, mockPanchayats, mockBooths);
      expect(districtDrill.length).toBe(1);

      const stateDrill = drillDown('TS-AC-1', 'state', mockMandals, mockPanchayats, mockBooths);
      expect(stateDrill.length).toBe(1);
    });

    it('covers empty aggregation fallbacks and missing mandal data', () => {
      const emptyMandal = aggregatePanchayatsToMandal([], new Map(), 'TS');
      expect(emptyMandal.totalVoters).toBe(0);
      expect(emptyMandal.level).toBe('mandal');

      const emptyAc = aggregateMandalsToConstituency([], new Map());
      expect(emptyAc.totalVoters).toBe(0);
      expect(emptyAc.level).toBe('constituency');

      // Overlap with missing mandal data
      const partialOverlaps: MandalConstituencyOverlap[] = [
        {
          mandalId: 'NON_EXISTENT_MANDAL',
          constituencyId: 'TS-AC-1',
          overlapType: 'partial',
          overlapPercentage: 50,
          panchayatsInAc: 1,
          votersInAc: 500,
        },
      ];
      const partialRes = aggregateMandalsToConstituency(partialOverlaps, new Map());
      expect(partialRes.totalVoters).toBe(0);
    });

    it('covers aggregateBoothResults edge cases (zero voters, empty votes)', () => {
      const emptyResults: BoothElectionResult[] = [
        {
          boothId: 'EMPTY-BOOTH',
          electionYear: 2023,
          constituencyId: 'TS-AC-1',
          totalVotersInRoll: 0,
          votesPolled: 0,
          validVotes: 0,
          rejectedVotes: 0,
          notaVotes: 0,
          turnoutPercent: 0,
          candidateVotes: [],
        },
      ];
      const res = aggregateBoothResults(emptyResults, 'panchayat', () => 'GP-1');
      const gp = res.get('GP-1');
      expect(gp?.turnout).toBe(0);
      expect(gp?.totalVotesPolled).toBe(0);
    });

    it('covers buildHierarchyTree with unmapped booths and empty booths', () => {
      const unmappedBooth: PollingBooth = {
        id: 'TS-AC1-B99',
        boothNumber: 99,
        boothName: 'Unmapped Booth',
        pollingStationName: 'Station 99',
        constituencyId: 'TS-AC-1',
        stateCode: 'TS',
        totalVoters: 500,
        maleVoters: 250,
        femaleVoters: 250,
        thirdGenderVoters: 0,
        isAuxiliary: false,
      };
      const tree = buildHierarchyTree('TS-AC-1', mockMandals, mockPanchayats, [unmappedBooth]);
      expect(tree.id).toBe('TS-AC-1');
      expect(tree.totalVoters).toBe(500);

      const emptyTree = buildHierarchyTree('TS-AC-999', [], [], []);
      expect(emptyTree.totalVoters).toBe(0);
    });

    it('covers all validateAggregation validation check branches and warning/error states', () => {
      // 1. Moderate deviation (between 0.5% and 1%) -> Warning
      const warnBooths: PollingBooth[] = [
        {
          id: 'B1',
          boothNumber: 1,
          boothName: 'B1',
          pollingStationName: 'PS1',
          constituencyId: 'AC-1',
          panchayatId: 'GP-1',
          mandalId: 'M-1',
          stateCode: 'TS',
          totalVoters: 1007,
          maleVoters: 507,
          femaleVoters: 500,
          thirdGenderVoters: 0,
          isAuxiliary: false,
        },
      ];
      const warnVal = validateAggregation('AC-1', warnBooths, 1000);
      expect(warnVal.warnings.length).toBeGreaterThan(0);
      expect(warnVal.errors.length).toBe(0);

      // 2. Severe deviation (> 1%) -> Critical Error
      const errVal = validateAggregation('AC-1', warnBooths, 800);
      expect(errVal.errors.some(e => e.includes('MISMATCH'))).toBe(true);

      // 3. Gender sum mismatch, zero voters, wrong constituency, missing panchayat/mandal
      const defectiveBooths: PollingBooth[] = [
        {
          id: 'DEF-1',
          boothNumber: 1,
          boothName: 'Defective Booth',
          pollingStationName: 'PS',
          constituencyId: 'WRONG-AC',
          stateCode: 'TS',
          totalVoters: 100,
          maleVoters: 40,
          femaleVoters: 40,
          thirdGenderVoters: 0, // 40+40 = 80 !== 100 -> Gender mismatch
          isAuxiliary: false,
        },
        {
          id: 'DEF-2',
          boothNumber: 2,
          boothName: 'Zero Voter Booth',
          pollingStationName: 'PS',
          constituencyId: 'AC-1',
          stateCode: 'TS',
          totalVoters: 0,
          maleVoters: 0,
          femaleVoters: 0,
          thirdGenderVoters: 0, // Zero voters -> booth_completeness warning
          isAuxiliary: false,
        },
      ];
      const defVal = validateAggregation('AC-1', defectiveBooths, 100);
      expect(defVal.errors.some(e => e.includes('gender sum mismatches'))).toBe(true);
      expect(defVal.errors.some(e => e.includes('wrong constituency'))).toBe(true);
      expect(defVal.warnings.some(e => e.includes('zero voters'))).toBe(true);
      expect(defVal.warnings.some(e => e.includes('missing panchayatId'))).toBe(true);
      expect(defVal.warnings.some(e => e.includes('missing mandalId'))).toBe(true);

      // 4. Election results: candidate vote mismatch and vote count deviation checks
      const badResults: BoothElectionResult[] = [
        {
          boothId: 'B1',
          electionYear: 2023,
          constituencyId: 'AC-1',
          totalVotersInRoll: 1000,
          votesPolled: 800,
          validVotes: 800,
          rejectedVotes: 0,
          notaVotes: 0,
          turnoutPercent: 80,
          candidateVotes: [
            { candidateName: 'C1', party: 'INC', votes: 700, isWinnerAtBooth: true }, // 700 !== 800 -> mismatch
          ],
        },
      ];
      // Vote count match warning (deviation between 0.1% and 1%)
      const resValWarn = validateAggregation('AC-1', warnBooths, 1007, badResults, 805);
      expect(resValWarn.errors.some(e => e.includes('candidate vote sum'))).toBe(true);
      expect(resValWarn.warnings.some(e => e.includes('Vote total deviation'))).toBe(true);

      // Vote count match error (deviation > 1%)
      const resValErr = validateAggregation('AC-1', warnBooths, 1007, badResults, 900);
      expect(resValErr.errors.some(e => e.includes('Vote total MISMATCH'))).toBe(true);
    });

    it('covers computeDataIntegrityScore edge cases', () => {
      // Official voter total = 0
      const scoreZero = computeDataIntegrityScore('TS-AC-1', mockBooths, mockPanchayats, mockMandals, 0);
      expect(scoreZero).toBeDefined();

      // Zero booths in constituency
      const scoreNoBooths = computeDataIntegrityScore('NON-AC', [], [], [], 1000);
      expect(scoreNoBooths).toBe(0);
    });
  });
});
