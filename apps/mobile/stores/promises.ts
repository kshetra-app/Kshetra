/**
 * Promise Store — Election promise tracking with seed entries.
 * Tracks manifesto commitments from promise → delivery/failure.
 *
 * Seed data based on INC's "6 Guarantees" (Telangana 2023) + other key promises.
 */
import { create } from 'zustand';
import type {
  ElectionPromise,
  PromiseUpdate,
  PromiseEvidence,
  PromiseStatus,
  PromiseCategory,
  GovernmentReportCardData,
  PromiseDeliveryIndex,
} from '../lib/promiseTypes';
import { computePDI, buildReportCard } from '../lib/promiseTypes';

interface PromiseState {
  promises: ElectionPromise[];
  updates: PromiseUpdate[];
  evidence: PromiseEvidence[];

  // Queries
  getPromisesForState: (stateCode: string) => ElectionPromise[];
  getPromisesForParty: (stateCode: string, party: string) => ElectionPromise[];
  getPromisesForConstituency: (stateCode: string, acNo: number) => ElectionPromise[];
  getPromiseById: (id: string) => ElectionPromise | null;
  getUpdatesForPromise: (promiseId: string) => PromiseUpdate[];
  getEvidenceForPromise: (promiseId: string) => PromiseEvidence[];
  getReportCard: (stateCode: string, party: string, year: number) => GovernmentReportCardData;
  getPDI: (stateCode: string, party: string) => number;
  getStatusBreakdown: (stateCode: string) => Record<PromiseStatus, number>;

  // Actions
  toggleFollowPromise: (promiseId: string) => void;
  submitEvidence: (evidence: Omit<PromiseEvidence, 'id' | 'upvotes' | 'createdAt'>) => void;
}

// ─── SEED: INC Telangana 2023 "6 Guarantees" + key promises ───

