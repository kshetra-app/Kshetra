// ─── Enhanced Civic Metrics Types ───
// Covers: Budget/expenditure tracking, RTI integration,
// bill/legislation tracker, government scheme tracker, development projects,
// public hearing calendar, comparative constituency metrics

// ─── Enums ───

export type BudgetCategory = 'education' | 'healthcare' | 'infrastructure' | 'agriculture' | 'social_welfare' | 'law_enforcement' | 'rural_development' | 'urban_development' | 'environment' | 'industry' | 'defence' | 'debt_servicing' | 'salaries' | 'other';

export type RTIStatus = 'draft' | 'filed' | 'acknowledged' | 'first_appeal' | 'second_appeal' | 'information_received' | 'denied' | 'partial_response' | 'transferred' | 'closed';

export type BillStatus = 'introduced' | 'first_reading' | 'committee_review' | 'second_reading' | 'passed_lower' | 'passed_upper' | 'presidential_assent' | 'enacted' | 'lapsed' | 'withdrawn' | 'referred_select';

export type BillType = 'ordinary' | 'money' | 'finance' | 'constitutional_amendment' | 'private_member';

export type SchemeCategory = 'agriculture' | 'education' | 'health' | 'housing' | 'employment' | 'social_security' | 'women_child' | 'skill_development' | 'digital' | 'infrastructure' | 'rural' | 'urban' | 'tribal' | 'minority';

export type SchemeStatus = 'active' | 'suspended' | 'completed' | 'merged' | 'discontinued';

export type ProjectPhase = 'proposed' | 'approved' | 'tendered' | 'under_construction' | 'delayed' | 'completed' | 'inaugurated' | 'cancelled' | 'stalled';

export type ProjectCategory = 'road' | 'bridge' | 'flyover' | 'school' | 'hospital' | 'water_supply' | 'sewage' | 'electricity' | 'housing' | 'community_hall' | 'park' | 'stadium' | 'market' | 'bus_depot' | 'railway' | 'metro' | 'airport' | 'port' | 'irrigation' | 'dam';

export type HearingType = 'public_hearing' | 'gram_sabha' | 'ward_meeting' | 'town_hall' | 'environment_clearance' | 'land_acquisition' | 'budget_consultation' | 'grievance_redressal';

export type ComparisonMetric = 'population' | 'literacy' | 'turnout' | 'development_index' | 'crime_rate' | 'health_index' | 'education_index' | 'road_density' | 'electrification' | 'water_access' | 'internet_penetration' | 'employment_rate' | 'income_per_capita' | 'budget_utilization';

// ─── Configs ───

export const BUDGET_CATEGORY_CONFIG: Record<BudgetCategory, { label: string; icon: string; color: string }> = {
  education: { label: 'Education', icon: 'school', color: '#8B5CF6' },
  healthcare: { label: 'Healthcare', icon: 'medkit', color: '#EF4444' },
  infrastructure: { label: 'Infrastructure', icon: 'construct', color: '#F59E0B' },
  agriculture: { label: 'Agriculture', icon: 'leaf', color: '#84CC16' },
  social_welfare: { label: 'Social Welfare', icon: 'heart', color: '#EC4899' },
  law_enforcement: { label: 'Law Enforcement', icon: 'shield', color: '#3B82F6' },
  rural_development: { label: 'Rural Development', icon: 'home', color: '#10B981' },
  urban_development: { label: 'Urban Development', icon: 'business', color: '#06B6D4' },
  environment: { label: 'Environment', icon: 'earth', color: '#14B8A6' },
  industry: { label: 'Industry', icon: 'cog', color: '#F97316' },
  defence: { label: 'Defence', icon: 'shield-checkmark', color: '#6B7280' },
  debt_servicing: { label: 'Debt Servicing', icon: 'trending-down', color: '#A855F7' },
  salaries: { label: 'Salaries & Pensions', icon: 'people', color: '#FBBF24' },
  other: { label: 'Other', icon: 'ellipsis-horizontal', color: '#9CA3AF' },
};

