/**
 * Tests for Sprint 14-16: Affidavits, Promises, Aspirants
 * Tests utility functions and type integrity.
 */
import {
  formatINR,
  computeWealthGrowth,
  detectRedFlags,
  EDUCATION_LEVEL_CONFIG,
  RED_FLAG_CONFIG,
  type CandidateAffidavit,
} from '../lib/affidavitTypes';
import {
  computePDI,
  buildReportCard,
  PROMISE_STATUS_CONFIG,
  PROMISE_CATEGORY_CONFIG,
  type ElectionPromise,
} from '../lib/promiseTypes';
import {
  computeCivicScore,
  getCivicLevel,
  BADGE_CONFIG,
  MODULE_CATEGORY_CONFIG,
  CIVIC_LEVEL_CONFIG,
  type AspirantProfile,
} from '../lib/aspirantTypes';

// ─── AFFIDAVIT TYPES TESTS ───

describe('Affidavit Types & Utilities', () => {
  describe('formatINR', () => {
    it('should format lakhs', () => {
      expect(formatINR(500000)).toBe('₹5.0 L');
    });
    it('should format crores', () => {
      expect(formatINR(15000000)).toBe('₹1.5 Cr');
    });
    it('should format zero', () => {
      expect(formatINR(0)).toBe('₹0');
    });
    it('should format thousands', () => {
      expect(formatINR(50000)).toBe('₹50K');
    });
    it('should format large crores', () => {
      // 10 billion → first branch divides by 1_00_00_00_000
      expect(formatINR(10000000000)).toBe('₹10.0 Cr');
      // 1 billion → also hits first branch (equals threshold)
      expect(formatINR(1000000000)).toBe('₹1.0 Cr');
    });
  });

  describe('computeWealthGrowth', () => {
    const prev: CandidateAffidavit = {
      id: 'a1',
      candidateName: 'Test',
      constituencyName: 'Test',
      stateCode: 'TS',
      acNo: 1,
      party: 'INC',
      electionYear: 2018,
      selfMovableAssets: 1000000,
      selfImmovableAssets: 2000000,
      spouseMovableAssets: 500000,
      spouseImmovableAssets: 1000000,
      totalAssets: 4500000,
      totalLiabilities: 100000,
      criminalCases: 0,
      seriousCriminalCases: 0,
      education: 'graduate',
      profession: 'Politician',
      age: 45,
      selfIncome: 500000,
      spouseIncome: 200000,
      isWinner: true,
      filedDate: '2018-11-01',
    };

    const curr: CandidateAffidavit = {
      ...prev,
      id: 'a2',
      electionYear: 2023,
      totalAssets: 13500000,
      selfMovableAssets: 3000000,
      selfImmovableAssets: 6000000,
      spouseMovableAssets: 1500000,
      spouseImmovableAssets: 3000000,
      filedDate: '2023-11-01',
    };

    it('should compute wealth growth between elections', () => {
      const growth = computeWealthGrowth(prev, curr);
      expect(growth.percentGrowth).toBe(200); // (13.5M - 4.5M) / 4.5M * 100
      expect(growth.fromAssets).toBe(4500000);
      expect(growth.toAssets).toBe(13500000);
      expect(growth.absoluteGrowth).toBe(9000000);
      expect(growth.fromYear).toBe(2018);
      expect(growth.toYear).toBe(2023);
    });
  });

  describe('detectRedFlags', () => {
    it('should flag extreme wealth growth', () => {
      const affidavit: CandidateAffidavit = {
        id: 'r1',
        candidateName: 'Test',
        constituencyName: 'Test',
        stateCode: 'TS',
        acNo: 1,
        party: 'INC',
        electionYear: 2023,
        selfMovableAssets: 10000000,
        selfImmovableAssets: 90000000,
        spouseMovableAssets: 0,
        spouseImmovableAssets: 0,
        totalAssets: 100000000,
        totalLiabilities: 0,
        criminalCases: 0,
        seriousCriminalCases: 0,
        education: 'graduate',
        profession: 'Politician',
        age: 55,
        selfIncome: 500000,
        spouseIncome: 0,
        isWinner: true,
        filedDate: '2023-11-01',
      };

      const prevAffidavit: CandidateAffidavit = {
        ...affidavit,
        id: 'r0',
        electionYear: 2018,
        totalAssets: 5000000,
        selfMovableAssets: 2000000,
        selfImmovableAssets: 3000000,
        filedDate: '2018-11-01',
      };

      const flags = detectRedFlags(affidavit, prevAffidavit);
      // Should flag: extreme wealth growth (1900%) + income-asset mismatch + zero liability
      expect(flags.length).toBeGreaterThanOrEqual(2);
      expect(flags.some((f) => f.type === 'extreme_wealth_growth')).toBe(true);
    });

    it('should flag serious criminal cases', () => {
      const affidavit: CandidateAffidavit = {
        id: 'r2',
        candidateName: 'Test Criminal',
        constituencyName: 'Test',
        stateCode: 'TS',
        acNo: 1,
        party: 'BJP',
        electionYear: 2023,
        selfMovableAssets: 1000000,
        selfImmovableAssets: 2000000,
        spouseMovableAssets: 0,
        spouseImmovableAssets: 0,
        totalAssets: 3000000,
        totalLiabilities: 500000,
        criminalCases: 3,
        seriousCriminalCases: 2,
        education: 'graduate',
        profession: 'Politician',
        age: 50,
        selfIncome: 1000000,
        spouseIncome: 0,
        isWinner: false,
        filedDate: '2023-11-01',
      };

      const flags = detectRedFlags(affidavit);
      expect(flags.some((f) => f.type === 'serious_criminal_cases')).toBe(true);
    });

    it('should return no flags for a clean candidate', () => {
      const affidavit: CandidateAffidavit = {
        id: 'r3',
        candidateName: 'Clean Candidate',
        constituencyName: 'Test',
        stateCode: 'TS',
        acNo: 1,
        party: 'INC',
        electionYear: 2023,
        selfMovableAssets: 500000,
        selfImmovableAssets: 1000000,
        spouseMovableAssets: 200000,
        spouseImmovableAssets: 800000,
        totalAssets: 2500000,
        totalLiabilities: 200000,
        criminalCases: 0,
        seriousCriminalCases: 0,
        education: 'graduate',
        profession: 'Social Worker',
        age: 40,
        selfIncome: 800000,
        spouseIncome: 400000,
        isWinner: true,
        filedDate: '2023-11-01',
      };
      const flags = detectRedFlags(affidavit);
      expect(flags.length).toBe(0);
    });
  });

  describe('Config completeness', () => {
    it('should have 10 education levels', () => {
      expect(Object.keys(EDUCATION_LEVEL_CONFIG).length).toBe(10);
    });
    it('should have 5 red flag types', () => {
      expect(Object.keys(RED_FLAG_CONFIG).length).toBe(5);
    });
  });
});

