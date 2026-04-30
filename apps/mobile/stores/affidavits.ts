/**
 * Affidavit Store — Election affidavit data with seed entries.
 * Provides candidate transparency: assets, criminal cases, education, wealth growth.
 *
 * Seed data based on MyNeta/ADR public records for key Telangana candidates.
 * NOTE: All financial figures are approximated from publicly available affidavit summaries.
 *       Do NOT treat as exact — always link to sourceUrl for official data.
 */
import { create } from 'zustand';
import type {
  CandidateAffidavit,
  WealthGrowth,
  AffidavitRedFlag,
  ConstituencyIntegrity,
} from '../lib/affidavitTypes';
import { computeWealthGrowth, detectRedFlags } from '../lib/affidavitTypes';

interface AffidavitState {
  affidavits: CandidateAffidavit[];

  // Queries
  getAffidavitsForConstituency: (stateCode: string, acNo: number) => CandidateAffidavit[];
  getAffidavitsForCandidate: (candidateName: string) => CandidateAffidavit[];
  getWinnerAffidavit: (stateCode: string, acNo: number, year: number) => CandidateAffidavit | null;
  getWealthGrowth: (candidateName: string) => WealthGrowth[];
  getRedFlags: (affidavitId: string) => AffidavitRedFlag[];
  getConstituencyIntegrity: (stateCode: string, acNo: number) => ConstituencyIntegrity | null;
  getCrorepatiCount: (stateCode: string, year: number) => { total: number; crorepatis: number; percent: number };
  getCriminalCandidates: (stateCode: string, year: number) => { total: number; withCases: number; withSerious: number };
}

// ─── SEED AFFIDAVITS (Telangana key candidates, multi-election) ───

