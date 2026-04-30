import { create } from 'zustand';
import type {
  CivicIssue,
  Headline,
  ConstituencySentiment,
  IssueCategory,
  IssueStatus,
  CivicScope,
} from '../lib/civicTypes';

// ─── Seed Issues (multi-state, full lifecycle showcase) ───

const SEED_ISSUES: CivicIssue[] = [
  // ── Telangana ──
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
    mediaUrls: ['https://picsum.photos/seed/orr1/400/300', 'https://picsum.photos/seed/orr2/400/300'],
    evidenceCount: 2,
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
    mediaUrls: ['https://picsum.photos/seed/phc1/400/300'],
    evidenceCount: 1,
    createdAt: '2026-04-28T12:00:00Z',
    updatedAt: '2026-04-28T12:00:00Z',
  },
  {
    id: 'issue-5',
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
  // ── Andhra Pradesh ──
  {
    id: 'issue-ap-1',
    reporterId: 'demo-ap-1',
    reporterName: 'Venkat Rao',
    constituencyId: 'AP-AC-1',
    constituencyName: 'Srikakulam',
    stateCode: 'AP',
    title: 'Fishing harbour dredging pending since 2025',
    description: 'Srikakulam fishing harbour silted up. Boats unable to dock during low tide. Fishermen losing livelihood. Central funds sanctioned but state not releasing matching share.',
    category: 'transport',
    severity: 'high',
    status: 'open',
    upvoteCount: 203,
    commentCount: 41,
    createdAt: '2026-04-27T04:00:00Z',
    updatedAt: '2026-04-27T04:00:00Z',
  },
  {
    id: 'issue-ap-2',
    reporterId: 'demo-ap-2',
    reporterName: 'Padma Lakshmi',
    constituencyId: 'AP-AC-68',
    constituencyName: 'Vijayawada West',
    stateCode: 'AP',
    title: 'Krishna river flood damage — 200 homes still unrepaired',
    description: 'September 2025 floods damaged over 200 homes in Bhavanipuram. Government announced Rs 50,000 per family — only 60 families received it. Rest still waiting 7 months later.',
    category: 'housing',
    severity: 'critical',
    status: 'in_progress',
    upvoteCount: 567,
    commentCount: 89,
    mediaUrls: ['https://picsum.photos/seed/flood1/400/300', 'https://picsum.photos/seed/flood2/400/300'],
    evidenceCount: 2,
    createdAt: '2026-04-20T08:00:00Z',
    updatedAt: '2026-04-29T10:00:00Z',
  },
  {
    id: 'issue-ap-3',
    reporterId: 'demo-ap-3',
    reporterName: 'Ravi Kumar',
    constituencyId: 'AP-AC-150',
    constituencyName: 'Tirupati',
    stateCode: 'AP',
    title: 'Tirupati municipal garbage collection stopped in 3 wards',
    description: 'Wards 15, 22, 31 have not seen garbage collection for 10 days. Overflowing bins on main roads. Temple town reputation at stake during peak pilgrim season.',
    category: 'sanitation',
    severity: 'high',
    status: 'acknowledged',
    upvoteCount: 312,
    commentCount: 52,
    createdAt: '2026-04-26T06:30:00Z',
    updatedAt: '2026-04-28T09:00:00Z',
  },
  // ── Karnataka ──
  {
    id: 'issue-ka-1',
    reporterId: 'demo-ka-1',
    reporterName: 'Suresh Hegde',
    constituencyId: 'KA-AC-150',
    constituencyName: 'Mahadevapura',
    stateCode: 'KA',
    title: 'Whitefield-Marathahalli road craters causing daily accidents',
    description: 'The main arterial connecting Whitefield to Marathahalli has 15+ craters. Two-wheeler accidents daily. BBMP patched once but washed away in first rain. IT corridor traffic nightmare.',
    category: 'roads',
    severity: 'critical',
    status: 'open',
    upvoteCount: 478,
    commentCount: 67,
    mediaUrls: ['https://picsum.photos/seed/pothole1/400/300', 'https://picsum.photos/seed/pothole2/400/300', 'https://picsum.photos/seed/pothole3/400/300'],
    evidenceCount: 3,
    createdAt: '2026-04-25T05:00:00Z',
    updatedAt: '2026-04-25T05:00:00Z',
  },
  {
    id: 'issue-ka-2',
    reporterId: 'demo-ka-2',
    reporterName: 'Meena Patil',
    constituencyId: 'KA-AC-176',
    constituencyName: 'Jayanagar',
    stateCode: 'KA',
    title: 'BESCOM overbilling — wrong meter readings for 2,000+ homes',
    description: 'Jayanagar 4th block residents received inflated electricity bills (3-5x normal). BESCOM admits meter reading error but says correction will take 2 billing cycles. Meanwhile threatening disconnection for non-payment.',
    category: 'electricity',
    severity: 'high',
    status: 'in_progress',
    upvoteCount: 189,
    commentCount: 34,
    createdAt: '2026-04-23T07:00:00Z',
    updatedAt: '2026-04-29T12:00:00Z',
  },
  {
    id: 'issue-ka-3',
    reporterId: 'demo-ka-3',
    reporterName: 'Divya S',
    constituencyId: 'KA-AC-154',
    constituencyName: 'Bommanahalli',
    stateCode: 'KA',
    title: 'Bellandur lake foam returns — no action despite NGT order',
    description: 'Toxic foam overflowing onto roads again near Bellandur lake. NGT had ordered cleanup in 2024. BBMP says STP capacity insufficient. Air quality hazardous in 1km radius.',
    category: 'environment',
    severity: 'critical',
    status: 'acknowledged',
    upvoteCount: 621,
    commentCount: 103,
    mediaUrls: ['https://picsum.photos/seed/foam1/400/300', 'https://picsum.photos/seed/foam2/400/300', 'https://picsum.photos/seed/foam3/400/300', 'https://picsum.photos/seed/foam4/400/300', 'https://picsum.photos/seed/foam5/400/300'],
    evidenceCount: 5,
    createdAt: '2026-04-22T08:30:00Z',
    updatedAt: '2026-04-28T16:00:00Z',
  },
  {
    id: 'issue-ka-4',
    reporterId: 'demo-ka-4',
    reporterName: 'Prasad K',
    constituencyId: 'KA-AC-168',
    constituencyName: 'Rajajinagar',
    stateCode: 'KA',
    title: 'Government hospital OPD wait time exceeds 4 hours',
    description: 'KC General Hospital OPD overwhelmed. Patients waiting 4-5 hours for basic consultation. Only 3 doctors for 500+ daily patients. Pharmacist absent — patients buying medicines outside.',
    category: 'healthcare',
    severity: 'high',
    status: 'resolved',
    upvoteCount: 156,
    commentCount: 22,
    resolvedAt: '2026-04-29T08:00:00Z',
    createdAt: '2026-04-18T09:00:00Z',
    updatedAt: '2026-04-29T08:00:00Z',
  },
  // ── Maharashtra ──
  {
    id: 'issue-mh-1',
    reporterId: 'demo-mh-1',
    reporterName: 'Amita Deshmukh',
    constituencyId: 'MH-AC-181',
    constituencyName: 'Andheri West',
    stateCode: 'MH',
    title: 'Versova beach cleanup volunteers harassed by BMC',
    description: 'Citizen volunteers doing weekly beach cleanup being told they need permits. BMC contractor claims exclusive rights. Volunteers have been doing this for 3 years without issues.',
    category: 'environment',
    severity: 'medium',
    status: 'open',
    upvoteCount: 344,
    commentCount: 56,
    createdAt: '2026-04-29T02:00:00Z',
    updatedAt: '2026-04-29T02:00:00Z',
  },
  {
    id: 'issue-mh-2',
    reporterId: 'demo-mh-2',
    reporterName: 'Sachin Jadhav',
    constituencyId: 'MH-AC-175',
    constituencyName: 'Kurla',
    stateCode: 'MH',
    title: 'Local train platform 5 roof collapse risk — cracks visible',
    description: 'Visible cracks in Kurla station platform 5 roof. During monsoon, chunks of concrete fell. 5 lakh commuters daily. Railway says inspection done but no repair scheduled.',
    category: 'public_safety',
    severity: 'critical',
    status: 'acknowledged',
    upvoteCount: 892,
    commentCount: 145,
    mediaUrls: ['https://picsum.photos/seed/kurla1/400/300', 'https://picsum.photos/seed/kurla2/400/300', 'https://picsum.photos/seed/kurla3/400/300'],
    evidenceCount: 3,
    createdAt: '2026-04-24T04:00:00Z',
    updatedAt: '2026-04-28T18:00:00Z',
  },
  {
    id: 'issue-mh-3',
    reporterId: 'demo-mh-3',
    reporterName: 'Geeta Pawar',
    constituencyId: 'MH-AC-207',
    constituencyName: 'Pune City',
    stateCode: 'MH',
    title: 'PMC Smart City funds diverted — cycle track abandoned half-built',
    description: 'Rs 120 crore sanctioned for JM Road cycle track. Work stopped at 40% completion. Barricades blocking footpath for 8 months. RTI reveals funds reallocated to another project.',
    category: 'corruption',
    severity: 'high',
    status: 'open',
    upvoteCount: 445,
    commentCount: 78,
    createdAt: '2026-04-26T06:00:00Z',
    updatedAt: '2026-04-26T06:00:00Z',
  },
  {
    id: 'issue-mh-4',
    reporterId: 'demo-mh-4',
    reporterName: 'Rahul Desai',
    constituencyId: 'MH-AC-187',
    constituencyName: 'Bandra West',
    stateCode: 'MH',
    title: 'Bandra-Worli sea link toll booth causing 45-min backup',
    description: 'FASTag lanes malfunctioning. Only 2 of 6 lanes operational during rush hour. MSRDC not deploying enough staff. Daily commuters paying toll for a parking lot experience.',
    category: 'transport',
    severity: 'medium',
    status: 'resolved',
    upvoteCount: 267,
    commentCount: 33,
    resolvedAt: '2026-04-27T14:00:00Z',
    createdAt: '2026-04-19T05:00:00Z',
    updatedAt: '2026-04-27T14:00:00Z',
  },
];

