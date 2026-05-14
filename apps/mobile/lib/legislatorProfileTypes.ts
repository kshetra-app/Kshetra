/**
 * Master Legislator Profile — Unified schema for MLA, MP (LS/RS), MLC
 * ═══════════════════════════════════════════════════════════════════════
 * Version 1.0 — Designed for researchers, historians, and citizens.
 * Covers every data point scraped from MyNeta, PRS India, Wikipedia,
 * ECI, Sansad.in, and data.gov.in.
 *
 * See LEGISLATOR_PROFILE_TEMPLATE.md in project root for full spec.
 */

// ─── Enums ─────────────────────────────────────────────────────────────

export type HouseType =
  | 'state_assembly'   // MLA
  | 'lok_sabha'        // MP — Lower House
  | 'rajya_sabha'      // MP — Upper House
  | 'state_council';   // MLC

export type Gender = 'male' | 'female' | 'other';

export type MaritalStatus = 'single' | 'married' | 'widowed' | 'divorced' | 'separated';

export type ReservationCategory = 'general' | 'sc' | 'st';

export type EducationLevel =
  | 'illiterate' | '5th_pass' | '8th_pass' | '10th_pass' | '12th_pass'
  | 'graduate' | 'post_graduate' | 'doctorate' | 'professional' | 'others';

export type CaseStatus = 'pending' | 'convicted' | 'acquitted' | 'discharged';

export type ElectionType = 'assembly' | 'lok_sabha' | 'rajya_sabha' | 'by_election';

export type ElectionResult = 'won' | 'lost' | 'forfeited_deposit';

export type VerificationStatus = 'verified' | 'partial' | 'unverified';

export type Trend = 'increasing' | 'decreasing' | 'stable';

export type RiskLevel = 'low' | 'medium' | 'high';

export type MLCType =
  | 'graduates' | 'teachers' | 'local_authority'
  | 'assembly_elected' | 'governor_nominated';

// ─── Section 1: Identity & Personal ────────────────────────────────────

export interface PhotoSources {
  myneta?: string;
  prs?: string;
  wikipedia?: string;
  legislature?: string;
  sansad?: string;
}

export interface PersonalInfo {
  fullName: string;
  displayName: string;
  aliases: string[];
  gender: Gender;
  dob: string | null;                     // YYYY-MM-DD
  ageAtElection: number | null;
  currentAge: number | null;
  religion?: string;
  caste?: ReservationCategory;
  maritalStatus?: MaritalStatus;
  spouseName?: string;
  dependents?: number;
  photoUrl: string | null;                // Best available
  photoSources: PhotoSources;
}

// ─── Section 2: Political Career ───────────────────────────────────────

export interface PartySwitch {
  party: string;
  fromYear: number;
  toYear: number | null;                  // null = current
  reason?: string;                        // 'defection' | 'merger' | 'ideological' | 'expelled'
}

export interface PoliticalCareer {
  house: HouseType;
  stateCode: string;
  stateName: string;
  constituencyName: string;
  constituencyNumber: number;
  constituencyType: ReservationCategory;
  district: string;
  currentParty: string;                   // Abbreviated (e.g., "INC")
  currentPartyFull: string;               // Full name
  previousParties: PartySwitch[];
  termsServed: number;
  firstElectedYear: number;
  isCurrentMember: boolean;
  isCabinetMinister: boolean;
  ministerialPortfolio?: string;
  isChiefMinister: boolean;
  isOppositionLeader: boolean;
  committeeMemberships: string[];
  specialPositions: string[];             // Speaker, Whip, etc.
}

// ─── Section 3: Election History ───────────────────────────────────────

export interface ElectionRecord {
  electionYear: number;
  electionType: ElectionType;
  electionKey: string;                    // MyNeta key (e.g., 'Telangana2023')
  stateCode: string;
  constituencyName: string;
  constituencyNumber: number;
  party: string;
  result: ElectionResult;
  votesReceived: number;
  evmVotes?: number;
  postalVotes?: number;
  voteShare: number;                      // Percentage
  margin: number;                         // Win/loss margin
  totalVoters: number;
  turnoutPercent: number;
  rank: number;                           // 1 = winner
  totalCandidates: number;
  runnerUp?: string;
  runnerUpParty?: string;
  runnerUpVotes?: number;
}