// ─── PROMISE TYPES TESTS ───

describe('Promise Types & Utilities', () => {
  describe('computePDI', () => {
    it('should return 100 for all delivered promises', () => {
      const promises: ElectionPromise[] = [
        { id: '1', stateCode: 'TS', party: 'INC', title: 'T1', description: '', category: 'welfare', source: 'manifesto', promisedDate: '2023-01-01', status: 'delivered', deliveryPercentage: 100, electionYear: 2023, followCount: 0, verificationCount: 0, disputeCount: 0 },
        { id: '2', stateCode: 'TS', party: 'INC', title: 'T2', description: '', category: 'welfare', source: 'manifesto', promisedDate: '2023-01-01', status: 'delivered', deliveryPercentage: 100, electionYear: 2023, followCount: 0, verificationCount: 0, disputeCount: 0 },
      ];
      expect(computePDI(promises)).toBe(100);
    });

    it('should return 0 for all broken promises', () => {
      const promises: ElectionPromise[] = [
        { id: '1', stateCode: 'TS', party: 'INC', title: 'T1', description: '', category: 'welfare', source: 'manifesto', promisedDate: '2023-01-01', status: 'broken', deliveryPercentage: 0, electionYear: 2023, followCount: 0, verificationCount: 0, disputeCount: 0 },
      ];
      expect(computePDI(promises)).toBe(0);
    });

    it('should return 0 for empty array', () => {
      expect(computePDI([])).toBe(0);
    });

    it('should score partially delivered by percentage', () => {
      const promises: ElectionPromise[] = [
        { id: '1', stateCode: 'TS', party: 'INC', title: 'T1', description: '', category: 'welfare', source: 'manifesto', promisedDate: '2023-01-01', status: 'partially_delivered', deliveryPercentage: 60, electionYear: 2023, followCount: 0, verificationCount: 0, disputeCount: 0 },
      ];
      expect(computePDI(promises)).toBe(60);
    });
  });

  describe('buildReportCard', () => {
    const promises: ElectionPromise[] = [
      { id: '1', stateCode: 'TS', party: 'INC', title: 'T1', description: '', category: 'welfare', source: 'manifesto', promisedDate: '2023-01-01', status: 'delivered', deliveryPercentage: 100, electionYear: 2023, followCount: 0, verificationCount: 0, disputeCount: 0 },
      { id: '2', stateCode: 'TS', party: 'INC', title: 'T2', description: '', category: 'infrastructure', source: 'manifesto', promisedDate: '2023-01-01', status: 'broken', deliveryPercentage: 0, electionYear: 2023, followCount: 0, verificationCount: 0, disputeCount: 0 },
      { id: '3', stateCode: 'TS', party: 'INC', title: 'T3', description: '', category: 'education', source: 'manifesto', promisedDate: '2023-01-01', status: 'in_progress', deliveryPercentage: 50, electionYear: 2023, followCount: 0, verificationCount: 0, disputeCount: 0 },
    ];

    it('should return correct total', () => {
      const card = buildReportCard(promises, 'TS', 'INC', 2023);
      expect(card.totalPromises).toBe(3);
    });

    it('should compute status breakdown', () => {
      const card = buildReportCard(promises, 'TS', 'INC', 2023);
      expect(card.statusBreakdown.delivered).toBe(1);
      expect(card.statusBreakdown.broken).toBe(1);
      expect(card.statusBreakdown.in_progress).toBe(1);
    });

    it('should compute category breakdown', () => {
      const card = buildReportCard(promises, 'TS', 'INC', 2023);
      expect(card.categoryBreakdown.welfare).toBe(1);
      expect(card.categoryBreakdown.infrastructure).toBe(1);
      expect(card.categoryBreakdown.education).toBe(1);
    });

    it('should have correct top delivered', () => {
      const card = buildReportCard(promises, 'TS', 'INC', 2023);
      expect(card.topDelivered).toHaveLength(1);
      expect(card.topDelivered[0].title).toBe('T1');
    });

    it('should have correct top broken', () => {
      const card = buildReportCard(promises, 'TS', 'INC', 2023);
      expect(card.topBroken).toHaveLength(1);
      expect(card.topBroken[0].title).toBe('T2');
    });
  });

  describe('Config completeness', () => {
    it('should have 7 promise statuses', () => {
      expect(Object.keys(PROMISE_STATUS_CONFIG).length).toBe(7);
    });
    it('should have 10 promise categories', () => {
      expect(Object.keys(PROMISE_CATEGORY_CONFIG).length).toBe(10);
    });
  });
});

