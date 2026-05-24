import { create } from 'zustand';
import type {
  BudgetAllocation,
  StateBudgetSummary,
  RTIRequest,
  LegislatorAttendance,
  Bill,
  GovernmentScheme,
  DevelopmentProject,
  PublicHearing,
  ConstituencyComparison,
  ConstituencyDevelopmentIndex,
  RTIStatus,
} from '../lib/civicMetricsTypes';

// ─── Seed Budget Data ───
const SEED_BUDGET_SUMMARIES: StateBudgetSummary[] = [
  {
    stateCode: 'TS', fiscalYear: '2025-26', totalBudgetCrores: 290000, totalRevisedCrores: 285000,
    totalSpentCrores: 198000, overallUtilization: 69.5,
    categoryBreakdown: [
      { category: 'education', allocated: 28500, spent: 22800, utilization: 80 },
      { category: 'healthcare', allocated: 21000, spent: 17600, utilization: 83.8 },
      { category: 'infrastructure', allocated: 45000, spent: 28500, utilization: 63.3 },
      { category: 'agriculture', allocated: 32000, spent: 25600, utilization: 80 },
      { category: 'social_welfare', allocated: 38000, spent: 31200, utilization: 82.1 },
      { category: 'law_enforcement', allocated: 12000, spent: 10800, utilization: 90 },
      { category: 'salaries', allocated: 52000, spent: 48000, utilization: 92.3 },
    ],
    topSchemes: [
      { name: 'Rythu Bandhu', allocated: 15000, spent: 14200 },
      { name: 'Aasara Pension', allocated: 12000, spent: 11800 },
      { name: 'Kalyana Lakshmi', allocated: 3000, spent: 2800 },
    ],
    fiscalDeficitCrores: 42000, revenueDeficitCrores: 8500, debtToGDPRatio: 22.5,
  },
  {
    stateCode: 'KA', fiscalYear: '2025-26', totalBudgetCrores: 370000, totalRevisedCrores: 365000,
    totalSpentCrores: 262000, overallUtilization: 71.8,
    categoryBreakdown: [
      { category: 'education', allocated: 38000, spent: 30400, utilization: 80 },
      { category: 'healthcare', allocated: 28000, spent: 23800, utilization: 85 },
      { category: 'infrastructure', allocated: 55000, spent: 35200, utilization: 64 },
      { category: 'social_welfare', allocated: 52000, spent: 46800, utilization: 90 },
    ],
    topSchemes: [
      { name: 'Gruha Lakshmi', allocated: 18000, spent: 17500 },
      { name: 'Anna Bhagya', allocated: 8000, spent: 7800 },
      { name: 'Shakti (Free Bus)', allocated: 6000, spent: 5800 },
    ],
    fiscalDeficitCrores: 52000, revenueDeficitCrores: 12000, debtToGDPRatio: 25.1,
  },
];

// ─── Seed RTI Requests ───
const SEED_RTI: RTIRequest[] = [
  {
    id: 'rti1', userId: 'u-rti1', status: 'information_received', department: 'GHMC - Roads',
    authority: 'Commissioner, GHMC', subject: 'Road repair expenditure in Jubilee Hills division',
    questionText: 'Please provide the total amount sanctioned and spent on road repairs in Jubilee Hills division (Ward 85-92) in FY 2025-26, including contractor details.',
    stateCode: 'TS', districtName: 'Hyderabad', constituencyAcNo: 58,
    filedDate: '2026-02-15', acknowledgedDate: '2026-02-18', responseDate: '2026-03-15',
    responseText: 'Total sanctioned: ₹45.2 Cr. Spent: ₹32.8 Cr (72.6% utilization). Contractor: XYZ Infrastructure Pvt Ltd.',
    attachmentUrls: [], responseAttachmentUrls: ['https://example.com/rti-response-road.pdf'],
    fees: 10, isPublic: true, upvotes: 234, views: 5600, tags: ['roads', 'infrastructure', 'ghmc'],
    createdAt: '2026-02-15',
  },
  {
    id: 'rti2', userId: 'u-rti2', status: 'first_appeal', department: 'Education - Telangana',
    authority: 'Director, School Education', subject: 'Teacher vacancies in government schools',
    questionText: 'Provide the total number of sanctioned vs. filled teaching positions in government schools across all districts of Telangana as of January 2026.',
    stateCode: 'TS', filedDate: '2026-03-01', acknowledgedDate: '2026-03-05',
    firstAppealDate: '2026-04-10', attachmentUrls: [], responseAttachmentUrls: [],
    fees: 10, isPublic: true, upvotes: 567, views: 12000, tags: ['education', 'teachers', 'vacancies'],
    createdAt: '2026-03-01',
  },
];

