import { create } from 'zustand';
import type {
  CivicIssue,
  Headline,
  ConstituencySentiment,
  IssueCategory,
  IssueStatus,
} from '../lib/civicTypes';

// ─── Seed Issues ───

const SEED_ISSUES: CivicIssue[] = [
  {
    id: 'issue-1',
    reporterId: 'demo-1',
    reporterName: 'Priya Reddy',
    constituencyId: 'TS-AC-67',
    constituencyName: 'Serilingampally',
    stateCode: 'TS',
    title: 'ORR service road construction stalled for 3 months',
    description: 'The road widening work near Gachibowli junction has been abandoned mid-construction. Barricades left on road causing daily traffic jams during peak hours. Multiple complaints to GHMC and NHAI with no response.',
    category: 'roads',
    severity: 'high',
    status: 'open',
    upvoteCount: 87,
    commentCount: 14,
    createdAt: '2026-04-28T06:00:00Z',
    updatedAt: '2026-04-28T06:00:00Z',
  },
  {
    id: 'issue-2',
    reporterId: 'demo-5',
    reporterName: 'Fatima Begum',
    constituencyId: 'TS-AC-77',
    constituencyName: 'Charminar',
    stateCode: 'TS',
    title: 'Irregular water supply in Old City areas',
    description: 'Water tankers not arriving on schedule. HMWSSB helpline busy. Residents in Falaknuma, Shalibanda, Yakutpura affected. Some areas getting water once in 3 days.',
    category: 'water',
    severity: 'critical',
    status: 'acknowledged',
    upvoteCount: 134,
    commentCount: 28,
    createdAt: '2026-04-27T08:00:00Z',
    updatedAt: '2026-04-28T14:00:00Z',
  },
  {
    id: 'issue-3',
    reporterId: 'demo-9',
    reporterName: 'Ramesh Goud',
    constituencyId: 'TS-AC-69',
    constituencyName: 'Rajendranagar',
    stateCode: 'TS',
    title: 'Frequent power cuts in Attapur area',
    description: 'Daily power cuts of 2-3 hours during evening peak. Transformer at colony entrance has been faulty for weeks. TSSPDCL complaint number given but no action taken.',
    category: 'electricity',
    severity: 'medium',
    status: 'in_progress',
    upvoteCount: 45,
    commentCount: 7,
    createdAt: '2026-04-26T10:00:00Z',
    updatedAt: '2026-04-29T05:00:00Z',
  },
  {
    id: 'issue-4',
    reporterId: 'demo-10',
    reporterName: 'Anitha K',
    constituencyId: 'TS-AC-58',
    constituencyName: 'Medchal',
    stateCode: 'TS',
    title: 'PHC in Kompally running without doctor for 2 weeks',
    description: 'Primary Health Centre in Kompally has had no doctor for 14 days. Patients being turned away. Nearest alternative is 8km away in Secunderabad. Critical for elderly and pregnant women.',
    category: 'healthcare',
    severity: 'critical',
    status: 'open',
    upvoteCount: 112,
    commentCount: 19,
    createdAt: '2026-04-28T12:00:00Z',
    updatedAt: '2026-04-28T12:00:00Z',
  },
  {
    id: 'issue-5',
    reporterId: 'demo-11',
    reporterName: 'Srinivas M',
    constituencyId: 'TS-AC-14',
    constituencyName: 'Nizamabad Urban',
    stateCode: 'TS',
    title: 'Open drainage near Vinayak Nagar school',
    description: 'Uncovered drain running alongside the school wall. Children exposed to contaminated water. Mosquito breeding ground. Municipality notified thrice.',
    category: 'sanitation',
    severity: 'high',
    status: 'acknowledged',
    upvoteCount: 67,
    commentCount: 11,
    createdAt: '2026-04-25T09:00:00Z',
    updatedAt: '2026-04-27T16:00:00Z',
  },
  {
    id: 'issue-6',
    reporterId: 'demo-12',
    reporterName: 'Kavitha P',
    constituencyId: 'TS-AC-92',
    constituencyName: 'Maheshwaram',
    stateCode: 'TS',
    title: 'Bus service to Shamshabad reduced without notice',
    description: 'TSRTC cut 4 bus routes connecting Maheshwaram to Shamshabad airport. Commuters stranded, forced to use expensive autos. No alternative public transport.',
    category: 'transport',
    severity: 'medium',
    status: 'open',
    upvoteCount: 38,
    commentCount: 6,
    createdAt: '2026-04-29T03:00:00Z',
    updatedAt: '2026-04-29T03:00:00Z',
  },
  {
    id: 'issue-7',
    reporterId: 'demo-13',
    reporterName: 'Rajesh T',
    constituencyId: 'TS-AC-50',
    constituencyName: 'Siddipet',
    stateCode: 'TS',
    title: 'Government school building roof leaking since monsoon',
    description: 'ZP High School main building roof has multiple leaks. Students sitting in wet classrooms. One classroom declared unsafe. Renovation funds sanctioned but work not started.',
    category: 'education',
    severity: 'high',
    status: 'in_progress',
    upvoteCount: 56,
    commentCount: 9,
    createdAt: '2026-04-24T07:00:00Z',
    updatedAt: '2026-04-28T11:00:00Z',
  },
  {
    id: 'issue-8',
    reporterId: 'demo-14',
    reporterName: 'Lakshmi D',
    constituencyId: 'TS-AC-75',
    constituencyName: 'Goshamahal',
    stateCode: 'TS',
    title: 'Streetlights not working on MJ Market to Abids stretch',
    description: 'Multiple streetlights out between MJ Market and Abids road. Dark stretch at night creating safety concerns especially for women. Reported to GHMC but no repair.',
    category: 'public_safety',
    severity: 'medium',
    status: 'resolved',
    upvoteCount: 29,
    commentCount: 4,
    resolvedAt: '2026-04-28T20:00:00Z',
    createdAt: '2026-04-22T15:00:00Z',
    updatedAt: '2026-04-28T20:00:00Z',
  },
];