export const SCHEME_CATEGORY_CONFIG: Record<SchemeCategory, { label: string; icon: string; color: string }> = {
  agriculture: { label: 'Agriculture', icon: 'leaf', color: '#84CC16' },
  education: { label: 'Education', icon: 'school', color: '#8B5CF6' },
  health: { label: 'Health', icon: 'medkit', color: '#EF4444' },
  housing: { label: 'Housing', icon: 'home', color: '#F59E0B' },
  employment: { label: 'Employment', icon: 'briefcase', color: '#3B82F6' },
  social_security: { label: 'Social Security', icon: 'shield', color: '#10B981' },
  women_child: { label: 'Women & Child', icon: 'female', color: '#EC4899' },
  skill_development: { label: 'Skill Development', icon: 'hammer', color: '#06B6D4' },
  digital: { label: 'Digital India', icon: 'hardware-chip', color: '#A855F7' },
  infrastructure: { label: 'Infrastructure', icon: 'construct', color: '#F97316' },
  rural: { label: 'Rural', icon: 'flower', color: '#14B8A6' },
  urban: { label: 'Urban', icon: 'business', color: '#6B7280' },
  tribal: { label: 'Tribal Welfare', icon: 'people', color: '#FBBF24' },
  minority: { label: 'Minority Welfare', icon: 'globe', color: '#84CC16' },
};

export const PROJECT_CATEGORY_CONFIG: Record<ProjectCategory, { label: string; icon: string; color: string }> = {
  road: { label: 'Road', icon: 'car', color: '#F59E0B' },
  bridge: { label: 'Bridge', icon: 'git-merge', color: '#3B82F6' },
  flyover: { label: 'Flyover', icon: 'swap-horizontal', color: '#8B5CF6' },
  school: { label: 'School', icon: 'school', color: '#EC4899' },
  hospital: { label: 'Hospital', icon: 'medkit', color: '#EF4444' },
  water_supply: { label: 'Water Supply', icon: 'water', color: '#06B6D4' },
  sewage: { label: 'Sewage/STP', icon: 'filter', color: '#14B8A6' },
  electricity: { label: 'Electricity', icon: 'flash', color: '#FBBF24' },
  housing: { label: 'Housing', icon: 'home', color: '#F97316' },
  community_hall: { label: 'Community Hall', icon: 'people', color: '#84CC16' },
  park: { label: 'Park', icon: 'leaf', color: '#10B981' },
  stadium: { label: 'Stadium', icon: 'football', color: '#A855F7' },
  market: { label: 'Market', icon: 'storefront', color: '#F59E0B' },
  bus_depot: { label: 'Bus Depot', icon: 'bus', color: '#6B7280' },
  railway: { label: 'Railway', icon: 'train', color: '#3B82F6' },
  metro: { label: 'Metro', icon: 'subway', color: '#8B5CF6' },
  airport: { label: 'Airport', icon: 'airplane', color: '#06B6D4' },
  port: { label: 'Port', icon: 'boat', color: '#14B8A6' },
  irrigation: { label: 'Irrigation', icon: 'water', color: '#84CC16' },
  dam: { label: 'Dam', icon: 'barricade', color: '#F97316' },
};

export const PROJECT_PHASE_CONFIG: Record<ProjectPhase, { label: string; icon: string; color: string; order: number }> = {
  proposed: { label: 'Proposed', icon: 'document-text', color: '#6B7280', order: 1 },
  approved: { label: 'Approved', icon: 'checkmark-circle', color: '#3B82F6', order: 2 },
  tendered: { label: 'Tendered', icon: 'briefcase', color: '#8B5CF6', order: 3 },
  under_construction: { label: 'Under Construction', icon: 'construct', color: '#F59E0B', order: 4 },
  delayed: { label: 'Delayed', icon: 'warning', color: '#EF4444', order: 5 },
  completed: { label: 'Completed', icon: 'checkmark-done', color: '#10B981', order: 6 },
  inaugurated: { label: 'Inaugurated', icon: 'ribbon', color: '#10B981', order: 7 },
  cancelled: { label: 'Cancelled', icon: 'close-circle', color: '#EF4444', order: 8 },
  stalled: { label: 'Stalled', icon: 'pause-circle', color: '#F97316', order: 9 },
};