// ─── Seed Headlines (multi-state, realistic local sources) ───

const SEED_HEADLINES: Headline[] = [
  // ── Telangana ──
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
    constituencyId: 'TS-AC-77',
    title: 'Old City water crisis: HMWSSB to deploy 50 additional tankers',
    summary: 'Emergency measure after widespread complaints. Summer heat and pipeline work causing supply disruption in Charminar, Yakutpura, Karwan constituencies.',
    sourceName: 'The Hindu',
    sourceUrl: 'https://thehindu.com',
    category: 'governance',
    publishedAt: '2026-04-28T22:00:00Z',
  },
  {
    id: 'hl-3',
    stateCode: 'TS',
    title: 'Anti-Defection Law: Supreme Court to hear Telangana BRS petitions next week',
    summary: '10 BRS-to-INC defection cases pending. Court will examine Speaker\'s delayed disqualification proceedings.',
    sourceName: 'Indian Express',
    sourceUrl: 'https://indianexpress.com',
    category: 'law_and_order',
    publishedAt: '2026-04-28T14:00:00Z',
  },
  {
    id: 'hl-4',
    stateCode: 'TS',
    title: 'Musi riverfront cleanup: Phase 1 demolitions face legal challenge',
    summary: 'High Court issues notices on petitions challenging demolition of encroachments. Government argues pollution cleanup is priority.',
    sourceName: 'Times of India',
    sourceUrl: 'https://timesofindia.com',
    category: 'environment',
    publishedAt: '2026-04-27T12:00:00Z',
  },
  // ── Andhra Pradesh ──
  {
    id: 'hl-ap-1',
    stateCode: 'AP',
    title: 'CM Naidu reviews Amaravati construction — Phase 1 deadline set for Dec 2026',
    summary: 'Capital city development back on track. Rs 15,000 crore allocated for government complex, roads, and utilities. 12,000 workers deployed.',
    sourceName: 'Eenadu',
    sourceUrl: 'https://eenadu.net',
    category: 'development',
    publishedAt: '2026-04-29T03:30:00Z',
  },
  {
    id: 'hl-ap-2',
    stateCode: 'AP',
    constituencyId: 'AP-AC-68',
    title: 'Krishna flood victims protest at Vijayawada Collectorate demanding rehabilitation',
    summary: '500+ families stage dharna. Government promises Rs 10 lakh per family for permanent housing by August. Opposition demands immediate interim relief.',
    sourceName: 'Andhra Jyothy',
    sourceUrl: 'https://andhrajyothy.com',
    category: 'governance',
    publishedAt: '2026-04-28T08:00:00Z',
  },
  {
    id: 'hl-ap-3',
    stateCode: 'AP',
    title: 'AP tops in digital land records — 98% of mutations now online',
    summary: 'Webland 2.0 platform processes mutations in 72 hours. Other states studying AP model. Revenue department staff retrained for digital-first workflow.',
    sourceName: 'Deccan Chronicle',
    sourceUrl: 'https://deccanchronicle.com',
    category: 'governance',
    publishedAt: '2026-04-27T14:00:00Z',
  },
  // ── Karnataka ──
  {
    id: 'hl-ka-1',
    stateCode: 'KA',
    title: 'BBMP allocates Rs 800 crore for pothole-free Bengaluru campaign',
    summary: 'Monsoon preparedness drive targets 50,000 potholes. New cold-mix technology for quick repairs. Ward-wise tracker to be made public.',
    sourceName: 'Deccan Herald',
    sourceUrl: 'https://deccanherald.com',
    category: 'development',
    publishedAt: '2026-04-29T05:00:00Z',
  },
  {
    id: 'hl-ka-2',
    stateCode: 'KA',
    constituencyId: 'KA-AC-154',
    title: 'Bellandur lake: NGT imposes Rs 100 crore fine on BBMP for non-compliance',
    summary: 'National Green Tribunal says Bengaluru civic body failed to meet 2024 cleanup deadline. Directs state to set up monitoring committee with citizen representation.',
    sourceName: 'The Hindu',
    sourceUrl: 'https://thehindu.com',
    category: 'environment',
    publishedAt: '2026-04-28T10:30:00Z',
  },
  {
    id: 'hl-ka-3',
    stateCode: 'KA',
    title: 'Karnataka guarantee schemes: 1.5 crore beneficiaries, Rs 52,000 crore disbursed',
    summary: 'Gruha Lakshmi, Shakti, Anna Bhagya, Gruha Jyoti combined reach. Opposition questions fiscal sustainability. CM says revenue growth covers cost.',
    sourceName: 'Kannada Prabha',
    sourceUrl: 'https://kannadaprabha.com',
    category: 'economy',
    publishedAt: '2026-04-27T06:00:00Z',
  },
  // ── Maharashtra ──
  {
    id: 'hl-mh-1',
    stateCode: 'MH',
    title: 'Mumbai Metro Line 3 Colaba–Bandra–SEEPZ: Trial runs begin next month',
    summary: 'India\'s first underground metro in Mumbai enters final testing phase. 33.5 km route with 27 stations expected to carry 17 lakh passengers daily.',
    sourceName: 'Mumbai Mirror',
    sourceUrl: 'https://mumbaimirror.com',
    category: 'development',
    publishedAt: '2026-04-29T04:00:00Z',
  },
  {
    id: 'hl-mh-2',
    stateCode: 'MH',
    constituencyId: 'MH-AC-175',
    title: 'Kurla station safety audit ordered after platform roof scare',
    summary: 'Railway Ministry orders structural audit of 15 suburban stations after citizens flag cracks at Kurla. Report due in 30 days.',
    sourceName: 'Indian Express',
    sourceUrl: 'https://indianexpress.com',
    category: 'governance',
    publishedAt: '2026-04-28T20:00:00Z',
  },
  {
    id: 'hl-mh-3',
    stateCode: 'MH',
    title: 'Pune smart city project: CAG flags Rs 340 crore cost overrun',
    summary: 'Comptroller audit reveals cost escalation in 8 of 12 projects. Cycle track and river rejuvenation projects most affected. Municipal commissioner responds: scope expanded.',
    sourceName: 'Loksatta',
    sourceUrl: 'https://loksatta.com',
    category: 'corruption',
    publishedAt: '2026-04-27T09:00:00Z',
  },
];