// ─── Seed Headlines ───

const SEED_HEADLINES: Headline[] = [
  {
    id: 'hl-1',
    stateCode: 'TS',
    title: 'CM Revanth Reddy announces Rs 2,000 crore for urban road upgrades across Hyderabad',
    summary: 'Major road infrastructure push targeting 500km of roads in Greater Hyderabad. Focus on ORR service roads and colony internal roads.',
    sourceName: 'Telangana Today',
    sourceUrl: 'https://telanganatoday.com',
    category: 'development',
    publishedAt: '2026-04-29T04:30:00Z',
  },
  {
    id: 'hl-2',
    stateCode: 'TS',
    title: 'BRS MLAs demand special assembly session on farm loan waiver implementation',
    summary: 'Opposition alleges Rs 31,000 crore promise yet to reach 70% of eligible farmers. Government says Phase 2 disbursement starting next month.',
    sourceName: 'Deccan Chronicle',
    sourceUrl: 'https://deccanchronicle.com',
    category: 'politics',
    publishedAt: '2026-04-29T03:00:00Z',
  },
  {
    id: 'hl-3',
    stateCode: 'TS',
    constituencyId: 'TS-AC-77',
    title: 'Old City water crisis: HMWSSB to deploy 50 additional tankers',
    summary: 'Emergency measure after widespread complaints. Summer heat and pipeline work causing supply disruption in Charminar, Yakutpura, Karwan constituencies.',
    sourceName: 'The Hindu',
    sourceUrl: 'https://thehindu.com',
    category: 'governance',
    publishedAt: '2026-04-28T22:00:00Z',
  },
  {
    id: 'hl-4',
    stateCode: 'TS',
    title: 'Telangana achieves 95% household tap water coverage under Mission Bhagiratha',
    summary: 'State ranks among top 5 nationally. Remaining 5% in remote tribal mandals to be covered by June 2026.',
    sourceName: 'NDTV',
    sourceUrl: 'https://ndtv.com',
    category: 'development',
    publishedAt: '2026-04-28T18:00:00Z',
  },
  {
    id: 'hl-5',
    stateCode: 'TS',
    title: 'Anti-Defection Law: Supreme Court to hear Telangana BRS petitions next week',
    summary: '10 BRS-to-INC defection cases pending. Court will examine Speaker\'s delayed disqualification proceedings.',
    sourceName: 'Indian Express',
    sourceUrl: 'https://indianexpress.com',
    category: 'law_and_order',
    publishedAt: '2026-04-28T14:00:00Z',
  },
  {
    id: 'hl-6',
    stateCode: 'TS',
    title: 'TSRTC records highest revenue in April, but rural routes still loss-making',
    summary: 'Urban routes profitable but 40% of rural routes running at loss. Union demands route rationalization instead of cuts.',
    sourceName: 'Hans India',
    sourceUrl: 'https://thehansindia.com',
    category: 'economy',
    publishedAt: '2026-04-28T10:00:00Z',
  },
  {
    id: 'hl-7',
    stateCode: 'TS',
    title: 'Telangana Inter Board results: Pass percentage rises to 68.4%',
    summary: 'Improvement of 3.2% over previous year. Medak district tops with 74% pass rate.',
    sourceName: 'Sakshi',
    sourceUrl: 'https://sakshi.com',
    category: 'education',
    publishedAt: '2026-04-27T16:00:00Z',
  },
  {
    id: 'hl-8',
    stateCode: 'TS',
    title: 'Musi riverfront cleanup: Phase 1 demolitions face legal challenge',
    summary: 'High Court issues notices on petitions challenging demolition of encroachments. Government argues pollution cleanup is priority.',
    sourceName: 'Times of India',
    sourceUrl: 'https://timesofindia.com',
    category: 'environment',
    publishedAt: '2026-04-27T12:00:00Z',
  },
];

// ─── Seed Sentiment (computed from imagined feed activity per constituency) ───