// ─── Seed Attendance ───
const SEED_ATTENDANCE: LegislatorAttendance[] = [
  { legislatorId: 'mla-1', legislatorName: 'Revanth Reddy', party: 'INC', stateCode: 'TS', constituencyAcNo: 116, sessionYear: '2025', type: 'assembly_session', totalSessions: 45, attended: 42, attendancePercent: 93.3, questionsAsked: 12, debatesParticipated: 8, privateMemberBills: 1, ranking: 3, totalLegislators: 119 },
  { legislatorId: 'mla-2', legislatorName: 'KT Rama Rao', party: 'BRS', stateCode: 'TS', constituencyAcNo: 53, sessionYear: '2025', type: 'assembly_session', totalSessions: 45, attended: 38, attendancePercent: 84.4, questionsAsked: 25, debatesParticipated: 15, privateMemberBills: 3, ranking: 8, totalLegislators: 119 },
  { legislatorId: 'mla-3', legislatorName: 'Akbaruddin Owaisi', party: 'AIMIM', stateCode: 'TS', constituencyAcNo: 56, sessionYear: '2025', type: 'assembly_session', totalSessions: 45, attended: 30, attendancePercent: 66.7, questionsAsked: 18, debatesParticipated: 12, privateMemberBills: 0, ranking: 25, totalLegislators: 119 },
  { legislatorId: 'mla-4', legislatorName: 'Siddaramaiah', party: 'INC', stateCode: 'KA', constituencyAcNo: 86, sessionYear: '2025', type: 'assembly_session', totalSessions: 50, attended: 46, attendancePercent: 92.0, questionsAsked: 8, debatesParticipated: 10, privateMemberBills: 0, ranking: 5, totalLegislators: 224 },
];

// ─── Seed Bills ───
const SEED_BILLS: Bill[] = [
  {
    id: 'bill1', title: 'The Telangana Land Redistribution (Amendment) Bill, 2026', shortTitle: 'TS Land Amendment 2026',
    type: 'ordinary', status: 'committee_review', introducedBy: 'Revanth Reddy', introducedByParty: 'INC',
    houseIntroduced: 'state_assembly', stateCode: 'TS',
    introducedDate: '2026-03-01', lastActionDate: '2026-04-15',
    summary: 'Amends the existing land redistribution framework to include urban agricultural land and provides for digital land records integration.',
    relatedDepartments: ['Revenue', 'Agriculture'], tags: ['land', 'agriculture', 'reform'],
    votesFor: 0, votesAgainst: 0, votesAbstain: 0,
    publicOpinion: { support: 4500, oppose: 1200, neutral: 800 },
    amendments: [], timeline: [
      { date: '2026-03-01', action: 'Introduced in Assembly' },
      { date: '2026-03-15', action: 'Referred to Select Committee' },
      { date: '2026-04-15', action: 'Committee hearings in progress' },
    ],
    createdAt: '2026-03-01', updatedAt: '2026-04-15',
  },
  {
    id: 'bill2', title: 'The Karnataka Guarantee Schemes (Continuation) Bill, 2026', shortTitle: 'KA Guarantees 2026',
    type: 'money', status: 'passed_lower', introducedBy: 'Siddaramaiah', introducedByParty: 'INC',
    houseIntroduced: 'state_assembly', stateCode: 'KA',
    introducedDate: '2026-02-15', lastActionDate: '2026-03-20',
    summary: 'Provides legal backing for the continuation of 5 Guarantee schemes (Gruha Lakshmi, Anna Bhagya, Shakti, Yuva Nidhi, Gruha Jyoti) with dedicated budget allocation.',
    relatedDepartments: ['Finance', 'Women & Child'], tags: ['guarantees', 'welfare', 'budget'],
    votesFor: 135, votesAgainst: 82, votesAbstain: 7,
    publicOpinion: { support: 12000, oppose: 3500, neutral: 1500 },
    amendments: [{ id: 'am1', proposedBy: 'BJP Opposition', description: 'Sunset clause after 3 years', status: 'rejected' }],
    timeline: [
      { date: '2026-02-15', action: 'Introduced in Assembly' },
      { date: '2026-03-01', action: 'Debated for 3 days' },
      { date: '2026-03-20', action: 'Passed by voice vote' },
    ],
    createdAt: '2026-02-15', updatedAt: '2026-03-20',
  },
];

