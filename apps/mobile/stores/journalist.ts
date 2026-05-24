import { create } from 'zustand';
import type {
  JournalistProfile,
  Article,
  FactCheck,
  BreakingNewsItem,
  JournalistAnalytics,
  TipTransaction,
  EditorialAssignment,
  ArticleStatus,
  ArticleType,
  BeatCategory,
  JournalistTier,
} from '../lib/journalistTypes';

// ─── Seed Journalist Profiles ───
const SEED_JOURNALISTS: JournalistProfile[] = [
  {
    id: 'j1', userId: 'u-j1', displayName: 'Kavitha Reddy', bio: 'Senior political correspondent covering Telangana & AP. 15+ years of ground reporting.',
    tier: 'senior', verificationStatus: 'verified', pressCardUrl: 'https://example.com/press/kavitha',
    outletAffiliation: 'Deccan Chronicle', outletRole: 'Bureau Chief - Telangana',
    beats: ['politics', 'governance'], coverageAreas: [{ stateCode: 'TS' }, { stateCode: 'AP' }],
    portfolioUrl: 'https://kavithareddy.press', socialLinks: [{ platform: 'twitter', url: 'https://x.com/kavitha_dc' }],
    reputation: 4500, totalArticles: 342, totalViews: 1850000, totalTips: 89, totalEarnings: 45600,
    avgRating: 4.6, isAvailableForAssignment: true, joinedAt: '2024-01-15', lastActiveAt: '2026-05-24',
    featuredArticleIds: ['a1', 'a3'], badges: [
      { id: 'b1', type: 'investigation_star', label: 'Investigation Star', icon: 'search', earnedAt: '2025-03-10' },
      { id: 'b2', type: 'election_coverage', label: 'Election Coverage', icon: 'flag', earnedAt: '2024-12-01' },
    ],
  },
  {
    id: 'j2', userId: 'u-j2', displayName: 'Ramesh Kumar', bio: 'Ground reporter focusing on rural issues, agriculture, and farmer welfare across Karnataka.',
    tier: 'correspondent', verificationStatus: 'verified', beats: ['agriculture', 'infrastructure', 'governance'],
    coverageAreas: [{ stateCode: 'KA', districtName: 'Belagavi' }, { stateCode: 'KA', districtName: 'Dharwad' }],
    socialLinks: [], reputation: 1200, totalArticles: 87, totalViews: 320000, totalTips: 24, totalEarnings: 12000,
    avgRating: 4.2, isAvailableForAssignment: true, joinedAt: '2024-06-20', lastActiveAt: '2026-05-23',
    featuredArticleIds: [], badges: [{ id: 'b3', type: 'ground_reporter', label: 'Ground Reporter', icon: 'location', earnedAt: '2025-01-15' }],
  },
  {
    id: 'j3', userId: 'u-j3', displayName: 'Priya Sharma', bio: 'Citizen journalist from Lucknow. Covers education and women empowerment issues in UP.',
    tier: 'stringer', verificationStatus: 'verified', beats: ['education', 'health'],
    coverageAreas: [{ stateCode: 'UP', districtName: 'Lucknow' }],
    socialLinks: [{ platform: 'instagram', url: 'https://instagram.com/priya_reports' }],
    reputation: 350, totalArticles: 23, totalViews: 45000, totalTips: 8, totalEarnings: 3200,
    avgRating: 4.0, isAvailableForAssignment: true, joinedAt: '2025-02-10', lastActiveAt: '2026-05-24',
    featuredArticleIds: [], badges: [{ id: 'b4', type: 'first_article', label: 'First Article', icon: 'create', earnedAt: '2025-02-15' }],
  },
  {
    id: 'j4', userId: 'u-j4', displayName: 'Suresh Patil', bio: 'Data journalist specializing in election analytics, political finance, and civic data stories.',
    tier: 'editor', verificationStatus: 'verified', outletAffiliation: 'Independent',
    beats: ['politics', 'business', 'governance'], coverageAreas: [{ stateCode: 'MH' }, { stateCode: 'KA' }],
    socialLinks: [{ platform: 'twitter', url: 'https://x.com/suresh_data' }],
    reputation: 6800, totalArticles: 520, totalViews: 3200000, totalTips: 156, totalEarnings: 89000,
    avgRating: 4.8, isAvailableForAssignment: false, joinedAt: '2023-11-01', lastActiveAt: '2026-05-24',
    featuredArticleIds: ['a2'], badges: [
      { id: 'b5', type: 'data_journalist', label: 'Data Journalist', icon: 'bar-chart', earnedAt: '2024-06-01' },
      { id: 'b6', type: 'editor_pick', label: 'Editor\'s Pick', icon: 'star', earnedAt: '2025-08-01' },
    ],
  },
];