// ─── Interfaces ───

export interface BudgetAllocation {
  id: string;
  stateCode: string;
  fiscalYear: string;
  category: BudgetCategory;
  allocatedCrores: number;
  revisedCrores?: number;
  actualSpentCrores?: number;
  utilizationPercent: number;
  constituencyAcNo?: number;
  districtName?: string;
  schemeName?: string;
  source: string;
  updatedAt: string;
}

export interface StateBudgetSummary {
  stateCode: string;
  fiscalYear: string;
  totalBudgetCrores: number;
  totalRevisedCrores: number | null;
  totalSpentCrores: number | null;
  overallUtilization: number | null;
  categoryBreakdown: { category: BudgetCategory; allocated: number | null; spent: number | null; utilization: number | null }[];
  topSchemes: { name: string; allocated: number | null; spent: number | null }[];
  fiscalDeficitCrores: number | null;
  revenueDeficitCrores: number | null;
  debtToGDPRatio: number | null;
  updatedAt?: string | null;
}

type StateBudgetSummaryRow = Record<string, unknown>;

function readFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string' || value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function readBudgetField(row: StateBudgetSummaryRow, snakeCase: string, camelCase: string): unknown {
  return Object.prototype.hasOwnProperty.call(row, snakeCase) ? row[snakeCase] : row[camelCase];
}

/** Maps the stored Supabase row without turning missing financial fields into zero. */
export function parseStateBudgetSummary(
  value: unknown,
  requestedStateCode: string,
): StateBudgetSummary | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as StateBudgetSummaryRow;
  const fiscalYear = readBudgetField(row, 'fiscal_year', 'fiscalYear');
  const totalBudgetCrores = readFiniteNumber(readBudgetField(row, 'total_budget_crores', 'totalBudgetCrores'));
  if (typeof fiscalYear !== 'string' || fiscalYear.trim() === '' || totalBudgetCrores === null) return null;

  const categoryRows = readBudgetField(row, 'category_breakdown', 'categoryBreakdown');
  const topSchemeRows = readBudgetField(row, 'top_schemes', 'topSchemes');
  const categoryBreakdown = Array.isArray(categoryRows)
    ? categoryRows.flatMap((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
      const category = (item as Record<string, unknown>).category;
      if (typeof category !== 'string' || category.trim() === '') return [];
      const entry = item as Record<string, unknown>;
      return [{
        category: category as BudgetCategory,
        allocated: readFiniteNumber(entry.allocated ?? entry.allocatedCrores ?? entry.allocated_crores),
        spent: readFiniteNumber(entry.spent ?? entry.actualSpentCrores ?? entry.actual_spent_crores),
        utilization: readFiniteNumber(entry.utilization ?? entry.utilizationPercent ?? entry.utilization_percent),
      }];
    })
    : [];
  const topSchemes = Array.isArray(topSchemeRows)
    ? topSchemeRows.flatMap((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
      const entry = item as Record<string, unknown>;
      if (typeof entry.name !== 'string' || entry.name.trim() === '') return [];
      return [{
        name: entry.name,
        allocated: readFiniteNumber(entry.allocated ?? entry.allocatedCrores ?? entry.allocated_crores),
        spent: readFiniteNumber(entry.spent ?? entry.actualSpentCrores ?? entry.actual_spent_crores),
      }];
    })
    : [];

  const stateCode = readBudgetField(row, 'state_code', 'stateCode');
  const updatedAt = readBudgetField(row, 'updated_at', 'updatedAt');
  return {
    stateCode: typeof stateCode === 'string' && stateCode ? stateCode : requestedStateCode,
    fiscalYear,
    totalBudgetCrores,
    totalRevisedCrores: readFiniteNumber(readBudgetField(row, 'total_revised_crores', 'totalRevisedCrores')),
    totalSpentCrores: readFiniteNumber(readBudgetField(row, 'total_spent_crores', 'totalSpentCrores')),
    overallUtilization: readFiniteNumber(readBudgetField(row, 'overall_utilization', 'overallUtilization')),
    categoryBreakdown,
    topSchemes,
    fiscalDeficitCrores: readFiniteNumber(readBudgetField(row, 'fiscal_deficit_crores', 'fiscalDeficitCrores')),
    revenueDeficitCrores: readFiniteNumber(readBudgetField(row, 'revenue_deficit_crores', 'revenueDeficitCrores')),
    debtToGDPRatio: readFiniteNumber(readBudgetField(row, 'debt_to_gdp_ratio', 'debtToGDPRatio')),
    updatedAt: typeof updatedAt === 'string' ? updatedAt : null,
  };
}