// ─── Section 4: Financial Disclosure ───────────────────────────────────

export interface FinancialRecord {
  electionYear: number;
  electionKey: string;
  selfMovableAssets: number;
  selfImmovableAssets: number;
  spouseMovableAssets: number;
  spouseImmovableAssets: number;
  dependentsAssets: number;
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;                       // totalAssets - totalLiabilities
  selfIncome: number;
  spouseIncome: number;
  totalIncome: number;
  isCrorepati: boolean;                   // totalAssets >= 1Cr
  wealthGrowth?: {
    fromYear: number;
    toYear: number;
    percentGrowth: number;
    annualizedGrowth: number;
  };
  sourceUrl: string;
  affidavitFiledDate?: string;
}

// ─── Section 5: Criminal Record ────────────────────────────────────────

export interface CriminalCase {
  caseNo: string;
  court: string;
  ipcSections: string[];
  otherActs: string[];                    // Prevention of Corruption, NDPS, etc.
  status: CaseStatus;
  chargesFramed: boolean;
  cognizanceYear?: number;
  description: string;
  isSeriousIPC: boolean;                  // IPC 302, 307, 376, 420, etc.
}

export interface CriminalRecord {
  hasCriminalCases: boolean;
  totalCases: number;
  seriousCases: number;
  convictions: number;
  caseDetails: CriminalCase[];
}

// ─── Section 6: Education & Profession ─────────────────────────────────

export interface EducationInfo {
  educationLevel: EducationLevel;
  educationCategory: string;              // Raw MyNeta category
  educationDetail?: string;               // Specific qualification
  selfProfession: string;
  spouseProfession?: string;
  otherActivities: string[];              // NGOs, trusts, boards
}

// ─── Section 7: Legislative Performance ────────────────────────────────

export interface LegislativePerformance {
  questionsAsked: number;
  debatesParticipated: number;
  privateMemberBills: number;
  attendancePercent: number;
  mpladsFundsUtilized?: number;           // % of MPLADS/MLALADS used
  developmentProjects?: number;
  performanceScore: number;               // Weighted 0-100
}

// ─── Section 8: Constituency Context ───────────────────────────────────

export interface ConstituencyContext {
  population?: number;
  areaKmSq?: number;
  literacyRate?: number;
  urbanRural?: 'urban' | 'rural' | 'semi_urban';
  scPercentage?: number;
  stPercentage?: number;
  totalElectors: number;
  avgTurnout?: number;
}

// ─── Section 9: Dynasty & Political Family ─────────────────────────────

export interface FamilyMember {
  name: string;
  relation: string;                       // 'father' | 'spouse' | 'sibling' | 'child' | etc.
  party: string;
  position: string;                       // 'MLA' | 'MP' | 'Minister' | etc.
  years: string;                          // '2004-2019'
}

export interface DynastyInfo {
  isDynast: boolean;
  politicalGeneration: number;            // 1 = first-gen, 2 = second-gen
  familyInPolitics: FamilyMember[];
  familyConstituencies: string[];
}

// ─── Section 10: Key Dates & Milestones ────────────────────────────────

export interface TimelineEvent {
  date: string;                           // YYYY-MM-DD
  event: string;                          // Short title
  description: string;                    // Detail
}

export interface KeyDates {
  dob: string | null;
  firstElected?: string;
  partyJoinDate?: string;
  oathDate?: string;
  termStartDate?: string;
  termEndDate?: string;
  notableEventsTimeline: TimelineEvent[];
}

// ─── Section 11: Computed Insights ─────────────────────────────────────

export type RedFlagType =
  | 'extreme_wealth_growth'
  | 'serious_criminal_cases'
  | 'zero_liability_anomaly'
  | 'income_asset_mismatch'
  | 'education_mismatch'
  | 'party_hopping'
  | 'low_attendance'
  | 'dynasty_concentration';

export interface RedFlag {
  type: RedFlagType;
  severity: 'info' | 'warning' | 'critical';
  description: string;
  value?: string;
}

export interface ComputedInsights {
  redFlags: RedFlag[];
  wealthRank?: number;                    // Among all MLAs/MPs in state
  criminalRank?: number;
  performanceRank?: number;
  attendanceRank?: number;
  incumbencyAdvantage: boolean;
  voteShareTrend: Trend;
  assetGrowthTrend: 'normal' | 'high' | 'suspicious';
  antiIncumbencyRisk: RiskLevel;
}