// ─── Seed Articles ───
const SEED_ARTICLES: Article[] = [
  {
    id: 'a1', authorId: 'j1', authorName: 'Kavitha Reddy', authorTier: 'senior',
    type: 'investigation', status: 'published', headline: 'Inside the BRS-to-INC Defection Machine: How 10 MLAs Switched Sides',
    subheadline: 'A deep investigation into the political maneuvering behind Telangana\'s biggest wave of defections',
    slug: 'brs-inc-defection-machine', body: [
      { id: 'b1', type: 'paragraph', content: 'In the six months following the December 2023 election, Telangana witnessed its most dramatic political realignment since statehood...' },
      { id: 'b2', type: 'heading', content: 'The Timeline of Defections' },
      { id: 'b3', type: 'paragraph', content: 'It began with Danam Nagender in Khairatabad, a constituency BRS had held since 2014...' },
      { id: 'b4', type: 'quote', content: '"The people chose change, and we are merely following their mandate."', attribution: 'Anonymous MLA' },
      { id: 'b5', type: 'data_widget', content: 'defection-timeline-chart' },
    ],
    summary: 'An investigation into how 10 BRS MLAs defected to INC within months of the 2023 election, reshaping Telangana politics.',
    coverImageUrl: 'https://example.com/images/defection-cover.jpg',
    media: [], tags: ['defection', 'telangana', 'brs', 'inc'], beats: ['politics'],
    sources: [
      { id: 's1', label: 'MLA interviews', type: 'interview', isAnonymous: true, verifiedByEditor: true },
      { id: 's2', label: 'Anti-Defection Law records', type: 'official_document', url: 'https://assembly.telangana.gov.in', isAnonymous: false, verifiedByEditor: true },
    ],
    location: { stateCode: 'TS' }, wordCount: 3200, readTimeMinutes: 16,
    views: 245000, shares: 8900, tips: 34, tipAmountTotal: 17200,
    reactions: { like: 4500, insightful: 2100, important: 1800, misleading: 45 },
    comments: 342, isBreaking: false, isEditorPick: true, isFeatured: true,
    publishedAt: '2024-08-15T10:00:00Z', updatedAt: '2024-08-15T10:00:00Z', createdAt: '2024-08-10T08:00:00Z',
    relatedArticleIds: ['a3'], stateCode: 'TS',
  },
  {
    id: 'a2', authorId: 'j4', authorName: 'Suresh Patil', authorTier: 'editor',
    type: 'data_story', status: 'published', headline: 'Crorepati MLAs: 87% of Maharashtra Winners Have Assets Over ₹1 Crore',
    slug: 'maharashtra-crorepati-mlas', body: [
      { id: 'b6', type: 'paragraph', content: 'Analysis of 2024 election affidavits reveals a staggering concentration of wealth among elected representatives...' },
      { id: 'b7', type: 'data_widget', content: 'wealth-distribution-chart' },
    ],
    summary: 'Data analysis of 288 Maharashtra MLA affidavits showing wealth concentration among legislators.',
    media: [], tags: ['wealth', 'maharashtra', 'affidavits', 'data'], beats: ['politics', 'business'],
    sources: [{ id: 's3', label: 'MyNeta Affidavit Data', type: 'public_record', url: 'https://myneta.info', isAnonymous: false, verifiedByEditor: true }],
    location: { stateCode: 'MH' }, wordCount: 2100, readTimeMinutes: 11,
    views: 180000, shares: 5200, tips: 21, tipAmountTotal: 10500,
    reactions: { like: 3200, insightful: 4100, important: 2800, misleading: 12 },
    comments: 187, isBreaking: false, isEditorPick: true, isFeatured: false,
    publishedAt: '2025-01-20T09:00:00Z', updatedAt: '2025-01-20T09:00:00Z', createdAt: '2025-01-15T08:00:00Z',
    relatedArticleIds: [], stateCode: 'MH',
  },
  {
    id: 'a3', authorId: 'j1', authorName: 'Kavitha Reddy', authorTier: 'senior',
    type: 'ground_report', status: 'published', headline: 'Musi River Cleanup: Promises vs. Reality on the Ground',
    slug: 'musi-river-cleanup-ground-report', body: [
      { id: 'b8', type: 'paragraph', content: 'Three months after the grand announcement of the Musi River rejuvenation project, a ground visit reveals a stark gap between promises and progress...' },
    ],
    summary: 'Ground report from Hyderabad examining the Musi River cleanup project\'s actual progress.',
    media: [{ id: 'm1', type: 'image', url: 'https://example.com/musi-1.jpg', caption: 'Untreated sewage still flows into Musi near Chaderghat', credit: 'Kavitha Reddy/Kshetra' }],
    tags: ['musi', 'hyderabad', 'infrastructure', 'environment'], beats: ['infrastructure', 'environment'],
    sources: [{ id: 's4', label: 'HMDA officials', type: 'interview', isAnonymous: false, verifiedByEditor: true }],
    location: { stateCode: 'TS', districtName: 'Hyderabad' }, wordCount: 1800, readTimeMinutes: 9,
    views: 95000, shares: 3400, tips: 15, tipAmountTotal: 7500,
    reactions: { like: 2100, insightful: 1500, important: 3200, misleading: 8 },
    comments: 156, isBreaking: false, isEditorPick: false, isFeatured: false,
    publishedAt: '2025-06-10T11:00:00Z', updatedAt: '2025-06-10T11:00:00Z', createdAt: '2025-06-08T08:00:00Z',
    relatedArticleIds: ['a1'], stateCode: 'TS', constituencyAcNo: 56,
  },
  {
    id: 'a4', authorId: 'j3', authorName: 'Priya Sharma', authorTier: 'stringer',
    type: 'news_report', status: 'published', headline: 'UP Government Schools See 22% Drop in Enrollment After Private School Voucher Scheme',
    slug: 'up-school-enrollment-drop', body: [
      { id: 'b9', type: 'paragraph', content: 'The controversial private school voucher scheme introduced in 2025 has had a dramatic impact on government school enrollment in urban UP...' },
    ],
    summary: 'News report on declining government school enrollment in UP following the voucher scheme.',
    media: [], tags: ['education', 'uttar-pradesh', 'schools'], beats: ['education'],
    sources: [{ id: 's5', label: 'UP Education Dept RTI response', type: 'rti_response', isAnonymous: false, verifiedByEditor: true }],
    location: { stateCode: 'UP', districtName: 'Lucknow' }, wordCount: 1200, readTimeMinutes: 6,
    views: 42000, shares: 1200, tips: 5, tipAmountTotal: 2500,
    reactions: { like: 890, insightful: 620, important: 1100, misleading: 3 },
    comments: 67, isBreaking: false, isEditorPick: false, isFeatured: false,
    publishedAt: '2026-03-15T07:00:00Z', updatedAt: '2026-03-15T07:00:00Z', createdAt: '2026-03-12T08:00:00Z',
    relatedArticleIds: [], stateCode: 'UP',
  },
];

