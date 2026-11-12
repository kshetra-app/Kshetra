import { create } from 'zustand';
import type {
  BudgetAllocation,
  StateBudgetSummary,
  RTIRequest,
  Bill,
  GovernmentScheme,
  DevelopmentProject,
  PublicHearing,
  ConstituencyDevelopmentIndex,
  RTIStatus,
} from '../lib/civicMetricsTypes';
import { parseStateBudgetSummary } from '../lib/civicMetricsTypes';
import { apiClient } from '../lib/api';
import { IS_LIVE_ENVIRONMENT } from '../lib/environment';

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

function currentIndiaCalendarDate(): string {
  return new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);
}

// ─── Store ───
interface CivicMetricsState {
  budgetSummaries: StateBudgetSummary[];
  budgetLoadStatus: 'idle' | 'loading' | 'loaded' | 'error';
  budgetLoadStateCode: string | null;
  rtiLoadStatus: 'idle' | 'loading' | 'loaded' | 'error';
  rtiLoadStateCode: string | null;
  rtiTotal: number;
  rtiPage: number;
  billLoadStatus: 'idle' | 'loading' | 'loaded' | 'error';
  billLoadStateCode: string | null;
  billTotal: number;
  billPage: number;
  schemeLoadStatus: 'idle' | 'loading' | 'loaded' | 'error';
  schemeLoadStateCode: string | null;
  schemeTotal: number;
  schemePage: number;
  projectLoadStatus: 'idle' | 'loading' | 'loaded' | 'error';
  projectLoadStateCode: string | null;
  projectTotal: number;
  projectPage: number;
  hearingLoadStatus: 'idle' | 'loading' | 'loaded' | 'error';
  hearingLoadStateCode: string | null;
  hearingTotal: number;
  hearingPage: number;
  budgetAllocations: BudgetAllocation[];
  rtiRequests: RTIRequest[];
  bills: Bill[];
  schemes: GovernmentScheme[];
  projects: DevelopmentProject[];
  hearings: PublicHearing[];
  cdiList: ConstituencyDevelopmentIndex[];

  // Queries
  getBudgetSummary: (stateCode: string) => StateBudgetSummary | undefined;
  getRTIByState: (stateCode: string) => RTIRequest[];
  getPublicRTIs: (stateCode?: string) => RTIRequest[];
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
  loadBudgetSummary: (stateCode: string) => Promise<void>;
  loadBillsByState: (stateCode: string) => Promise<void>;
  loadMoreBillsByState: (stateCode: string) => Promise<void>;
  loadSchemesByState: (stateCode: string) => Promise<void>;
  loadMoreSchemesByState: (stateCode: string) => Promise<void>;
  loadProjectsByState: (stateCode: string) => Promise<void>;
  loadMoreProjectsByState: (stateCode: string) => Promise<void>;
  loadPublicRTIs: (stateCode: string) => Promise<void>;
  loadMorePublicRTIs: (stateCode: string) => Promise<void>;
  loadHearingsByState: (stateCode: string) => Promise<void>;
  loadMoreHearingsByState: (stateCode: string) => Promise<void>;
  fileRTI: (rti: Partial<RTIRequest>) => Promise<boolean>;
  upvoteRTI: (rtiId: string) => Promise<boolean>;
  supportBill: (billId: string) => Promise<boolean>;
  opposeBill: (billId: string) => Promise<boolean>;
}