// ─── Section 12: Source Attribution ────────────────────────────────────

export interface SourceAttribution {
  dataSources: string[];                  // ['myneta', 'prs', 'wikipedia', 'eci']
  mynetaUrl?: string;
  prsUrl?: string;
  sansadUrl?: string;
  wikipediaArticle?: string;
  legislatureUrl?: string;
  lastUpdated: string;                    // ISO datetime
  dataCompleteness: number;               // 0-100
  verificationStatus: VerificationStatus;
}

// ─── House-Specific Extensions ─────────────────────────────────────────

export interface MLAExtension {
  assemblyTerm: string;                   // e.g., "16th Karnataka Assembly"
  assemblyTermNumber: number;
  delimitation2008Name?: string;          // Previous name if renamed
}

export interface LokSabhaMPExtension {
  lokSabhaNumber: number;                 // e.g., 18
  parliamentaryConstituency: string;
  assemblySegments: string[];             // Assembly segments in this PC
}

export interface RajyaSabhaMPExtension {
  nominatedByState: string;
  termStart: string;
  termEnd: string;
  retirementBatch?: string;              // Biennial batch
}

export interface MLCExtension {
  councilType: MLCType;
  mlcTermYears: number;
}

// ═══════════════════════════════════════════════════════════════════════
// THE MASTER PROFILE
// ═══════════════════════════════════════════════════════════════════════

export interface LegislatorProfile {
  /** Unique ID: {HOUSE}_{STATE}_{YEAR}_{CONST_NO}_{SERIAL} */
  id: string;

  // Core sections
  personal: PersonalInfo;
  career: PoliticalCareer;
  electionHistory: ElectionRecord[];
  financialHistory: FinancialRecord[];
  criminalRecord: CriminalRecord;
  education: EducationInfo;
  performance: LegislativePerformance;
  constituencyContext: ConstituencyContext;
  dynasty: DynastyInfo;
  keyDates: KeyDates;
  insights: ComputedInsights;
  sources: SourceAttribution;

  // House-specific (only one populated)
  mlaExtension?: MLAExtension;
  lsMPExtension?: LokSabhaMPExtension;
  rsMPExtension?: RajyaSabhaMPExtension;
  mlcExtension?: MLCExtension;
}

// ═══════════════════════════════════════════════════════════════════════
// KEY CONTESTANTS (for non-winners in each constituency)
// ═══════════════════════════════════════════════════════════════════════

export interface KeyContestant {
  name: string;
  party: string;
  votesReceived: number;
  voteShare: number;
  rank: number;                           // 2 = runner-up, 3 = third, etc.
  margin: number;                         // Margin from winner
  photoUrl?: string;
  age?: number;
  education?: EducationLevel;
  criminalCases?: number;
  totalAssets?: number;
  isCrorepati?: boolean;
  mynetaUrl?: string;
}

// ═══════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════

/** Format INR in human-readable Indian notation */
export function formatINR(amount: number): string {
  if (amount >= 1_00_00_00_000) return `₹${(amount / 1_00_00_00_000).toFixed(1)} Cr`;
  if (amount >= 1_00_00_000) return `₹${(amount / 1_00_00_000).toFixed(1)} Cr`;
  if (amount >= 1_00_000) return `₹${(amount / 1_00_000).toFixed(1)} L`;
  if (amount >= 1_000) return `₹${(amount / 1_000).toFixed(0)}K`;
  return `₹${amount}`;
}

/** Calculate current age from DOB string */
export function currentAgeFromDOB(dob: string | null): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const monthDiff = now.getMonth() - d.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

/** Calculate age at a specific date */
export function ageAtDate(dob: string | null, targetDate: string): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  const t = new Date(targetDate);
  if (isNaN(d.getTime()) || isNaN(t.getTime())) return null;
  let age = t.getFullYear() - d.getFullYear();
  const monthDiff = t.getMonth() - d.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && t.getDate() < d.getDate())) age--;
  return age;
}