// ─── Seed Fact Checks ───
const SEED_FACT_CHECKS: FactCheck[] = [
  {
    id: 'fc1', articleId: undefined, claimText: 'Telangana has the highest per-capita income among all Indian states',
    claimSource: 'Political rally speech', claimDate: '2026-04-10', verdict: 'mostly_false',
    explanation: 'Telangana ranks 4th in per-capita GSDP behind Goa, Delhi, and Sikkim as of 2024-25 data.',
    evidence: [{ label: 'RBI State Finances Report 2024-25', url: 'https://rbi.org.in', type: 'official_document' }],
    checkedBy: 'j4', publishedAt: '2026-04-12T10:00:00Z', createdAt: '2026-04-11T08:00:00Z',
  },
  {
    id: 'fc2', claimText: 'BJP won 40% vote share in Karnataka 2023',
    claimSource: 'Social media viral post', claimDate: '2026-05-01', verdict: 'mostly_true',
    explanation: 'BJP received 36.0% vote share in Karnataka 2023. Close to 40% but not accurate.',
    evidence: [{ label: 'ECI Official Results', url: 'https://results.eci.gov.in', type: 'official_document' }],
    checkedBy: 'j4', publishedAt: '2026-05-02T09:00:00Z', createdAt: '2026-05-01T08:00:00Z',
  },
];

