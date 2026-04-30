/**
 * Election Affidavit types for Candidate Transparency.
 * Mirrors the Supabase schema from 008_election_affidavits.sql.
 * Data sourced from MyNeta/ADR and ECI filings.
 */

export type EducationLevel =
  | 'illiterate'
  | '5th_pass'
  | '8th_pass'
  | '10th_pass'
  | '12th_pass'
  | 'graduate'
  | 'post_graduate'
  | 'doctorate'
  | 'professional'
  | 'others';

export type CaseStatus = 'pending' | 'convicted' | 'acquitted';

export interface CriminalCaseDetail {
  caseNo: string;
  court: string;
  ipcSections: string[];
  status: CaseStatus;
  description: string;
}

export interface CandidateAffidavit {
  id: string;
  candidateName: string;
  acNo: number;
  constituencyName: string;
  stateCode: string;
  party: string;
  electionYear: number;

  // Assets (in INR)
  selfMovableAssets: number;
  selfImmovableAssets: number;
  spouseMovableAssets: number;
  spouseImmovableAssets: number;
  totalAssets: number;

  // Liabilities
  totalLiabilities: number;

  // Criminal
  criminalCases: number;
  seriousCriminalCases: number;
  caseDetails?: CriminalCaseDetail[];

  // Personal
  education: EducationLevel;
  profession: string;
  age: number;
  selfIncome: number;
  spouseIncome: number;

  // Source
  sourceUrl?: string;
  filedDate?: string;
  isWinner: boolean;
}

/** Computed wealth growth between two election filings */
export interface WealthGrowth {
  candidateName: string;
  fromYear: number;
  toYear: number;
  fromAssets: number;
  toAssets: number;
  absoluteGrowth: number;
  percentGrowth: number;
  years: number;
  annualizedGrowth: number;
}

/** Constituency-level integrity metrics */
export interface ConstituencyIntegrity {
  acNo: number;
  constituencyName: string;
  stateCode: string;
  totalCandidates: number;
  candidatesWithCases: number;
  candidatesWithSeriousCases: number;
  averageAssets: number;
  medianEducation: EducationLevel;
  integrityScore: number; // 0-100
}

/** Red flag types for anomaly detection */
export type RedFlagType =
  | 'extreme_wealth_growth'
  | 'serious_criminal_cases'
  | 'zero_liability_anomaly'
  | 'income_asset_mismatch'
  | 'education_mismatch';

export interface AffidavitRedFlag {
  type: RedFlagType;
  severity: 'warning' | 'critical';
  description: string;
  value?: string;
}

// ─── CONFIGS ───

export const EDUCATION_LEVEL_CONFIG: Record<EducationLevel, { label: string; rank: number }> = {
  illiterate: { label: 'Illiterate', rank: 0 },
  '5th_pass': { label: '5th Pass', rank: 1 },
  '8th_pass': { label: '8th Pass', rank: 2 },
  '10th_pass': { label: '10th Pass', rank: 3 },
  '12th_pass': { label: '12th Pass', rank: 4 },
  graduate: { label: 'Graduate', rank: 5 },
  post_graduate: { label: 'Post Graduate', rank: 6 },
  doctorate: { label: 'Doctorate', rank: 7 },
  professional: { label: 'Professional', rank: 8 },
  others: { label: 'Others', rank: 3 },
};

export const RED_FLAG_CONFIG: Record<RedFlagType, { icon: string; color: string; label: string }> = {
  extreme_wealth_growth: { icon: 'trending-up', color: '#F59E0B', label: 'Extreme Wealth Growth' },
  serious_criminal_cases: { icon: 'alert-circle', color: '#EF4444', label: 'Serious Criminal Cases' },
  zero_liability_anomaly: { icon: 'help-circle', color: '#F97316', label: 'Zero Liability Anomaly' },
  income_asset_mismatch: { icon: 'swap-horizontal', color: '#8B5CF6', label: 'Income-Asset Mismatch' },
  education_mismatch: { icon: 'school', color: '#6B7280', label: 'Education Mismatch' },
};

// ─── UTILITY FUNCTIONS ───

/** Format INR amount in human-readable form */
export function formatINR(amount: number): string {
  if (amount >= 1_00_00_00_000) return `₹${(amount / 1_00_00_00_000).toFixed(1)} Cr`;
  if (amount >= 1_00_00_000) return `₹${(amount / 1_00_00_000).toFixed(1)} Cr`;
  if (amount >= 1_00_000) return `₹${(amount / 1_00_000).toFixed(1)} L`;
  if (amount >= 1_000) return `₹${(amount / 1_000).toFixed(0)}K`;
  return `₹${amount}`;
}

/** Compute wealth growth between two affidavits of the same candidate */
export function computeWealthGrowth(older: CandidateAffidavit, newer: CandidateAffidavit): WealthGrowth {
  const years = newer.electionYear - older.electionYear;
  const absoluteGrowth = newer.totalAssets - older.totalAssets;
  const percentGrowth = older.totalAssets > 0 ? (absoluteGrowth / older.totalAssets) * 100 : 0;
  const annualizedGrowth = years > 0 && older.totalAssets > 0
    ? (Math.pow(newer.totalAssets / older.totalAssets, 1 / years) - 1) * 100
    : 0;

  return {
    candidateName: newer.candidateName,
    fromYear: older.electionYear,
    toYear: newer.electionYear,
    fromAssets: older.totalAssets,
    toAssets: newer.totalAssets,
    absoluteGrowth,
    percentGrowth,
    years,
    annualizedGrowth,
  };
}

/** Detect red flags in an affidavit */
export function detectRedFlags(
  affidavit: CandidateAffidavit,
  previousAffidavit?: CandidateAffidavit,
): AffidavitRedFlag[] {
  const flags: AffidavitRedFlag[] = [];

  // Serious criminal cases
  if (affidavit.seriousCriminalCases > 0) {
    flags.push({
      type: 'serious_criminal_cases',
      severity: 'critical',
      description: `${affidavit.seriousCriminalCases} serious criminal case${affidavit.seriousCriminalCases > 1 ? 's' : ''} (IPC sections with 5+ year sentence)`,
      value: `${affidavit.seriousCriminalCases} cases`,
    });
  }

  // Extreme wealth growth
  if (previousAffidavit) {
    const growth = computeWealthGrowth(previousAffidavit, affidavit);
    if (growth.percentGrowth > 500) {
      flags.push({
        type: 'extreme_wealth_growth',
        severity: growth.percentGrowth > 1000 ? 'critical' : 'warning',
        description: `Assets grew ${growth.percentGrowth.toFixed(0)}% in ${growth.years} years (${formatINR(growth.fromAssets)} → ${formatINR(growth.toAssets)})`,
        value: `${growth.percentGrowth.toFixed(0)}%`,
      });
    }
  }

  // Zero liability anomaly
  if (affidavit.totalAssets > 5_00_00_000 && affidavit.totalLiabilities === 0) {
    flags.push({
      type: 'zero_liability_anomaly',
      severity: 'warning',
      description: `Declares ${formatINR(affidavit.totalAssets)} in assets but zero liabilities`,
    });
  }

  // Income-asset mismatch
  const totalIncome = affidavit.selfIncome + affidavit.spouseIncome;
  if (totalIncome > 0 && affidavit.totalAssets > totalIncome * 50) {
    flags.push({
      type: 'income_asset_mismatch',
      severity: 'warning',
      description: `Assets (${formatINR(affidavit.totalAssets)}) are ${Math.round(affidavit.totalAssets / totalIncome)}x declared annual income (${formatINR(totalIncome)})`,
    });
  }

  return flags;
}