const SEED_PROMISES: ElectionPromise[] = [
  // === INC "6 GUARANTEES" (Telangana 2023) ===
  {
    id: 'p-ts-1',
    stateCode: 'TS',
    party: 'INC',
    title: 'Mahalakshmi — Free bus travel for women',
    description: 'Free travel for women in TSRTC buses across Telangana. Launched as part of 6 guarantees to empower women mobility.',
    category: 'welfare',
    source: 'manifesto',
    sourceUrl: 'https://inc.in/telangana-manifesto-2023',
    promisedDate: '2023-10-15',
    deadline: '2024-03-31',
    status: 'delivered',
    deliveryPercentage: 100,
    electionYear: 2023,
    followCount: 2340,
    verificationCount: 890,
    disputeCount: 12,
  },
  {
    id: 'p-ts-2',
    stateCode: 'TS',
    party: 'INC',
    title: 'Gruha Jyothi — 200 units free electricity',
    description: 'Free electricity up to 200 units per month for every household. Aimed at reducing energy costs for lower/middle income families.',
    category: 'welfare',
    source: 'manifesto',
    promisedDate: '2023-10-15',
    deadline: '2024-06-30',
    status: 'delivered',
    deliveryPercentage: 100,
    electionYear: 2023,
    followCount: 3100,
    verificationCount: 1200,
    disputeCount: 45,
  },
  {
    id: 'p-ts-3',
    stateCode: 'TS',
    party: 'INC',
    title: 'Indiramma Indlu — Housing for the poor',
    description: '5 lakh houses for the poor and homeless across Telangana. Land identification and construction in partnership with district administrations.',
    category: 'welfare',
    source: 'manifesto',
    promisedDate: '2023-10-15',
    deadline: '2028-12-31',
    status: 'in_progress',
    deliveryPercentage: 15,
    electionYear: 2023,
    followCount: 1800,
    verificationCount: 120,
    disputeCount: 200,
  },
  {
    id: 'p-ts-4',
    stateCode: 'TS',
    party: 'INC',
    title: 'Rythu Bharosa — Crop loan waiver ₹2 lakh',
    description: 'Waiver of farm loans up to ₹2 lakh per farmer. Biggest farm loan waiver in Telangana history. To be implemented in phases.',
    category: 'agriculture',
    source: 'manifesto',
    promisedDate: '2023-10-15',
    deadline: '2024-12-31',
    status: 'partially_delivered',
    deliveryPercentage: 65,
    electionYear: 2023,
    followCount: 4200,
    verificationCount: 800,
    disputeCount: 350,
  },
  {
    id: 'p-ts-5',
    stateCode: 'TS',
    party: 'INC',
    title: 'Cheyutha — ₹2,500/month for women',
    description: '₹2,500 per month to women heads of BPL families. Cash transfer directly to bank accounts for women empowerment.',
    category: 'welfare',
    source: 'manifesto',
    promisedDate: '2023-10-15',
    deadline: '2024-06-30',
    status: 'stalled',
    deliveryPercentage: 10,
    electionYear: 2023,
    followCount: 2800,
    verificationCount: 50,
    disputeCount: 600,
  },
  {
    id: 'p-ts-6',
    stateCode: 'TS',
    party: 'INC',
    title: 'Yuva Vikasam — ₹4,000 unemployment allowance',
    description: '₹4,000 monthly unemployment allowance for graduates and ₹3,000 for diploma holders while seeking jobs. Up to 2 years.',
    category: 'economy',
    source: 'manifesto',
    promisedDate: '2023-10-15',
    deadline: '2024-09-30',
    status: 'stalled',
    deliveryPercentage: 5,
    electionYear: 2023,
    followCount: 3500,
    verificationCount: 20,
    disputeCount: 800,
  },

  // === OTHER KEY PROMISES ===
  {
    id: 'p-ts-7',
    stateCode: 'TS',
    party: 'INC',
    title: 'Caste Census',
    description: 'Comprehensive socio-economic and caste survey across Telangana. Key demand from OBC communities for proportional representation.',
    category: 'social_justice',
    source: 'campaign_speech',
    promisedDate: '2023-11-01',
    status: 'in_progress',
    deliveryPercentage: 30,
    electionYear: 2023,
    followCount: 1500,
    verificationCount: 100,
    disputeCount: 80,
  },
  {
    id: 'p-ts-8',
    stateCode: 'TS',
    party: 'INC',
    title: 'Fill 2 lakh government vacancies',
    description: 'Fill 2 lakh vacant government posts through transparent recruitment. Job calendar to be published within 6 months.',
    category: 'governance',
    source: 'manifesto',
    promisedDate: '2023-10-15',
    deadline: '2025-12-31',
    status: 'in_progress',
    deliveryPercentage: 20,
    electionYear: 2023,
    followCount: 5200,
    verificationCount: 300,
    disputeCount: 400,
  },
  {
    id: 'p-ts-9',
    stateCode: 'TS',
    party: 'INC',
    title: 'Musi River Rejuvenation',
    description: 'Clean and rejuvenate the Musi River passing through Hyderabad. Sewage treatment plants, riverfront development, encroachment removal.',
    category: 'environment',
    source: 'official_announcement',
    promisedDate: '2024-02-01',
    deadline: '2028-12-31',
    status: 'in_progress',
    deliveryPercentage: 10,
    electionYear: 2023,
    followCount: 1200,
    verificationCount: 60,
    disputeCount: 150,
  },
  {
    id: 'p-ts-10',
    stateCode: 'TS',
    party: 'INC',
    title: 'HYDRAA — anti-encroachment body',
    description: 'Hyderabad Disaster Response and Asset Protection Agency to demolish illegal constructions on water bodies and public land.',
    category: 'governance',
    source: 'official_announcement',
    promisedDate: '2024-07-01',
    status: 'delivered',
    deliveryPercentage: 100,
    electionYear: 2023,
    followCount: 3800,
    verificationCount: 1500,
    disputeCount: 200,
  },
  {
    id: 'p-ts-11',
    stateCode: 'TS',
    party: 'INC',
    title: 'Aarogya Lakshmi — free health insurance ₹10 lakh',
    description: 'Enhancement of Aarogyasri health insurance to ₹10 lakh per family per year. Covers all government and empanelled private hospitals.',
    category: 'healthcare',
    source: 'manifesto',
    promisedDate: '2023-10-15',
    deadline: '2025-03-31',
    status: 'partially_delivered',
    deliveryPercentage: 50,
    electionYear: 2023,
    followCount: 1800,
    verificationCount: 400,
    disputeCount: 100,
  },
  {
    id: 'p-ts-12',
    stateCode: 'TS',
    party: 'INC',
    title: 'English medium in all government schools',
    description: 'Convert all government schools to English medium instruction while retaining Telugu as a subject. Teacher retraining program included.',
    category: 'education',
    source: 'manifesto',
    promisedDate: '2023-10-15',
    deadline: '2025-06-30',
    status: 'in_progress',
    deliveryPercentage: 35,
    electionYear: 2023,
    followCount: 2200,
    verificationCount: 180,
    disputeCount: 300,
  },

  // === AP PROMISE (for multi-state demo) ===
  {
    id: 'p-ap-1',
    stateCode: 'AP',
    party: 'TDP',
    title: 'Super Six — ₹15,000 to every woman annually',
    description: 'TDP\'s flagship Super Six promise: ₹15,000 annual cash transfer to every woman aged 18+ in Andhra Pradesh. Tallam Banda scheme.',
    category: 'welfare',
    source: 'manifesto',
    promisedDate: '2024-03-01',
    deadline: '2024-12-31',
    status: 'in_progress',
    deliveryPercentage: 40,
    electionYear: 2024,
    followCount: 6000,
    verificationCount: 800,
    disputeCount: 250,
  },
  {
    id: 'p-ap-2',
    stateCode: 'AP',
    party: 'TDP',
    title: '20 lakh jobs for youth',
    description: 'Create 20 lakh jobs in 5 years through industrial corridors, IT hubs, and skill development centers. Job calendar within 100 days.',
    category: 'economy',
    source: 'manifesto',
    promisedDate: '2024-03-01',
    deadline: '2029-06-30',
    status: 'promised',
    deliveryPercentage: 0,
    electionYear: 2024,
    followCount: 4500,
    verificationCount: 10,
    disputeCount: 100,
  },

  // === CONSTITUENCY-LEVEL PROMISES — Serilingampally (TS-AC-67) ===
  {
    id: 'p-ts-c1',
    stateCode: 'TS',
    constituencyAcNo: 67,
    constituencyName: 'Serilingampally',
    party: 'BRS',
    mlaName: 'Arekapudi Gandhi',
    title: 'Stormwater drains for Gachibowli–Kondapur belt',
    description: 'Construct a comprehensive stormwater drainage network across the IT corridor to end recurring monsoon flooding in Serilingampally.',
    category: 'infrastructure',
    source: 'campaign_speech',
    promisedDate: '2023-11-01',
    deadline: '2026-06-30',
    status: 'in_progress',
    deliveryPercentage: 25,
    electionYear: 2023,
    followCount: 1450,
    verificationCount: 90,
    disputeCount: 60,
  },
  {
    id: 'p-ts-c2',
    stateCode: 'TS',
    constituencyAcNo: 67,
    constituencyName: 'Serilingampally',
    party: 'BRS',
    mlaName: 'Arekapudi Gandhi',
    title: 'Nallagandla lake restoration & walking track',
    description: 'Restore Nallagandla lake, fence the bund, add lighting and a walking/cycling track for residents.',
    category: 'environment',
    source: 'manifesto',
    promisedDate: '2023-11-01',
    deadline: '2025-12-31',
    status: 'partially_delivered',
    deliveryPercentage: 60,
    electionYear: 2023,
    followCount: 980,
    verificationCount: 210,
    disputeCount: 30,
  },
  {
    id: 'p-ts-c3',
    stateCode: 'TS',
    constituencyAcNo: 67,
    constituencyName: 'Serilingampally',
    party: 'BRS',
    mlaName: 'Arekapudi Gandhi',
    title: 'Government junior college for Serilingampally',
    description: 'Establish a new government junior college to serve the growing population of the constituency and reduce travel to the city.',
    category: 'education',
    source: 'campaign_speech',
    promisedDate: '2023-11-01',
    status: 'stalled',
    deliveryPercentage: 5,
    electionYear: 2023,
    followCount: 720,
    verificationCount: 15,
    disputeCount: 140,
  },

  // === NATIONAL-LEVEL PROMISES (Lok Sabha 2024) ===
  {
    id: 'p-nat-1',
    stateCode: 'NATIONAL',
    party: 'BJP',
    title: 'Har Ghar Jal — tap water to every rural household',
    description: 'Jal Jeevan Mission commitment to provide functional household tap connections to every rural home across India.',
    category: 'infrastructure',
    source: 'manifesto',
    promisedDate: '2024-04-01',
    deadline: '2028-12-31',
    status: 'partially_delivered',
    deliveryPercentage: 78,
    electionYear: 2024,
    followCount: 9200,
    verificationCount: 3100,
    disputeCount: 540,
  },
  {
    id: 'p-nat-2',
    stateCode: 'NATIONAL',
    party: 'BJP',
    title: '3 crore Lakhpati Didis',
    description: 'Empower 3 crore rural women to earn over ₹1 lakh annually through self-help groups, skilling and credit linkage.',
    category: 'welfare',
    source: 'manifesto',
    promisedDate: '2024-04-01',
    deadline: '2029-05-31',
    status: 'in_progress',
    deliveryPercentage: 33,
    electionYear: 2024,
    followCount: 6700,
    verificationCount: 410,
    disputeCount: 290,
  },
  {
    id: 'p-nat-3',
    stateCode: 'NATIONAL',
    party: 'INC',
    title: 'MSP legal guarantee for farmers',
    description: 'Opposition commitment to enact a legal guarantee for Minimum Support Price as per the Swaminathan formula.',
    category: 'agriculture',
    source: 'manifesto',
    promisedDate: '2024-04-01',
    status: 'promised',
    deliveryPercentage: 0,
    electionYear: 2024,
    followCount: 8100,
    verificationCount: 60,
    disputeCount: 720,
  },
];