// ─── Seed Breaking News ───
const SEED_BREAKING: BreakingNewsItem[] = [
  {
    id: 'bn1', priority: 'urgent', headline: 'Delimitation Commission Draft Report Expected Within 30 Days',
    summary: 'Sources confirm the Delimitation Commission has finalized its methodology and a draft report for 8 states will be released for public consultation.',
    authorId: 'j1', stateCode: undefined, isActive: true,
    createdAt: '2026-05-24T08:00:00Z', expiresAt: '2026-05-24T20:00:00Z', updatedAt: '2026-05-24T10:00:00Z',
    updateCount: 1, updates: [{ text: 'Commission spokesperson confirms June timeline', timestamp: '2026-05-24T10:00:00Z' }],
  },
];

// ─── Seed Assignments ───
const SEED_ASSIGNMENTS: EditorialAssignment[] = [
  {
    id: 'ea1', editorId: 'j4', journalistId: 'j2', beat: 'agriculture',
    stateCode: 'KA', title: 'Cover the drought impact on North Karnataka farmers',
    description: 'Need a comprehensive ground report on the ongoing drought affecting Belagavi and Dharwad districts.',
    deadline: '2026-06-15T18:00:00Z', status: 'in_progress', createdAt: '2026-05-20T08:00:00Z',
  },
];

// ─── Store Interface ───
interface JournalistState {
  journalists: JournalistProfile[];
  articles: Article[];
  factChecks: FactCheck[];
  breakingNews: BreakingNewsItem[];
  assignments: EditorialAssignment[];
  tips: TipTransaction[];
  currentJournalistId: string | null;
  articleDraft: Partial<Article> | null;

  // Queries
  getJournalist: (id: string) => JournalistProfile | undefined;
  getArticle: (id: string) => Article | undefined;
  getArticlesByAuthor: (authorId: string) => Article[];
  getArticlesByBeat: (beat: BeatCategory) => Article[];
  getArticlesByState: (stateCode: string) => Article[];
  getPublishedArticles: () => Article[];
  getFeaturedArticles: () => Article[];
  getEditorPicks: () => Article[];
  getActiveBreaking: () => BreakingNewsItem[];
  getFactChecks: () => FactCheck[];
  getAssignmentsForJournalist: (journalistId: string) => EditorialAssignment[];
  getTopJournalists: () => JournalistProfile[];
  getJournalistAnalytics: (journalistId: string) => JournalistAnalytics;

  // Actions
  setCurrentJournalist: (id: string) => void;
  createArticle: (article: Partial<Article>) => void;
  updateArticleStatus: (articleId: string, status: ArticleStatus, note?: string) => void;
  publishArticle: (articleId: string) => void;
  tipArticle: (articleId: string, amount: number, message?: string) => void;
  submitFactCheck: (factCheck: Partial<FactCheck>) => void;
  addBreakingNews: (item: Partial<BreakingNewsItem>) => void;
  updateBreakingNews: (id: string, update: string) => void;
  setArticleDraft: (draft: Partial<Article> | null) => void;
}