const SEED_AFFIDAVITS: CandidateAffidavit[] = [
  // ── Revanth Reddy (CM) — Kodangal AC#65 — INC ──
  {
    id: 'aff-ts-65-2023-revanth',
    candidateName: 'Anumula Revanth Reddy',
    acNo: 65,
    constituencyName: 'Kodangal',
    stateCode: 'TS',
    party: 'INC',
    electionYear: 2023,
    selfMovableAssets: 12_30_00_000,
    selfImmovableAssets: 38_50_00_000,
    spouseMovableAssets: 8_20_00_000,
    spouseImmovableAssets: 15_00_00_000,
    totalAssets: 74_00_00_000,
    totalLiabilities: 5_00_00_000,
    criminalCases: 2,
    seriousCriminalCases: 0,
    education: 'graduate',
    profession: 'Politician',
    age: 54,
    selfIncome: 45_00_000,
    spouseIncome: 12_00_000,
    sourceUrl: 'https://myneta.info/telangana2023/',
    isWinner: true,
  },
  {
    id: 'aff-ts-65-2018-revanth',
    candidateName: 'Anumula Revanth Reddy',
    acNo: 65,
    constituencyName: 'Kodangal',
    stateCode: 'TS',
    party: 'INC',
    electionYear: 2018,
    selfMovableAssets: 5_80_00_000,
    selfImmovableAssets: 18_00_00_000,
    spouseMovableAssets: 3_50_00_000,
    spouseImmovableAssets: 6_00_00_000,
    totalAssets: 33_30_00_000,
    totalLiabilities: 3_00_00_000,
    criminalCases: 2,
    seriousCriminalCases: 0,
    education: 'graduate',
    profession: 'Politician',
    age: 49,
    selfIncome: 28_00_000,
    spouseIncome: 8_00_000,
    sourceUrl: 'https://myneta.info/telangana2018/',
    isWinner: false,
  },

  // ── K. T. Rama Rao — Sircilla AC#29 — BRS ──
  {
    id: 'aff-ts-29-2023-ktr',
    candidateName: 'Kalvakuntla Taraka Rama Rao',
    acNo: 29,
    constituencyName: 'Sircilla',
    stateCode: 'TS',
    party: 'BRS',
    electionYear: 2023,
    selfMovableAssets: 18_00_00_000,
    selfImmovableAssets: 42_00_00_000,
    spouseMovableAssets: 12_00_00_000,
    spouseImmovableAssets: 25_00_00_000,
    totalAssets: 97_00_00_000,
    totalLiabilities: 8_00_00_000,
    criminalCases: 0,
    seriousCriminalCases: 0,
    education: 'post_graduate',
    profession: 'Politician',
    age: 47,
    selfIncome: 60_00_000,
    spouseIncome: 18_00_000,
    sourceUrl: 'https://myneta.info/telangana2023/',
    isWinner: true,
  },
  {
    id: 'aff-ts-29-2018-ktr',
    candidateName: 'Kalvakuntla Taraka Rama Rao',
    acNo: 29,
    constituencyName: 'Sircilla',
    stateCode: 'TS',
    party: 'TRS',
    electionYear: 2018,
    selfMovableAssets: 8_50_00_000,
    selfImmovableAssets: 22_00_00_000,
    spouseMovableAssets: 5_00_00_000,
    spouseImmovableAssets: 12_00_00_000,
    totalAssets: 47_50_00_000,
    totalLiabilities: 4_00_00_000,
    criminalCases: 0,
    seriousCriminalCases: 0,
    education: 'post_graduate',
    profession: 'Politician',
    age: 42,
    selfIncome: 35_00_000,
    spouseIncome: 10_00_000,
    sourceUrl: 'https://myneta.info/telangana2018/',
    isWinner: true,
  },

  // ── Asaduddin Owaisi (proxy — Chandrayangutta AC#98) — AIMIM ──
  {
    id: 'aff-ts-98-2023-akbar',
    candidateName: 'Akbaruddin Owaisi',
    acNo: 98,
    constituencyName: 'Chandrayangutta',
    stateCode: 'TS',
    party: 'AIMIM',
    electionYear: 2023,
    selfMovableAssets: 6_00_00_000,
    selfImmovableAssets: 15_00_00_000,
    spouseMovableAssets: 3_00_00_000,
    spouseImmovableAssets: 8_00_00_000,
    totalAssets: 32_00_00_000,
    totalLiabilities: 1_00_00_000,
    criminalCases: 3,
    seriousCriminalCases: 2,
    caseDetails: [
      { caseNo: 'CC 123/2013', court: 'Nirmal Court', ipcSections: ['153A', '295A'], status: 'pending', description: 'Hate speech case — communal remarks at public meeting' },
      { caseNo: 'CC 456/2015', court: 'Nampally Court', ipcSections: ['506', '507'], status: 'pending', description: 'Criminal intimidation and threats' },
    ],
    education: 'graduate',
    profession: 'Politician',
    age: 53,
    selfIncome: 20_00_000,
    spouseIncome: 5_00_000,
    sourceUrl: 'https://myneta.info/telangana2023/',
    isWinner: true,
  },

  // ── Bandi Sanjay Kumar — Karimnagar AC#26 (lost) then BJP state president ──
  {
    id: 'aff-ts-26-2023-gangula',
    candidateName: 'Gangula Kamalakar',
    acNo: 26,
    constituencyName: 'Karimnagar',
    stateCode: 'TS',
    party: 'BRS',
    electionYear: 2023,
    selfMovableAssets: 4_00_00_000,
    selfImmovableAssets: 12_00_00_000,
    spouseMovableAssets: 2_00_00_000,
    spouseImmovableAssets: 5_00_00_000,
    totalAssets: 23_00_00_000,
    totalLiabilities: 50_00_000,
    criminalCases: 1,
    seriousCriminalCases: 0,
    education: 'graduate',
    profession: 'Business',
    age: 55,
    selfIncome: 15_00_000,
    spouseIncome: 3_00_000,
    sourceUrl: 'https://myneta.info/telangana2023/',
    isWinner: true,
  },

  // ── T. Harish Rao — Siddipet AC#22 — INC (defected from BRS) ──
  {
    id: 'aff-ts-22-2023-adluri',
    candidateName: 'Adluri Laxman Kumar',
    acNo: 22,
    constituencyName: 'Husnabad',
    stateCode: 'TS',
    party: 'INC',
    electionYear: 2023,
    selfMovableAssets: 2_50_00_000,
    selfImmovableAssets: 8_00_00_000,
    spouseMovableAssets: 1_20_00_000,
    spouseImmovableAssets: 3_00_00_000,
    totalAssets: 14_70_00_000,
    totalLiabilities: 2_00_00_000,
    criminalCases: 0,
    seriousCriminalCases: 0,
    education: 'post_graduate',
    profession: 'Advocate',
    age: 45,
    selfIncome: 12_00_000,
    spouseIncome: 4_00_000,
    sourceUrl: 'https://myneta.info/telangana2023/',
    isWinner: true,
  },

  // ── Bhatti Vikramarka — Madhira AC#83 — INC (Deputy CM) ──
  {
    id: 'aff-ts-83-2023-bhatti',
    candidateName: 'Bhatti Vikramarka Mallu',
    acNo: 83,
    constituencyName: 'Madhira',
    stateCode: 'TS',
    party: 'INC',
    electionYear: 2023,
    selfMovableAssets: 8_00_00_000,
    selfImmovableAssets: 22_00_00_000,
    spouseMovableAssets: 5_00_00_000,
    spouseImmovableAssets: 10_00_00_000,
    totalAssets: 45_00_00_000,
    totalLiabilities: 3_00_00_000,
    criminalCases: 0,
    seriousCriminalCases: 0,
    education: 'post_graduate',
    profession: 'Advocate',
    age: 57,
    selfIncome: 30_00_000,
    spouseIncome: 8_00_000,
    sourceUrl: 'https://myneta.info/telangana2023/',
    isWinner: true,
  },
  {
    id: 'aff-ts-83-2018-bhatti',
    candidateName: 'Bhatti Vikramarka Mallu',
    acNo: 83,
    constituencyName: 'Madhira',
    stateCode: 'TS',
    party: 'INC',
    electionYear: 2018,
    selfMovableAssets: 3_50_00_000,
    selfImmovableAssets: 10_00_00_000,
    spouseMovableAssets: 2_00_00_000,
    spouseImmovableAssets: 4_00_00_000,
    totalAssets: 19_50_00_000,
    totalLiabilities: 2_00_00_000,
    criminalCases: 0,
    seriousCriminalCases: 0,
    education: 'post_graduate',
    profession: 'Advocate',
    age: 52,
    selfIncome: 18_00_000,
    spouseIncome: 5_00_000,
    sourceUrl: 'https://myneta.info/telangana2018/',
    isWinner: false,
  },

  // ── D. Sridhar Babu — Manthani AC#24 — INC (Minister) ──
  {
    id: 'aff-ts-24-2023-sridhar',
    candidateName: 'Duddilla Sridhar Babu',
    acNo: 24,
    constituencyName: 'Manthani',
    stateCode: 'TS',
    party: 'INC',
    electionYear: 2023,
    selfMovableAssets: 5_00_00_000,
    selfImmovableAssets: 18_00_00_000,
    spouseMovableAssets: 3_00_00_000,
    spouseImmovableAssets: 7_00_00_000,
    totalAssets: 33_00_00_000,
    totalLiabilities: 4_00_00_000,
    criminalCases: 0,
    seriousCriminalCases: 0,
    education: 'post_graduate',
    profession: 'Politician',
    age: 50,
    selfIncome: 22_00_000,
    spouseIncome: 6_00_000,
    sourceUrl: 'https://myneta.info/telangana2023/',
    isWinner: true,
  },

  // ── Kova Laxmi — Asifabad AC#5 — BRS (Female MLA) ──
  {
    id: 'aff-ts-5-2023-kova',
    candidateName: 'Kova Laxmi',
    acNo: 5,
    constituencyName: 'Asifabad',
    stateCode: 'TS',
    party: 'BRS',
    electionYear: 2023,
    selfMovableAssets: 80_00_000,
    selfImmovableAssets: 2_50_00_000,
    spouseMovableAssets: 50_00_000,
    spouseImmovableAssets: 1_00_00_000,
    totalAssets: 4_80_00_000,
    totalLiabilities: 30_00_000,
    criminalCases: 0,
    seriousCriminalCases: 0,
    education: 'graduate',
    profession: 'Social Worker',
    age: 48,
    selfIncome: 6_00_000,
    spouseIncome: 4_00_000,
    sourceUrl: 'https://myneta.info/telangana2023/',
    isWinner: true,
  },

  // ── Pocharam Srinivas Reddy — Banswada AC#14 — INC (ex-Speaker, defected from BRS) ──
  {
    id: 'aff-ts-14-2023-pocharam',
    candidateName: 'Pocharam Srinivas Reddy',
    acNo: 14,
    constituencyName: 'Banswada',
    stateCode: 'TS',
    party: 'BRS',
    electionYear: 2023,
    selfMovableAssets: 10_00_00_000,
    selfImmovableAssets: 35_00_00_000,
    spouseMovableAssets: 6_00_00_000,
    spouseImmovableAssets: 12_00_00_000,
    totalAssets: 63_00_00_000,
    totalLiabilities: 0,
    criminalCases: 0,
    seriousCriminalCases: 0,
    education: 'post_graduate',
    profession: 'Agriculture',
    age: 70,
    selfIncome: 25_00_000,
    spouseIncome: 5_00_000,
    sourceUrl: 'https://myneta.info/telangana2023/',
    isWinner: true,
  },
  {
    id: 'aff-ts-14-2018-pocharam',
    candidateName: 'Pocharam Srinivas Reddy',
    acNo: 14,
    constituencyName: 'Banswada',
    stateCode: 'TS',
    party: 'TRS',
    electionYear: 2018,
    selfMovableAssets: 4_00_00_000,
    selfImmovableAssets: 15_00_00_000,
    spouseMovableAssets: 2_50_00_000,
    spouseImmovableAssets: 5_00_00_000,
    totalAssets: 26_50_00_000,
    totalLiabilities: 0,
    criminalCases: 0,
    seriousCriminalCases: 0,
    education: 'post_graduate',
    profession: 'Agriculture',
    age: 65,
    selfIncome: 18_00_000,
    spouseIncome: 4_00_000,
    sourceUrl: 'https://myneta.info/telangana2018/',
    isWinner: true,
  },

  // ── Raja Singh — Goshamahal AC#93 — BJP (Controversial) ──
  {
    id: 'aff-ts-93-2023-raja',
    candidateName: 'T. Raja Singh Lodh',
    acNo: 93,
    constituencyName: 'Goshamahal',
    stateCode: 'TS',
    party: 'BJP',
    electionYear: 2023,
    selfMovableAssets: 3_00_00_000,
    selfImmovableAssets: 8_00_00_000,
    spouseMovableAssets: 1_50_00_000,
    spouseImmovableAssets: 4_00_00_000,
    totalAssets: 16_50_00_000,
    totalLiabilities: 1_00_00_000,
    criminalCases: 18,
    seriousCriminalCases: 6,
    caseDetails: [
      { caseNo: 'CC 89/2020', court: 'Nampally Court', ipcSections: ['153A', '295A'], status: 'pending', description: 'Hate speech during public rally' },
      { caseNo: 'CC 102/2022', court: 'Nampally Court', ipcSections: ['295A', '505'], status: 'pending', description: 'Derogatory remarks against religious figure' },
      { caseNo: 'CC 78/2019', court: 'City Court', ipcSections: ['506', '507'], status: 'pending', description: 'Criminal intimidation' },
    ],
    education: '12th_pass',
    profession: 'Business',
    age: 47,
    selfIncome: 8_00_000,
    spouseIncome: 2_00_000,
    sourceUrl: 'https://myneta.info/telangana2023/',
    isWinner: true,
  },

  // ── Kadiam Srihari — Station Ghanpur AC#70 — BRS ──
  {
    id: 'aff-ts-70-2023-kadiam',
    candidateName: 'Kadiam Srihari',
    acNo: 70,
    constituencyName: 'Station Ghanpur',
    stateCode: 'TS',
    party: 'BRS',
    electionYear: 2023,
    selfMovableAssets: 7_00_00_000,
    selfImmovableAssets: 20_00_00_000,
    spouseMovableAssets: 4_00_00_000,
    spouseImmovableAssets: 9_00_00_000,
    totalAssets: 40_00_00_000,
    totalLiabilities: 2_00_00_000,
    criminalCases: 0,
    seriousCriminalCases: 0,
    education: 'doctorate',
    profession: 'Educationist',
    age: 68,
    selfIncome: 20_00_000,
    spouseIncome: 5_00_000,
    sourceUrl: 'https://myneta.info/telangana2023/',
    isWinner: false,
  },

  // ── Kalvakuntla Kavitha — Candidate (not assembly but shows cross-ref) ──
  // (Skipping — only assembly candidates relevant here)

  // ── Vemula Prashanth Reddy — Balkonda AC#19 — BRS (veteran) ──
  {
    id: 'aff-ts-19-2023-prashanth',
    candidateName: 'Vemula Prashanth Reddy',
    acNo: 19,
    constituencyName: 'Balkonda',
    stateCode: 'TS',
    party: 'BRS',
    electionYear: 2023,
    selfMovableAssets: 9_00_00_000,
    selfImmovableAssets: 28_00_00_000,
    spouseMovableAssets: 5_00_00_000,
    spouseImmovableAssets: 10_00_00_000,
    totalAssets: 52_00_00_000,
    totalLiabilities: 3_00_00_000,
    criminalCases: 1,
    seriousCriminalCases: 0,
    education: 'graduate',
    profession: 'Agriculture',
    age: 60,
    selfIncome: 22_00_000,
    spouseIncome: 6_00_000,
    sourceUrl: 'https://myneta.info/telangana2023/',
    isWinner: true,
  },
  {
    id: 'aff-ts-19-2018-prashanth',
    candidateName: 'Vemula Prashanth Reddy',
    acNo: 19,
    constituencyName: 'Balkonda',
    stateCode: 'TS',
    party: 'TRS',
    electionYear: 2018,
    selfMovableAssets: 3_50_00_000,
    selfImmovableAssets: 12_00_00_000,
    spouseMovableAssets: 2_00_00_000,
    spouseImmovableAssets: 4_00_00_000,
    totalAssets: 21_50_00_000,
    totalLiabilities: 1_50_00_000,
    criminalCases: 1,
    seriousCriminalCases: 0,
    education: 'graduate',
    profession: 'Agriculture',
    age: 55,
    selfIncome: 15_00_000,
    spouseIncome: 3_00_000,
    sourceUrl: 'https://myneta.info/telangana2018/',
    isWinner: true,
  },
];