// ─── ASPIRANT TYPES TESTS ───

describe('Aspirant Types & Utilities', () => {
  describe('computeCivicScore', () => {
    it('should compute correct score for active profile', () => {
      const profile = {
        issuesReported: 10,      // 50
        issuesResolved: 5,       // 100
        commentsCount: 20,       // 40
        evidenceSubmitted: 3,    // 30
        promisesTracked: 10,     // 30
        communityEndorsements: 8,// 40
        modulesCompleted: 4,     // 60
        challengesCompleted: 3,  // 30
      };
      const score = computeCivicScore(profile);
      expect(score.totalScore).toBe(380); // 50+100+40+30+30+40+60+30
      expect(score.level).toBe('advocate');
    });

    it('should return observer for zero activity', () => {
      const profile = {
        issuesReported: 0,
        issuesResolved: 0,
        commentsCount: 0,
        evidenceSubmitted: 0,
        promisesTracked: 0,
        communityEndorsements: 0,
        modulesCompleted: 0,
        challengesCompleted: 0,
      };
      const score = computeCivicScore(profile);
      expect(score.totalScore).toBe(0);
      expect(score.level).toBe('observer');
    });

    it('should return champion for very active profile', () => {
      const profile = {
        issuesReported: 50,      // 250
        issuesResolved: 20,      // 400
        commentsCount: 50,       // 100
        evidenceSubmitted: 10,   // 100
        promisesTracked: 20,     // 60
        communityEndorsements: 30,// 150
        modulesCompleted: 10,    // 150
        challengesCompleted: 10, // 100
      };
      const score = computeCivicScore(profile);
      expect(score.totalScore).toBe(1310);
      expect(score.level).toBe('champion');
    });
  });

  describe('getCivicLevel', () => {
    it('should return correct levels', () => {
      expect(getCivicLevel(0)).toBe('observer');
      expect(getCivicLevel(99)).toBe('observer');
      expect(getCivicLevel(100)).toBe('contributor');
      expect(getCivicLevel(299)).toBe('contributor');
      expect(getCivicLevel(300)).toBe('advocate');
      expect(getCivicLevel(599)).toBe('advocate');
      expect(getCivicLevel(600)).toBe('leader');
      expect(getCivicLevel(999)).toBe('leader');
      expect(getCivicLevel(1000)).toBe('champion');
      expect(getCivicLevel(5000)).toBe('champion');
    });
  });

  describe('Config completeness', () => {
    it('should have 13 badge types', () => {
      expect(Object.keys(BADGE_CONFIG).length).toBe(13);
    });
    it('should have 8 module categories', () => {
      expect(Object.keys(MODULE_CATEGORY_CONFIG).length).toBe(8);
    });
    it('should have 5 civic levels', () => {
      expect(Object.keys(CIVIC_LEVEL_CONFIG).length).toBe(5);
    });
  });
});