// ─── Seed Schemes ───
const SEED_SCHEMES: GovernmentScheme[] = [
  {
    id: 'gs1', name: 'Rythu Bandhu', shortName: 'RB', category: 'agriculture', status: 'active',
    launchedDate: '2018-05-10', ministry: 'Agriculture', level: 'state', stateCode: 'TS',
    description: '₹10,000 per acre per year direct investment support to farmers.',
    eligibility: 'All farmers with pattadar passbook', benefits: '₹10,000/acre/year direct bank transfer',
    budgetCrores: 15000, beneficiariesTarget: 7000000, beneficiariesActual: 6200000, coveragePercent: 88.6,
    documents: [], updatedAt: '2026-05-01',
  },
  {
    id: 'gs2', name: 'Gruha Lakshmi', shortName: 'GL', category: 'women_child', status: 'active',
    launchedDate: '2023-08-15', ministry: 'Women & Child Development', level: 'state', stateCode: 'KA',
    description: '₹2,000 monthly to the woman head of every BPL family.',
    eligibility: 'Women head of household in BPL families', benefits: '₹2,000/month direct transfer',
    budgetCrores: 18000, beneficiariesTarget: 10000000, beneficiariesActual: 9200000, coveragePercent: 92.0,
    documents: [], updatedAt: '2026-05-01',
  },
  {
    id: 'gs3', name: 'PM Kisan Samman Nidhi', shortName: 'PM-KISAN', category: 'agriculture', status: 'active',
    launchedDate: '2019-02-01', ministry: 'Agriculture & Farmers Welfare', level: 'central',
    description: '₹6,000 per year in three installments to all farmer families.',
    eligibility: 'All farmer families (subject to exclusion criteria)', benefits: '₹6,000/year in 3 installments',
    budgetCrores: 60000, beneficiariesTarget: 120000000, beneficiariesActual: 110000000, coveragePercent: 91.7,
    documents: [], updatedAt: '2026-05-01',
  },
];

// ─── Seed Projects ───
const SEED_PROJECTS: DevelopmentProject[] = [
  {
    id: 'dp1', name: 'Musi River Rejuvenation', category: 'irrigation', phase: 'under_construction',
    stateCode: 'TS', districtName: 'Hyderabad', constituencyAcNo: 56,
    description: 'Comprehensive cleanup and beautification of the Musi River with sewage treatment plants, riverfront parks, and flood management.',
    contractor: 'Megha Engineering', sanctionedCostCrores: 15000, revisedCostCrores: 16500,
    expenditureCrores: 4200, sanctionedDate: '2024-06-01', expectedCompletion: '2028-12-31',
    delayDays: 0, physicalProgress: 28, financialProgress: 25.5,
    photos: [{ url: 'https://example.com/musi-phase1.jpg', caption: 'Phase 1 riverfront completed', date: '2026-05-15' }],
    milestones: [
      { title: 'Phase 1: Chaderghat to Nagole (5km)', targetDate: '2026-03-31', completedDate: '2026-05-15', status: 'delayed' },
      { title: 'Phase 2: STP installations (5 plants)', targetDate: '2027-06-30', status: 'pending' },
      { title: 'Phase 3: Full riverfront (23km)', targetDate: '2028-12-31', status: 'pending' },
    ],
    issues: ['Land acquisition delays in Attapur stretch', 'STP discharge standards review pending'],
    source: 'HMDA Project Dashboard', updatedAt: '2026-05-20',
  },
  {
    id: 'dp2', name: 'Hyderabad Metro Phase 2', category: 'metro', phase: 'approved',
    stateCode: 'TS', districtName: 'Hyderabad',
    description: 'Extension of Hyderabad Metro to Old City (Falaknuma), Airport, and Shamshabad.',
    sanctionedCostCrores: 24000, expenditureCrores: 500,
    sanctionedDate: '2025-09-01', expectedCompletion: '2030-12-31',
    delayDays: 0, physicalProgress: 2, financialProgress: 2.1,
    photos: [], milestones: [
      { title: 'DPR approval', targetDate: '2025-12-31', completedDate: '2026-01-15', status: 'completed' },
      { title: 'Land acquisition', targetDate: '2026-12-31', status: 'pending' },
    ],
    issues: [], source: 'HMR Official', updatedAt: '2026-05-10',
  },
];