export interface RTIRequest {
  id: string;
  userId: string;
  status: RTIStatus;
  department: string;
  authority: string;
  subject: string;
  questionText: string;
  stateCode: string;
  districtName?: string;
  constituencyAcNo?: number;
  filedDate?: string;
  acknowledgedDate?: string;
  responseDate?: string;
  responseText?: string;
  attachmentUrls: string[];
  responseAttachmentUrls: string[];
  firstAppealDate?: string;
  secondAppealDate?: string;
  fees: number;
  isPublic: boolean;
  upvotes: number;
  views: number;
  tags: string[];
  createdAt: string;
}

export interface Bill {
  id: string;
  title: string;
  shortTitle: string;
  type: BillType;
  status: BillStatus;
  introducedBy: string;
  introducedByParty: string | null;
  houseIntroduced: 'lok_sabha' | 'rajya_sabha' | 'state_assembly' | 'state_council';
  stateCode?: string;
  introducedDate: string;
  lastActionDate: string | null;
  summary: string;
  fullTextUrl?: string;
  committeeReportUrl?: string;
  relatedDepartments: string[];
  tags: string[];
  affectedConstituencies?: number[];
  votesFor: number | null;
  votesAgainst: number | null;
  votesAbstain: number | null;
  publicOpinion: { support: number | null; oppose: number | null; neutral: number | null };
  amendments: { id: string; proposedBy: string; description: string; status: 'accepted' | 'rejected' | 'pending' }[];
  timeline: { date: string; action: string; details?: string }[];
  createdAt: string | null;
  updatedAt: string | null;
}

export interface GovernmentScheme {
  id: string;
  name: string;
  shortName: string;
  category: SchemeCategory;
  status: SchemeStatus;
  launchedDate: string;
  ministry: string;
  level: 'central' | 'state' | 'joint';
  stateCode?: string;
  description: string;
  eligibility: string;
  benefits: string;
  applicationUrl?: string;
  budgetCrores: number | null;
  beneficiariesTarget: number | null;
  beneficiariesActual: number | null;
  coveragePercent: number | null;
  districtWiseCoverage?: { districtName: string; beneficiaries: number | null; target: number | null }[];
  constituencyWiseCoverage?: { acNo: number; acName: string; beneficiaries: number | null }[];
  documents: { title: string; url: string }[];
  updatedAt: string | null;
}

export interface DevelopmentProject {
  id: string;
  name: string;
  category: ProjectCategory;
  phase: ProjectPhase;
  stateCode: string;
  districtName: string;
  constituencyAcNo?: number;
  wardNo?: number;
  description: string;
  contractor?: string;
  sanctionedCostCrores: number | null;
  revisedCostCrores?: number | null;
  expenditureCrores: number | null;
  sanctionedDate: string | null;
  expectedCompletion: string | null;
  actualCompletion?: string;
  delayDays: number | null;
  physicalProgress: number | null;
  financialProgress: number | null;
  gpsLat?: number;
  gpsLng?: number;
  photos: { url: string; caption: string; date: string }[];
  milestones: { title: string; targetDate: string; completedDate?: string; status: 'pending' | 'completed' | 'delayed' }[];
  issues: string[];
  lastInspection?: { date: string; by: string; findings: string };
  source: string | null;
  updatedAt: string | null;
}