export const useCivicMetricsStore = create<CivicMetricsState>((set, get) => {
  let budgetRequestSequence = 0;
  let billRequestSequence = 0;
  let schemeRequestSequence = 0;
  let projectRequestSequence = 0;
  let rtiRequestSequence = 0;
  let hearingRequestSequence = 0;

  return ({
  budgetSummaries: IS_LIVE_ENVIRONMENT ? [] : SEED_BUDGET_SUMMARIES,
  budgetLoadStatus: 'idle',
  budgetLoadStateCode: null,
  rtiLoadStatus: 'idle',
  rtiLoadStateCode: null,
  rtiTotal: 0,
  rtiPage: 0,
  billLoadStatus: 'idle',
  billLoadStateCode: null,
  billTotal: IS_LIVE_ENVIRONMENT ? 0 : SEED_BILLS.length,
  billPage: 0,
  schemeLoadStatus: 'idle',
  schemeLoadStateCode: null,
  schemeTotal: IS_LIVE_ENVIRONMENT ? 0 : SEED_SCHEMES.length,
  schemePage: 0,
  projectLoadStatus: 'idle',
  projectLoadStateCode: null,
  projectTotal: IS_LIVE_ENVIRONMENT ? 0 : SEED_PROJECTS.length,
  projectPage: 0,
  hearingLoadStatus: 'idle',
  hearingLoadStateCode: null,
  hearingTotal: IS_LIVE_ENVIRONMENT ? 0 : SEED_HEARINGS.length,
  hearingPage: 0,
  budgetAllocations: [],
  rtiRequests: IS_LIVE_ENVIRONMENT ? [] : SEED_RTI,
  bills: IS_LIVE_ENVIRONMENT ? [] : SEED_BILLS,
  schemes: IS_LIVE_ENVIRONMENT ? [] : SEED_SCHEMES,
  projects: IS_LIVE_ENVIRONMENT ? [] : SEED_PROJECTS,
  hearings: IS_LIVE_ENVIRONMENT ? [] : SEED_HEARINGS,
  cdiList: IS_LIVE_ENVIRONMENT ? [] : SEED_CDI,

  getBudgetSummary: (stateCode) => get().budgetSummaries.find((b) => b.stateCode === stateCode),
  getRTIByState: (stateCode) => get().rtiRequests.filter((r) => r.stateCode === stateCode),
  getPublicRTIs: (stateCode) => get().rtiRequests.filter(
    (r) => r.isPublic && r.status !== 'draft' && (!stateCode || r.stateCode === stateCode),
  ),
  getBillsByState: (stateCode) => get().bills.filter((b) => stateCode ? b.stateCode === stateCode : true),
  getActiveBills: () => get().bills.filter((b) => !['enacted', 'lapsed', 'withdrawn'].includes(b.status)),
  getSchemesByCategory: (category) => get().schemes.filter((s) => s.category === category && s.status === 'active'),
  getSchemesByState: (stateCode) => get().schemes.filter((s) => stateCode
    ? (s.stateCode === stateCode || s.level === 'central' || (s.level === 'joint' && !s.stateCode))
    : true),
  getProjectsByState: (stateCode) => get().projects.filter((p) => p.stateCode === stateCode),
  getProjectsByAC: (acNo) => get().projects.filter((p) => p.constituencyAcNo === acNo),
  getDelayedProjects: () => get().projects.filter((p) =>
    p.phase === 'delayed' || p.phase === 'stalled' || (p.delayDays !== null && p.delayDays > 90),
  ),
  getUpcomingHearings: (stateCode) => get().hearings
    .filter((hearing) => (stateCode ? hearing.stateCode === stateCode : true) && hearing.date >= currentIndiaCalendarDate())
    .sort((left, right) => left.date.localeCompare(right.date)),
  getCDI: (acNo, stateCode) => get().cdiList.find((c) => c.constituencyAcNo === acNo && c.stateCode === stateCode),

  loadBudgetSummary: async (stateCode) => {
    const requestSequence = ++budgetRequestSequence;
    set({ budgetLoadStatus: 'loading', budgetLoadStateCode: stateCode });

    try {
      const row = await apiClient.civic.getStateBudgetSummary(stateCode);
      if (requestSequence !== budgetRequestSequence) return;

      const summary = row ? parseStateBudgetSummary(row, stateCode) : null;
      set((state) => ({
        budgetSummaries: summary
          ? [...state.budgetSummaries.filter((item) => item.stateCode !== stateCode), summary]
          : IS_LIVE_ENVIRONMENT
            ? state.budgetSummaries.filter((item) => item.stateCode !== stateCode)
            : state.budgetSummaries,
        budgetLoadStatus: 'loaded',
        budgetLoadStateCode: stateCode,
      }));
    } catch {
      if (requestSequence !== budgetRequestSequence) return;
      set((state) => ({
        budgetSummaries: IS_LIVE_ENVIRONMENT
          ? state.budgetSummaries.filter((item) => item.stateCode !== stateCode)
          : state.budgetSummaries,
        budgetLoadStatus: 'error',
        budgetLoadStateCode: stateCode,
      }));
    }
  },

  loadBillsByState: async (stateCode) => {
    const requestSequence = ++billRequestSequence;
    set({ billLoadStatus: 'loading', billLoadStateCode: stateCode });

    try {
      const { items, total } = await apiClient.civic.listBills(stateCode);
      if (requestSequence !== billRequestSequence) return;

      set((state) => {
        const keepDemoBills = items.length === 0 && !IS_LIVE_ENVIRONMENT;
        const nextBills = keepDemoBills
          ? state.bills
          : [...state.bills.filter((bill) => bill.stateCode !== stateCode), ...items];
        return {
          bills: nextBills,
          billLoadStatus: 'loaded',
          billLoadStateCode: stateCode,
          billTotal: keepDemoBills
            ? nextBills.filter((bill) => bill.stateCode === stateCode).length
            : total,
          billPage: 1,
        };
      });
    } catch {
      if (requestSequence !== billRequestSequence) return;
      set((state) => {
        const nextBills = IS_LIVE_ENVIRONMENT
          ? state.bills.filter((bill) => bill.stateCode !== stateCode)
          : state.bills;
        return {
          bills: nextBills,
          billLoadStatus: 'error',
          billLoadStateCode: stateCode,
          billTotal: IS_LIVE_ENVIRONMENT
            ? 0
            : nextBills.filter((bill) => bill.stateCode === stateCode).length,
          billPage: 0,
        };
      });
    }
  },

  loadMoreBillsByState: async (stateCode) => {
    const current = get();
    if (current.billLoadStatus === 'loading' && current.billLoadStateCode === stateCode) return;
    if (current.billLoadStateCode !== stateCode || current.billPage < 1) {
      await get().loadBillsByState(stateCode);
      return;
    }
    if (current.getBillsByState(stateCode).length >= current.billTotal) return;

    const requestSequence = ++billRequestSequence;
    const page = current.billPage + 1;
    set({ billLoadStatus: 'loading', billLoadStateCode: stateCode });

    try {
      const { items, total } = await apiClient.civic.listBills(stateCode, page);
      if (requestSequence !== billRequestSequence) return;

      set((state) => {
        const mergedBills = new Map(state.bills.map((bill) => [bill.id, bill]));
        for (const item of items) mergedBills.set(item.id, item);
        return {
          bills: [...mergedBills.values()],
          billLoadStatus: 'loaded',
          billLoadStateCode: stateCode,
          billTotal: total,
          billPage: page,
        };
      });
    } catch {
      if (requestSequence !== billRequestSequence) return;
      set({ billLoadStatus: 'error', billLoadStateCode: stateCode });
    }
  },

  loadSchemesByState: async (stateCode) => {
    const requestSequence = ++schemeRequestSequence;
    set({ schemeLoadStatus: 'loading', schemeLoadStateCode: stateCode });

    try {
      const { items, total } = await apiClient.civic.listGovernmentSchemes(stateCode);
      if (requestSequence !== schemeRequestSequence) return;

      set((state) => {
        const keepDemoSchemes = items.length === 0 && !IS_LIVE_ENVIRONMENT;
        const nextSchemes = keepDemoSchemes
          ? state.schemes
          : [
              ...state.schemes.filter((scheme) =>
                scheme.stateCode !== stateCode && scheme.level !== 'central' &&
                !(scheme.level === 'joint' && !scheme.stateCode),
              ),
              ...items,
            ];
        return {
          schemes: nextSchemes,
          schemeLoadStatus: 'loaded',
          schemeLoadStateCode: stateCode,
          schemeTotal: keepDemoSchemes
            ? nextSchemes.filter((scheme) =>
                scheme.stateCode === stateCode || scheme.level === 'central' || (scheme.level === 'joint' && !scheme.stateCode),
              ).length
            : total,
          schemePage: 1,
        };
      });
    } catch {
      if (requestSequence !== schemeRequestSequence) return;
      set((state) => {
        const nextSchemes = IS_LIVE_ENVIRONMENT
          ? state.schemes.filter((scheme) =>
              scheme.stateCode !== stateCode && scheme.level !== 'central' &&
              !(scheme.level === 'joint' && !scheme.stateCode),
            )
          : state.schemes;
        return {
          schemes: nextSchemes,
          schemeLoadStatus: 'error',
          schemeLoadStateCode: stateCode,
          schemeTotal: IS_LIVE_ENVIRONMENT
            ? 0
            : nextSchemes.filter((scheme) =>
                scheme.stateCode === stateCode || scheme.level === 'central' || (scheme.level === 'joint' && !scheme.stateCode),
              ).length,
          schemePage: 0,
        };
      });
    }
  },

  loadMoreSchemesByState: async (stateCode) => {
    const current = get();
    if (current.schemeLoadStatus === 'loading' && current.schemeLoadStateCode === stateCode) return;
    if (current.schemeLoadStateCode !== stateCode || current.schemePage < 1) {
      await get().loadSchemesByState(stateCode);
      return;
    }
    if (current.schemePage * 50 >= current.schemeTotal) return;

    const requestSequence = ++schemeRequestSequence;
    const page = current.schemePage + 1;
    set({ schemeLoadStatus: 'loading', schemeLoadStateCode: stateCode });

    try {
      const { items, total } = await apiClient.civic.listGovernmentSchemes(stateCode, page);
      if (requestSequence !== schemeRequestSequence) return;

      set((state) => {
        const mergedSchemes = new Map(state.schemes.map((scheme) => [scheme.id, scheme]));
        for (const item of items) mergedSchemes.set(item.id, item);
        return {
          schemes: [...mergedSchemes.values()],
          schemeLoadStatus: 'loaded',
          schemeLoadStateCode: stateCode,
          schemeTotal: total,
          schemePage: page,
        };
      });
    } catch {
      if (requestSequence !== schemeRequestSequence) return;
      set({ schemeLoadStatus: 'error', schemeLoadStateCode: stateCode });
    }
  },

  loadProjectsByState: async (stateCode) => {
    const requestSequence = ++projectRequestSequence;
    set({ projectLoadStatus: 'loading', projectLoadStateCode: stateCode });

    try {
      const { items, total } = await apiClient.civic.listDevelopmentProjects(stateCode);
      if (requestSequence !== projectRequestSequence) return;

      set((state) => {
        const keepDemoProjects = items.length === 0 && !IS_LIVE_ENVIRONMENT;
        const nextProjects = keepDemoProjects
          ? state.projects
          : [...state.projects.filter((project) => project.stateCode !== stateCode), ...items];
        return {
          projects: nextProjects,
          projectLoadStatus: 'loaded',
          projectLoadStateCode: stateCode,
          projectTotal: keepDemoProjects
            ? nextProjects.filter((project) => project.stateCode === stateCode).length
            : total,
          projectPage: 1,
        };
      });
    } catch {
      if (requestSequence !== projectRequestSequence) return;
      set((state) => {
        const nextProjects = IS_LIVE_ENVIRONMENT
          ? state.projects.filter((project) => project.stateCode !== stateCode)
          : state.projects;
        return {
          projects: nextProjects,
          projectLoadStatus: 'error',
          projectLoadStateCode: stateCode,
          projectTotal: IS_LIVE_ENVIRONMENT
            ? 0
            : nextProjects.filter((project) => project.stateCode === stateCode).length,
          projectPage: 0,
        };
      });
    }
  },

  loadMoreProjectsByState: async (stateCode) => {
    const current = get();
    if (current.projectLoadStatus === 'loading' && current.projectLoadStateCode === stateCode) return;
    if (current.projectLoadStateCode !== stateCode || current.projectPage < 1) {
      await get().loadProjectsByState(stateCode);
      return;
    }
    if (current.projectPage * 50 >= current.projectTotal) return;

    const requestSequence = ++projectRequestSequence;
    const page = current.projectPage + 1;
    set({ projectLoadStatus: 'loading', projectLoadStateCode: stateCode });

    try {
      const { items, total } = await apiClient.civic.listDevelopmentProjects(stateCode, page);
      if (requestSequence !== projectRequestSequence) return;

      set((state) => {
        const mergedProjects = new Map(state.projects.map((project) => [project.id, project]));
        for (const item of items) mergedProjects.set(item.id, item);
        return {
          projects: [...mergedProjects.values()],
          projectLoadStatus: 'loaded',
          projectLoadStateCode: stateCode,
          projectTotal: total,
          projectPage: page,
        };
      });
    } catch {
      if (requestSequence !== projectRequestSequence) return;
      set({ projectLoadStatus: 'error', projectLoadStateCode: stateCode });
    }
  },

  loadHearingsByState: async (stateCode) => {
    const requestSequence = ++hearingRequestSequence;
    set({ hearingLoadStatus: 'loading', hearingLoadStateCode: stateCode });

    try {
      const { items, total } = await apiClient.civic.listPublicHearings(stateCode);
      if (requestSequence !== hearingRequestSequence) return;

      set((state) => {
        const keepDemoHearings = items.length === 0 && !IS_LIVE_ENVIRONMENT;
        const nextHearings = keepDemoHearings
          ? state.hearings
          : [...state.hearings.filter((hearing) => hearing.stateCode !== stateCode), ...items];
        return {
          hearings: nextHearings,
          hearingLoadStatus: 'loaded',
          hearingLoadStateCode: stateCode,
          hearingTotal: keepDemoHearings
            ? nextHearings.filter((hearing) => hearing.stateCode === stateCode).length
            : total,
          hearingPage: 1,
        };
      });
    } catch {
      if (requestSequence !== hearingRequestSequence) return;
      set((state) => ({
        hearings: IS_LIVE_ENVIRONMENT
          ? state.hearings.filter((hearing) => hearing.stateCode !== stateCode)
          : state.hearings,
        hearingLoadStatus: 'error',
        hearingLoadStateCode: stateCode,
        hearingTotal: IS_LIVE_ENVIRONMENT
          ? 0
          : state.hearings.filter((hearing) => hearing.stateCode === stateCode).length,
        hearingPage: 0,
      }));
    }
  },

  loadMoreHearingsByState: async (stateCode) => {
    const current = get();
    if (current.hearingLoadStatus === 'loading' && current.hearingLoadStateCode === stateCode) return;
    if (current.hearingLoadStateCode !== stateCode || current.hearingPage < 1) {
      await get().loadHearingsByState(stateCode);
      return;
    }
    if (current.getUpcomingHearings(stateCode).length >= current.hearingTotal) return;

    const requestSequence = ++hearingRequestSequence;
    const page = current.hearingPage + 1;
    set({ hearingLoadStatus: 'loading', hearingLoadStateCode: stateCode });

    try {
      const { items, total } = await apiClient.civic.listPublicHearings(stateCode, page);
      if (requestSequence !== hearingRequestSequence) return;

      set((state) => {
        const mergedHearings = new Map(state.hearings.map((hearing) => [hearing.id, hearing]));
        for (const item of items) mergedHearings.set(item.id, item);
        return {
          hearings: [...mergedHearings.values()],
          hearingLoadStatus: 'loaded',
          hearingLoadStateCode: stateCode,
          hearingTotal: total,
          hearingPage: page,
        };
      });
    } catch {
      if (requestSequence !== hearingRequestSequence) return;
      set({ hearingLoadStatus: 'error', hearingLoadStateCode: stateCode });
    }
  },

  loadPublicRTIs: async (stateCode) => {
    const requestSequence = ++rtiRequestSequence;
    set({ rtiLoadStatus: 'loading', rtiLoadStateCode: stateCode });

    try {
      const { items: requests, total } = await apiClient.civic.listPublicRtiRequests(stateCode);
      if (requestSequence !== rtiRequestSequence) return;

      set((state) => {
        const keepDemoRequests = requests.length === 0 && !IS_LIVE_ENVIRONMENT;
        const nextRequests = keepDemoRequests
          ? state.rtiRequests
          : [
              ...state.rtiRequests.filter((request) =>
                request.stateCode !== stateCode || request.status === 'draft',
              ),
              ...requests,
            ];
        return {
          rtiRequests: nextRequests,
          rtiLoadStatus: 'loaded',
          rtiLoadStateCode: stateCode,
          rtiTotal: keepDemoRequests
            ? nextRequests.filter((request) =>
                request.isPublic && request.status !== 'draft' && request.stateCode === stateCode,
              ).length
            : total,
          rtiPage: 1,
        };
      });
    } catch {
      if (requestSequence !== rtiRequestSequence) return;
      set((state) => {
        const nextRequests = IS_LIVE_ENVIRONMENT
          ? state.rtiRequests.filter((request) =>
              request.stateCode !== stateCode || request.status === 'draft',
            )
          : state.rtiRequests;
        return {
          rtiRequests: nextRequests,
          rtiLoadStatus: 'error',
          rtiLoadStateCode: stateCode,
          rtiTotal: IS_LIVE_ENVIRONMENT
            ? 0
            : nextRequests.filter((request) =>
                request.isPublic && request.status !== 'draft' && request.stateCode === stateCode,
              ).length,
          rtiPage: 0,
        };
      });
    }
  },

  loadMorePublicRTIs: async (stateCode) => {
    const current = get();
    if (current.rtiLoadStatus === 'loading' && current.rtiLoadStateCode === stateCode) return;
    if (current.rtiLoadStateCode !== stateCode || current.rtiPage < 1) {
      await get().loadPublicRTIs(stateCode);
      return;
    }
    if (current.getPublicRTIs(stateCode).length >= current.rtiTotal) return;

    const requestSequence = ++rtiRequestSequence;
    const page = current.rtiPage + 1;
    set({ rtiLoadStatus: 'loading', rtiLoadStateCode: stateCode });

    try {
      const { items, total } = await apiClient.civic.listPublicRtiRequests(stateCode, page);
      if (requestSequence !== rtiRequestSequence) return;

      set((state) => {
        const mergedRequests = new Map(state.rtiRequests.map((request) => [request.id, request]));
        for (const item of items) {
          if (!mergedRequests.has(item.id)) mergedRequests.set(item.id, item);
        }
        return {
          rtiRequests: [...mergedRequests.values()],
          rtiLoadStatus: 'loaded',
          rtiLoadStateCode: stateCode,
          rtiTotal: total,
          rtiPage: page,
        };
      });
    } catch {
      if (requestSequence !== rtiRequestSequence) return;
      set({ rtiLoadStatus: 'error', rtiLoadStateCode: stateCode });
    }
  },

  fileRTI: async (rti) => {
    try {
      const res = await apiClient.civic.submitRtiQuery({
        department: rti.department || 'General Administration',
        subject: rti.subject || 'RTI Request',
        description: rti.questionText || '',
        state: rti.stateCode || 'TS',
      });
      const newId = res.id;
      set((s) => ({
        rtiRequests: [
          ...s.rtiRequests,
          {
            id: newId,
            userId: '',
            status: 'draft' as RTIStatus,
            department: '',
            authority: '',
            subject: '',
            questionText: '',
            stateCode: '',
            filedDate: new Date().toISOString().split('T')[0],
            fees: 10,
            isPublic: true,
            upvotes: 0,
            views: 0,
            tags: [],
            attachmentUrls: [],
            responseAttachmentUrls: [],
            createdAt: new Date().toISOString(),
            ...rti,
          } as RTIRequest,
        ],
      }));
      return true;
    } catch {
      return false;
    }
  },

  upvoteRTI: async (rtiId) => {
    set((s) => ({
      rtiRequests: s.rtiRequests.map((r) =>
        r.id === rtiId ? { ...r, upvotes: r.upvotes + 1 } : r
      ),
    }));
    try {
      await apiClient.civic.upvoteRtiQuery(rtiId);
      return true;
    } catch {
      set((s) => ({
        rtiRequests: s.rtiRequests.map((r) =>
          r.id === rtiId ? { ...r, upvotes: Math.max(0, r.upvotes - 1) } : r
        ),
      }));
      return false;
    }
  },

  supportBill: async (billId) => {
    try {
      const result = await apiClient.civic.postCitizenOpinion(billId, true);
      if (!result.success) return false;
      set((state) => ({
        bills: state.bills.map((bill) => bill.id === billId
          ? { ...bill, publicOpinion: result.publicOpinion || { support: null, oppose: null, neutral: null } }
          : bill),
      }));
      return result.success;
    } catch {
      return false;
    }
  },

  opposeBill: async (billId) => {
    try {
      const result = await apiClient.civic.postCitizenOpinion(billId, false);
      if (!result.success) return false;
      set((state) => ({
        bills: state.bills.map((bill) => bill.id === billId
          ? { ...bill, publicOpinion: result.publicOpinion || { support: null, oppose: null, neutral: null } }
          : bill),
      }));
      return result.success;
    } catch {
      return false;
    }
  },
  });
});