// ─── Seed Hearings ───
const SEED_HEARINGS: PublicHearing[] = [
  {
    id: 'ph1', type: 'environment_clearance', title: 'Musi River STP Environmental Clearance Hearing',
    description: 'Public hearing for the environmental impact assessment of 5 new STPs along the Musi River.',
    organizer: 'TSPCB', stateCode: 'TS', districtName: 'Hyderabad', constituencyAcNo: 56,
    venue: 'TSPCB Office, Sanathnagar', date: '2026-06-15', time: '10:00 AM',
    isOpen: true, registrationUrl: 'https://tspcb.cgg.gov.in/hearing',
    agendaItems: ['EIA report presentation', 'Public comments', 'Expert panel Q&A'],
    createdAt: '2026-05-20',
  },
  {
    id: 'ph2', type: 'budget_consultation', title: 'Pre-Budget Consultation: Education Sector',
    description: 'Public consultation on education budget priorities for FY 2026-27.',
    organizer: 'TS Finance Department', stateCode: 'TS', districtName: 'Hyderabad',
    venue: 'Secretariat Conference Hall', date: '2026-07-01', time: '11:00 AM',
    isOpen: true, agendaItems: ['Teacher recruitment', 'School infrastructure', 'Digital education'],
    createdAt: '2026-05-22',
  },
];

// ─── Seed CDI ───
const SEED_CDI: ConstituencyDevelopmentIndex[] = [
  {
    constituencyAcNo: 56, constituencyName: 'Nampally', stateCode: 'TS',
    overallScore: 72.5, rank: 18, totalACs: 119, percentile: 85,
    metrics: [
      { metric: 'literacy', constituencyValue: 82.3, constituencyRank: 12, districtAvg: 80.1, stateAvg: 72.8, nationalAvg: 74.0, totalConstituencies: 119, percentile: 90, trend: 'improving', label: 'Literacy Rate', unit: '%', higherIsBetter: true },
      { metric: 'electrification', constituencyValue: 99.2, constituencyRank: 5, districtAvg: 98.5, stateAvg: 96.1, nationalAvg: 92.0, totalConstituencies: 119, percentile: 96, trend: 'stable', label: 'Electrification', unit: '%', higherIsBetter: true },
      { metric: 'water_access', constituencyValue: 88.5, constituencyRank: 22, districtAvg: 90.2, stateAvg: 78.5, nationalAvg: 71.0, totalConstituencies: 119, percentile: 82, trend: 'improving', label: 'Water Access', unit: '%', higherIsBetter: true },
      { metric: 'internet_penetration', constituencyValue: 72.0, constituencyRank: 8, districtAvg: 68.5, stateAvg: 52.3, nationalAvg: 45.0, totalConstituencies: 119, percentile: 93, trend: 'improving', label: 'Internet Access', unit: '%', higherIsBetter: true },
      { metric: 'crime_rate', constituencyValue: 312, constituencyRank: 45, districtAvg: 285, stateAvg: 220, nationalAvg: 250, totalConstituencies: 119, percentile: 38, trend: 'stable', label: 'Crime Rate', unit: 'per 100K', higherIsBetter: false },
    ],
    strengths: ['High literacy rate', 'Near-universal electrification', 'Strong internet penetration'],
    weaknesses: ['Above-average crime rate', 'Traffic congestion'],
    recommendations: ['Increase police visibility', 'Improve public transport', 'Expand affordable housing'],
    lastUpdated: '2026-05-01',
  },
];

// ─── Store ───
interface CivicMetricsState {
  budgetSummaries: StateBudgetSummary[];
  budgetAllocations: BudgetAllocation[];
  rtiRequests: RTIRequest[];
  attendance: LegislatorAttendance[];
  bills: Bill[];
  schemes: GovernmentScheme[];
  projects: DevelopmentProject[];
  hearings: PublicHearing[];
  cdiList: ConstituencyDevelopmentIndex[];

