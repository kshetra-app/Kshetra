// ─── Enhanced Civic Metrics Types ───
// Covers: Budget/expenditure tracking, RTI integration, MLA/MP attendance,
// bill/legislation tracker, government scheme tracker, development projects,
// public hearing calendar, comparative constituency metrics

// ─── Enums ───

export type BudgetCategory = 'education' | 'healthcare' | 'infrastructure' | 'agriculture' | 'social_welfare' | 'law_enforcement' | 'rural_development' | 'urban_development' | 'environment' | 'industry' | 'defence' | 'debt_servicing' | 'salaries' | 'other';

export type RTIStatus = 'draft' | 'filed' | 'acknowledged' | 'first_appeal' | 'second_appeal' | 'information_received' | 'denied' | 'partial_response' | 'transferred' | 'closed';

export type AttendanceType = 'assembly_session' | 'committee_meeting' | 'question_hour' | 'debate' | 'voting' | 'zero_hour';

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
  totalRevisedCrores: number;
  totalSpentCrores: number;
  overallUtilization: number;
  categoryBreakdown: { category: BudgetCategory; allocated: number; spent: number; utilization: number }[];
  topSchemes: { name: string; allocated: number; spent: number }[];
  fiscalDeficitCrores: number;
  revenueDeficitCrores: number;
  debtToGDPRatio: number;
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
  filedDate: string;
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

export interface LegislatorAttendance {
  legislatorId: string;
  legislatorName: string;
  party: string;
  stateCode: string;
  constituencyAcNo?: number;
  sessionYear: string;
  type: AttendanceType;
  totalSessions: number;
  attended: number;
  attendancePercent: number;
  questionsAsked: number;
  debatesParticipated: number;
  privateMemberBills: number;
  ranking: number;
  totalLegislators: number;
}

export interface Bill {
  id: string;
  title: string;
  shortTitle: string;
  type: BillType;
  status: BillStatus;
  introducedBy: string;
  introducedByParty: string;
  houseIntroduced: 'lok_sabha' | 'rajya_sabha' | 'state_assembly' | 'state_council';
  stateCode?: string;
  introducedDate: string;
  lastActionDate: string;
  summary: string;
  fullTextUrl?: string;
  committeeReportUrl?: string;
  relatedDepartments: string[];
  tags: string[];
  affectedConstituencies?: number[];
  votesFor: number;
  votesAgainst: number;
  votesAbstain: number;
  publicOpinion: { support: number; oppose: number; neutral: number };
  amendments: { id: string; proposedBy: string; description: string; status: 'accepted' | 'rejected' | 'pending' }[];
  timeline: { date: string; action: string; details?: string }[];
  createdAt: string;
  updatedAt: string;
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
  budgetCrores: number;
  beneficiariesTarget: number;
  beneficiariesActual: number;
  coveragePercent: number;
  districtWiseCoverage?: { districtName: string; beneficiaries: number; target: number }[];
  constituencyWiseCoverage?: { acNo: number; acName: string; beneficiaries: number }[];
  documents: { title: string; url: string }[];
  updatedAt: string;
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
  sanctionedCostCrores: number;
  revisedCostCrores?: number;
  expenditureCrores: number;
  sanctionedDate: string;
  expectedCompletion: string;
  actualCompletion?: string;
  delayDays: number;
  physicalProgress: number;
  financialProgress: number;
  gpsLat?: number;
  gpsLng?: number;
  photos: { url: string; caption: string; date: string }[];
  milestones: { title: string; targetDate: string; completedDate?: string; status: 'pending' | 'completed' | 'delayed' }[];
  issues: string[];
  lastInspection?: { date: string; by: string; findings: string };
  source: string;
  updatedAt: string;
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
  isOpen: boolean;
  registrationUrl?: string;
  agendaItems: string[];
  attendeeCount?: number;
  minutesUrl?: string;
  outcome?: string;
  relatedProjectId?: string;
  createdAt: string;
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

export function getAttendanceGrade(pct: number): { grade: string; color: string; label: string } {
  if (pct >= 90) return { grade: 'A+', color: '#10B981', label: 'Excellent' };
  if (pct >= 80) return { grade: 'A', color: '#84CC16', label: 'Very Good' };
  if (pct >= 70) return { grade: 'B', color: '#F59E0B', label: 'Good' };
  if (pct >= 50) return { grade: 'C', color: '#F97316', label: 'Average' };
  if (pct >= 30) return { grade: 'D', color: '#EF4444', label: 'Poor' };
  return { grade: 'F', color: '#991B1B', label: 'Very Poor' };
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