const SEED_UPDATES: PromiseUpdate[] = [
  {
    id: 'pu-1',
    promiseId: 'p-ts-1',
    fromStatus: 'promised',
    toStatus: 'in_progress',
    note: 'TSRTC begins trial run of free bus travel for women on select routes',
    updatedByName: 'Telangana Transport Dept',
    createdAt: '2024-01-15T00:00:00Z',
  },
  {
    id: 'pu-2',
    promiseId: 'p-ts-1',
    fromStatus: 'in_progress',
    toStatus: 'delivered',
    note: 'Mahalakshmi scheme launched statewide. Over 1 crore free bus trips in first month.',
    updatedByName: 'CM Office',
    sourceUrl: 'https://telangana.gov.in/mahalakshmi',
    createdAt: '2024-03-08T00:00:00Z',
  },
  {
    id: 'pu-3',
    promiseId: 'p-ts-4',
    fromStatus: 'promised',
    toStatus: 'in_progress',
    note: 'Phase 1: Loans up to ₹1 lakh waiver processed for 8 lakh farmers',
    updatedByName: 'Agriculture Department',
    createdAt: '2024-06-01T00:00:00Z',
  },
  {
    id: 'pu-4',
    promiseId: 'p-ts-4',
    fromStatus: 'in_progress',
    toStatus: 'partially_delivered',
    note: 'Phase 2: ₹1-2 lakh bracket processing started. 12 lakh farmers covered so far.',
    updatedByName: 'Finance Department',
    createdAt: '2024-11-01T00:00:00Z',
  },
  {
    id: 'pu-5',
    promiseId: 'p-ts-5',
    fromStatus: 'promised',
    toStatus: 'stalled',
    note: 'Scheme deferred due to fiscal constraints. Government says it will be launched in a modified form.',
    updatedByName: 'Finance Minister',
    createdAt: '2024-08-15T00:00:00Z',
  },
  {
    id: 'pu-6',
    promiseId: 'p-ts-10',
    fromStatus: 'promised',
    toStatus: 'delivered',
    note: 'HYDRAA formally established with commissioner appointed. First demolitions begin within weeks.',
    updatedByName: 'GHMC',
    sourceUrl: 'https://hydraa.telangana.gov.in',
    createdAt: '2024-07-15T00:00:00Z',
  },
];