// ─── Seed Sentiment (multi-state, computed from imagined feed activity) ───

const SEED_SENTIMENT: ConstituencySentiment[] = [
  // ── Telangana ──
  { constituencyId: 'TS-AC-67', constituencyName: 'Serilingampally', positiveCount: 12, negativeCount: 28, neutralCount: 8, totalPosts: 48, score: -0.33, topIssues: ['roads', 'transport'] },
  { constituencyId: 'TS-AC-77', constituencyName: 'Charminar', positiveCount: 8, negativeCount: 35, neutralCount: 5, totalPosts: 48, score: -0.56, topIssues: ['water', 'sanitation'] },
  { constituencyId: 'TS-AC-75', constituencyName: 'Goshamahal', positiveCount: 18, negativeCount: 12, neutralCount: 10, totalPosts: 40, score: 0.15, topIssues: ['public_safety', 'roads'] },
  { constituencyId: 'TS-AC-58', constituencyName: 'Medchal', positiveCount: 6, negativeCount: 24, neutralCount: 4, totalPosts: 34, score: -0.53, topIssues: ['healthcare', 'water'] },
  // ── Andhra Pradesh ──
  { constituencyId: 'AP-AC-68', constituencyName: 'Vijayawada West', positiveCount: 5, negativeCount: 38, neutralCount: 7, totalPosts: 50, score: -0.66, topIssues: ['housing', 'sanitation'] },
  { constituencyId: 'AP-AC-150', constituencyName: 'Tirupati', positiveCount: 14, negativeCount: 22, neutralCount: 9, totalPosts: 45, score: -0.18, topIssues: ['sanitation', 'transport'] },
  { constituencyId: 'AP-AC-1', constituencyName: 'Srikakulam', positiveCount: 10, negativeCount: 26, neutralCount: 6, totalPosts: 42, score: -0.38, topIssues: ['transport', 'healthcare'] },
  // ── Karnataka ──
  { constituencyId: 'KA-AC-150', constituencyName: 'Mahadevapura', positiveCount: 9, negativeCount: 42, neutralCount: 11, totalPosts: 62, score: -0.53, topIssues: ['roads', 'transport'] },
  { constituencyId: 'KA-AC-154', constituencyName: 'Bommanahalli', positiveCount: 6, negativeCount: 48, neutralCount: 8, totalPosts: 62, score: -0.68, topIssues: ['environment', 'sanitation'] },
  { constituencyId: 'KA-AC-176', constituencyName: 'Jayanagar', positiveCount: 20, negativeCount: 15, neutralCount: 12, totalPosts: 47, score: 0.11, topIssues: ['electricity', 'education'] },
  { constituencyId: 'KA-AC-168', constituencyName: 'Rajajinagar', positiveCount: 24, negativeCount: 10, neutralCount: 8, totalPosts: 42, score: 0.33, topIssues: ['healthcare', 'roads'] },
  // ── Maharashtra ──
  { constituencyId: 'MH-AC-175', constituencyName: 'Kurla', positiveCount: 4, negativeCount: 52, neutralCount: 6, totalPosts: 62, score: -0.77, topIssues: ['public_safety', 'transport'] },
  { constituencyId: 'MH-AC-207', constituencyName: 'Pune City', positiveCount: 15, negativeCount: 30, neutralCount: 10, totalPosts: 55, score: -0.27, topIssues: ['corruption', 'roads'] },
  { constituencyId: 'MH-AC-187', constituencyName: 'Bandra West', positiveCount: 22, negativeCount: 14, neutralCount: 9, totalPosts: 45, score: 0.18, topIssues: ['transport', 'environment'] },
  { constituencyId: 'MH-AC-181', constituencyName: 'Andheri West', positiveCount: 16, negativeCount: 20, neutralCount: 8, totalPosts: 44, score: -0.09, topIssues: ['environment', 'roads'] },
];