export interface PublicHearing {
  id: string;
  type: HearingType;
  title: string;
  description: string;
  organizer: string;
  stateCode: string;
  districtName: string;
  constituencyAcNo?: number;
  venue: string;
  date: string;
  time: string;
  isOpen: boolean | null;
  registrationUrl?: string;
  agendaItems: string[];
  minutesUrl?: string;
  outcome?: string;
  relatedProjectId?: string;
  createdAt: string | null;
}

export interface ConstituencyComparison {
  metric: ComparisonMetric;
  constituencyValue: number;
  constituencyRank: number;
  districtAvg: number;
  stateAvg: number;
  nationalAvg: number;
  totalConstituencies: number;
  percentile: number;
  trend: 'improving' | 'stable' | 'declining';
  label: string;
  unit: string;
  higherIsBetter: boolean;
}

export interface ConstituencyDevelopmentIndex {
  constituencyAcNo: number;
  constituencyName: string;
  stateCode: string;
  overallScore: number;
  rank: number;
  totalACs: number;
  percentile: number;
  metrics: ConstituencyComparison[];
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  lastUpdated: string;
}

// ─── Utility Functions ───

export function calculateUtilization(allocated: number, spent: number): number {
  if (allocated <= 0) return 0;
  return Math.round((spent / allocated) * 100);
}

export function getUtilizationColor(pct: number): string {
  if (pct >= 80) return '#10B981';
  if (pct >= 60) return '#F59E0B';
  if (pct >= 40) return '#F97316';
  return '#EF4444';
}

export function getProjectHealthColor(phase: ProjectPhase): string {
  return PROJECT_PHASE_CONFIG[phase].color;
}

export function getBillStatusLabel(status: BillStatus): string {
  const labels: Record<BillStatus, string> = {
    introduced: 'Introduced', first_reading: 'First Reading', committee_review: 'Committee Review',
    second_reading: 'Second Reading', passed_lower: 'Passed (Lower House)', passed_upper: 'Passed (Upper House)',
    presidential_assent: "President's Assent", enacted: 'Enacted', lapsed: 'Lapsed',
    withdrawn: 'Withdrawn', referred_select: 'Referred to Select Committee',
  };
  return labels[status];
}

export function calculateDevelopmentIndex(metrics: ConstituencyComparison[]): number {
  if (metrics.length === 0) return 0;
  const totalPercentile = metrics.reduce((sum, m) => sum + m.percentile, 0);
  return Math.round(totalPercentile / metrics.length);
}

export function getPercentileLabel(percentile: number): string {
  if (percentile >= 90) return 'Top 10%';
  if (percentile >= 75) return 'Top 25%';
  if (percentile >= 50) return 'Above Average';
  if (percentile >= 25) return 'Below Average';
  return 'Bottom 25%';
}

export function formatCrores(crores: number): string {
  if (crores >= 100) return `₹${Math.round(crores)}Cr`;
  if (crores >= 1) return `₹${crores.toFixed(1)}Cr`;
  return `₹${Math.round(crores * 100)}L`;
}

export function getRTIStatusColor(status: RTIStatus): string {
  const colors: Record<RTIStatus, string> = {
    draft: '#6B7280', filed: '#3B82F6', acknowledged: '#8B5CF6', first_appeal: '#F59E0B',
    second_appeal: '#F97316', information_received: '#10B981', denied: '#EF4444',
    partial_response: '#F59E0B', transferred: '#06B6D4', closed: '#4B5563',
  };
  return colors[status];
}