const SEED_EVIDENCE: PromiseEvidence[] = [
  {
    id: 'pe-1',
    promiseId: 'p-ts-1',
    userId: 'demo-1',
    userName: 'Priya K',
    evidenceType: 'photo',
    url: 'https://picsum.photos/seed/mahalakshmi/400/300',
    caption: 'Free bus pass working! Traveled from Secunderabad to Ameerpet without paying.',
    isSupporting: true,
    upvotes: 45,
    createdAt: '2024-04-10T10:00:00Z',
  },
  {
    id: 'pe-2',
    promiseId: 'p-ts-4',
    userId: 'demo-2',
    userName: 'Raju M',
    evidenceType: 'news_link',
    url: 'https://thehindu.com/telangana-loan-waiver',
    caption: 'Phase 1 complete but Phase 2 delayed. Banks complaining about late reimbursement from state.',
    isSupporting: false,
    upvotes: 120,
    createdAt: '2024-09-05T14:00:00Z',
  },
  {
    id: 'pe-3',
    promiseId: 'p-ts-6',
    userId: 'demo-3',
    userName: 'Vikram S',
    evidenceType: 'news_link',
    url: 'https://deccanchronicle.com/youth-allowance-stalled',
    caption: 'Zero disbursements so far. Applied 6 months ago, no response from Telangana Skill Development Corp.',
    isSupporting: false,
    upvotes: 340,
    createdAt: '2025-01-15T08:00:00Z',
  },
];