export const useJournalistStore = create<JournalistState>((set, get) => ({
  journalists: SEED_JOURNALISTS,
  articles: SEED_ARTICLES,
  factChecks: SEED_FACT_CHECKS,
  breakingNews: SEED_BREAKING,
  assignments: SEED_ASSIGNMENTS,
  tips: [],
  currentJournalistId: null,
  articleDraft: null,

  getJournalist: (id) => get().journalists.find((j) => j.id === id),
  getArticle: (id) => get().articles.find((a) => a.id === id),
  getArticlesByAuthor: (authorId) => get().articles.filter((a) => a.authorId === authorId && a.status === 'published'),
  getArticlesByBeat: (beat) => get().articles.filter((a) => a.beats.includes(beat) && a.status === 'published'),
  getArticlesByState: (stateCode) => get().articles.filter((a) => a.stateCode === stateCode && a.status === 'published'),
  getPublishedArticles: () => get().articles.filter((a) => a.status === 'published').sort((a, b) => new Date(b.publishedAt!).getTime() - new Date(a.publishedAt!).getTime()),
  getFeaturedArticles: () => get().articles.filter((a) => a.isFeatured && a.status === 'published'),
  getEditorPicks: () => get().articles.filter((a) => a.isEditorPick && a.status === 'published'),
  getActiveBreaking: () => get().breakingNews.filter((b) => b.isActive && new Date(b.expiresAt).getTime() > Date.now()),
  getFactChecks: () => get().factChecks.filter((fc) => fc.publishedAt),
  getAssignmentsForJournalist: (journalistId) => get().assignments.filter((a) => a.journalistId === journalistId),
  getTopJournalists: () => [...get().journalists].sort((a, b) => b.reputation - a.reputation).slice(0, 10),

  getJournalistAnalytics: (journalistId) => {
    const articles = get().getArticlesByAuthor(journalistId);
    const totalViews = articles.reduce((s, a) => s + a.views, 0);
    const totalShares = articles.reduce((s, a) => s + a.shares, 0);
    const totalTips = articles.reduce((s, a) => s + a.tips, 0);
    const totalEarnings = articles.reduce((s, a) => s + a.tipAmountTotal, 0);
    return {
      journalistId, period: 'all_time' as const, totalArticles: articles.length,
      totalViews, totalShares, totalTips, totalEarnings, avgReadTime: 8,
      topArticles: articles.sort((a, b) => b.views - a.views).slice(0, 5).map((a) => ({ id: a.id, headline: a.headline, views: a.views })),
      viewsByBeat: {} as Record<BeatCategory, number>, viewsByDay: [],
      engagementRate: totalViews > 0 ? Math.round((articles.reduce((s, a) => s + a.reactions.like + a.reactions.insightful, 0) / totalViews) * 100) : 0,
      followerCount: 0, followerGrowth: 0, reachByState: {},
    };
  },

  setCurrentJournalist: (id) => set({ currentJournalistId: id }),

  createArticle: (article) => set((s) => ({
    articles: [...s.articles, {
      id: `a-${Date.now()}`, authorId: article.authorId || '', authorName: article.authorName || '', authorTier: article.authorTier || 'citizen',
      type: article.type || 'news_report', status: 'draft', headline: article.headline || '', slug: article.slug || '',
      body: article.body || [], summary: article.summary || '', media: [], tags: article.tags || [], beats: article.beats || [],
      sources: article.sources || [], wordCount: article.wordCount || 0, readTimeMinutes: Math.max(1, Math.ceil((article.wordCount || 0) / 200)),
      views: 0, shares: 0, tips: 0, tipAmountTotal: 0, reactions: { like: 0, insightful: 0, important: 0, misleading: 0 },
      comments: 0, isBreaking: false, isEditorPick: false, isFeatured: false,
      updatedAt: new Date().toISOString(), createdAt: new Date().toISOString(), relatedArticleIds: [], ...article,
    } as Article],
  })),

  updateArticleStatus: (articleId, status, note) => set((s) => ({
    articles: s.articles.map((a) => a.id === articleId ? { ...a, status, reviewNote: note || a.reviewNote, updatedAt: new Date().toISOString() } : a),
  })),

  publishArticle: (articleId) => set((s) => ({
    articles: s.articles.map((a) => a.id === articleId ? { ...a, status: 'published' as const, publishedAt: new Date().toISOString(), updatedAt: new Date().toISOString() } : a),
  })),

  tipArticle: (articleId, amount, message) => {
    const tip: TipTransaction = { id: `tip-${Date.now()}`, fromUserId: 'current-user', toJournalistId: '', articleId, amount, currency: 'INR', message, createdAt: new Date().toISOString() };
    set((s) => ({
      tips: [...s.tips, tip],
      articles: s.articles.map((a) => a.id === articleId ? { ...a, tips: a.tips + 1, tipAmountTotal: a.tipAmountTotal + amount } : a),
    }));
  },

  submitFactCheck: (factCheck) => set((s) => ({
    factChecks: [...s.factChecks, { id: `fc-${Date.now()}`, claimText: '', claimSource: '', claimDate: '', verdict: 'unverifiable', explanation: '', evidence: [], checkedBy: '', createdAt: new Date().toISOString(), ...factCheck } as FactCheck],
  })),

  addBreakingNews: (item) => set((s) => ({
    breakingNews: [{ id: `bn-${Date.now()}`, priority: 'developing', headline: '', summary: '', authorId: '', isActive: true, createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 6 * 3600000).toISOString(), updatedAt: new Date().toISOString(), updateCount: 0, updates: [], ...item } as BreakingNewsItem, ...s.breakingNews],
  })),

  updateBreakingNews: (id, update) => set((s) => ({
    breakingNews: s.breakingNews.map((b) => b.id === id ? { ...b, updates: [...b.updates, { text: update, timestamp: new Date().toISOString() }], updateCount: b.updateCount + 1, updatedAt: new Date().toISOString() } : b),
  })),

  setArticleDraft: (draft) => set({ articleDraft: draft }),
}));