  // Queries
  getBudgetSummary: (stateCode: string) => StateBudgetSummary | undefined;
  getRTIByState: (stateCode: string) => RTIRequest[];
  getPublicRTIs: () => RTIRequest[];
  getAttendanceForState: (stateCode: string) => LegislatorAttendance[];
  getAttendanceForLegislator: (name: string) => LegislatorAttendance[];
  getBillsByState: (stateCode?: string) => Bill[];
  getActiveBills: () => Bill[];
  getSchemesByCategory: (category: string) => GovernmentScheme[];
  getSchemesByState: (stateCode?: string) => GovernmentScheme[];
  getProjectsByState: (stateCode: string) => DevelopmentProject[];
  getProjectsByAC: (acNo: number) => DevelopmentProject[];
  getDelayedProjects: () => DevelopmentProject[];
  getUpcomingHearings: (stateCode?: string) => PublicHearing[];
  getCDI: (acNo: number, stateCode: string) => ConstituencyDevelopmentIndex | undefined;

  // Actions
  fileRTI: (rti: Partial<RTIRequest>) => void;
  upvoteRTI: (rtiId: string) => void;
  supportBill: (billId: string) => void;
  opposeBill: (billId: string) => void;
}

export const useCivicMetricsStore = create<CivicMetricsState>((set, get) => ({
  budgetSummaries: SEED_BUDGET_SUMMARIES,
  budgetAllocations: [],
  rtiRequests: SEED_RTI,
  attendance: SEED_ATTENDANCE,
  bills: SEED_BILLS,
  schemes: SEED_SCHEMES,
  projects: SEED_PROJECTS,
  hearings: SEED_HEARINGS,
  cdiList: SEED_CDI,

  getBudgetSummary: (stateCode) => get().budgetSummaries.find((b) => b.stateCode === stateCode),
  getRTIByState: (stateCode) => get().rtiRequests.filter((r) => r.stateCode === stateCode),
  getPublicRTIs: () => get().rtiRequests.filter((r) => r.isPublic),
  getAttendanceForState: (stateCode) => get().attendance.filter((a) => a.stateCode === stateCode).sort((a, b) => b.attendancePercent - a.attendancePercent),
  getAttendanceForLegislator: (name) => get().attendance.filter((a) => a.legislatorName === name),
  getBillsByState: (stateCode) => get().bills.filter((b) => stateCode ? b.stateCode === stateCode : true),
  getActiveBills: () => get().bills.filter((b) => !['enacted', 'lapsed', 'withdrawn'].includes(b.status)),
  getSchemesByCategory: (category) => get().schemes.filter((s) => s.category === category && s.status === 'active'),
  getSchemesByState: (stateCode) => get().schemes.filter((s) => stateCode ? (s.stateCode === stateCode || s.level === 'central') : true),
  getProjectsByState: (stateCode) => get().projects.filter((p) => p.stateCode === stateCode),
  getProjectsByAC: (acNo) => get().projects.filter((p) => p.constituencyAcNo === acNo),
  getDelayedProjects: () => get().projects.filter((p) => p.phase === 'delayed' || p.phase === 'stalled' || p.delayDays > 90),
  getUpcomingHearings: (stateCode) => get().hearings.filter((h) => (stateCode ? h.stateCode === stateCode : true) && new Date(h.date).getTime() > Date.now()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
  getCDI: (acNo, stateCode) => get().cdiList.find((c) => c.constituencyAcNo === acNo && c.stateCode === stateCode),

  fileRTI: (rti) => set((s) => ({ rtiRequests: [...s.rtiRequests, { id: `rti-${Date.now()}`, userId: '', status: 'draft' as RTIStatus, department: '', authority: '', subject: '', questionText: '', stateCode: '', filedDate: new Date().toISOString().split('T')[0], fees: 10, isPublic: true, upvotes: 0, views: 0, tags: [], attachmentUrls: [], responseAttachmentUrls: [], createdAt: new Date().toISOString(), ...rti } as RTIRequest] })),

  upvoteRTI: (rtiId) => set((s) => ({ rtiRequests: s.rtiRequests.map((r) => r.id === rtiId ? { ...r, upvotes: r.upvotes + 1 } : r) })),

  supportBill: (billId) => set((s) => ({ bills: s.bills.map((b) => b.id === billId ? { ...b, publicOpinion: { ...b.publicOpinion, support: b.publicOpinion.support + 1 } } : b) })),

  opposeBill: (billId) => set((s) => ({ bills: s.bills.map((b) => b.id === billId ? { ...b, publicOpinion: { ...b.publicOpinion, oppose: b.publicOpinion.oppose + 1 } } : b) })),
}));