export const usePromiseStore = create<PromiseState>()((set, get) => ({
  promises: SEED_PROMISES,
  updates: SEED_UPDATES,
  evidence: SEED_EVIDENCE,

  getPromisesForState: (stateCode) =>
    get().promises.filter((p) => p.stateCode === stateCode),

  getPromisesForParty: (stateCode, party) =>
    get().promises.filter((p) => p.stateCode === stateCode && p.party === party),

  getPromisesForConstituency: (stateCode, acNo) =>
    get().promises.filter((p) => p.stateCode === stateCode && p.constituencyAcNo === acNo),

  getPromiseById: (id) => get().promises.find((p) => p.id === id) ?? null,

  getUpdatesForPromise: (promiseId) =>
    get()
      .updates.filter((u) => u.promiseId === promiseId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),

  getEvidenceForPromise: (promiseId) =>
    get()
      .evidence.filter((e) => e.promiseId === promiseId)
      .sort((a, b) => b.upvotes - a.upvotes),

  getReportCard: (stateCode, party, year) => {
    const filtered = get().promises.filter(
      (p) => p.stateCode === stateCode && p.party === party && p.electionYear === year,
    );
    return buildReportCard(filtered, stateCode, party, year);
  },

  getPDI: (stateCode, party) => {
    const filtered = get().promises.filter(
      (p) => p.stateCode === stateCode && p.party === party,
    );
    return computePDI(filtered);
  },

  getStatusBreakdown: (stateCode) => {
    const filtered = get().promises.filter((p) => p.stateCode === stateCode);
    const breakdown: Record<PromiseStatus, number> = {
      promised: 0,
      in_progress: 0,
      partially_delivered: 0,
      delivered: 0,
      broken: 0,
      modified: 0,
      stalled: 0,
    };
    for (const p of filtered) {
      breakdown[p.status] = (breakdown[p.status] ?? 0) + 1;
    }
    return breakdown;
  },

  toggleFollowPromise: (promiseId) =>
    set((state) => ({
      promises: state.promises.map((p) =>
        p.id === promiseId
          ? {
              ...p,
              userFollowing: !p.userFollowing,
              followCount: p.userFollowing ? p.followCount - 1 : p.followCount + 1,
            }
          : p,
      ),
    })),

  submitEvidence: (ev) =>
    set((state) => ({
      evidence: [
        ...state.evidence,
        {
          ...ev,
          id: `pe-${Date.now()}`,
          upvotes: 0,
          createdAt: new Date().toISOString(),
        },
      ],
    })),
}));