const SEED_SENTIMENT: ConstituencySentiment[] = [
  { constituencyId: 'TS-AC-67', constituencyName: 'Serilingampally', positiveCount: 12, negativeCount: 28, neutralCount: 8, totalPosts: 48, score: -0.33, topIssues: ['roads', 'transport'] },
  { constituencyId: 'TS-AC-77', constituencyName: 'Charminar', positiveCount: 8, negativeCount: 35, neutralCount: 5, totalPosts: 48, score: -0.56, topIssues: ['water', 'sanitation'] },
  { constituencyId: 'TS-AC-75', constituencyName: 'Goshamahal', positiveCount: 18, negativeCount: 12, neutralCount: 10, totalPosts: 40, score: 0.15, topIssues: ['public_safety', 'roads'] },
  { constituencyId: 'TS-AC-29', constituencyName: 'Sircilla', positiveCount: 22, negativeCount: 8, neutralCount: 6, totalPosts: 36, score: 0.39, topIssues: ['education', 'healthcare'] },
  { constituencyId: 'TS-AC-69', constituencyName: 'Rajendranagar', positiveCount: 10, negativeCount: 20, neutralCount: 6, totalPosts: 36, score: -0.28, topIssues: ['electricity', 'roads'] },
  { constituencyId: 'TS-AC-58', constituencyName: 'Medchal', positiveCount: 6, negativeCount: 24, neutralCount: 4, totalPosts: 34, score: -0.53, topIssues: ['healthcare', 'water'] },
  { constituencyId: 'TS-AC-50', constituencyName: 'Siddipet', positiveCount: 14, negativeCount: 14, neutralCount: 8, totalPosts: 36, score: 0.0, topIssues: ['education', 'roads'] },
  { constituencyId: 'TS-AC-14', constituencyName: 'Nizamabad Urban', positiveCount: 9, negativeCount: 18, neutralCount: 5, totalPosts: 32, score: -0.28, topIssues: ['sanitation', 'healthcare'] },
  { constituencyId: 'TS-AC-92', constituencyName: 'Maheshwaram', positiveCount: 11, negativeCount: 16, neutralCount: 7, totalPosts: 34, score: -0.15, topIssues: ['transport', 'roads'] },
  { constituencyId: 'TS-AC-1', constituencyName: 'Adilabad', positiveCount: 20, negativeCount: 6, neutralCount: 8, totalPosts: 34, score: 0.41, topIssues: ['education', 'environment'] },
];

// ─── Civic Store ───

interface CivicState {
  issues: CivicIssue[];
  headlines: Headline[];
  sentiment: ConstituencySentiment[];
  issueFilter: IssueCategory | 'all';
  statusFilter: IssueStatus | 'all';
  stateFilter: string | null;
  loading: boolean;

  setIssueFilter: (f: IssueCategory | 'all') => void;
  setStatusFilter: (f: IssueStatus | 'all') => void;
  setStateFilter: (stateCode: string | null) => void;
  getFilteredIssues: () => CivicIssue[];
  toggleUpvote: (issueId: string) => void;
  addIssue: (issue: CivicIssue) => void;
  getTopIssueCategories: () => { category: IssueCategory; count: number }[];
  getSentimentSorted: () => ConstituencySentiment[];
}

export const useCivicStore = create<CivicState>()((set, get) => ({
  issues: SEED_ISSUES,
  headlines: SEED_HEADLINES,
  sentiment: SEED_SENTIMENT,
  issueFilter: 'all',
  statusFilter: 'all',
  stateFilter: null,
  loading: false,

  setIssueFilter: (f) => set({ issueFilter: f }),
  setStatusFilter: (f) => set({ statusFilter: f }),
  setStateFilter: (stateCode) => set({ stateFilter: stateCode }),

  getFilteredIssues: () => {
    const { issues, issueFilter, statusFilter, stateFilter } = get();
    return issues.filter((i) => {
      if (stateFilter && i.stateCode !== stateFilter) return false;
      if (issueFilter !== 'all' && i.category !== issueFilter) return false;
      if (statusFilter !== 'all' && i.status !== statusFilter) return false;
      return true;
    });
  },

  toggleUpvote: (issueId) =>
    set((state) => ({
      issues: state.issues.map((i) => {
        if (i.id !== issueId) return i;
        const wasUpvoted = i.userUpvoted;
        return {
          ...i,
          userUpvoted: !wasUpvoted,
          upvoteCount: i.upvoteCount + (wasUpvoted ? -1 : 1),
        };
      }),
    })),

  addIssue: (issue) =>
    set((state) => ({ issues: [issue, ...state.issues] })),

  getTopIssueCategories: () => {
    const counts = new Map<IssueCategory, number>();
    for (const issue of get().issues) {
      counts.set(issue.category, (counts.get(issue.category) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);
  },

  getSentimentSorted: () => {
    return [...get().sentiment].sort((a, b) => a.score - b.score);
  },
}));