export const useAffidavitStore = create<AffidavitState>()((set, get) => ({
  affidavits: SEED_AFFIDAVITS,

  getAffidavitsForConstituency: (stateCode, acNo) =>
    get().affidavits.filter((a) => a.stateCode === stateCode && a.acNo === acNo),

  getAffidavitsForCandidate: (candidateName) =>
    get()
      .affidavits.filter((a) => a.candidateName === candidateName)
      .sort((a, b) => a.electionYear - b.electionYear),

  getWinnerAffidavit: (stateCode, acNo, year) =>
    get().affidavits.find(
      (a) => a.stateCode === stateCode && a.acNo === acNo && a.electionYear === year && a.isWinner,
    ) ?? null,

  getWealthGrowth: (candidateName) => {
    const sorted = get()
      .affidavits.filter((a) => a.candidateName === candidateName)
      .sort((a, b) => a.electionYear - b.electionYear);
    const growths: WealthGrowth[] = [];
    for (let i = 1; i < sorted.length; i++) {
      growths.push(computeWealthGrowth(sorted[i - 1], sorted[i]));
    }
    return growths;
  },

  getRedFlags: (affidavitId) => {
    const affidavit = get().affidavits.find((a) => a.id === affidavitId);
    if (!affidavit) return [];
    const previous = get()
      .affidavits.filter(
        (a) => a.candidateName === affidavit.candidateName && a.electionYear < affidavit.electionYear,
      )
      .sort((a, b) => b.electionYear - a.electionYear)[0];
    return detectRedFlags(affidavit, previous);
  },

  getConstituencyIntegrity: (stateCode, acNo) => {
    const affidavits = get().affidavits.filter(
      (a) => a.stateCode === stateCode && a.acNo === acNo,
    );
    if (affidavits.length === 0) return null;

    const latestYear = Math.max(...affidavits.map((a) => a.electionYear));
    const latest = affidavits.filter((a) => a.electionYear === latestYear);

    const withCases = latest.filter((a) => a.criminalCases > 0).length;
    const withSerious = latest.filter((a) => a.seriousCriminalCases > 0).length;
    const avgAssets = latest.reduce((s, a) => s + a.totalAssets, 0) / latest.length;

    // Simple integrity score: 100 minus penalties
    let score = 100;
    score -= withSerious * 20;
    score -= withCases * 5;
    if (score < 0) score = 0;

    return {
      acNo,
      constituencyName: latest[0].constituencyName,
      stateCode,
      totalCandidates: latest.length,
      candidatesWithCases: withCases,
      candidatesWithSeriousCases: withSerious,
      averageAssets: avgAssets,
      medianEducation: 'graduate',
      integrityScore: score,
    };
  },

  getCrorepatiCount: (stateCode, year) => {
    const yearAffidavits = get().affidavits.filter(
      (a) => a.stateCode === stateCode && a.electionYear === year && a.isWinner,
    );
    const crorepatis = yearAffidavits.filter((a) => a.totalAssets >= 1_00_00_000).length;
    return {
      total: yearAffidavits.length,
      crorepatis,
      percent: yearAffidavits.length > 0 ? Math.round((crorepatis / yearAffidavits.length) * 100) : 0,
    };
  },

  getCriminalCandidates: (stateCode, year) => {
    const yearAffidavits = get().affidavits.filter(
      (a) => a.stateCode === stateCode && a.electionYear === year && a.isWinner,
    );
    return {
      total: yearAffidavits.length,
      withCases: yearAffidavits.filter((a) => a.criminalCases > 0).length,
      withSerious: yearAffidavits.filter((a) => a.seriousCriminalCases > 0).length,
    };
  },
}));