/** Compute data completeness percentage */
export function computeCompleteness(profile: LegislatorProfile): number {
  const checks = [
    !!profile.personal.fullName,
    !!profile.personal.dob,
    !!profile.personal.photoUrl,
    !!profile.personal.gender,
    profile.career.constituencyName.length > 0,
    profile.career.currentParty.length > 0,
    profile.career.termsServed > 0,
    profile.electionHistory.length > 0,
    profile.financialHistory.length > 0,
    profile.criminalRecord.totalCases >= 0,
    !!profile.education.educationLevel,
    !!profile.education.selfProfession,
    profile.performance.attendancePercent > 0,
    profile.performance.questionsAsked >= 0,
    !!profile.sources.mynetaUrl,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

/** Detect all red flags from a profile */
export function detectAllRedFlags(profile: LegislatorProfile): RedFlag[] {
  const flags: RedFlag[] = [];

  // Serious criminal cases
  if (profile.criminalRecord.seriousCases > 0) {
    flags.push({
      type: 'serious_criminal_cases',
      severity: 'critical',
      description: `${profile.criminalRecord.seriousCases} serious criminal case(s) involving IPC sections with 5+ year sentences`,
      value: `${profile.criminalRecord.seriousCases}`,
    });
  }

  // Extreme wealth growth
  if (profile.financialHistory.length >= 2) {
    const sorted = [...profile.financialHistory].sort((a, b) => a.electionYear - b.electionYear);
    const older = sorted[0], newer = sorted[sorted.length - 1];
    if (older.totalAssets > 0) {
      const pctGrowth = ((newer.totalAssets - older.totalAssets) / older.totalAssets) * 100;
      if (pctGrowth > 500) {
        flags.push({
          type: 'extreme_wealth_growth',
          severity: pctGrowth > 1000 ? 'critical' : 'warning',
          description: `Assets grew ${pctGrowth.toFixed(0)}% from ${formatINR(older.totalAssets)} to ${formatINR(newer.totalAssets)} over ${newer.electionYear - older.electionYear} years`,
          value: `${pctGrowth.toFixed(0)}%`,
        });
      }
    }
  }

  // Zero liability anomaly
  const latest = profile.financialHistory[profile.financialHistory.length - 1];
  if (latest && latest.totalAssets > 5_00_00_000 && latest.totalLiabilities === 0) {
    flags.push({
      type: 'zero_liability_anomaly',
      severity: 'warning',
      description: `Declares ${formatINR(latest.totalAssets)} in assets but zero liabilities`,
    });
  }

  // Income-asset mismatch
  if (latest && latest.totalIncome > 0 && latest.totalAssets > latest.totalIncome * 50) {
    flags.push({
      type: 'income_asset_mismatch',
      severity: 'warning',
      description: `Assets (${formatINR(latest.totalAssets)}) are ${Math.round(latest.totalAssets / latest.totalIncome)}x the declared income`,
      value: `${Math.round(latest.totalAssets / latest.totalIncome)}x`,
    });
  }

  // Party hopping
  if (profile.career.previousParties.length >= 2) {
    flags.push({
      type: 'party_hopping',
      severity: 'info',
      description: `Changed parties ${profile.career.previousParties.length} time(s): ${profile.career.previousParties.map(p => p.party).join(' → ')} → ${profile.career.currentParty}`,
    });
  }

  // Low attendance
  if (profile.performance.attendancePercent > 0 && profile.performance.attendancePercent < 50) {
    flags.push({
      type: 'low_attendance',
      severity: profile.performance.attendancePercent < 30 ? 'critical' : 'warning',
      description: `Only ${profile.performance.attendancePercent}% attendance in legislative sessions`,
      value: `${profile.performance.attendancePercent}%`,
    });
  }

  // Dynasty concentration
  if (profile.dynasty.isDynast && profile.dynasty.familyInPolitics.length >= 3) {
    flags.push({
      type: 'dynasty_concentration',
      severity: 'info',
      description: `${profile.dynasty.familyInPolitics.length} family members in active politics`,
    });
  }

  return flags;
}

/** Build an empty profile shell */
export function createEmptyProfile(id: string, house: HouseType): LegislatorProfile {
  return {
    id,
    personal: {
      fullName: '', displayName: '', aliases: [],
      gender: 'male', dob: null, ageAtElection: null, currentAge: null,
      photoUrl: null, photoSources: {},
    },
    career: {
      house, stateCode: '', stateName: '',
      constituencyName: '', constituencyNumber: 0, constituencyType: 'general',
      district: '', currentParty: '', currentPartyFull: '',
      previousParties: [], termsServed: 0, firstElectedYear: 0,
      isCurrentMember: true, isCabinetMinister: false,
      isChiefMinister: false, isOppositionLeader: false,
      committeeMemberships: [], specialPositions: [],
    },
    electionHistory: [],
    financialHistory: [],
    criminalRecord: { hasCriminalCases: false, totalCases: 0, seriousCases: 0, convictions: 0, caseDetails: [] },
    education: { educationLevel: 'others', educationCategory: '', selfProfession: '', otherActivities: [] },
    performance: { questionsAsked: 0, debatesParticipated: 0, privateMemberBills: 0, attendancePercent: 0, performanceScore: 0 },
    constituencyContext: { totalElectors: 0 },
    dynasty: { isDynast: false, politicalGeneration: 1, familyInPolitics: [], familyConstituencies: [] },
    keyDates: { dob: null, notableEventsTimeline: [] },
    insights: { redFlags: [], incumbencyAdvantage: false, voteShareTrend: 'stable', assetGrowthTrend: 'normal', antiIncumbencyRisk: 'low' },
    sources: { dataSources: [], lastUpdated: new Date().toISOString(), dataCompleteness: 0, verificationStatus: 'unverified' },
  };
}

// ─── Config Maps ───────────────────────────────────────────────────────

export const EDUCATION_LEVEL_CONFIG: Record<EducationLevel, { label: string; rank: number; icon: string }> = {
  illiterate:     { label: 'Illiterate',      rank: 0, icon: 'close-circle' },
  '5th_pass':     { label: '5th Pass',        rank: 1, icon: 'school-outline' },
  '8th_pass':     { label: '8th Pass',        rank: 2, icon: 'school-outline' },
  '10th_pass':    { label: '10th Pass',       rank: 3, icon: 'school-outline' },
  '12th_pass':    { label: '12th Pass',       rank: 4, icon: 'school' },
  graduate:       { label: 'Graduate',        rank: 5, icon: 'school' },
  post_graduate:  { label: 'Post Graduate',   rank: 6, icon: 'ribbon' },
  doctorate:      { label: 'Doctorate',       rank: 7, icon: 'medal' },
  professional:   { label: 'Professional',    rank: 8, icon: 'briefcase' },
  others:         { label: 'Others',          rank: 3, icon: 'help-circle' },
};

export const HOUSE_CONFIG: Record<HouseType, { label: string; shortLabel: string; icon: string; color: string }> = {
  state_assembly: { label: 'Member of Legislative Assembly', shortLabel: 'MLA', icon: 'business', color: '#2563EB' },
  lok_sabha:      { label: 'Member of Parliament (Lok Sabha)', shortLabel: 'MP', icon: 'globe', color: '#7C3AED' },
  rajya_sabha:    { label: 'Member of Parliament (Rajya Sabha)', shortLabel: 'MP (RS)', icon: 'globe-outline', color: '#9333EA' },
  state_council:  { label: 'Member of Legislative Council', shortLabel: 'MLC', icon: 'layers', color: '#0891B2' },
};

export const RED_FLAG_CONFIG: Record<RedFlagType, { icon: string; color: string; label: string }> = {
  extreme_wealth_growth:  { icon: 'trending-up',       color: '#F59E0B', label: 'Extreme Wealth Growth' },
  serious_criminal_cases: { icon: 'alert-circle',      color: '#EF4444', label: 'Serious Criminal Cases' },
  zero_liability_anomaly: { icon: 'help-circle',       color: '#F97316', label: 'Zero Liability Anomaly' },
  income_asset_mismatch:  { icon: 'swap-horizontal',   color: '#8B5CF6', label: 'Income-Asset Mismatch' },
  education_mismatch:     { icon: 'school',            color: '#6B7280', label: 'Education Mismatch' },
  party_hopping:          { icon: 'swap-vertical',     color: '#3B82F6', label: 'Party Hopping' },
  low_attendance:         { icon: 'time-outline',      color: '#EF4444', label: 'Low Attendance' },
  dynasty_concentration:  { icon: 'people',            color: '#F97316', label: 'Dynasty Concentration' },
};