// ─── Civic Store ───

interface CivicState {
  issues: CivicIssue[];
  headlines: Headline[];
  sentiment: ConstituencySentiment[];
  issueFilter: IssueCategory | 'all';
  statusFilter: IssueStatus | 'all';
  stateFilter: string | null;
  scopeFilter: CivicScope;
  loading: boolean;

  setIssueFilter: (f: IssueCategory | 'all') => void;
  setStatusFilter: (f: IssueStatus | 'all') => void;
  setStateFilter: (stateCode: string | null) => void;
  setScopeFilter: (scope: CivicScope) => void;
  /** Filter issues by scope + stateCode + optional constituencyId */
  getFilteredByScope: (stateCode: string, constituencyId?: string) => {
    issues: CivicIssue[];
    headlines: Headline[];
    sentiment: ConstituencySentiment[];
  };
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
  scopeFilter: 'national',
  loading: false,

  setIssueFilter: (f) => set({ issueFilter: f }),
  setStatusFilter: (f) => set({ statusFilter: f }),
  setStateFilter: (stateCode) => set({ stateFilter: stateCode }),
  setScopeFilter: (scope) => set({ scopeFilter: scope }),

  getFilteredByScope: (stateCode, constituencyId) => {
    const { issues, headlines, sentiment, scopeFilter, issueFilter, statusFilter } = get();

    const matchScope = (itemState: string, itemConstituencyId?: string) => {
      if (scopeFilter === 'national') return true;
      if (scopeFilter === 'state') return itemState === stateCode;
      // constituency
      if (!constituencyId) return itemState === stateCode; // fallback to state if no constituency set
      return itemConstituencyId === constituencyId;
    };

    return {
      issues: issues.filter((i) => {
        if (!matchScope(i.stateCode, i.constituencyId)) return false;
        if (issueFilter !== 'all' && i.category !== issueFilter) return false;
        if (statusFilter !== 'all' && i.status !== statusFilter) return false;
        return true;
      }),
      headlines: headlines.filter((h) => matchScope(h.stateCode, h.constituencyId)),
      sentiment: sentiment.filter((s) => {
        if (scopeFilter === 'national') return true;
        if (scopeFilter === 'state') return s.constituencyId.startsWith(stateCode);
        return s.constituencyId === constituencyId;
      }),
    };
  },

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
